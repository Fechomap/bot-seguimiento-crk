// src/controllers/costoController.js
import { formatCurrency } from '../utils/formatters.js';
import { getSeguimientoKeyboard } from '../utils/keyboards.js';

/**
 * Maneja la acción de consultar costo del servicio
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
export async function handleCostoServicio(bot, chatId, expediente, usuario, botService) {
  const cliente = usuario.datosExpediente;
  
  try {
    const expedienteCosto = await botService.obtenerExpedienteCosto(expediente);
    let mensaje = `💰 *Costo del Servicio*\n`;

    // Si el expediente fue cancelado, solo se muestra el costo total
    if (cliente.estatus === 'Cancelado') {
      mensaje += `- **Costo Total:** ${formatCurrency(expedienteCosto.costo)}\n`;
    } else {
      // Servicio Local: agregar coma en desglose
      if (cliente.servicio === 'Local') {
        mensaje += `- **Desglose:** ${expedienteCosto.km} km, plano ${expedienteCosto.plano}\n`;
      }
      // Servicio Carretero: agregar coma y formatear la línea de desglose
      else if (cliente.servicio === 'Carretero') {
        let recorridoInfo = `${expedienteCosto.km} km, `;
        if (expedienteCosto.banderazo && expedienteCosto.banderazo !== 'N/A') {
          recorridoInfo += `banderazo ${expedienteCosto.banderazo} `;
        }
        if (expedienteCosto.costoKm && expedienteCosto.costoKm !== 'N/A') {
          recorridoInfo += `costo Km ${expedienteCosto.costoKm}`;
        }
        mensaje += `- **Desglose:** ${recorridoInfo.trim()}\n`;
      }
      // Otros servicios
      else {
        mensaje += `- **Desglose:** ${expedienteCosto.km} km, plano ${expedienteCosto.plano}\n`;
      }
      
      // Desgloses adicionales (formateados con dos decimales)
      const desgloses = [];
      if (expedienteCosto.casetaACobro > 0) desgloses.push(`- **Caseta de Cobro:** ${formatCurrency(expedienteCosto.casetaACobro)}`);
      if (expedienteCosto.casetaCubierta > 0) desgloses.push(`- **Caseta Cubierta:** ${formatCurrency(expedienteCosto.casetaCubierta)}`);
      if (expedienteCosto.resguardo > 0) desgloses.push(`- **Resguardo:** ${formatCurrency(expedienteCosto.resguardo)}`);
      if (expedienteCosto.maniobras > 0) desgloses.push(`- **Maniobras:** ${formatCurrency(expedienteCosto.maniobras)}`);
      if (expedienteCosto.horaEspera > 0) desgloses.push(`- **Hora de Espera:** ${formatCurrency(expedienteCosto.horaEspera)}`);
      if (expedienteCosto.Parking > 0) desgloses.push(`- **Parking:** ${formatCurrency(expedienteCosto.Parking)}`);
      if (expedienteCosto.Otros > 0) desgloses.push(`- **Otros:** ${formatCurrency(expedienteCosto.Otros)}`);
      if (expedienteCosto.excedente > 0) desgloses.push(`- **Excedente:** ${formatCurrency(expedienteCosto.excedente)}`);

      if (desgloses.length > 0) {
        mensaje += desgloses.join('\n') + '\n';
      }
      mensaje += `- **Costo Total:** ${formatCurrency(expedienteCosto.costo)}`;
    }

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getSeguimientoKeyboard(usuario.datosExpediente)
    });
  } catch (error) {
    console.error('❌ Error al obtener costo:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre el costo del servicio. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}