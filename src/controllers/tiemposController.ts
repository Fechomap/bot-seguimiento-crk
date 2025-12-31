import type { Context } from 'grammy';
import { formatDateTime } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import type { SessionManager } from '../services/sessionManager.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja la acción de consultar tiempos del expediente
 */
export async function handleTiempos(
  ctx: Context,
  expediente: string,
  sessionManager: SessionManager,
  botService: BotService
): Promise<void> {
  const chatId = ctx.chat!.id;
  const usuario = sessionManager.getOrCreate(chatId);

  try {
    const expedienteTiempos = await botService.obtenerExpedienteTiempos(expediente);

    if (!expedienteTiempos) {
      await ctx.reply('❌ No se encontró información de tiempos para este expediente.', {
        reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      });
      return;
    }

    const mensaje = `⏰ *Tiempos del Expediente*
- **Contacto:** ${
      expedienteTiempos.tc ? `${formatDateTime(expedienteTiempos.tc)} ⏳` : 'aún sin contacto'
    }
- **Termino:** ${
      expedienteTiempos.tt ? `${formatDateTime(expedienteTiempos.tt)} ⏳` : 'aún sin término'
    }`;

    await ctx.reply(mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
    });
  } catch (error) {
    console.error('❌ Error al obtener tiempos:', error);
    await ctx.reply(
      '❌ No se pudo obtener información sobre los tiempos. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}
