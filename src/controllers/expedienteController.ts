import TelegramBot from 'node-telegram-bot-api';
import { validateExpedienteNumber, sanitizeInput } from '../utils/validators.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/formatters.js';
import type { Usuario, DatosExpediente, ExpedienteCompleto } from '../types/index.js';
import type { BotService } from '../services/botService.js';

// Importaciones de los controladores específicos
import { handleCostoServicio } from './costoController.js';
import { handleDatosUnidad } from './unidadController.js';
import { handleUbicacionTiempo } from './ubicacionController.js';
import { handleTiempos } from './tiemposController.js';

/**
 * Procesa la solicitud de número de expediente con pre-carga automática
 */
export async function processExpedienteRequest(
  bot: TelegramBot,
  chatId: number,
  usuario: Usuario,
  mensaje: string,
  botService: BotService
): Promise<void> {
  // Sanitizar y validar entrada
  const expedienteInput = sanitizeInput(mensaje);

  if (validateExpedienteNumber(expedienteInput)) {
    const expediente = expedienteInput;
    console.info(`🔍 Buscando expediente: ${expediente}`);

    try {
      // Mostrar animación de carga con emojis dinámicos
      const loadingMessage = await bot.sendMessage(chatId, '🔍', { parse_mode: 'Markdown' });

      // Animación súper limpia y minimalista
      const loadingSteps = [
        '⠀⠀⠀⠀⠀⠀⠀🚛💨',
        '⠀⠀⠀⠀⠀⠀🚛💨⠀',
        '⠀⠀⠀⠀⠀🚛💨⠀⠀',
        '⠀⠀⠀⠀🚛💨⠀⠀⠀',
        '⠀⠀⠀🚛💨⠀⠀⠀⠀',
        '⠀⠀🚛💨⠀⠀⠀⠀⠀',
        '⠀🚛💨⠀⠀⠀⠀⠀⠀',
        '🚛💨⠀⠀⠀⠀⠀⠀⠀',
      ];

      // Ejecutar animación mientras se hace la consulta
      const animationPromise = (async () => {
        // eslint-disable-next-line no-await-in-loop
        for (let i = 0; i < loadingSteps.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 15); // ULTRA MEGA RÁPIDA 🏎️💨
          });
          try {
            const currentStep = loadingSteps[i];
            if (loadingMessage.message_id && currentStep) {
              // eslint-disable-next-line no-await-in-loop
              await bot.editMessageText(currentStep, {
                chat_id: chatId,
                message_id: loadingMessage.message_id,
                parse_mode: 'Markdown',
              });
            }
          } catch (error) {
            // Ignorar errores de edición (mensaje puede haber sido editado muy rápido)
            console.warn('Animación: salto de frame');
          }
        }
      })();

      // ✨ NUEVA FUNCIONALIDAD: Pre-carga completa automática en paralelo con animación
      const [expedienteCompleto] = await Promise.all([
        botService.obtenerExpedienteCompleto(expediente),
        animationPromise,
      ]);

      if (expedienteCompleto?.expediente) {
        // Mensaje final de éxito con emoji celebrativo
        if (loadingMessage.message_id) {
          await bot.editMessageText(
            '🎉 *¡Expediente encontrado!*\n\n✨ _Información completa cargada y lista._',
            {
              chat_id: chatId,
              message_id: loadingMessage.message_id,
              parse_mode: 'Markdown',
            }
          );
        }

        // Pausa breve para que el usuario vea el mensaje de éxito
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        });
        // Guardar datos completos en la sesión del usuario
        // eslint-disable-next-line no-param-reassign
        usuario.datosExpediente = expedienteCompleto.expediente;
        // eslint-disable-next-line no-param-reassign
        usuario.expedienteCompleto = expedienteCompleto;
        // eslint-disable-next-line no-param-reassign
        usuario.expediente = expediente;
        // eslint-disable-next-line no-param-reassign
        usuario.etapa = 'menu_seguimiento';

        // Mostrar detalles básicos
        const detalles = formatExpedienteDetails(expedienteCompleto.expediente, expediente); // eslint-disable-line @typescript-eslint/no-use-before-define
        await bot.sendMessage(chatId, detalles, {
          parse_mode: 'Markdown',
          reply_markup: getSeguimientoKeyboard(expedienteCompleto.expediente),
        });

        // Enviar automáticamente el resumen completo
        const resumenCompleto = generateResumenCompleto(expedienteCompleto); // eslint-disable-line @typescript-eslint/no-use-before-define
        await bot.sendMessage(chatId, resumenCompleto, {
          parse_mode: 'Markdown',
        });
      } else if (loadingMessage.message_id) {
        // Mensaje final de error cuando no se encuentra el expediente
        await bot.editMessageText(
          '❌ *Expediente no encontrado*\n\n_El número ingresado no existe o no se encontró información._',
          {
            chat_id: chatId,
            message_id: loadingMessage.message_id,
            parse_mode: 'Markdown',
          }
        );
      } else {
        await bot.sendMessage(
          chatId,
          '❌ Lo siento, el número de expediente no es válido o no se encontró información. Por favor, intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('❌ Error:', error);
      await bot.sendMessage(
        chatId,
        '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.'
      );
    }
  } else {
    await bot.sendMessage(
      chatId,
      '⚠️ Por favor, *ingresa un número de expediente válido* (solo letras, números, espacios y guiones).',
      { parse_mode: 'Markdown' }
    );
  }
}

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
    `- ***ESTATUS: ${statusColor}${expedienteData.estatus || 'N/A'}***\n` +
    `- ***SERVICIO: ${expedienteData.servicio || 'N/A'}***\n` +
    `- ***EXP: ${numeroExpediente || 'N/A'}***`
  );
}

/**
 * Procesa las acciones de menú seleccionadas
 */
export async function processMenuAction(
  bot: TelegramBot,
  chatId: number,
  usuario: Usuario,
  opcion: string,
  botService: BotService
): Promise<void> {
  const { expediente } = usuario;

  if (!expediente) {
    await bot.sendMessage(
      chatId,
      '❌ No hay expediente activo. Por favor escribe tu número de expediente.'
    );
    return;
  }

  try {
    switch (opcion) {
      case 'costo_servicio':
        await handleCostoServicio(bot, chatId, expediente, usuario, botService);
        break;
      case 'datos_unidad':
        await handleDatosUnidad(bot, chatId, expediente, usuario, botService);
        break;
      case 'ubicacion_tiempo':
        await handleUbicacionTiempo(bot, chatId, expediente, usuario, botService);
        break;
      case 'tiempos':
        await handleTiempos(bot, chatId, expediente, usuario, botService);
        break;
      default:
        await bot.sendMessage(
          chatId,
          'ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.',
          {
            reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
          }
        );
        break;
    }
  } catch (error) {
    console.error('❌ Error en processMenuAction:', error);
    await bot.sendMessage(
      chatId,
      '❌ Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
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
