import TelegramBot from 'node-telegram-bot-api';
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
 * Envía un mensaje de bienvenida sin teclado persistente
 */
function sendWelcomeMessage(bot: TelegramBot, chatId: number): void {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.sendMessage(
    chatId,
    '👋 *¡Bienvenido al Sistema de Seguimiento de Expedientes!*\n\n' +
    '📝 *Simplemente escribe tu número de expediente* y yo me encargo del resto.\n\n' +
    '💡 *Ejemplos:* ABC123, 12345, EXP-789\n\n' +
    '_¡Es así de fácil! No necesitas presionar botones._',
    {
      parse_mode: 'Markdown',
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
    '1️⃣ Escribe tu número de expediente\n' +
    '2️⃣ El bot carga toda la información automáticamente\n' +
    '3️⃣ Usa "📋 Resumen Completo" para ver todo de una vez\n\n' +
    '💡 *Tips:*\n' +
    '• No necesitas botones, solo escribe el expediente\n' +
    '• La información se carga instantáneamente\n' +
    '• Puedes consultar diferentes expedientes cuando quieras\n\n' +
    '*Comandos:*\n' +
    '/start - Reiniciar conversación\n' +
    '/help - Ver esta ayuda';

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
  });
}
