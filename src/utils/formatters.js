// src/utils/formatters.js
/**
 * Utilidades para formatear datos y mensajes
 */
const dayjs = require('dayjs');

/**
 * Convierte un valor hexadecimal a un nombre de color en español.
 * Si no se encuentra en el mapeo, se devuelve el código hexadecimal.
 * @param {string} hex - Código hexadecimal del color.
 * @returns {string} - Nombre del color o el mismo código si no hay mapeo.
 */
function hexToColorName(hex) {
  if (!hex) return 'N/A';
  // Normalizar a minúsculas para la comparación
  const hexNormalized = hex.toLowerCase();
  
  // Mapeo de los 20 colores más comunes
  const colorMap = {
    "#ffffff": "Blanco",
    "#000000": "Negro",
    "#ff0000": "Rojo",
    "#00ff00": "Verde",
    "#0000ff": "Azul",
    "#ffff00": "Amarillo",
    "#00ffff": "Cian",
    "#ff00ff": "Magenta",
    "#c0c0c0": "Plata",
    "#808080": "Gris",
    "#800000": "Marrón",
    "#808000": "Oliva",
    "#008000": "Verde Oscuro",
    "#800080": "Púrpura",
    "#008080": "Teal",
    "#000080": "Azul Marino",
    "#ffa500": "Naranja",
    "#f5f5dc": "Beige",
    "#a52a2a": "Marrón",
    "#ffc0cb": "Rosa"
  };
  
  return colorMap[hexNormalized] || hex;
}

/**
 * Formatea los detalles generales de un expediente
 * @param {Object} expedienteData - Datos del expediente
 * @returns {string} - Mensaje formateado
 */
function formatDetallesExpediente(expedienteData) {
  return `🔍 *Detalles del Expediente*\n- **Nombre:** ${expedienteData.nombre}\n- **Vehículo:** ${expedienteData.vehiculo}\n- **Estatus:** ${expedienteData.estatus}\n- **Servicio:** ${expedienteData.servicio}\n- **Destino:** ${expedienteData.destino}\n\n📋 *Selecciona una opción para ver más detalles:*`;
}

/**
 * Formatea los datos de costo del servicio
 * @param {Object} cliente - Datos generales del cliente
 * @param {Object} expedienteCosto - Datos de costo
 * @returns {string} - Mensaje formateado
 */
function formatCostoServicio(cliente, expedienteCosto) {
  let mensaje = `💰 *Costo del Servicio*\n`;

  // Si el expediente fue cancelado, solo se muestra el costo total
  if (cliente.estatus === 'Cancelado') {
    mensaje += `- **Costo Total:** $${parseFloat(expedienteCosto.costo).toFixed(2)}\n`;
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
    if (expedienteCosto.casetaACobro > 0) desgloses.push(`- **Caseta de Cobro:** $${parseFloat(expedienteCosto.casetaACobro).toFixed(2)}`);
    if (expedienteCosto.casetaCubierta > 0) desgloses.push(`- **Caseta Cubierta:** $${parseFloat(expedienteCosto.casetaCubierta).toFixed(2)}`);
    if (expedienteCosto.resguardo > 0) desgloses.push(`- **Resguardo:** $${parseFloat(expedienteCosto.resguardo).toFixed(2)}`);
    if (expedienteCosto.maniobras > 0) desgloses.push(`- **Maniobras:** $${parseFloat(expedienteCosto.maniobras).toFixed(2)}`);
    if (expedienteCosto.horaEspera > 0) desgloses.push(`- **Hora de Espera:** $${parseFloat(expedienteCosto.horaEspera).toFixed(2)}`);
    if (expedienteCosto.Parking > 0) desgloses.push(`- **Parking:** $${parseFloat(expedienteCosto.Parking).toFixed(2)}`);
    if (expedienteCosto.Otros > 0) desgloses.push(`- **Otros:** $${parseFloat(expedienteCosto.Otros).toFixed(2)}`);
    if (expedienteCosto.excedente > 0) desgloses.push(`- **Excedente:** $${parseFloat(expedienteCosto.excedente).toFixed(2)}`);

    if (desgloses.length > 0) {
      mensaje += desgloses.join('\n') + '\n';
    }
    mensaje += `- **Costo Total:** $${parseFloat(expedienteCosto.costo).toFixed(2)}`;
  }
  
  return mensaje;
}

/**
 * Formatea los datos de la unidad operativa
 * @param {Object} expedienteUnidad - Datos de la unidad
 * @returns {string} - Mensaje formateado
 */
function formatDatosUnidad(expedienteUnidad) {
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
  
  return `🚚 *Datos de la Unidad o Grúa*
- **Operador:** ${expedienteUnidad.operador || 'N/A'}
- **Tipo de Grúa:** ${tipoGrua}
- **Color:** ${hexToColorName(expedienteUnidad.color)}
- **Número Económico:** ${numeroEconomico}
- **Placas:** ${expedienteUnidad.placas || 'N/A'}`;
}

/**
 * Formatea los datos de ubicación y tiempo restante
 * @param {Object} expedienteUbicacion - Datos de ubicación
 * @returns {string} - Mensaje formateado
 */
function formatUbicacionTiempo(expedienteUbicacion) {
  let urlUbicacion = "";
  let coordsGrua = expedienteUbicacion?.ubicacionGrua?.trim()?.split(",");
  if (coordsGrua != null) {
    urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coordsGrua[0]}%2C${coordsGrua[1]}`;
  }
  
  return `📍 *Ubicación y Tiempo Restante*
- **Ubicación Actual de la Grúa:** ${`[Ver en maps](${coordsGrua != null ? urlUbicacion : ''})` || 'N/A'}
- **Tiempo Restante Estimado:** ${expedienteUbicacion.tiempoRestante || 'N/A'}`;
}

/**
 * Formatea los datos de tiempos
 * @param {Object} expedienteTiempos - Datos de tiempos
 * @returns {string} - Mensaje formateado
 */
function formatTiempos(expedienteTiempos) {
  return `⏰ *Tiempos del Expediente*
- **Contacto:** ${expedienteTiempos.tc ? `${dayjs(expedienteTiempos.tc).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin contacto'}
- **Termino:** ${expedienteTiempos.tt ? `${dayjs(expedienteTiempos.tt).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin término'}`;
}

module.exports = {
  hexToColorName,
  formatDetallesExpediente,
  formatCostoServicio,
  formatDatosUnidad,
  formatUbicacionTiempo,
  formatTiempos
};

// src/utils/validators.js
/**
 * Utilidades para validar datos de entrada
 */

/**
 * Valida si un número de expediente tiene un formato válido
 * @param {string} expediente - Número de expediente a validar
 * @returns {boolean} - true si es válido, false en caso contrario
 */
function isValidExpedienteNumber(expediente) {
  if (!expediente || typeof expediente !== 'string') {
    return false;
  }
  
  // Solo permitir letras, números, espacios y guiones
  return /^[a-zA-Z0-9\s-]*$/.test(expediente);
}

/**
 * Valida si un mensaje de entrada es un comando válido
 * @param {string} mensaje - Mensaje a validar
 * @returns {boolean} - true si es un comando válido, false en caso contrario
 */
function isValidCommand(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') {
    return false;
  }
  
  const comandos = [
    '📊 Seguimiento de Expediente',
    '💰 Costo del Servicio',
    '🚚 Datos de la Unidad o Grúa',
    '📍 Ubicación y Tiempo Restante',
    '🔄 Consultar otro Expediente',
    '⏰ Tiempos',
    '📊 Usar menú tradicional',
    '💬 Volver a modo conversacional'
  ];
  
  return comandos.includes(mensaje);
}

/**
 * Identifica el tipo de consulta basado en un mensaje en lenguaje natural
 * Para ser utilizado en fase posterior con ChatGPT
 * @param {string} mensaje - Mensaje del usuario
 * @returns {string|null} - Tipo de consulta o null si no se identifica
 */
function identifyQueryType(mensaje) {
  // Esta función se implementará en fases posteriores
  // Aquí solo se incluye un esqueleto básico
  
  const lowerMsg = mensaje.toLowerCase();
  
  if (/costo|precio|valor|cobro|pago/i.test(lowerMsg)) {
    return 'costo';
  }
  
  if (/grúa|unidad|operador|chofer|conductor|placas/i.test(lowerMsg)) {
    return 'unidad';
  }
  
  if (/ubicación|ubicacion|donde|dónde|llega|llegada|maps|mapa/i.test(lowerMsg)) {
    return 'ubicacion';
  }
  
  if (/tiempo|hora|horario|cuando|cuándo|contacto|termino|fin/i.test(lowerMsg)) {
    return 'tiempos';
  }
  
  return null;
}

module.exports = {
  isValidExpedienteNumber,
  isValidCommand,
  identifyQueryType
};