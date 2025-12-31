import type { Context } from 'grammy';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import type { SessionManager } from '../services/sessionManager.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja la acción de consultar ubicación y tiempo restante
 */
export async function handleUbicacionTiempo(
  ctx: Context,
  expediente: string,
  sessionManager: SessionManager,
  botService: BotService
): Promise<void> {
  const chatId = ctx.chat!.id;
  const usuario = sessionManager.getOrCreate(chatId);

  try {
    const expedienteUbicacion = await botService.obtenerExpedienteUbicacion(expediente);

    if (!expedienteUbicacion) {
      await ctx.reply('❌ No se encontró información de ubicación para este expediente.', {
        reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      });
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

    await ctx.reply(mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
      link_preview_options: { is_disabled: false },
    });
  } catch (error) {
    console.error('❌ Error al obtener ubicación:', error);
    await ctx.reply(
      '❌ No se pudo obtener información sobre la ubicación. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}
