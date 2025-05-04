/**
 * Configuración centralizada del sistema de caché
 * Define políticas, estrategias y ajustes para los distintos tipos de caché
 */

// Cargar configuraciones desde variables de entorno
const DEFAULT_EXPIRY = parseInt(process.env.CACHE_EXPIRY || '3600', 10); // En segundos
const MAX_ITEMS = parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10);
const CLEANUP_INTERVAL = parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300', 10); // En segundos

/**
 * Políticas de caché para diferentes tipos de datos
 */
const cachePolicies = {
  // Caché para expedientes completos
  expediente: {
    defaultExpiry: DEFAULT_EXPIRY,
    maxItems: MAX_ITEMS,
    cleanupInterval: CLEANUP_INTERVAL,
    // Estrategia de reemplazo: Least Recently Used (LRU)
    replacementStrategy: 'lru',
    // Tiempo máximo antes de forzar refresco completo
    maxAge: 86400, // 24 horas
    // Política según tipo de datos
    typeSpecific: {
      costo: {
        expiry: DEFAULT_EXPIRY,
        priority: 2 // Prioridad de actualización (mayor = más prioritario)
      },
      unidad: {
        expiry: DEFAULT_EXPIRY,
        priority: 1
      },
      ubicacion: {
        expiry: 300, // 5 minutos
        priority: 4
      },
      tiempos: {
        expiry: 600, // 10 minutos
        priority: 3
      }
    }
  },
  
  // Caché para respuestas de ChatGPT
  chatgpt: {
    defaultExpiry: 86400, // 24 horas
    maxItems: 500,
    cleanupInterval: CLEANUP_INTERVAL,
    replacementStrategy: 'lru',
    // Umbral de similitud para reutilizar respuestas (0-1)
    similarityThreshold: 0.85
  },
  
  // Caché para detección de intenciones
  intents: {
    defaultExpiry: 604800, // 7 días
    maxItems: 200,
    cleanupInterval: CLEANUP_INTERVAL,
    replacementStrategy: 'lru'
  }
};

/**
 * Determina si un tipo de datos debe actualizarse basado en su edad
 * y el estatus del expediente
 * @param {string} dataType - Tipo de datos (costo, ubicacion, etc.)
 * @param {number} ageInSeconds - Edad de los datos en caché en segundos
 * @param {Object} expedienteData - Datos básicos del expediente
 * @returns {boolean} - true si debe actualizarse
 */
function shouldUpdate(dataType, ageInSeconds, expedienteData) {
  if (!expedienteData) return true;
  
  const { estatus } = expedienteData;
  const policy = cachePolicies.expediente.typeSpecific[dataType] || { expiry: DEFAULT_EXPIRY };
  
  // Determinar tiempo de expiración según estatus
  let expiryTime = policy.expiry;
  
  // Expedientes finalizados o cancelados tienen caché más duradera
  if (estatus === 'Finalizado' || estatus === 'Cancelado') {
    expiryTime = Math.max(expiryTime, DEFAULT_EXPIRY);
  }
  
  // Expedientes en proceso tienen caché menos duradera para ubicación y tiempos
  if ((estatus === 'A Contactar' || estatus === 'En Proceso') && 
      (dataType === 'ubicacion' || dataType === 'tiempos')) {
    expiryTime = Math.min(expiryTime, dataType === 'ubicacion' ? 300 : 600);
  }
  
  return ageInSeconds >= expiryTime;
}

/**
 * Determina la prioridad de actualización para los diferentes tipos de datos
 * basado en el estatus del expediente
 * @param {Object} expedienteData - Datos básicos del expediente
 * @returns {Array<string>} - Lista ordenada de tipos de datos por prioridad
 */
function getUpdatePriorities(expedienteData) {
  if (!expedienteData) {
    // Prioridad por defecto
    return ['ubicacion', 'tiempos', 'costo', 'unidad'];
  }
  
  const { estatus } = expedienteData;
  
  // Para expedientes en proceso, priorizar ubicación y tiempos
  if (estatus === 'A Contactar' || estatus === 'En Proceso') {
    return ['ubicacion', 'tiempos', 'costo', 'unidad'];
  }
  
  // Para expedientes finalizados o cancelados, priorizar costo
  if (estatus === 'Finalizado' || estatus === 'Cancelado') {
    return ['costo', 'unidad', 'tiempos', 'ubicacion'];
  }
  
  // Prioridad por defecto
  return ['ubicacion', 'tiempos', 'costo', 'unidad'];
}

/**
 * Genera una clave de caché basada en los parámetros
 * @param {string} prefix - Prefijo para el tipo de caché
 * @param {string|Object} identifier - Identificador principal
 * @param {string} [subType] - Subtipo o categoría opcional
 * @returns {string} - Clave de caché
 */
function generateCacheKey(prefix, identifier, subType = null) {
  if (typeof identifier === 'object') {
    // Si es un objeto, crear un hash basado en su contenido
    // Filtrar propiedades innecesarias para la caché
    const relevantData = { ...identifier };
    delete relevantData.timestamp;
    delete relevantData.id;
    delete relevantData._id;
    
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(relevantData))
      .digest('hex');
    
    return `${prefix}:${hash}${subType ? `:${subType}` : ''}`;
  }
  
  return `${prefix}:${identifier}${subType ? `:${subType}` : ''}`;
}

/**
 * Serializa datos para almacenamiento en caché
 * @param {any} data - Datos a serializar
 * @returns {string} - Datos serializados
 */
function serializeForCache(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('❌ Error al serializar datos para caché:', error);
    return null;
  }
}

/**
 * Deserializa datos desde la caché
 * @param {string} serializedData - Datos serializados
 * @returns {any} - Datos deserializados
 */
function deserializeFromCache(serializedData) {
  try {
    return JSON.parse(serializedData);
  } catch (error) {
    console.error('❌ Error al deserializar datos de caché:', error);
    return null;
  }
}

module.exports = {
  cachePolicies,
  shouldUpdate,
  getUpdatePriorities,
  generateCacheKey,
  serializeForCache,
  deserializeFromCache
};