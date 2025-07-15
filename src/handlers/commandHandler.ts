import TelegramBot from 'node-telegram-bot-api';
import { getMainMenuKeyboard } from '../utils/keyboards.js';
import type { Usuario } from '../types/index.js';

/**
 * Registra los comandos del bot
 */
export function registerCommands(bot: TelegramBot, usuarios: Record<number, Usuario>): void {
  // Comando /start para iniciar la conversación
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    initUsuario(chatId, usuarios);
    sendWelcomeMessage(bot, chatId);
  });

  // Comando /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    sendHelpMessage(bot, chatId);
  });
}

/**
 * Inicializa el estado de un usuario
 */
export function initUsuario(chatId: number, usuarios: Record<number, Usuario>): void {
  usuarios[chatId] = {
    etapa: 'initial',
    expediente: undefined,
    datosExpediente: undefined,
  };
}

/**
 * Envía un mensaje de bienvenida con el menú principal
 */
function sendWelcomeMessage(bot: TelegramBot, chatId: number): void {
  bot.sendMessage(
    chatId,
    '👋 *¡Bienvenido al sistema de atención al cliente!*\n\nPor favor, selecciona una opción para continuar:',
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    }
  );
}

/**
 * Envía un mensaje de ayuda
 */
function sendHelpMessage(bot: TelegramBot, chatId: number): void {
  const helpMessage =
    '*Ayuda del Bot de Seguimiento*\n\n' +
    'Este bot te permite consultar información sobre tu expediente de servicio.\n\n' +
    '*Comandos disponibles:*\n' +
    '/start - Iniciar o reiniciar el bot\n' +
    '/help - Mostrar este mensaje de ayuda';

  bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  });
}
