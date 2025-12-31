import type { Bot, Context } from 'grammy';
import {
  processExpedienteRequest,
  processMenuAction,
} from '../controllers/expedienteController.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import { getStatusColor } from '../utils/formatters.js';
import type { SessionManager } from '../services/sessionManager.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja las opciones del menú seleccionadas por texto
 */
async function handleMenuOption(
  ctx: Context,
  sessionManager: SessionManager,
  mensaje: string,
  botService: BotService
): Promise<void> {
  const chatId = ctx.chat!.id;
  const usuario = sessionManager.getOrCreate(chatId);

  switch (mensaje) {
    case '💰 Costo Total':
      await processMenuAction(ctx, sessionManager, 'costo_servicio', botService);
      break;

    case '🚚 Unidad':
      await processMenuAction(ctx, sessionManager, 'datos_unidad', botService);
      break;

    case '📍 Ubicación':
      await processMenuAction(ctx, sessionManager, 'ubicacion_tiempo', botService);
      break;

    case '⏰ Tiempos':
      await processMenuAction(ctx, sessionManager, 'tiempos', botService);
      break;

    case '📊 Estado': {
      const statusColor = getStatusColor(usuario.datosExpediente?.estatus);

      await ctx.reply(
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
      await ctx.reply('ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.', {
        reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      });
      break;
  }
}

/**
 * Registra los manejadores de mensajes
 */
export function registerMessageHandlers(
  bot: Bot,
  sessionManager: SessionManager,
  botService: BotService
): void {
  // Manejo de mensajes de texto (excluye comandos)
  bot.on('message:text', async (ctx) => {
    const mensaje = ctx.message.text.trim();

    // Ignorar comandos (ya manejados por bot.command)
    if (mensaje.startsWith('/')) return;

    const chatId = ctx.chat.id;
    console.info('ℹ️ Mensaje recibido:', mensaje);

    const usuario = sessionManager.getOrCreate(chatId);

    // Detectar si el usuario ingresó directamente un número de expediente
    const posibleExpediente = mensaje.match(/^[a-zA-Z0-9\s-]+$/);

    // En función de la etapa en que se encuentre el usuario
    switch (usuario.etapa) {
      case 'initial':
        // Si parece un expediente, procesarlo directamente
        if (posibleExpediente && mensaje.length >= 3) {
          await processExpedienteRequest(ctx, sessionManager, mensaje, botService);
        } else {
          await ctx.reply(
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
        await processExpedienteRequest(ctx, sessionManager, mensaje, botService);
        break;

      case 'menu_seguimiento':
        // Si parece un expediente, resetear y consultar nuevo expediente
        if (posibleExpediente && mensaje.length >= 3) {
          sessionManager.setEtapa(chatId, 'initial');
          await processExpedienteRequest(ctx, sessionManager, mensaje, botService);
        } else {
          await handleMenuOption(ctx, sessionManager, mensaje, botService);
        }
        break;

      default:
        await ctx.reply(
          'ℹ️ No entendí tu respuesta. Por favor, selecciona una opción del menú o escribe "/start" para reiniciar.'
        );
        break;
    }
  });

  // Manejo de errores del bot
  bot.catch((err) => {
    console.error('❌ Error en el bot:', err);
  });
}
