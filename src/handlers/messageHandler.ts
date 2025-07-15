import TelegramBot from 'node-telegram-bot-api';
import { initUsuario } from './commandHandler.js';
import {
  processExpedienteRequest,
  processMenuAction,
} from '../controllers/expedienteController.js';
import { getMainMenuKeyboard, removeKeyboard, getSeguimientoKeyboard } from '../utils/keyboards.js';
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

    // Si el usuario no está registrado, pedir que inicie con /start
    if (!usuarios[chatId]) {
      initUsuario(chatId, usuarios);
      await bot.sendMessage(
        chatId,
        'ℹ️ Por favor, usa el comando /start para iniciar la conversación.',
        {
          reply_markup: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            keyboard: [['/start'] as any],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
      return;
    }

    const usuario = usuarios[chatId];
    // En función de la etapa en que se encuentre el usuario, se maneja el mensaje
    switch (usuario.etapa) {
      case 'initial':
        if (mensaje === '📊 Seguimiento de Expediente') {
          usuario.etapa = 'esperando_numero_expediente';
          await bot.sendMessage(
            chatId,
            '🔍 Por favor, *ingresa tu número de expediente* para realizar el seguimiento:',
            {
              parse_mode: 'Markdown',
              reply_markup: removeKeyboard(),
            }
          );
        } else {
          await bot.sendMessage(
            chatId,
            'ℹ️ Por favor, selecciona una opción válida o usa /start para reiniciar.',
            {
              reply_markup: getMainMenuKeyboard(),
            }
          );
        }
        break;

      case 'esperando_numero_expediente':
        await processExpedienteRequest(bot, chatId, usuario, mensaje, botService);
        break;

      case 'menu_seguimiento':
        await handleMenuOption(bot, chatId, usuario, mensaje, botService); // eslint-disable-line @typescript-eslint/no-use-before-define
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
    case '💰 Costo del Servicio':
      await processMenuAction(bot, chatId, usuario, 'costo_servicio', botService);
      break;

    case '🚚 Datos de la Unidad':
      await processMenuAction(bot, chatId, usuario, 'datos_unidad', botService);
      break;

    case '📍 Ubicación y Tiempo Restante':
      await processMenuAction(bot, chatId, usuario, 'ubicacion_tiempo', botService);
      break;

    case '⏰ Tiempos':
      await processMenuAction(bot, chatId, usuario, 'tiempos', botService);
      break;

    case '🔄 Consultar otro Expediente':
      await processMenuAction(bot, chatId, usuario, 'otro_expediente', botService);
      break;

    default:
      await bot.sendMessage(
        chatId,
        'ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.',
        { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
      );
      break;
  }
}
