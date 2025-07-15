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
    initUsuario(chatId, usuarios); // eslint-disable-line @typescript-eslint/no-use-before-define
    sendWelcomeMessage(bot, chatId); // eslint-disable-line @typescript-eslint/no-use-before-define
  });

  // Comando /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    sendHelpMessage(bot, chatId); // eslint-disable-line @typescript-eslint/no-use-before-define
  });
}

/**
 * Inicializa el estado de un usuario
 */
export function initUsuario(chatId: number, usuarios: Record<number, Usuario>): void {
  // eslint-disable-next-line no-param-reassign
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
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.sendMessage(
    chatId,
    '👋 *¡Bienvenido al Sistema de Seguimiento de Expedientes!*\n\n' +
    '📋 *¿Qué necesitas hacer?*\n' +
    '• Presiona el botón para consultar tu expediente\n' +
    '• Ingresa directamente tu número de expediente\n\n' +
    '_Estoy aquí para ayudarte con toda la información de tu servicio._',
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
    '🤖 *Ayuda del Bot de Seguimiento*\n\n' +
    '📌 *¿Cómo funciona?*\n' +
    '1️⃣ Ingresa tu número de expediente\n' +
    '2️⃣ Consulta la información que necesites\n' +
    '3️⃣ Cambia de expediente cuando quieras\n\n' +
    '💡 *Tips:*\n' +
    '• Puedes escribir tu expediente directamente\n' +
    '• Usa los botones para navegar fácilmente\n' +
    '• El bot recuerda tu último expediente\n\n' +
    '*Comandos:*\n' +
    '/start - Reiniciar conversación\n' +
    '/help - Ver esta ayuda';

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  });
}
