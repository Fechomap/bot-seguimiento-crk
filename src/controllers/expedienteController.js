import dayjs from 'dayjs';
import { formatCurrency, formatDateTime, hexToColorName } from '../utils/formatters.js';
import { validateExpedienteNumber, sanitizeInput } from '../utils/validators.js';
import { getSeguimientoKeyboard, getBackToMenuKeyboard, getMainMenuKeyboard, removeKeyboard } from '../utils/keyboards.js';

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
        { reply_markup: getBackToMenuKeyboard() }
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
      case 'volver_menu':
        // Mostrar nuevamente el menú de seguimiento con las opciones
        if (usuario.datosExpediente) {
          const detalles = formatExpedienteDetails(usuario.datosExpediente);
          await bot.sendMessage(chatId, detalles, {
            parse_mode: 'Markdown',
            reply_markup: getSeguimientoKeyboard(usuario.datosExpediente)
          });
        } else {
          await bot.sendMessage(
            chatId, 
            '🔄 Por favor, *ingresa el número de expediente* para continuar:',
            { 
              parse_mode: 'Markdown',
              reply_markup: removeKeyboard()
            }
          );
          usuario.etapa = 'esperando_numero_expediente';
        }
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
      { reply_markup: getBackToMenuKeyboard() }
    );
  }
}

/**
 * Maneja la acción de consultar costo del servicio
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
async function handleCostoServicio(bot, chatId, expediente, usuario, botService) {
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
      reply_markup: getBackToMenuKeyboard()
    });
  } catch (error) {
    console.error('❌ Error al obtener costo:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre el costo del servicio. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getBackToMenuKeyboard() }
    );
  }
}

/**
 * Maneja la acción de consultar datos de la unidad
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
async function handleDatosUnidad(bot, chatId, expediente, usuario, botService) {
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
      reply_markup: getBackToMenuKeyboard()
    });
  } catch (error) {
    console.error('❌ Error al obtener datos de unidad:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre la unidad. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getBackToMenuKeyboard() }
    );
  }
}

/**
 * Maneja la acción de consultar ubicación y tiempo restante
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
async function handleUbicacionTiempo(bot, chatId, expediente, usuario, botService) {
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
      reply_markup: getBackToMenuKeyboard(),
      disable_web_page_preview: false // Permitir vista previa para el enlace
    });
  } catch (error) {
    console.error('❌ Error al obtener ubicación:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre la ubicación. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getBackToMenuKeyboard() }
    );
  }
}

/**
 * Maneja la acción de consultar tiempos del expediente
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 * @param {string} expediente - Número de expediente
 * @param {Object} usuario - Estado del usuario
 * @param {BotService} botService - Servicio del bot
 */
async function handleTiempos(bot, chatId, expediente, usuario, botService) {
  try {
    const expedienteTiempos = await botService.obtenerExpedienteTiempos(expediente);
    
    const mensaje = `⏰ *Tiempos del Expediente*
- **Contacto:** ${expedienteTiempos.tc ? formatDateTime(expedienteTiempos.tc) + ' ⏳' : 'aún sin contacto'}
- **Termino:** ${expedienteTiempos.tt ? formatDateTime(expedienteTiempos.tt) + ' ⏳' : 'aún sin término'}`;

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: getBackToMenuKeyboard()
    });
  } catch (error) {
    console.error('❌ Error al obtener tiempos:', error);
    await bot.sendMessage(
      chatId,
      '❌ No se pudo obtener información sobre los tiempos. Por favor, intenta nuevamente más tarde.',
      { reply_markup: getBackToMenuKeyboard() }
    );
  }
}