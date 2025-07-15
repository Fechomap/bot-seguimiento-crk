import TelegramBot from 'node-telegram-bot-api';
import { validateExpedienteNumber, sanitizeInput } from '../utils/validators.js';
import { getSeguimientoKeyboard, getMainMenuKeyboard, removeKeyboard } from '../utils/keyboards.js';
import type { Usuario, DatosExpediente } from '../types/index.js';
import type { BotService } from '../services/botService.js';

// Importaciones de los controladores específicos
import { handleCostoServicio } from './costoController.js';
import { handleDatosUnidad } from './unidadController.js';
import { handleUbicacionTiempo } from './ubicacionController.js';
import { handleTiempos } from './tiemposController.js';

/**
 * Procesa la solicitud de número de expediente
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
      // Consulta del expediente a través del servicio
      const expedienteData = await botService.obtenerExpediente(expediente);
      console.info(`📄 Registros encontrados:`, expedienteData);

      if (expedienteData != null) {
        // Guardar datos del expediente en la sesión del usuario
        // eslint-disable-next-line no-param-reassign
        usuario.datosExpediente = expedienteData;
        // eslint-disable-next-line no-param-reassign
        usuario.expediente = expediente;
        // eslint-disable-next-line no-param-reassign
        usuario.etapa = 'menu_seguimiento';

        // Mostrar detalles y menú de opciones
        const detalles = formatExpedienteDetails(expedienteData); // eslint-disable-line @typescript-eslint/no-use-before-define
        await bot.sendMessage(chatId, detalles, {
          parse_mode: 'Markdown',
          reply_markup: getSeguimientoKeyboard(expedienteData),
        });
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
        '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.',
        { reply_markup: getMainMenuKeyboard() }
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
function formatExpedienteDetails(expedienteData: DatosExpediente): string {
  return (
    `🔍 *Detalles del Expediente*\n` +
    `- ***ESTATUS: ${expedienteData.estatus || 'N/A'}***\n` +
    `- ***SERVICIO: ${expedienteData.servicio || 'N/A'}***\n\n` +
    `- **Nombre:** ${expedienteData.nombre || 'N/A'}\n` +
    `- **Vehículo:** ${expedienteData.vehiculo || 'N/A'}\n` +
    `- **Destino:** ${expedienteData.destino || 'N/A'}\n\n` +
    `📋 *Selecciona una opción para ver más detalles:*`
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
      '❌ No hay expediente activo. Por favor inicia una nueva consulta.',
      {
        reply_markup: getMainMenuKeyboard(),
      }
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
      case 'otro_expediente':
        // eslint-disable-next-line no-param-reassign
        usuario.etapa = 'esperando_numero_expediente';
        await bot.sendMessage(
          chatId,
          '🔄 Por favor, *ingresa el número de otro expediente* para continuar:',
          {
            parse_mode: 'Markdown',
            reply_markup: removeKeyboard(),
          }
        );
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
