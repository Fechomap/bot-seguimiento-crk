// src/controllers/ubicacionController.js
import { getSeguimientoKeyboard } from '../utils/keyboards.js';

/**
 * Maneja la acción de consultar ubicación y tiempo restante
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
export async function handleUbicacionTiempo(bot, chatId, expediente, usuario, botService) {
  try {
    const expedienteUbicacion = await botService.obtenerExpedienteUbicacion(expediente);
    let urlUbicacion = "";
    let coordsGrua = expedienteUbicacion?.ubicacionGrua?.trim()?.split(",");
    
    if (coordsGrua && coordsGrua.length === 2) {
      urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coordsGrua[0]}%2C${coordsGrua[1]}`;
    }
    
    const mensaje = `📍 *Ubicación y Tiempo Restante*
- **Ubicación Actual de la Grúa:** ${coordsGrua ? `[Ver en Maps](${urlUbicacion})` : 'N/A'}
- **Tiempo Restante Estimado:** ${expedienteUbicacion.tiempoRestante || 'N/A'}`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      disable_web_page_preview: false // Permitir vista previa para el enlace
    });
  } catch (error) {
    console.error('❌ Error al obtener ubicación:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre la ubicación. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}