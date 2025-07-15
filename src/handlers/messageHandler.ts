import TelegramBot from 'node-telegram-bot-api';
import { initUsuario } from './commandHandler.js';
import {
  processExpedienteRequest,
  processMenuAction,
} from '../controllers/expedienteController.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import { getStatusColor } from '../utils/formatters.js';
import type { Usuario } from '../types/index.js';
import type { BotService } from '../services/botService.js';

/**
 * Registra los manejadores de mensajes
 */
export function registerMessageHandlers(
  bot: TelegramBot,
  usuarios: Record<number, Usuario>,
  botService: BotService
): void {
  // Manejo de mensajes de texto
  bot.on('message', async (msg) => {
    // Ignorar si no es mensaje de texto o si es comando /start o /help
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const mensaje = msg.text.trim();
    console.info('ℹ️ Mensaje recibido:', mensaje);

    // Si el usuario no está registrado, inicializarlo automáticamente
    if (!usuarios[chatId]) {
      initUsuario(chatId, usuarios);
    }

    const usuario = usuarios[chatId]!;

    // Detectar si el usuario ingresó directamente un número de expediente
    const posibleExpediente = mensaje.match(/^[a-zA-Z0-9\s-]+$/);

    // Simplificado: solo detección automática de expedientes

    // En función de la etapa en que se encuentre el usuario
    switch (usuario.etapa) {
      case 'initial':
        // Si parece un expediente, procesarlo directamente
        if (posibleExpediente && mensaje.length >= 3) {
          await processExpedienteRequest(bot, chatId, usuario, mensaje, botService);
        } else {
          await bot.sendMessage(
            chatId,
            '🤔 No entendí tu mensaje.\n\n' +
              '📝 Simplemente escribe tu número de expediente\n' +
              '_Ejemplo: ABC123, 12345, EXP-789_',
            {
              parse_mode: 'Markdown',
            }
          );
        }
        break;

      case 'esperando_numero_expediente':
        await processExpedienteRequest(bot, chatId, usuario, mensaje, botService);
        break;

      case 'menu_seguimiento':
        // Si parece un expediente, resetear y consultar nuevo expediente
        if (posibleExpediente && mensaje.length >= 3) {
          // eslint-disable-next-line no-param-reassign
          usuario.etapa = 'initial';
          await processExpedienteRequest(bot, chatId, usuario, mensaje, botService);
        } else {
          await handleMenuOption(bot, chatId, usuario, mensaje, botService); // eslint-disable-line @typescript-eslint/no-use-before-define
        }
        break;

      default:
        await bot.sendMessage(
          chatId,
          'ℹ️ No entendí tu respuesta. Por favor, selecciona una opción del menú o escribe "/start" para reiniciar.'
        );
        break;
    }
  });

  // Manejo de errores en el polling
  bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error);
  });
}

/**
 * Maneja las opciones del menú seleccionadas por texto
 */
async function handleMenuOption(
  bot: TelegramBot,
  chatId: number,
  usuario: Usuario,
  mensaje: string,
  botService: BotService
): Promise<void> {
  switch (mensaje) {
    case '💰 Costo Total':
      await processMenuAction(bot, chatId, usuario, 'costo_servicio', botService);
      break;

    case '🚚 Unidad':
      await processMenuAction(bot, chatId, usuario, 'datos_unidad', botService);
      break;

    case '📍 Ubicación':
      await processMenuAction(bot, chatId, usuario, 'ubicacion_tiempo', botService);
      break;

    case '⏰ Tiempos':
      await processMenuAction(bot, chatId, usuario, 'tiempos', botService);
      break;

    case '📊 Estado': {
      const statusColor = getStatusColor(usuario.datosExpediente?.estatus);

      await bot.sendMessage(
        chatId,
        `📊 *Estado del Expediente*\n\n` +
          `📋 Número: *${usuario.expediente}*\n` +
          `Estado: ***${statusColor}${usuario.datosExpediente?.estatus || 'N/A'}***`,
        {
          parse_mode: 'Markdown',
          reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
        }
      );
      break;
    }

    default:
      await bot.sendMessage(
        chatId,
        'ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.',
        { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
      );
      break;
  }
}
