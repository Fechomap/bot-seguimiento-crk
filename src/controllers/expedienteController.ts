import type { Context } from 'grammy';
import { validateExpedienteNumber, sanitizeInput } from '../utils/validators.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/formatters.js';
import type { DatosExpediente, ExpedienteCompleto } from '../types/index.js';
import type { SessionManager } from '../services/sessionManager.js';
import type { BotService } from '../services/botService.js';

// Importaciones de los controladores específicos
import { handleCostoServicio } from './costoController.js';
import { handleDatosUnidad } from './unidadController.js';
import { handleUbicacionTiempo } from './ubicacionController.js';
import { handleTiempos } from './tiemposController.js';

/**
 * Formatea los detalles del expediente para mostrarlos
 */
function formatExpedienteDetails(
  expedienteData: DatosExpediente,
  numeroExpediente: string
): string {
  const statusColor = getStatusColor(expedienteData.estatus);

  return (
    `🔍 *Detalles del Expediente*\n` +
    `- *ESTATUS:* ${statusColor}${expedienteData.estatus || 'N/A'}\n` +
    `- *SERVICIO:* ${expedienteData.servicio || 'N/A'}\n` +
    `- *EXP:* ${numeroExpediente || 'N/A'}\n` +
    `- *Vehículo:* ${expedienteData.vehiculo || 'N/A'}\n` +
    `- *Placas:* ${expedienteData.placas || 'N/A'}`
  );
}

/**
 * Genera un resumen completo del expediente combinando toda la información
 */
function generateResumenCompleto(expedienteCompleto: ExpedienteCompleto): string {
  const { expediente, costo, ubicacion, tiempos } = expedienteCompleto;

  // Encabezado del resumen
  let resumen = `📋 *RESUMEN DEL EXPEDIENTE*\n\n`;

  // ===== INFORMACIÓN DE COSTOS =====
  resumen += `💰 *Costo del Servicio*\n`;
  if (costo) {
    if (expediente.estatus === 'Cancelado') {
      resumen += `- **Costo Total:** ${formatCurrency(costo.costo)}\n`;
    } else {
      // Desglose según tipo de servicio
      if (expediente.servicio === 'Local') {
        resumen += `- **Desglose:** ${costo.km || 'N/A'} km, plano ${costo.plano || 'N/A'}\n`;
      } else if (expediente.servicio === 'Carretero') {
        resumen += `- **Distancia:** ${costo.km || 'N/A'} km\n`;
        resumen += `- **Banderazo:** ${formatCurrency(costo.banderazo)}\n`;
        resumen += `- **Costo por Km:** ${formatCurrency(costo.costoKm)}\n`;
      } else {
        resumen += `- **Desglose:** ${costo.km || 'N/A'} km, plano ${costo.plano || 'N/A'}\n`;
      }

      // Desgloses adicionales (solo si > 0)
      if (costo.casetaACobro && costo.casetaACobro > 0) {
        resumen += `- **Caseta de Cobro:** ${formatCurrency(costo.casetaACobro)}\n`;
      }
      if (costo.casetaCubierta && costo.casetaCubierta > 0) {
        resumen += `- **Caseta Cubierta:** ${formatCurrency(costo.casetaCubierta)}\n`;
      }
      if (costo.resguardo && costo.resguardo > 0) {
        resumen += `- **Resguardo:** ${formatCurrency(costo.resguardo)}\n`;
      }
      if (costo.maniobras && costo.maniobras > 0) {
        resumen += `- **Maniobras:** ${formatCurrency(costo.maniobras)}\n`;
      }
      if (costo.horaEspera && costo.horaEspera > 0) {
        resumen += `- **Hora de Espera:** ${formatCurrency(costo.horaEspera)}\n`;
      }
      if (costo.Parking && costo.Parking > 0) {
        resumen += `- **Parking:** ${formatCurrency(costo.Parking)}\n`;
      }
      if (costo.Otros && costo.Otros > 0) {
        resumen += `- **Otros:** ${formatCurrency(costo.Otros)}\n`;
      }
      if (costo.excedente && costo.excedente > 0) {
        resumen += `- **Excedente:** ${formatCurrency(costo.excedente)}\n`;
      }

      resumen += `- **Costo Total:** ${formatCurrency(costo.costo)}\n`;
    }
  } else {
    resumen += `- **Información no disponible**\n`;
  }
  resumen += `\n`;

  resumen += `\n`;

  // ===== INFORMACIÓN DE UBICACIÓN (solo para servicios en tránsito) =====
  const estatusConUbicacion = ['A Contactar'];
  const debeMostrarUbicacion = estatusConUbicacion.includes(expediente.estatus || '');

  if (debeMostrarUbicacion) {
    resumen += `📍 *Ubicación y Tiempo Restante*\n`;
    if (ubicacion) {
      let ubicacionTexto = 'N/A';

      if (ubicacion.latitud && ubicacion.longitud) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ubicacion.latitud}%2C${ubicacion.longitud}`;
        ubicacionTexto = `[Ver en Maps](${mapsUrl})`;
      }

      resumen += `- **Ubicación Actual de la Grúa:** ${ubicacionTexto}\n`;
      resumen += `- **Tiempo Restante Estimado:** ${ubicacion.tiempoRestante || 'N/A'}\n`;
    } else {
      resumen += `- **Información no disponible**\n`;
    }
    resumen += `\n`;
  }

  // ===== INFORMACIÓN DE TIEMPOS (solo para servicios que ya iniciaron) =====
  const estatusConTiempos = ['En Proceso', 'Concluido', 'Cancelado', 'Finalizado'];
  const debeMostrarTiempos = estatusConTiempos.includes(expediente.estatus || '');

  if (debeMostrarTiempos) {
    resumen += `⏰ *Tiempos del Expediente*\n`;
    if (tiempos) {
      const contacto = tiempos.tc ? `${formatDateTime(tiempos.tc)} ⏳` : 'aún sin contacto';
      const termino = tiempos.tt ? `${formatDateTime(tiempos.tt)} ⏳` : 'aún sin término';

      resumen += `- **Contacto:** ${contacto}\n`;
      resumen += `- **Termino:** ${termino}\n`;
    } else {
      resumen += `- **Información no disponible**\n`;
    }
  }

  return resumen;
}

/**
 * Procesa la solicitud de número de expediente con pre-carga automática
 */
export async function processExpedienteRequest(
  ctx: Context,
  sessionManager: SessionManager,
  mensaje: string,
  botService: BotService
): Promise<void> {
  const chatId = ctx.chat!.id;

  // Sanitizar y validar entrada
  const expedienteInput = sanitizeInput(mensaje);

  if (validateExpedienteNumber(expedienteInput)) {
    const expediente = expedienteInput;
    console.info(`🔍 Buscando expediente: ${expediente}`);

    try {
      // Mensaje de búsqueda
      const loadingMessage = await ctx.reply('🔍 _Buscando expediente..._', {
        parse_mode: 'Markdown',
      });

      // Consultar API
      const expedienteCompleto = await botService.obtenerExpedienteCompleto(expediente);

      if (expedienteCompleto?.expediente) {
        // Eliminar mensaje de búsqueda
        await ctx.api.deleteMessage(chatId, loadingMessage.message_id);

        // Guardar datos completos en la sesión del usuario
        sessionManager.setExpedienteCompleto(chatId, expediente, expedienteCompleto);

        // Mostrar detalles básicos
        const detalles = formatExpedienteDetails(expedienteCompleto.expediente, expediente);
        await ctx.reply(detalles, {
          parse_mode: 'Markdown',
          reply_markup: getSeguimientoKeyboard(expedienteCompleto.expediente),
        });

        // Enviar automáticamente el resumen completo
        const resumenCompleto = generateResumenCompleto(expedienteCompleto);
        await ctx.reply(resumenCompleto, {
          parse_mode: 'Markdown',
        });
      } else {
        // Editar mensaje de búsqueda con error
        await ctx.api.editMessageText(
          chatId,
          loadingMessage.message_id,
          '❌ *Expediente no encontrado*\n\n_El número ingresado no existe en el sistema._',
          {
            parse_mode: 'Markdown',
          }
        );
      }
    } catch (error) {
      console.error('❌ Error:', error);
      await ctx.reply(
        '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.'
      );
    }
  } else {
    await ctx.reply(
      '⚠️ Por favor, *ingresa un número de expediente válido* (solo letras, números, espacios y guiones).',
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Procesa las acciones de menú seleccionadas
 */
export async function processMenuAction(
  ctx: Context,
  sessionManager: SessionManager,
  opcion: string,
  botService: BotService
): Promise<void> {
  const chatId = ctx.chat!.id;
  const usuario = sessionManager.getOrCreate(chatId);
  const { expediente } = usuario;

  if (!expediente) {
    await ctx.reply('❌ No hay expediente activo. Por favor escribe tu número de expediente.');
    return;
  }

  try {
    switch (opcion) {
      case 'costo_servicio':
        await handleCostoServicio(ctx, expediente, sessionManager, botService);
        break;
      case 'datos_unidad':
        await handleDatosUnidad(ctx, expediente, sessionManager, botService);
        break;
      case 'ubicacion_tiempo':
        await handleUbicacionTiempo(ctx, expediente, sessionManager, botService);
        break;
      case 'tiempos':
        await handleTiempos(ctx, expediente, sessionManager, botService);
        break;
      default:
        await ctx.reply('ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.', {
          reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
        });
        break;
    }
  } catch (error) {
    console.error('❌ Error en processMenuAction:', error);
    await ctx.reply(
      '❌ Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}
