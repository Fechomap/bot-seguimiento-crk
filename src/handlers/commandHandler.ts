import type { Bot } from 'grammy';
import type { SessionManager } from '../services/sessionManager.js';

/**
 * Registra los comandos del bot
 */
export function registerCommands(bot: Bot, sessionManager: SessionManager): void {
  // Comando /start para iniciar la conversación
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    sessionManager.init(chatId);
    await ctx.reply('👋 *¡Hola!*\n\n📝 Escribe tu número de expediente', {
      parse_mode: 'Markdown',
    });
  });

  // Comando /help
  bot.command('help', async (ctx) => {
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

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
    });
  });
}
