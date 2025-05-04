/**
 * Sistema avanzado de manejo de errores
 * Proporciona funciones para categorizar, registrar y manejar errores
 * con estrategias de recuperación
 */

// Tipos de errores
const ERROR_TYPES = {
    NETWORK: 'network_error',
    API: 'api_error',
    TIMEOUT: 'timeout_error',
    AUTH: 'authentication_error',
    VALIDATION: 'validation_error',
    NOT_FOUND: 'not_found_error',
    OPENAI: 'openai_error',
    CACHE: 'cache_error',
    RATE_LIMIT: 'rate_limit_error',
    UNKNOWN: 'unknown_error'
  };
  
  // Nivel de severidad
  const SEVERITY = {
    LOW: 'low',        // Errores menores, no afectan funcionalidad principal
    MEDIUM: 'medium',  // Errores que afectan parcialmente la funcionalidad
    HIGH: 'high',      // Errores críticos que impiden operación normal
    FATAL: 'fatal'     // Errores que requieren intervención manual
  };
  
  /**
   * Categoriza un error según su tipo y mensaje
   * @param {Error} error - Error a categorizar
   * @returns {Object} - Tipo de error, severidad y mensaje formateado
   */
  function categorizeError(error) {
    if (!error) {
      return {
        type: ERROR_TYPES.UNKNOWN,
        severity: SEVERITY.MEDIUM,
        message: 'Error desconocido',
        originalError: null
      };
    }
    
    // Obtener mensaje y código
    const message = error.message || 'Error sin mensaje';
    const code = error.code || error.status || '';
    const response = error.response || {};
    const data = response.data || {};
    
    // Categorizaciones específicas según código y mensaje
    
    // Errores de red
    if (
      code === 'ECONNRESET' || 
      code === 'ECONNREFUSED' || 
      code === 'ENOTFOUND' || 
      message.includes('network') ||
      message.includes('connection')
    ) {
      return {
        type: ERROR_TYPES.NETWORK,
        severity: SEVERITY.MEDIUM,
        message: `Error de red: ${message}`,
        originalError: error,
        retryable: true
      };
    }
    
    // Errores de timeout
    if (
      code === 'ETIMEDOUT' || 
      message.includes('timeout') || 
      message.includes('timed out')
    ) {
      return {
        type: ERROR_TYPES.TIMEOUT,
        severity: SEVERITY.MEDIUM,
        message: `Timeout: ${message}`,
        originalError: error,
        retryable: true
      };
    }
    
    // Errores de autenticación
    if (
      code === 401 || 
      code === 403 || 
      message.includes('auth') || 
      message.includes('unauthorized') ||
      message.includes('api key')
    ) {
      return {
        type: ERROR_TYPES.AUTH,
        severity: SEVERITY.HIGH,
        message: `Error de autenticación: ${message}`,
        originalError: error,
        retryable: false
      };
    }
    
    // Errores de validación
    if (
      code === 400 || 
      code === 422 || 
      message.includes('validation') || 
      message.includes('invalid')
    ) {
      return {
        type: ERROR_TYPES.VALIDATION,
        severity: SEVERITY.LOW,
        message: `Error de validación: ${message}`,
        originalError: error,
        retryable: false
      };
    }
    
    // Errores de no encontrado
    if (
      code === 404 || 
      message.includes('not found') || 
      message.includes('no existe')
    ) {
      return {
        type: ERROR_TYPES.NOT_FOUND,
        severity: SEVERITY.LOW,
        message: `Recurso no encontrado: ${message}`,
        originalError: error,
        retryable: false
      };
    }
    
    // Errores específicos de OpenAI
    if (
      message.includes('openai') || 
      message.includes('ChatGPT') ||
      message.includes('rate limit') ||
      message.includes('token') ||
      message.includes('prompt')
    ) {
      // Determinar si es límite de rate
      const isRateLimit = 
        code === 429 || 
        message.includes('rate limit') || 
        message.includes('too many requests');
      
      if (isRateLimit) {
        return {
          type: ERROR_TYPES.RATE_LIMIT,
          severity: SEVERITY.MEDIUM,
          message: `Límite de tasa OpenAI: ${message}`,
          originalError: error,
          retryable: true,
          retryDelay: 2000 // Esperar más tiempo en errores de rate limit
        };
      }
      
      return {
        type: ERROR_TYPES.OPENAI,
        severity: SEVERITY.MEDIUM,
        message: `Error de OpenAI: ${message}`,
        originalError: error,
        retryable: true
      };
    }
    
    // Errores específicos de caché
    if (
      message.includes('cache') || 
      message.includes('serialize') || 
      message.includes('deserialize')
    ) {
      return {
        type: ERROR_TYPES.CACHE,
        severity: SEVERITY.LOW,
        message: `Error de caché: ${message}`,
        originalError: error,
        retryable: false
      };
    }
    
    // Errores de API general (códigos HTTP 5xx)
    if (code >= 500 && code < 600) {
      return {
        type: ERROR_TYPES.API,
        severity: SEVERITY.HIGH,
        message: `Error de servidor API: ${message}`,
        originalError: error,
        retryable: true
      };
    }
    
    // Otros errores de API
    if (
      response.status || 
      data.error || 
      message.includes('api') || 
      message.includes('endpoint')
    ) {
      return {
        type: ERROR_TYPES.API,
        severity: SEVERITY.MEDIUM,
        message: `Error de API: ${message}`,
        originalError: error,
        retryable: code !== 400 // No reintentar errores 400
      };
    }
    
    // Error desconocido por defecto
    return {
      type: ERROR_TYPES.UNKNOWN,
      severity: SEVERITY.MEDIUM,
      message: `Error no categorizado: ${message}`,
      originalError: error,
      retryable: true
    };
  }
  
  /**
   * Determina si un error debería ser reintentado
   * @param {Object} errorInfo - Información del error categorizado
   * @param {number} attempts - Número de intentos realizados
   * @param {number} maxAttempts - Número máximo de intentos permitidos
   * @returns {boolean} - true si debe reintentarse
   */
  function shouldRetry(errorInfo, attempts, maxAttempts) {
    // No reintentar si el error es no retriable
    if (errorInfo.retryable === false) {
      return false;
    }
    
    // No reintentar si se alcanzó el máximo de intentos
    if (attempts >= maxAttempts) {
      return false;
    }
    
    // Casos especiales según tipo y severidad
    if (errorInfo.severity === SEVERITY.FATAL) {
      return false;
    }
    
    // No reintentar errores de autenticación
    if (errorInfo.type === ERROR_TYPES.AUTH) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calcula el tiempo de espera para el próximo reintento usando backoff exponencial
   * @param {number} attempt - Número de intento actual (comenzando desde 1)
   * @param {number} baseDelay - Tiempo base de espera en ms
   * @param {number} maxDelay - Tiempo máximo de espera en ms
   * @param {Object} errorInfo - Información del error categorizado
   * @returns {number} - Tiempo de espera en ms
   */
  function calculateRetryDelay(attempt, baseDelay = 1000, maxDelay = 30000, errorInfo = {}) {
    // Usar delay específico del error si está disponible
    const initialDelay = errorInfo.retryDelay || baseDelay;
    
    // Calcular delay con jitter (variación aleatoria)
    const exponentialDelay = initialDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 + 0.85; // Factor entre 0.85 y 1.15
    
    // Aplicar límite máximo
    return Math.min(exponentialDelay * jitter, maxDelay);
  }
  
  /**
   * Genera un mensaje amigable para el usuario según el tipo de error
   * @param {Object} errorInfo - Información del error categorizado
   * @returns {string} - Mensaje amigable para el usuario
   */
  function getFriendlyMessage(errorInfo) {
    switch (errorInfo.type) {
      case ERROR_TYPES.NETWORK:
        return '❌ Parece que hay problemas de conexión. Por favor, intenta de nuevo en unos momentos.';
      
      case ERROR_TYPES.TIMEOUT:
        return '⏳ La solicitud está tardando demasiado. Por favor, intenta de nuevo en unos momentos.';
      
      case ERROR_TYPES.AUTH:
        return '🔒 Hay un problema con la autenticación del servicio. Por favor, contacta al administrador.';
      
      case ERROR_TYPES.VALIDATION:
        return '⚠️ La información proporcionada no es válida. Por favor, verifica los datos ingresados.';
      
      case ERROR_TYPES.NOT_FOUND:
        return '🔍 No se encontró la información solicitada. Por favor, verifica el número de expediente.';
      
      case ERROR_TYPES.OPENAI:
        return '🤖 Hay un problema con el servicio de inteligencia artificial. Por favor, intenta usar el modo tradicional por ahora.';
      
      case ERROR_TYPES.RATE_LIMIT:
        return '⏱️ Estamos experimentando muchas solicitudes en este momento. Por favor, intenta de nuevo en unos segundos.';
      
      case ERROR_TYPES.API:
        return '🌐 Hay un problema al obtener la información. Por favor, intenta de nuevo más tarde o usa el modo tradicional.';
      
      case ERROR_TYPES.CACHE:
        return '🔄 Hubo un problema al recuperar la información almacenada. Por favor, intenta realizar una nueva consulta.';
      
      default:
        return '❌ Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo o usa el modo tradicional.';
    }
  }
  
  /**
   * Determina si un error debería cambiar el modo de operación automáticamente
   * @param {Object} errorInfo - Información del error categorizado
   * @param {number} attempts - Número de intentos realizados
   * @returns {boolean} - true si debe cambiar el modo
   */
  function shouldSwitchMode(errorInfo, attempts) {
    // Cambiar modo automáticamente para errores críticos
    if (errorInfo.severity === SEVERITY.FATAL) {
      return true;
    }
    
    // Cambiar modo para errores persistentes de OpenAI
    if (errorInfo.type === ERROR_TYPES.OPENAI && attempts >= 2) {
      return true;
    }
    
    // Cambiar modo para errores de API persistentes
    if (errorInfo.type === ERROR_TYPES.API && 
       (errorInfo.severity === SEVERITY.HIGH || attempts >= 3)) {
      return true;
    }
    
    // Cambiar modo para errores de red persistentes
    if (errorInfo.type === ERROR_TYPES.NETWORK && attempts >= 3) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Registra un error para monitoreo y análisis
   * @param {Object} errorInfo - Información del error categorizado
   * @param {Object} context - Contexto adicional (usuario, operación, etc.)
   */
  function logError(errorInfo, context = {}) {
    const { type, severity, message, originalError } = errorInfo;
    const timestamp = new Date().toISOString();
    
    // Crear objeto de log
    const logEntry = {
      timestamp,
      type,
      severity,
      message,
      context,
      stack: originalError?.stack || 'No stack trace available'
    };
    
    // Log según severidad
    if (severity === SEVERITY.HIGH || severity === SEVERITY.FATAL) {
      console.error('❌ ERROR CRÍTICO:', JSON.stringify(logEntry));
    } else if (severity === SEVERITY.MEDIUM) {
      console.error('⚠️ ERROR:', JSON.stringify(logEntry));
    } else {
      console.warn('ℹ️ ERROR LEVE:', JSON.stringify(logEntry));
    }
    
    // Aquí se podría implementar envío a sistema de monitoreo
    // o almacenamiento en BD para análisis posterior
  }
  
  module.exports = {
    ERROR_TYPES,
    SEVERITY,
    categorizeError,
    shouldRetry,
    calculateRetryDelay,
    getFriendlyMessage,
    shouldSwitchMode,
    logError
  };