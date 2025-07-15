import TelegramBot from 'node-telegram-bot-api';
import { formatDateTime } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import type { Usuario } from '../types/index.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja la acción de consultar tiempos del expediente
 */
export async function handleTiempos(
  bot: TelegramBot,
  chatId: number,
  expediente: string,
  usuario: Usuario,
  botService: BotService
): Promise<void> {
  try {
    const expedienteTiempos = await botService.obtenerExpedienteTiempos(expediente);

    if (!expedienteTiempos) {
      await bot.sendMessage(
        chatId,
        '❌ No se encontró información de tiempos para este expediente.',
        { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
      );
      return;
    }

    const mensaje = `⏰ *Tiempos del Expediente*
- **Contacto:** ${
      expedienteTiempos.tc ? `${formatDateTime(expedienteTiempos.tc)} ⏳` : 'aún sin contacto'
    }
- **Termino:** ${
      expedienteTiempos.tt ? `${formatDateTime(expedienteTiempos.tt)} ⏳` : 'aún sin término'
    }`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
    });
  } catch (error) {
    console.error('❌ Error al obtener tiempos:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre los tiempos. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}
