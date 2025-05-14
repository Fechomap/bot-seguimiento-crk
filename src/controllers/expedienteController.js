// src/controllers/expedienteController.js
import { validateExpedienteNumber, sanitizeInput } from '../utils/validators.js';
import { getSeguimientoKeyboard, getMainMenuKeyboard, removeKeyboard } from '../utils/keyboards.js';

// Importaciones de los controladores específicos
import { handleCostoServicio } from './costoController.js';
import { handleDatosUnidad } from './unidadController.js';
import { handleUbicacionTiempo } from './ubicacionController.js';
import { handleTiempos } from './tiemposController.js';

/**
 * Procesa la solicitud de número de expediente
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {Object} usuario - Estado del usuario
 * @param {string} mensaje - Mensaje recibido
 * @param {BotService} botService - Servicio del bot
 */
export async function processExpedienteRequest(bot, chatId, usuario, mensaje, botService) {
  // Sanitizar y validar entrada
  const expedienteInput = sanitizeInput(mensaje);
  
  if (validateExpedienteNumber(expedienteInput)) {
    const expediente = expedienteInput;
    console.log(`🔍 Buscando expediente: ${expediente}`);

    try {
      // Consulta del expediente a través del servicio
      const expedienteData = await botService.obtenerExpediente(expediente);
      console.log(`📄 Registros encontrados:`, expedienteData);

      if (expedienteData != null) {
        // Guardar datos del expediente en la sesión del usuario
        usuario.datosExpediente = expedienteData;
        usuario.expediente = expediente;
        usuario.etapa = 'menu_seguimiento';

        // Mostrar detalles y menú de opciones
        const detalles = formatExpedienteDetails(expedienteData);
        await bot.sendMessage(chatId, detalles, {
          parse_mode: 'Markdown',
          reply_markup: getSeguimientoKeyboard(expedienteData)
        });
      } else {
        await bot.sendMessage(
          chatId, 
          '❌ Lo siento, el número de expediente no es válido o no se encontró información. Por favor, intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('❌ Error:', error);
      await bot.sendMessage(
        chatId, 
        '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.',
        { reply_markup: getMainMenuKeyboard() }
      );
    }
  } else {
    await bot.sendMessage(
      chatId,
      '⚠️ Por favor, *ingresa un número de expediente válido* (solo letras, números, espacios y guiones).',
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Formatea los detalles del expediente para mostrarlos
 * @param {Object} expedienteData - Datos del expediente
 * @returns {string} - Texto formateado con detalles del expediente
 */
function formatExpedienteDetails(expedienteData) {
  return `🔍 *Detalles del Expediente*\n` +
    `- **Nombre:** ${expedienteData.nombre || 'N/A'}\n` +
    `- **Vehículo:** ${expedienteData.vehiculo || 'N/A'}\n` +
    `- **Estatus:** ${expedienteData.estatus || 'N/A'}\n` +
    `- **Servicio:** ${expedienteData.servicio || 'N/A'}\n` +
    `- **Destino:** ${expedienteData.destino || 'N/A'}\n\n` +
    `📋 *Selecciona una opción para ver más detalles:*`;
}

/**
 * Procesa las acciones de menú seleccionadas
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {Object} usuario - Estado del usuario
 * @param {string} opcion - Opción seleccionada o código de acción
 * @param {BotService} botService - Servicio del bot
 */
export async function processMenuAction(bot, chatId, usuario, opcion, botService) {
  const expediente = usuario.expediente;
  
  if (!expediente) {
    await bot.sendMessage(chatId, '❌ No hay expediente activo. Por favor inicia una nueva consulta.', {
      reply_markup: getMainMenuKeyboard()
    });
    return;
  }

  try {
    switch (opcion) {
      case 'costo_servicio':
        await handleCostoServicio(bot, chatId, expediente, usuario, botService);
        break;
      case 'datos_unidad':
        await handleDatosUnidad(bot, chatId, expediente, usuario, botService);
        break;
      case 'ubicacion_tiempo':
        await handleUbicacionTiempo(bot, chatId, expediente, usuario, botService);
        break;
      case 'tiempos':
        await handleTiempos(bot, chatId, expediente, usuario, botService);
        break;
      case 'otro_expediente':
        usuario.etapa = 'esperando_numero_expediente';
        await bot.sendMessage(
          chatId, 
          '🔄 Por favor, *ingresa el número de otro expediente* para continuar:',
          { 
            parse_mode: 'Markdown',
            reply_markup: removeKeyboard()
          }
        );
        break;
      default:
        await bot.sendMessage(chatId, 'ℹ️ Opción no reconocida. Por favor, selecciona una opción válida.', {
          reply_markup: getSeguimientoKeyboard(usuario.datosExpediente)
        });
        break;
    }
  } catch (error) {
    console.error('❌ Error en processMenuAction:', error);
    await bot.sendMessage(
      chatId, 
      '❌ Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getSeguimientoKeyboard(usuario.datosExpediente) }
    );
  }
}