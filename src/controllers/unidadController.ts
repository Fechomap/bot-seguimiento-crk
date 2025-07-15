import TelegramBot from 'node-telegram-bot-api';
import { hexToColorName } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';
import type { Usuario } from '../types/index.js';
import type { BotService } from '../services/botService.js';

/**
 * Maneja la acción de consultar datos de la unidad
 */
export async function handleDatosUnidad(
  bot: TelegramBot,
  chatId: number,
  expediente: string,
  usuario: Usuario,
  botService: BotService
): Promise<void> {
  try {
    const expedienteUnidad = await botService.obtenerExpedienteUnidadOp(expediente);

    if (!expedienteUnidad) {
      await bot.sendMessage(
        chatId,
        '❌ No se encontró información de la unidad para este expediente.',
        { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
      );
      return;
    }

    // Extraer el número económico y el tipo de grúa desde 'unidadOperativa'
    const unidadOperativa = expedienteUnidad.unidadOperativa || '';
    let numeroEconomico = unidadOperativa;
    let tipoGrua = expedienteUnidad.tipoGrua || 'N/A';

    // Suponemos que 'unidadOperativa' tiene el formato "7 Plataforma Tipo A"
    const match = unidadOperativa.match(/^(\d+)\s*(.*)$/);
    if (match) {
      numeroEconomico = match[1] || numeroEconomico; // Solo el número
      const tipoMatch = match[2];
      if (tipoMatch && tipoMatch.trim().length > 0) {
        // El tipo de grúa se tomará del texto adicional
        tipoGrua = tipoMatch.trim();
      }
    }

    const mensaje = `🚚 *Datos de la Unidad o Grúa*
- **Operador:** ${expedienteUnidad.operador || 'N/A'}
- **Tipo de Grúa:** ${tipoGrua}
- **Color:** ${hexToColorName(expedienteUnidad.color)}
- **Número Económico:** ${numeroEconomico}
- **Placas:** ${expedienteUnidad.placas || 'N/A'}`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente),
    });
  } catch (error) {
    console.error('❌ Error al obtener datos de unidad:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre la unidad. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}
