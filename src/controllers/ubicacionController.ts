import TelegramBot from 'node-telegram-bot-api';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import type { Usuario } from '../types/index.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja la acción de consultar ubicación y tiempo restante
 */
export async function handleUbicacionTiempo(
  bot: TelegramBot,
  chatId: number,
  expediente: string,
  usuario: Usuario,
  botService: BotService
): Promise<void> {
  try {
    const expedienteUbicacion = await botService.obtenerExpedienteUbicacion(expediente);

    if (!expedienteUbicacion) {
      await bot.sendMessage(
        chatId,
        '❌ No se encontró información de ubicación para este expediente.',
        { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
      );
      return;
    }

    let urlUbicacion = '';
    const coordsGrua = expedienteUbicacion.ubicacionGrua?.trim()?.split(',');

    if (coordsGrua && coordsGrua.length === 2) {
      const [lat, lng] = coordsGrua;
      urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
    }

    const mensaje = `📍 *Ubicación y Tiempo Restante*
- **Ubicación Actual de la Grúa:** ${coordsGrua ? `[Ver en Maps](${urlUbicacion})` : 'N/A'}
- **Tiempo Restante Estimado:** ${expedienteUbicacion.tiempoRestante || 'N/A'}`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      disable_web_page_preview: false, // Permitir vista previa para el enlace
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
