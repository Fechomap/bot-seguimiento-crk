/**
 * Servicio de métricas y monitoreo
 * Proporciona funcionalidades para registro, seguimiento y reporte
 * de métricas de rendimiento, uso y calidad del servicio
 */
const logger = require('../utils/logger').createLogger('metricService');

class MetricService {
  constructor() {
    // Métricas generales
    this.metrics = {
      // Métricas de solicitudes
      requests: {
        total: 0,
        success: 0,
        failed: 0,
        byType: {
          start: 0,
          expedienteConsulta: 0,
          chatGPT: 0,
          tradicional: 0,
          cambioModo: 0
        }
      },
      
      // Métricas de rendimiento
      performance: {
        responseTime: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        },
        apiCalls: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        },
        openaiCalls: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        }
      },
      
      // Métricas de usuarios
      users: {
        unique: new Set(),
        interactions: {}, // Por usuario
        preferredMode: {
          conversational: 0,
          traditional: 0
        }
      },
      
      // Métricas de expedientes
      expedientes: {
        unique: new Set(),
        queries: {} // Por expediente
      },
      
      // Métricas de caché
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      
      // Métricas de errores
      errors: {
        total: 0,
        byType: {},
        bySeverity: {}
      },
      
      // Métricas de uso de IA
      ai: {
        calls: 0,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0
        },
        intents: {}
      },
      
      // Estadísticas de tiempo
      uptime: Date.now(),
      lastReset: Date.now()
    };
    
    // Histogramas para análisis de percentiles
    this.histograms = {
      responseTime: [],
      aiResponseTime: []
    };
    
    // Límites para histogramas (evitar crecimiento excesivo)
    this.histogramLimits = {
      responseTime: 1000, // Máximo 1000 muestras
      aiResponseTime: 500  // Máximo 500 muestras
    };
  }

  /**
   * Registra una solicitud entrante
   * @param {string} type - Tipo de solicitud
   * @param {number} userId - ID del usuario
   */
  trackRequest(type, userId) {
    // Incrementar contadores generales
    this.metrics.requests.total++;
    
    // Incrementar contador por tipo (si existe)
    if (this.metrics.requests.byType[type] !== undefined) {
      this.metrics.requests.byType[type]++;
    }
    
    // Registrar usuario
    if (userId) {
      this.metrics.users.unique.add(userId);
      
      // Inicializar contador de interacciones si no existe
      if (!this.metrics.users.interactions[userId]) {
        this.metrics.users.interactions[userId] = {
          total: 0,
          conversational: 0,
          traditional: 0,
          lastSeen: Date.now()
        };
      }
      
      // Incrementar contador
      this.metrics.users.interactions[userId].total++;
      this.metrics.users.interactions[userId].lastSeen = Date.now();
    }
    
    return this;
  }

  /**
   * Registra el resultado de una solicitud
   * @param {boolean} success - Si la solicitud fue exitosa
   * @param {number} responseTime - Tiempo de respuesta en ms
   */
  trackResponse(success, responseTime) {
    // Incrementar contador de éxito o fallo
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Registrar tiempo de respuesta
    if (responseTime && responseTime > 0) {
      const perf = this.metrics.performance.responseTime;
      perf.count++;
      perf.sum += responseTime;
      perf.max = Math.max(perf.max, responseTime);
      perf.min = Math.min(perf.min, responseTime);
      
      // Añadir a histograma (limitando tamaño)
      if (this.histograms.responseTime.length >= this.histogramLimits.responseTime) {
        this.histograms.responseTime.shift(); // Eliminar el más antiguo
      }
      this.histograms.responseTime.push(responseTime);
    }
    
    return this;
  }

  /**
   * Registra una llamada a la API
   * @param {string} endpoint - Endpoint consultado
   * @param {number} responseTime - Tiempo de respuesta en ms
   * @param {boolean} success - Si la llamada fue exitosa
   */
  trackApiCall(endpoint, responseTime, success = true) {
    // Incrementar contador
    const perf = this.metrics.performance.apiCalls;
    perf.count++;
    
    // Registrar tiempo de respuesta
    if (responseTime && responseTime > 0) {
      perf.sum += responseTime;
      perf.max = Math.max(perf.max, responseTime);
      perf.min = Math.min(perf.min, responseTime);
    }
    
    return this;
  }

  /**
   * Registra una consulta de expediente
   * @param {string} expedienteId - ID del expediente
   * @param {string} tipoConsulta - Tipo de consulta (general, costo, ubicacion, etc.)
   * @param {number} userId - ID del usuario
   */
  trackExpedienteQuery(expedienteId, tipoConsulta, userId) {
    if (!expedienteId) return this;
    
    // Registrar expediente único
    this.metrics.expedientes.unique.add(expedienteId);
    
    // Inicializar contador si no existe
    if (!this.metrics.expedientes.queries[expedienteId]) {
      this.metrics.expedientes.queries[expedienteId] = {
        total: 0,
        byType: {},
        byUser: new Set(),
        lastQueried: Date.now()
      };
    }
    
    const expStats = this.metrics.expedientes.queries[expedienteId];
    expStats.total++;
    expStats.lastQueried = Date.now();
    
    // Registrar tipo de consulta
    if (tipoConsulta) {
      expStats.byType[tipoConsulta] = (expStats.byType[tipoConsulta] || 0) + 1;
    }
    
    // Registrar usuario
    if (userId) {
      expStats.byUser.add(userId);
    }
    
    return this;
  }

  /**
   * Registra el modo preferido por un usuario
   * @param {number} userId - ID del usuario
   * @param {string} mode - Modo preferido (conversational, traditional)
   */
  trackUserMode(userId, mode) {
    if (!userId) return this;
    
    // Incrementar contador global
    if (mode === 'conversational' || mode === 'traditional') {
      this.metrics.users.preferredMode[mode]++;
    }
    
    // Registrar a nivel de usuario
    if (this.metrics.users.interactions[userId]) {
      this.metrics.users.interactions[userId][mode]++;
    }
    
    return this;
  }

  /**
   * Registra un error
   * @param {string} type - Tipo de error
   * @param {string} severity - Severidad (low, medium, high, fatal)
   * @param {Object} details - Detalles adicionales
   */
  trackError(type, severity, details = {}) {
    // Incrementar contador general
    this.metrics.errors.total++;
    
    // Incrementar contador por tipo
    this.metrics.errors.byType[type] = (this.metrics.errors.byType[type] || 0) + 1;
    
    // Incrementar contador por severidad
    this.metrics.errors.bySeverity[severity] = (this.metrics.errors.bySeverity[severity] || 0) + 1;
    
    // Registrar detalles para análisis (limitando a errores críticos)
    if (severity === 'high' || severity === 'fatal') {
      logger.error(`Error ${severity}: ${type}`, details);
    }
    
    return this;
  }

  /**
   * Registra una llamada a la API de OpenAI
   * @param {number} promptTokens - Tokens en el prompt
   * @param {number} completionTokens - Tokens en la respuesta
   * @param {number} responseTime - Tiempo de respuesta en ms
   * @param {string} intent - Intención detectada (opcional)
   */
  trackAICall(promptTokens, completionTokens, responseTime, intent = null) {
    // Incrementar contador
    this.metrics.ai.calls++;
    
    // Registrar tokens
    if (promptTokens > 0) {
      this.metrics.ai.tokens.prompt += promptTokens;
    }
    
    if (completionTokens > 0) {
      this.metrics.ai.tokens.completion += completionTokens;
    }
    
    this.metrics.ai.tokens.total = this.metrics.ai.tokens.prompt + this.metrics.ai.tokens.completion;
    
    // Registrar tiempo de respuesta
    if (responseTime && responseTime > 0) {
      const perf = this.metrics.performance.openaiCalls;
      perf.count++;
      perf.sum += responseTime;
      perf.max = Math.max(perf.max, responseTime);
      perf.min = Math.min(perf.min, responseTime);
      
      // Añadir a histograma (limitando tamaño)
      if (this.histograms.aiResponseTime.length >= this.histogramLimits.aiResponseTime) {
        this.histograms.aiResponseTime.shift(); // Eliminar el más antiguo
      }
      this.histograms.aiResponseTime.push(responseTime);
    }
    
    // Registrar intención
    if (intent) {
      this.metrics.ai.intents[intent] = (this.metrics.ai.intents[intent] || 0) + 1;
    }
    
    return this;
  }

  /**
   * Actualiza las métricas de caché
   * @param {number} hits - Número de aciertos
   * @param {number} misses - Número de fallos
   */
  updateCacheMetrics(hits, misses) {
    this.metrics.cache.hits += hits;
    this.metrics.cache.misses += misses;
    
    // Calcular hit rate
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    if (total > 0) {
      this.metrics.cache.hitRate = (this.metrics.cache.hits / total) * 100;
    }
    
    return this;
  }

  /**
   * Calcula percentiles de tiempo de respuesta
   * @param {string} metricType - Tipo de métrica (responseTime, aiResponseTime)
   * @param {Array<number>} percentiles - Percentiles a calcular [50, 90, 95, 99]
   * @returns {Object} - Valores de percentiles
   */
  calculatePercentiles(metricType = 'responseTime', percentiles = [50, 90, 95, 99]) {
    const histogram = [...this.histograms[metricType]].sort((a, b) => a - b);
    const result = {};
    
    if (histogram.length === 0) {
      return { empty: true };
    }
    
    // Calcular cada percentil solicitado
    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * histogram.length) - 1;
      result[`p${p}`] = histogram[Math.max(0, index)];
    }
    
    // Añadir promedio
    const sum = histogram.reduce((a, b) => a + b, 0);
    result.avg = sum / histogram.length;
    
    return result;
  }

  /**
   * Genera un reporte completo de métricas
   * @returns {Object} - Reporte de métricas
   */
  getReport() {
    // Calcular métricas derivadas
    const responseTimeAvg = this.metrics.performance.responseTime.count > 0
      ? this.metrics.performance.responseTime.sum / this.metrics.performance.responseTime.count
      : 0;
      
    const apiCallTimeAvg = this.metrics.performance.apiCalls.count > 0
      ? this.metrics.performance.apiCalls.sum / this.metrics.performance.apiCalls.count
      : 0;
      
    const openaiCallTimeAvg = this.metrics.performance.openaiCalls.count > 0
      ? this.metrics.performance.openaiCalls.sum / this.metrics.performance.openaiCalls.count
      : 0;
    
    // Calcular percentiles
    const responseTimePercentiles = this.calculatePercentiles('responseTime');
    const aiResponseTimePercentiles = this.calculatePercentiles('aiResponseTime');
    
    // Calcular tasas de error
    const errorRate = this.metrics.requests.total > 0
      ? (this.metrics.errors.total / this.metrics.requests.total) * 100
      : 0;
    
    // Calcular tiempo de actividad
    const uptime = Date.now() - this.metrics.uptime;
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      summary: {
        requests: {
          total: this.metrics.requests.total,
          success: this.metrics.requests.success,
          failed: this.metrics.requests.failed,
          successRate: this.metrics.requests.total > 0
            ? (this.metrics.requests.success / this.metrics.requests.total) * 100
            : 0
        },
        users: {
          uniqueCount: this.metrics.users.unique.size,
          modePreference: {
            conversational: this.metrics.users.preferredMode.conversational,
            traditional: this.metrics.users.preferredMode.traditional,
            ratio: this.metrics.users.preferredMode.traditional > 0
              ? this.metrics.users.preferredMode.conversational / this.metrics.users.preferredMode.traditional
              : 'N/A'
          }
        },
        expedientes: {
          uniqueCount: this.metrics.expedientes.unique.size
        },
        performance: {
          responseTimeAvg,
          responseTimePercentiles,
          apiCallTimeAvg,
          openaiCallTimeAvg,
          aiResponseTimePercentiles
        },
        errors: {
          total: this.metrics.errors.total,
          rate: errorRate.toFixed(2) + '%',
          bySeverity: this.metrics.errors.bySeverity
        },
        cache: {
          hits: this.metrics.cache.hits,
          misses: this.metrics.cache.misses,
          hitRate: this.metrics.cache.hitRate.toFixed(2) + '%'
        },
        ai: {
          calls: this.metrics.ai.calls,
          tokensTotal: this.metrics.ai.tokens.total,
          topIntents: this.getTopItems(this.metrics.ai.intents, 5)
        },
        uptime: `${uptimeHours}h ${uptimeMinutes}m`
      },
      details: {
        requestsByType: this.metrics.requests.byType,
        errorsByType: this.metrics.errors.byType,
        aiTokens: this.metrics.ai.tokens,
        aiIntents: this.metrics.ai.intents
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtiene un informe resumido de métricas clave
   * @returns {Object} - Métricas resumidas
   */
  getQuickStats() {
    return {
      requests: this.metrics.requests.total,
      users: this.metrics.users.unique.size,
      expedientes: this.metrics.expedientes.unique.size,
      errors: this.metrics.errors.total,
      aiCalls: this.metrics.ai.calls,
      cacheHitRate: this.metrics.cache.hitRate.toFixed(2) + '%',
      avgResponseTime: this.metrics.performance.responseTime.count > 0
        ? (this.metrics.performance.responseTime.sum / this.metrics.performance.responseTime.count).toFixed(2) + 'ms'
        : 'N/A',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reinicia todas las métricas
   */
  resetMetrics() {
    logger.info('Reiniciando métricas');
    
    // Guardar algunos valores persistentes
    const uptime = this.metrics.uptime;
    const uniqueUsers = this.metrics.users.unique.size;
    
    // Reiniciar métricas
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        failed: 0,
        byType: {
          start: 0,
          expedienteConsulta: 0,
          chatGPT: 0,
          tradicional: 0,
          cambioModo: 0
        }
      },
      performance: {
        responseTime: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        },
        apiCalls: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        },
        openaiCalls: {
          count: 0,
          sum: 0,
          max: 0,
          min: Number.MAX_SAFE_INTEGER
        }
      },
      users: {
        unique: new Set(),
        interactions: {},
        preferredMode: {
          conversational: 0,
          traditional: 0
        }
      },
      expedientes: {
        unique: new Set(),
        queries: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      errors: {
        total: 0,
        byType: {},
        bySeverity: {}
      },
      ai: {
        calls: 0,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0
        },
        intents: {}
      },
      uptime,
      lastReset: Date.now(),
      previousUsers: uniqueUsers
    };
    
    // Reiniciar histogramas
    this.histograms = {
      responseTime: [],
      aiResponseTime: []
    };
  }

  /**
   * Obtiene los N elementos más frecuentes de un objeto
   * @param {Object} obj - Objeto con contadores
   * @param {number} n - Número de elementos a obtener
   * @returns {Array} - Array de pares [clave, valor]
   * @private
   */
  getTopItems(obj, n = 5) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }
}

// Exportar instancia singleton
module.exports = new MetricService();