/**
 * Servicio mejorado para realizar peticiones HTTP
 * Implementa patrones de resiliencia como retry y circuit breaker
 */
const axios = require('axios');
const apiConfig = require('../config/apiConfig');
const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger').createLogger('apiService');
const metricService = require('./metricService');

class AxiosService {
  /**
   * Constructor del servicio
   * @param {string} baseURL - URL base para todas las peticiones
   */
  constructor(baseURL) {
    // Configuración base para axios
    this.api = axios.create({
      baseURL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.globalConfig.headers
      },
      timeout: apiConfig.mainApiConfig.timeout,
      // Configuración para certificados SSL
      rejectUnauthorized: apiConfig.globalConfig.rejectUnauthorized
    });

    // Headers por defecto
    this.defaultHeaders = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };
    
    // Estado del circuit breaker
    this.circuitState = {
      status: 'closed', // closed, open, half-open
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0
    };
    
    // Configuración de circuit breaker
    this.circuitConfig = apiConfig.mainApiConfig.circuitBreaker;
  }

  /**
   * Realiza una petición HTTP con reintentos automáticos y circuit breaker
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
   * @param {string} url - URL relativa
   * @param {Object} data - Datos a enviar (para POST, PUT)
   * @param {Object} customHeaders - Headers adicionales
   * @param {Object} options - Opciones adicionales para axios
   * @returns {Promise<Object>} - Respuesta de la petición
   */
  async request(method, url, data = null, customHeaders = {}, options = {}) {
    // Verificar estado del circuit breaker
    await this.checkCircuitBreaker();
    
    const headers = { ...this.defaultHeaders, ...customHeaders };
    const source = axios.CancelToken.source();
    let attempt = 0;
    let lastError = null;
    
    // Obtener configuración de reintentos
    const retryConfig = apiConfig.mainApiConfig.retry;
    const maxAttempts = options.maxRetries || retryConfig.attempts;
    const baseDelay = options.retryDelay || retryConfig.delay;
    
    // Registrar inicio de la petición
    const startTime = Date.now();
    const requestId = `${method}-${url}-${Date.now()}`;
    logger.debug(`📤 Iniciando petición ${method} ${url}`, { requestId });
    
    // Configuración base para la petición
    const config = {
      method,
      url,
      headers,
      cancelToken: source.token,
      data: null,
      ...options,
    };

    if (data) {
      config.data = data;
    }
    
    // Intentar la petición con reintentos
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        const response = await this.api(config);
        
        // Registrar petición exitosa
        const duration = Date.now() - startTime;
        logger.debug(`📥 Respuesta recibida ${method} ${url} (${duration}ms)`, {
          status: response.status,
          requestId
        });
        
        // Actualizar métricas
        metricService.trackApiCall(url, duration, true);
        
        // Restablecer contador de fallos del circuit breaker
        this.resetCircuitBreaker();
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Categorizar error
        const errorInfo = errorHandler.categorizeError(error);
        
        // Registrar error
        logger.error(`🔥 Error en petición ${method} ${url} (intento ${attempt}/${maxAttempts})`, {
          errorType: errorInfo.type,
          message: errorInfo.message,
          status: error.response?.status,
          requestId
        });
        
        // Determinar si se debe reintentar
        const isRetryable = this.isRetryableError(error, retryConfig);
        const shouldRetry = attempt < maxAttempts && isRetryable;
        
        if (shouldRetry) {
          // Calcular tiempo de espera con backoff exponencial
          const delay = errorHandler.calculateRetryDelay(attempt, baseDelay, 10000, errorInfo);
          logger.debug(`⏱️ Reintentando en ${delay}ms...`, { requestId });
          await this.sleep(delay);
        } else {
          // Incrementar contador de fallos del circuit breaker
          this.incrementCircuitFailures();
          
          // Actualizar métricas
          metricService.trackApiCall(url, Date.now() - startTime, false);
          metricService.trackError(errorInfo.type, errorInfo.severity, {
            url,
            method,
            status: error.response?.status,
            message: errorInfo.message
          });
          
          // Si no se debe reintentar, propagar el error
          break;
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    errorHandler.logError(
      errorHandler.categorizeError(lastError),
      { method, url, attempts: attempt }
    );
    
    throw lastError;
  }

  /**
   * Verifica si un error es retriable
   * @param {Error} error - Error producido
   * @param {Object} retryConfig - Configuración de reintentos
   * @returns {boolean} - true si el error es retriable
   * @private
   */
  isRetryableError(error, retryConfig) {
    // Si hay código de estado, verificar si está en la lista de códigos retriables
    if (error.response && error.response.status) {
      return retryConfig.statusCodes.includes(error.response.status);
    }
    
    // Verificar errores de red
    if (error.code) {
      return retryConfig.networkErrors.includes(error.code);
    }
    
    // Errores de timeout generalmente son retriables
    if (error.message && error.message.includes('timeout')) {
      return true;
    }
    
    return false;
  }

  /**
   * Función auxiliar para esperar un tiempo determinado
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Método especializado para peticiones GET
   * @param {string} url - URL relativa
   * @param {Object} customHeaders - Headers adicionales
   * @param {Object} options - Opciones adicionales para axios
   * @returns {Promise<Object>} - Respuesta de la petición
   */
  async get(url, customHeaders = {}, options = {}) {
    return this.request('GET', url, null, customHeaders, options);
  }

  /**
   * Método especializado para peticiones POST
   * @param {string} url - URL relativa
   * @param {Object} data - Datos a enviar
   * @param {Object} customHeaders - Headers adicionales
   * @param {Object} options - Opciones adicionales para axios
   * @returns {Promise<Object>} - Respuesta de la petición
   */
  async post(url, data, customHeaders = {}, options = {}) {
    return this.request('POST', url, data, customHeaders, options);
  }

  /**
   * Método especializado para peticiones PUT
   * @param {string} url - URL relativa
   * @param {Object} data - Datos a enviar
   * @param {Object} customHeaders - Headers adicionales
   * @param {Object} options - Opciones adicionales para axios
   * @returns {Promise<Object>} - Respuesta de la petición
   */
  async put(url, data, customHeaders = {}, options = {}) {
    return this.request('PUT', url, data, customHeaders, options);
  }

  /**
   * Método especializado para peticiones DELETE
   * @param {string} url - URL relativa
   * @param {Object} customHeaders - Headers adicionales
   * @param {Object} options - Opciones adicionales para axios
   * @returns {Promise<Object>} - Respuesta de la petición
   */
  async delete(url, customHeaders = {}, options = {}) {
    return this.request('DELETE', url, null, customHeaders, options);
  }

  /**
   * Verifica el estado del circuit breaker antes de realizar una petición
   * @private
   */
  async checkCircuitBreaker() {
    const now = Date.now();
    
    // Si el circuito está abierto, verificar si es momento de probar conexión
    if (this.circuitState.status === 'open') {
      // Si aún no ha pasado el tiempo de timeout, rechazar inmediatamente
      if (now < this.circuitState.nextAttempt) {
        throw new Error('Circuit Breaker is open. Request rejected.');
      }
      
      // Cambiar a estado semi-abierto
      this.circuitState.status = 'half-open';
      logger.info('🔄 Circuit Breaker cambiado a estado semi-abierto');
    }
    
    // En estado semi-abierto, solo permitir un porcentaje de peticiones
    if (this.circuitState.status === 'half-open') {
      const random = Math.random();
      if (random > this.circuitConfig.semiOpenRate) {
        throw new Error('Circuit Breaker is half-open. Request rejected by rate limiter.');
      }
    }
  }

  /**
   * Incrementa el contador de fallos del circuit breaker
   * @private
   */
  incrementCircuitFailures() {
    this.circuitState.failures++;
    this.circuitState.lastFailure = Date.now();
    
    // Verificar si se debe abrir el circuito
    if (this.circuitState.failures >= this.circuitConfig.threshold) {
      this.circuitState.status = 'open';
      this.circuitState.nextAttempt = Date.now() + this.circuitConfig.timeout;
      
      logger.warn(`🔌 Circuit Breaker abierto. Próximo intento en ${this.circuitConfig.timeout / 1000}s`);
    }
  }

  /**
   * Restablece el estado del circuit breaker
   * @private
   */
  resetCircuitBreaker() {
    // Si el estado era semi-abierto y la petición tuvo éxito, cerrar el circuito
    if (this.circuitState.status === 'half-open' || this.circuitState.status === 'open') {
      logger.info('🔄 Circuit Breaker restablecido a estado cerrado');
    }
    
    this.circuitState = {
      status: 'closed',
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0
    };
  }

  /**
   * Obtiene el estado actual del circuit breaker
   * @returns {Object} - Estado del circuit breaker
   */
  getCircuitBreakerStatus() {
    return {
      ...this.circuitState,
      config: this.circuitConfig
    };
  }
}

module.exports = AxiosService;