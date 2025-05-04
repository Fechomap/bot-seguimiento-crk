/**
 * Constructor de contexto para ChatGPT
 * Convierte los datos de expedientes en formato JSON a un contexto estructurado
 * para ser utilizado en las consultas a la API de OpenAI
 */
const dayjs = require('dayjs');

/**
 * Construye un contexto estructurado para consultas sobre expedientes
 * @param {Object} expedienteData - Datos completos del expediente
 * @returns {string} - Contexto estructurado en formato de texto
 */
function buildExpedienteContext(expedienteData) {
  // Verificar si tenemos datos válidos
  if (!expedienteData) {
    return 'No hay datos disponibles para este expediente.';
  }

  // Formatear el contexto en un formato estructurado y fácil de leer para la IA
  let context = `
INFORMACIÓN DEL EXPEDIENTE #${expedienteData.expediente || 'N/A'}

---DATOS GENERALES---
Nombre del cliente: ${expedienteData.nombre || 'No disponible'}
Vehículo: ${expedienteData.vehiculo || 'No disponible'}
Estatus actual: ${expedienteData.estatus || 'No disponible'}
Tipo de servicio: ${expedienteData.servicio || 'No disponible'}
Destino: ${expedienteData.destino || 'No disponible'}
`;

  // Añadir datos de costo si están disponibles
  if (expedienteData.costo) {
    const costo = expedienteData.costo;
    context += `
---COSTOS---
Costo total: ${formatCurrency(costo.total)}
Kilómetros: ${costo.km || 'No disponible'}
${costo.plano ? `Plano: ${costo.plano}` : ''}
${costo.banderazo ? `Banderazo: ${costo.banderazo}` : ''}
${costo.costoKm ? `Costo por Km: ${costo.costoKm}` : ''}
`;

    // Añadir costos adicionales si existen
    const costosAdicionales = [];
    
    if (parseFloat(costo.casetaACobro) > 0) costosAdicionales.push(`Caseta de cobro: ${formatCurrency(costo.casetaACobro)}`);
    if (parseFloat(costo.casetaCubierta) > 0) costosAdicionales.push(`Caseta cubierta: ${formatCurrency(costo.casetaCubierta)}`);
    if (parseFloat(costo.resguardo) > 0) costosAdicionales.push(`Resguardo: ${formatCurrency(costo.resguardo)}`);
    if (parseFloat(costo.maniobras) > 0) costosAdicionales.push(`Maniobras: ${formatCurrency(costo.maniobras)}`);
    if (parseFloat(costo.horaEspera) > 0) costosAdicionales.push(`Hora de espera: ${formatCurrency(costo.horaEspera)}`);
    if (parseFloat(costo.Parking) > 0) costosAdicionales.push(`Parking: ${formatCurrency(costo.Parking)}`);
    if (parseFloat(costo.Otros) > 0) costosAdicionales.push(`Otros: ${formatCurrency(costo.Otros)}`);
    if (parseFloat(costo.excedente) > 0) costosAdicionales.push(`Excedente: ${formatCurrency(costo.excedente)}`);
    
    if (costosAdicionales.length > 0) {
      context += `
---COSTOS ADICIONALES---
${costosAdicionales.join('\n')}
`;
    }
  }

  // Añadir datos de la unidad si están disponibles
  if (expedienteData.unidad) {
    const unidad = expedienteData.unidad;
    
    // Extraer número económico de unidadOperativa si está en formato "7 Plataforma Tipo A"
    let numeroEconomico = unidad.numeroEconomico || '';
    let tipoGrua = unidad.tipoGrua || 'No disponible';
    
    if (!numeroEconomico && unidad.unidadOperativa) {
      const match = unidad.unidadOperativa.match(/^(\d+)\s*(.*)$/);
      if (match) {
        numeroEconomico = match[1];
        if (match[2].trim().length > 0 && !unidad.tipoGrua) {
          tipoGrua = match[2].trim();
        }
      } else {
        numeroEconomico = unidad.unidadOperativa;
      }
    }
    
    context += `
---DATOS DE LA UNIDAD---
Operador: ${unidad.operador || 'No disponible'}
Tipo de grúa: ${tipoGrua}
Número económico: ${numeroEconomico || 'No disponible'}
Color: ${unidad.color || 'No disponible'}
Placas: ${unidad.placas || 'No disponible'}
`;
  }

  // Añadir datos de ubicación si están disponibles
  if (expedienteData.ubicacion) {
    const ubicacion = expedienteData.ubicacion;
    
    // Generar URL de Google Maps si hay coordenadas disponibles
    let urlMaps = '';
    if (ubicacion.ubicacionGrua) {
      const coordsGrua = ubicacion.ubicacionGrua.trim().split(',');
      if (coordsGrua.length === 2) {
        urlMaps = `https://www.google.com/maps/search/?api=1&query=${coordsGrua[0]}%2C${coordsGrua[1]}`;
      }
    }
    
    context += `
---UBICACIÓN Y TIEMPO---
${ubicacion.ubicacionGrua ? `Coordenadas: ${ubicacion.ubicacionGrua}` : 'Ubicación no disponible'}
${urlMaps ? `URL de Google Maps: ${urlMaps}` : ''}
Tiempo restante estimado: ${ubicacion.tiempoRestante || 'No disponible'}
`;
  }

  // Añadir datos de tiempos si están disponibles
  if (expedienteData.tiempos) {
    const tiempos = expedienteData.tiempos;
    context += `
---TIEMPOS---
Tiempo de contacto: ${tiempos.tc ? formatDateTime(tiempos.tc) : 'Aún sin contacto'}
Tiempo de término: ${tiempos.tt ? formatDateTime(tiempos.tt) : 'Aún sin término'}
`;
  }

  return context;
}

/**
 * Construye un contexto resumido para detección de intenciones
 * @param {Object} expedienteData - Datos del expediente
 * @returns {string} - Contexto resumido
 */
function buildIntentContext(expedienteData) {
  if (!expedienteData) {
    return 'Sin datos de expediente.';
  }
  
  let expedienteInfo = `Expediente #${expedienteData.expediente || 'N/A'} - `;
  expedienteInfo += `Cliente: ${expedienteData.nombre || 'N/A'} - `;
  expedienteInfo += `Vehículo: ${expedienteData.vehiculo || 'N/A'} - `;
  expedienteInfo += `Estatus: ${expedienteData.estatus || 'N/A'} - `;
  expedienteInfo += `Servicio: ${expedienteData.servicio || 'N/A'}`;
  
  return expedienteInfo;
}

/**
 * Formatea un valor monetario
 * @param {number|string} value - Valor a formatear
 * @returns {string} - Valor formateado como moneda
 * @private
 */
function formatCurrency(value) {
  if (!value) return '$0.00';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '$0.00';
  
  return `$${numValue.toFixed(2)}`;
}

/**
 * Formatea una fecha/hora
 * @param {string|Date} datetime - Fecha/hora a formatear
 * @returns {string} - Fecha/hora formateada
 * @private
 */
function formatDateTime(datetime) {
  if (!datetime) return 'N/A';
  
  try {
    return dayjs(datetime).format('DD/MM/YY HH:mm');
  } catch (error) {
    return datetime.toString();
  }
}

module.exports = {
  buildExpedienteContext,
  buildIntentContext
};