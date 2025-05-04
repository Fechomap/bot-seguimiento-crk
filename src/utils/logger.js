/**
 * Sistema de logging estructurado
 * Proporciona funciones para generar logs consistentes y estructurados
 * para diferentes niveles y componentes
 */

// Niveles de log
const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal'
  };
  
  // Mapa de prioridades numéricas para cada nivel (menor = más detallado)
  const LEVEL_PRIORITY = {
    [LOG_LEVELS.DEBUG]: 0,
    [LOG_LEVELS.INFO]: 1,
    [LOG_LEVELS.WARN]: 2,
    [LOG_LEVELS.ERROR]: 3,
    [LOG_LEVELS.FATAL]: 4
  };
  
  // Nivel de log configurado desde variables de entorno
  const configuredLevel = process.env.LOG_LEVEL || LOG_LEVELS.INFO;
  
  // Verificar si un nivel debe ser registrado según configuración
  function shouldLog(level) {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel];
  }
  
  // Iconos para diferentes niveles de log
  const LEVEL_ICONS = {
    [LOG_LEVELS.DEBUG]: '🔍',
    [LOG_LEVELS.INFO]: 'ℹ️',
    [LOG_LEVELS.WARN]: '⚠️',
    [LOG_LEVELS.ERROR]: '❌',
    [LOG_LEVELS.FATAL]: '💥'
  };
  
  // Colores para consola (solo se aplican en entorno de desarrollo)
  const CONSOLE_COLORS = {
    [LOG_LEVELS.DEBUG]: '\x1b[90m', // Gris
    [LOG_LEVELS.INFO]: '\x1b[32m',  // Verde
    [LOG_LEVELS.WARN]: '\x1b[33m',  // Amarillo
    [LOG_LEVELS.ERROR]: '\x1b[31m', // Rojo
    [LOG_LEVELS.FATAL]: '\x1b[35m', // Magenta
    RESET: '\x1b[0m'                // Reset
  };
  
  // Determinar si se deben usar colores
  const useColors = process.env.NODE_ENV !== 'production';
  
  /**
   * Crea una instancia de logger para un componente específico
   * @param {string} component - Nombre del componente
   * @returns {Object} - Objeto con métodos de log
   */
  function createLogger(component) {
    // Validar componente
    if (!component) {
      console.warn('⚠️ Logger creado sin especificar componente. Por favor, proporcione un nombre de componente.');
      component = 'unknown';
    }
    
    /**
     * Genera un log estructurado
     * @param {string} level - Nivel de log (debug, info, warn, error, fatal)
     * @param {string} message - Mensaje principal
     * @param {Object} data - Datos adicionales
     * @private
     */
    function _log(level, message, data = {}) {
      // Verificar si debe registrarse según nivel configurado
      if (!shouldLog(level)) return;
      
      // Crear objeto de log estructurado
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        component,
        message,
        ...data
      };
      
      // Formatear mensaje para consola
      const icon = LEVEL_ICONS[level] || '';
      const color = useColors ? CONSOLE_COLORS[level] || '' : '';
      const reset = useColors ? CONSOLE_COLORS.RESET : '';
      
      // Crear versión corta para consola
      let consoleMessage = `${color}${icon} ${timestamp} [${level.toUpperCase()}] [${component}] ${message}${reset}`;
      
      // Añadir datos adicionales si existen
      if (Object.keys(data).length > 0) {
        // Filtrar datos sensibles
        const filteredData = { ...data };
        if (filteredData.apiKey) filteredData.apiKey = '[REDACTED]';
        if (filteredData.token) filteredData.token = '[REDACTED]';
        if (filteredData.password) filteredData.password = '[REDACTED]';
        
        // Serializar para la consola (solo los primeros niveles)
        const dataStr = JSON.stringify(filteredData, null, 2);
        consoleMessage += `\n${dataStr}`;
      }
      
      // Log a la consola según nivel
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(consoleMessage);
          break;
        case LOG_LEVELS.INFO:
          console.info(consoleMessage);
          break;
        case LOG_LEVELS.WARN:
          console.warn(consoleMessage);
          break;
        case LOG_LEVELS.ERROR:
        case LOG_LEVELS.FATAL:
          console.error(consoleMessage);
          break;
        default:
          console.log(consoleMessage);
      }
      
      // Aquí se podría implementar envío a sistema de monitoreo
      // o almacenamiento en BD para análisis posterior
    }
    
    /**
     * Registra una operación de inicio y fin con medición de tiempo
     * @param {string} operationName - Nombre de la operación
     * @param {Function} operation - Función (puede ser async)
     * @param {Object} metadata - Metadatos adicionales
     * @returns {Promise<any>} - Resultado de la operación
     */
    async function time(operationName, operation, metadata = {}) {
      if (!operation || typeof operation !== 'function') {
        throw new Error('La operación debe ser una función');
      }
      
      const startTime = Date.now();
      _log(LOG_LEVELS.DEBUG, `Iniciando ${operationName}`, metadata);
      
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        _log(LOG_LEVELS.DEBUG, `Completado ${operationName}`, {
          duration_ms: duration,
          ...metadata
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        _log(LOG_LEVELS.ERROR, `Error en ${operationName}`, {
          duration_ms: duration,
          error: error.message,
          stack: error.stack,
          ...metadata
        });
        
        throw error;
      }
    }
    
    // Retornar interfaz del logger
    return {
      debug: (message, data) => _log(LOG_LEVELS.DEBUG, message, data),
      info: (message, data) => _log(LOG_LEVELS.INFO, message, data),
      warn: (message, data) => _log(LOG_LEVELS.WARN, message, data),
      error: (message, data) => _log(LOG_LEVELS.ERROR, message, data),
      fatal: (message, data) => _log(LOG_LEVELS.FATAL, message, data),
      time
    };
  }
  
  /**
   * Logger global para uso general
   */
  const globalLogger = createLogger('global');
  
  module.exports = {
    createLogger,
    globalLogger,
    LOG_LEVELS
  };