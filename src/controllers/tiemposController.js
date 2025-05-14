// src/controllers/tiemposController.js
import { formatDateTime } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';

/**
 * Maneja la acción de consultar tiempos del expediente
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
export async function handleTiempos(bot, chatId, expediente, usuario, botService) {
  try {
    const expedienteTiempos = await botService.obtenerExpedienteTiempos(expediente);
    
    const mensaje = `⏰ *Tiempos del Expediente*
- **Contacto:** ${expedienteTiempos.tc ? formatDateTime(expedienteTiempos.tc) + ' ⏳' : 'aún sin contacto'}
- **Termino:** ${expedienteTiempos.tt ? formatDateTime(expedienteTiempos.tt) + ' ⏳' : 'aún sin término'}`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente)
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