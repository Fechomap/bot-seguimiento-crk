/**
 * Configuración centralizada para APIs y servicios externos
 * Proporciona ajustes, timeouts y parámetros de retry para las distintas APIs
 */

// Cargar variables de entorno
const API_BASE_URL = process.env.API_BASE_URL;
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);
const API_RETRY_ATTEMPTS = parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10);
const API_RETRY_DELAY = parseInt(process.env.API_RETRY_DELAY || '2000', 10);
const API_CIRCUIT_TIMEOUT = parseInt(process.env.API_CIRCUIT_TIMEOUT || '30000', 10);

// Validar configuración
if (!API_BASE_URL) {
  console.error('❌ Error: API_BASE_URL no está configurado en las variables de entorno');
}

/**
 * Configuración global para todas las APIs
 */
const globalConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Ignora errores de certificados (solo para desarrollo)
  rejectUnauthorized: process.env.NODE_ENV === 'production'
};

/**
 * Configuración específica para la API principal del sistema
 */
const mainApiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  retry: {
    attempts: API_RETRY_ATTEMPTS,
    delay: API_RETRY_DELAY,
    // Códigos de error que provocan reintentos
    statusCodes: [408, 429, 500, 502, 503, 504],
    // Errores de red que provocan reintentos
    networkErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']
  },
  circuitBreaker: {
    // Tiempo de espera antes de permitir nuevas peticiones tras fallos consecutivos
    timeout: API_CIRCUIT_TIMEOUT,
    // Número de fallos consecutivos para abrir el circuit breaker
    threshold: 5,
    // Porcentaje de peticiones permitidas durante estado semi-abierto
    semiOpenRate: 0.1
  },
  endpoints: {
    expediente: '/api/ConsultaExterna/ObtenerExpedienteBot',
    costo: '/api/ConsultaExterna/ObtenerExpedienteCostoBot',
    unidad: '/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot',
    ubicacion: '/api/ConsultaExterna/ObtenerExpedienteUbicacionBot',
    tiempos: '/api/ConsultaExterna/ObtenerExpedienteTiemposBot'
  },
  // Prioridad de datos para actualización (menor número = más prioritario)
  dataPriority: {
    costo: 1,
    ubicacion: 2,
    tiempos: 3,
    unidad: 4
  }
};

/**
 * Determina los endpoints a consultar según el estatus del expediente y otras condiciones
 * @param {Object} expedienteData - Datos básicos del expediente
 * @returns {Array<string>} - Lista de tipos de datos a consultar (costo, ubicacion, etc.)
 */
function getEndpointsForStatus(expedienteData) {
  // Por defecto, consultar todos los endpoints
  const allEndpoints = ['costo', 'unidad', 'ubicacion', 'tiempos'];
  
  if (!expedienteData) return allEndpoints;
  
  const { estatus } = expedienteData;
  
  // Expedientes cancelados no necesitan datos de ubicación
  if (estatus === 'Cancelado' || estatus === 'Finalizado') {
    return ['costo', 'unidad', 'tiempos'];
  }
  
  // Expedientes en proceso requieren datos de ubicación actualizados
  if (estatus === 'A Contactar' || estatus === 'En Proceso') {
    // Configurar prioridad para ubicación
    return ['ubicacion', 'costo', 'unidad', 'tiempos'];
  }
  
  return allEndpoints;
}

/**
 * Determina el tiempo de expiración de caché según el tipo de datos y estatus
 * @param {string} dataType - Tipo de datos (costo, ubicacion, etc.)
 * @param {Object} expedienteData - Datos básicos del expediente
 * @returns {number} - Tiempo de expiración en segundos
 */
function getCacheExpiryTime(dataType, expedienteData) {
  const baseExpiry = parseInt(process.env.CACHE_EXPIRY || '3600', 10);
  
  if (!expedienteData) return baseExpiry;
  
  const { estatus } = expedienteData;
  
  // Datos de ubicación expiran más rápido para expedientes en proceso
  if (dataType === 'ubicacion' && (estatus === 'A Contactar' || estatus === 'En Proceso')) {
    return Math.min(baseExpiry, 300); // 5 minutos como máximo
  }
  
  // Datos de tiempo expiran rápido para expedientes en proceso
  if (dataType === 'tiempos' && (estatus === 'A Contactar' || estatus === 'En Proceso')) {
    return Math.min(baseExpiry, 600); // 10 minutos como máximo
  }
  
  // Datos de costo son más estables
  if (dataType === 'costo') {
    return baseExpiry;
  }
  
  // Datos de unidad son relativamente estables
  if (dataType === 'unidad') {
    return baseExpiry;
  }
  
  return baseExpiry;
}

module.exports = {
  globalConfig,
  mainApiConfig,
  getEndpointsForStatus,
  getCacheExpiryTime
};