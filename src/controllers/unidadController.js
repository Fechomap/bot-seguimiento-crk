// src/controllers/unidadController.js
import { hexToColorName } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';

/**
 * Maneja la acción de consultar datos de la unidad
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
export async function handleDatosUnidad(bot, chatId, expediente, usuario, botService) {
  try {
    const expedienteUnidad = await botService.obtenerExpedienteUnidadOp(expediente);
    
    // Extraer el número económico y el tipo de grúa desde 'unidadOperativa'
    const unidadOperativa = expedienteUnidad.unidadOperativa || '';
    let numeroEconomico = unidadOperativa;
    let tipoGrua = expedienteUnidad.tipoGrua || 'N/A';
    
    // Suponemos que 'unidadOperativa' tiene el formato "7 Plataforma Tipo A"
    const match = unidadOperativa.match(/^(\d+)\s*(.*)$/);
    if (match) {
      numeroEconomico = match[1]; // Solo el número
      if (match[2].trim().length > 0) {
        // El tipo de grúa se tomará del texto adicional
        tipoGrua = match[2].trim();
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
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente)
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