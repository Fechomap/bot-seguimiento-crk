/**
 * Servicio de caché avanzado
 * Proporciona funcionalidades para almacenamiento y recuperación de datos en caché
 * con soporte para diferentes políticas de expiración y estrategias de reemplazo
 */
const crypto = require('crypto');
const cacheConfig = require('../config/cacheConfig');
const logger = require('../utils/logger').createLogger('cacheService');

class CacheService {
  constructor() {
    // Mapa de almacenamiento para diferentes cachés
    this.caches = {
      expediente: new Map(),
      chatgpt: new Map(),
      intents: new Map()
    };
    
    // Estadísticas de uso
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      lastCleanup: Date.now()
    };
    
    // Iniciar limpieza automática
    this.initCleanupScheduler();
  }

  /**
   * Obtiene un valor de la caché
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @param {string} key - Clave de búsqueda
   * @returns {any|null} - Valor almacenado o null si no existe o expiró
   */
  get(cacheType, key) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      logger.warn(`Intentando acceder a un tipo de caché no definido: ${cacheType}`);
      return null;
    }
    
    const cacheKey = this.normalizeKey(key);
    const cache = this.caches[cacheType];
    const entry = cache.get(cacheKey);
    
    // Si no existe en caché
    if (!entry) {
      this.stats.misses++;
      logger.debug(`Cache MISS: ${cacheType}:${cacheKey}`);
      return null;
    }
    
    // Si ha expirado
    if (this.isExpired(entry)) {
      this.delete(cacheType, cacheKey);
      this.stats.misses++;
      logger.debug(`Cache EXPIRED: ${cacheType}:${cacheKey}`);
      return null;
    }
    
    // Actualizar estadísticas y metadata
    this.stats.hits++;
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    logger.debug(`Cache HIT: ${cacheType}:${cacheKey}`);
    return entry.value;
  }

  /**
   * Almacena un valor en la caché
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @param {string} key - Clave de almacenamiento
   * @param {any} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en segundos (opcional)
   * @param {Object} metadata - Metadatos adicionales (opcional)
   * @returns {boolean} - true si se almacenó correctamente
   */
  set(cacheType, key, value, ttl = null, metadata = {}) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      logger.warn(`Intentando escribir en un tipo de caché no definido: ${cacheType}`);
      return false;
    }
    
    // Si el valor es null o undefined, no almacenar
    if (value === null || value === undefined) {
      logger.debug(`Intento de almacenar valor nulo en caché: ${cacheType}:${key}`);
      return false;
    }
    
    const cacheKey = this.normalizeKey(key);
    const cache = this.caches[cacheType];
    const config = cacheConfig.cachePolicies[cacheType];
    
    // Verificar límite de elementos y aplicar estrategia de reemplazo si es necesario
    if (cache.size >= config.maxItems) {
      this.applyReplacementStrategy(cacheType);
    }
    
    // Calcular tiempo de expiración
    const now = Date.now();
    const expiryTime = ttl !== null 
      ? now + (ttl * 1000) 
      : now + (config.defaultExpiry * 1000);
    
    // Crear entrada de caché
    const entry = {
      value,
      created: now,
      expires: expiryTime,
      lastAccessed: now,
      accessCount: 0,
      metadata
    };
    
    // Almacenar en caché
    cache.set(cacheKey, entry);
    this.stats.sets++;
    
    logger.debug(`Cache SET: ${cacheType}:${cacheKey}`, {
      ttl: ttl || config.defaultExpiry,
      expires: new Date(expiryTime).toISOString()
    });
    
    return true;
  }

  /**
   * Elimina una entrada de la caché
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @param {string} key - Clave a eliminar
   * @returns {boolean} - true si se eliminó correctamente
   */
  delete(cacheType, key) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      logger.warn(`Intentando eliminar de un tipo de caché no definido: ${cacheType}`);
      return false;
    }
    
    const cacheKey = this.normalizeKey(key);
    const cache = this.caches[cacheType];
    const result = cache.delete(cacheKey);
    
    if (result) {
      logger.debug(`Cache DELETE: ${cacheType}:${cacheKey}`);
    }
    
    return result;
  }

  /**
   * Verifica si una entrada existe en la caché y no ha expirado
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @param {string} key - Clave a verificar
   * @returns {boolean} - true si existe y no ha expirado
   */
  has(cacheType, key) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      return false;
    }
    
    const cacheKey = this.normalizeKey(key);
    const cache = this.caches[cacheType];
    const entry = cache.get(cacheKey);
    
    // Verificar si existe y no ha expirado
    if (entry && !this.isExpired(entry)) {
      return true;
    }
    
    // Si existe pero ha expirado, eliminarlo
    if (entry) {
      this.delete(cacheType, cacheKey);
    }
    
    return false;
  }

  /**
   * Obtiene la edad de una entrada en caché en segundos
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @param {string} key - Clave a verificar
   * @returns {number} - Edad en segundos o -1 si no existe
   */
  getAge(cacheType, key) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      return -1;
    }
    
    const cacheKey = this.normalizeKey(key);
    const cache = this.caches[cacheType];
    const entry = cache.get(cacheKey);
    
    if (!entry) {
      return -1;
    }
    
    return Math.floor((Date.now() - entry.created) / 1000);
  }

  /**
   * Limpia todas las entradas expiradas de un tipo de caché
   * @param {string} cacheType - Tipo de caché (expediente, chatgpt, intents)
   * @returns {number} - Número de entradas eliminadas
   */
  cleanup(cacheType) {
    // Verificar tipo de caché
    if (!this.caches[cacheType]) {
      logger.warn(`Intentando limpiar un tipo de caché no definido: ${cacheType}`);
      return 0;
    }
    
    const cache = this.caches[cacheType];
    let removedCount = 0;
    const now = Date.now();
    
    // Eliminar entradas expiradas
    for (const [key, entry] of cache.entries()) {
      if (entry.expires <= now) {
        cache.delete(key);
        removedCount++;
        this.stats.evictions++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cache CLEANUP: ${cacheType} - Eliminadas ${removedCount} entradas expiradas`);
    }
    
    return removedCount;
  }

  /**
   * Limpia todas las cachés
   * @returns {Object} - Estadísticas de limpieza por tipo de caché
   */
  cleanupAll() {
    const results = {};
    const cacheTypes = Object.keys(this.caches);
    
    for (const cacheType of cacheTypes) {
      results[cacheType] = this.cleanup(cacheType);
    }
    
    this.stats.lastCleanup = Date.now();
    logger.info(`Cache CLEANUP completo`, results);
    
    return results;
  }

  /**
   * Aplica la estrategia de reemplazo configurada para liberar espacio
   * @param {string} cacheType - Tipo de caché
   * @private
   */
  applyReplacementStrategy(cacheType) {
    const cache = this.caches[cacheType];
    const config = cacheConfig.cachePolicies[cacheType];
    const strategy = config.replacementStrategy || 'lru';
    const targetSize = Math.floor(config.maxItems * 0.9); // Eliminar 10% de las entradas
    
    // Si la caché no está llena, no hacer nada
    if (cache.size <= targetSize) {
      return;
    }
    
    // Número de entradas a eliminar
    const removeCount = cache.size - targetSize;
    let entriesArray = Array.from(cache.entries());
    
    switch (strategy) {
      case 'lru': // Least Recently Used
        // Ordenar por último acceso (más antiguo primero)
        entriesArray.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      
      case 'ttl': // Time To Live
        // Ordenar por tiempo de expiración (más cercano primero)
        entriesArray.sort((a, b) => a[1].expires - b[1].expires);
        break;
      
      case 'lfu': // Least Frequently Used
        // Ordenar por frecuencia de acceso (menos frecuente primero)
        entriesArray.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      
      case 'fifo': // First In First Out
        // Ordenar por tiempo de creación (más antiguo primero)
        entriesArray.sort((a, b) => a[1].created - b[1].created);
        break;
      
      default:
        // Por defecto usar LRU
        entriesArray.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
    }
    
    // Eliminar las entradas seleccionadas
    for (let i = 0; i < removeCount; i++) {
      if (i < entriesArray.length) {
        const [key] = entriesArray[i];
        cache.delete(key);
        this.stats.evictions++;
      }
    }
    
    logger.info(`Cache EVICTION: ${cacheType} - Eliminadas ${removeCount} entradas usando estrategia ${strategy}`);
  }

  /**
   * Verifica si una entrada de caché ha expirado
   * @param {Object} entry - Entrada de caché
   * @returns {boolean} - true si ha expirado
   * @private
   */
  isExpired(entry) {
    return entry.expires <= Date.now();
  }

  /**
   * Normaliza una clave para uso en caché
   * @param {string|Object} key - Clave original
   * @returns {string} - Clave normalizada
   * @private
   */
  normalizeKey(key) {
    if (typeof key === 'object') {
      // Si es un objeto, crear un hash basado en su contenido
      return crypto
        .createHash('md5')
        .update(JSON.stringify(key))
        .digest('hex');
    }
    
    // Si es string, normalizar
    return String(key)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  /**
   * Inicializa el programador de limpieza automática
   * @private
   */
  initCleanupScheduler() {
    // Obtener intervalo de limpieza de la configuración (por defecto 5 minutos)
    const interval = parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300', 10) * 1000;
    
    // Configurar intervalo de limpieza
    setInterval(() => {
      this.cleanupAll();
    }, interval);
    
    logger.info(`Programador de limpieza de caché iniciado con intervalo de ${interval / 1000} segundos`);
  }

  /**
   * Obtiene estadísticas de uso de la caché
   * @returns {Object} - Estadísticas de uso
   */
  getStats() {
    // Calcular estadísticas adicionales
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? (this.stats.hits / totalOperations) * 100 : 0;
    
    // Obtener tamaños actuales
    const sizes = {};
    for (const [type, cache] of Object.entries(this.caches)) {
      sizes[type] = cache.size;
    }
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      sizes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Encuentra entradas de caché similares a una consulta para reutilización
   * (especialmente útil para consultas a ChatGPT)
   * @param {string} cacheType - Tipo de caché (chatgpt)
   * @param {string} query - Consulta a buscar
   * @param {number} threshold - Umbral de similitud (0-1)
   * @returns {Object|null} - Entrada similar o null si no se encontró
   */
  findSimilar(cacheType, query, threshold = 0.85) {
    // Solo implementado para caché de chatgpt
    if (cacheType !== 'chatgpt' || !this.caches[cacheType]) {
      return null;
    }
    
    // Normalizar consulta
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 5) {
      return null; // Consultas muy cortas no son comparables
    }
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Buscar en caché
    for (const [key, entry] of this.caches[cacheType].entries()) {
      // Ignorar entradas expiradas
      if (this.isExpired(entry)) {
        continue;
      }
      
      // Verificar metadatos
      if (!entry.metadata || !entry.metadata.query) {
        continue;
      }
      
      const cachedQuery = entry.metadata.query.toLowerCase().trim();
      // Calcular similitud
      const similarity = this.calculateSimilarity(normalizedQuery, cachedQuery);
      
      // Actualizar mejor coincidencia
      if (similarity > threshold && similarity > bestScore) {
        bestMatch = entry;
        bestScore = similarity;
      }
    }
    
    if (bestMatch) {
      logger.debug(`Cache SIMILAR MATCH: ${cacheType} - Score: ${bestScore.toFixed(2)}`);
      // Actualizar estadísticas
      bestMatch.lastAccessed = Date.now();
      bestMatch.accessCount++;
      this.stats.hits++;
    }
    
    return bestMatch?.value || null;
  }

  /**
   * Calcula la similitud entre dos textos (coeficiente de Jaccard)
   * @param {string} text1 - Primer texto
   * @param {string} text2 - Segundo texto
   * @returns {number} - Similitud (0-1)
   * @private
   */
  calculateSimilarity(text1, text2) {
    // Si alguno es vacío, no hay similitud
    if (!text1 || !text2) return 0;
    
    // Simplificación para textos muy diferentes en longitud
    const lengthRatio = Math.min(text1.length, text2.length) / Math.max(text1.length, text2.length);
    if (lengthRatio < 0.5) return 0;
    
    // Dividir en palabras
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    // Calcular intersección
    const intersection = new Set();
    for (const word of words1) {
      if (words2.has(word)) {
        intersection.add(word);
      }
    }
    
    // Calcular unión
    const union = new Set([...words1, ...words2]);
    
    // Calcular coeficiente de Jaccard
    return intersection.size / union.size;
  }
}

// Exportar instancia singleton
module.exports = new CacheService();