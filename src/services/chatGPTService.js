/**
 * Servicio optimizado para integración con OpenAI
 * Implementa caché inteligente, gestión de errores mejorada y optimización de tokens
 */

// Importar la biblioteca oficial de OpenAI
const { OpenAI } = require('openai');

// Importar servicios y utilidades
const cacheService = require('./cacheService');
const metricService = require('./metricService');
const openaiConfig = require('../config/openaiConfig');
const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger').createLogger('chatGPTService');

// Importar constructores de contexto y formateadores
const contextBuilder = require('../prompts/contextBuilder');
const responseFormatter = require('../prompts/responseFormatter');
const expedientePrompt = require('../prompts/expedientePrompt');

class ChatGPTService {
  /**
   * Constructor del servicio
   * @param {string} apiKey - Clave de API de OpenAI (opcional, por defecto toma de variables de entorno)
   */
  constructor(apiKey = process.env.OPENAI_API_KEY) {
    // Validar configuración
    if (!apiKey) {
      logger.warn('⚠️ OPENAI_API_KEY no configurada en variables de entorno');
    }
    
    // Inicializar cliente de OpenAI
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Obtener configuración
    this.config = openaiConfig.openaiConfig;
    this.model = this.config.defaultModel;
    
    // Flag para habilitar/deshabilitar caché
    this.useCaching = process.env.USE_OPENAI_CACHE !== 'false';
    
    // Tiempo de vida de respuestas en caché (1 día por defecto)
    this.cacheTTL = parseInt(process.env.OPENAI_CACHE_TTL || '86400', 10);
    
    // Umbral de similitud para consultas en caché (0-1)
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.85');
    
    logger.info('✅ Servicio ChatGPT inicializado', {
      model: this.model,
      caching: this.useCaching ? 'habilitado' : 'deshabilitado',
    });
  }

  /**
   * Procesa una consulta en lenguaje natural sobre un expediente con optimizaciones
   * @param {string} mensaje - Mensaje del usuario
   * @param {object} datosExpediente - Datos completos del expediente
   * @param {array} historicoMensajes - Historial de mensajes previos (opcional)
   * @returns {Promise<string>} - Respuesta formateada
   */
  async procesarConsulta(mensaje, datosExpediente, historicoMensajes = []) {
    // Validar parámetros
    if (!mensaje) {
      throw new Error('Se requiere un mensaje para procesar');
    }
    
    if (!datosExpediente) {
      throw new Error('Se requieren datos del expediente');
    }
    
    // Registrar inicio de procesamiento
    const startTime = Date.now();
    logger.info('🔍 Procesando consulta con ChatGPT', { 
      mensaje: mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : ''),
      expediente: datosExpediente.expediente
    });
    
    // Intentar obtener respuesta de caché si está habilitado
    if (this.useCaching) {
      const cachedResponse = this.buscarEnCache(mensaje, datosExpediente);
      if (cachedResponse) {
        const duration = Date.now() - startTime;
        logger.info(`✅ Respuesta obtenida desde caché (${duration}ms)`);
        
        // Actualizar métricas
        metricService.trackAICall(0, 0, duration);
        cacheService.updateCacheMetrics(1, 0);
        
        return cachedResponse;
      }
    }
    
    try {
      // Construir mensajes para la API
      const contexto = contextBuilder.buildExpedienteContext(datosExpediente);
      const messages = this._buildMessages(mensaje, contexto, historicoMensajes);
      
      // Determinar la configuración según tipo de prompt
      const promptConfig = openaiConfig.getConfigForPromptType('expediente');
      
      // Intentar obtener respuesta de OpenAI con reintentos
      const response = await this._callOpenAIWithRetry(messages, promptConfig);
      
      // Calcular duración
      const duration = Date.now() - startTime;
      
      // Formatear respuesta
      const formattedResponse = responseFormatter.formatResponse(response, datosExpediente);
      
      // Guardar en caché si está habilitado y cumple criterios
      if (this.useCaching && openaiConfig.shouldCacheResponse(mensaje, formattedResponse)) {
        this.guardarEnCache(mensaje, formattedResponse, datosExpediente);
      }
      
      // Actualizar métricas
      const tokensEstimados = {
        prompt: openaiConfig.estimateTokens(JSON.stringify(messages)),
        completion: openaiConfig.estimateTokens(formattedResponse)
      };
      
      metricService.trackAICall(
        tokensEstimados.prompt,
        tokensEstimados.completion,
        duration
      );
      
      logger.info(`✅ Respuesta generada en ${duration}ms`);
      
      return formattedResponse;
    } catch (error) {
      // Categorizar y registrar error
      const errorInfo = errorHandler.categorizeError(error);
      errorHandler.logError(errorInfo, { 
        operation: 'procesarConsulta',
        mensaje: mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : ''),
        expediente: datosExpediente.expediente
      });
      
      // Actualizar métricas
      metricService.trackError(errorInfo.type, errorInfo.severity, {
        operation: 'procesarConsulta',
        mensaje: mensaje.substring(0, 50)
      });
      
      // Verificar si debe cambiar automáticamente de modo
      const shouldSwitch = errorHandler.shouldSwitchMode(errorInfo, 1);
      
      // Obtener mensaje amigable para el usuario
      let friendlyMessage = errorHandler.getFriendlyMessage(errorInfo);
      
      // Añadir sugerencia de cambio de modo si corresponde
      if (shouldSwitch) {
        friendlyMessage += '\n\nPuedes usar el modo tradicional con botones para continuar sin problemas.';
      }
      
      return friendlyMessage;
    }
  }

  /**
   * Detecta la intención del usuario en un mensaje de forma optimizada
   * @param {string} mensaje - Mensaje del usuario
   * @returns {Promise<object>} - Intención detectada con confianza
   */
  async detectarIntencion(mensaje) {
    if (!mensaje) {
      return { 
        intencion: 'desconocida', 
        confianza: 0,
        tipo: null,
        campo: null
      };
    }
    
    const startTime = Date.now();
    logger.info('🔍 Detectando intención', { 
      mensaje: mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : '')
    });
    
    // Verificar si está en caché
    if (this.useCaching) {
      const cachedIntent = cacheService.get('intents', mensaje);
      if (cachedIntent) {
        logger.debug('✅ Intención obtenida desde caché');
        cacheService.updateCacheMetrics(1, 0);
        return cachedIntent;
      }
    }
    
    try {
      // Construir mensajes para la API
      const messages = [
        {
          role: 'system',
          content: expedientePrompt.intencionPrompt
        },
        {
          role: 'user',
          content: mensaje
        }
      ];
      
      // Configuración específica para detectar intención (baja temperatura)
      const config = openaiConfig.getConfigForPromptType('intencion');
      
      // Llamar a la API con menor cantidad de tokens
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens
      });
      
      const content = response.choices[0].message.content.trim();
      const duration = Date.now() - startTime;
      
      // Intentar parsear como JSON
      let intencion;
      try {
        intencion = JSON.parse(content);
      } catch (e) {
        logger.warn('⚠️ Error al parsear respuesta de intención', { error: e.message, content });
        intencion = { 
          intencion: 'desconocida', 
          confianza: 0,
          tipo: null,
          campo: null
        };
      }
      
      // Guardar en caché (tiempo de vida más largo para intenciones)
      if (this.useCaching) {
        cacheService.set('intents', mensaje, intencion, this.cacheTTL * 7);
      }
      
      // Registrar métricas
      const tokensEstimados = {
        prompt: openaiConfig.estimateTokens(JSON.stringify(messages)),
        completion: openaiConfig.estimateTokens(content)
      };
      
      metricService.trackAICall(
        tokensEstimados.prompt,
        tokensEstimados.completion,
        duration,
        intencion.intencion
      );
      
      logger.info(`✅ Intención detectada: ${intencion.intencion} (confianza: ${intencion.confianza})`, {
        duracion: duration
      });
      
      return intencion;
    } catch (error) {
      // Manejar error
      const errorInfo = errorHandler.categorizeError(error);
      errorHandler.logError(errorInfo, { operation: 'detectarIntencion' });
      
      // En caso de error, devolver intención desconocida
      return { 
        intencion: 'error', 
        confianza: 0,
        tipo: null,
        campo: null,
        error: errorInfo.message
      };
    }
  }

  /**
   * Construye el arreglo de mensajes para enviar a la API de OpenAI con optimización de tokens
   * @param {string} userMessage - Mensaje del usuario
   * @param {string} context - Contexto generado para el modelo
   * @param {array} historicoMensajes - Historial de mensajes previos
   * @returns {array} - Arreglo de mensajes para la API
   * @private
   */
  _buildMessages(userMessage, context, historicoMensajes) {
    // Mensaje del sistema con instrucciones y contexto
    const systemMessage = {
      role: 'system',
      content: expedientePrompt.getSystemPrompt(context)
    };
    
    // Limitar el contexto histórico para no exceder límites de tokens
    const truncatedHistory = openaiConfig.truncateContext(historicoMensajes);
    
    // Mensaje actual del usuario
    const currentUserMessage = {
      role: 'user',
      content: userMessage
    };
    
    // Construir arreglo completo de mensajes
    return [
      systemMessage,
      ...truncatedHistory,
      currentUserMessage
    ];
  }

  /**
   * Realiza la llamada a la API de OpenAI con gestión de reintentos
   * @param {array} messages - Mensajes para la API
   * @param {object} config - Configuración para la llamada
   * @returns {string} - Contenido de la respuesta
   * @private
   */
  async _callOpenAIWithRetry(messages, config = {}) {
    let attempt = 0;
    const maxAttempts = this.config.retry.attempts;
    let lastError = null;
    
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        // Configuración para la llamada a la API
        const apiConfig = {
          model: this.model,
          messages: messages,
          temperature: config.temperature || this.config.temperature,
          max_tokens: config.max_tokens || this.config.max_tokens,
          top_p: config.top_p || 1,
          frequency_penalty: config.frequency_penalty || 0,
          presence_penalty: config.presence_penalty || 0
        };
        
        // Registrar intento
        if (attempt > 1) {
          logger.info(`🔄 Reintentando llamada a OpenAI (intento ${attempt}/${maxAttempts})`);
        }
        
        // Realizar la llamada
        const response = await this.openai.chat.completions.create(apiConfig);
        
        // Extraer contenido de la respuesta
        return response.choices[0].message.content;
      } catch (error) {
        lastError = error;
        
        // Categorizar error
        const errorInfo = errorHandler.categorizeError(error);
        
        // Registrar error
        logger.warn(`⚠️ Error en llamada a OpenAI (intento ${attempt}/${maxAttempts})`, {
          errorType: errorInfo.type,
          message: errorInfo.message
        });
        
        // Determinar si se debe reintentar
        if (attempt < maxAttempts && errorInfo.retryable) {
          // Calcular tiempo de espera con backoff exponencial
          const delay = errorHandler.calculateRetryDelay(attempt, this.config.retry.delay, 10000, errorInfo);
          logger.debug(`⏱️ Esperando ${delay}ms antes de reintentar...`);
          await this._sleep(delay);
        } else {
          // Si no se debe reintentar, propagar el error
          break;
        }
      }
    }
    
    // Si todos los intentos fallaron, intentar usar respuesta predefinida
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Busca una respuesta similar en caché
   * @param {string} mensaje - Mensaje del usuario
   * @param {object} datosExpediente - Datos del expediente para contexto
   * @returns {string|null} - Respuesta desde caché o null si no se encuentra
   * @private
   */
  buscarEnCache(mensaje, datosExpediente) {
    // Intentar obtener respuesta exacta
    const exactMatch = cacheService.get('chatgpt', mensaje);
    if (exactMatch) {
      logger.debug('✅ Respuesta exacta encontrada en caché');
      return exactMatch;
    }
    
    // Si no hay match exacto, buscar respuesta similar
    const similarMatch = cacheService.findSimilar('chatgpt', mensaje, this.similarityThreshold);
    if (similarMatch) {
      logger.debug('✅ Respuesta similar encontrada en caché');
      return similarMatch;
    }
    
    return null;
  }

  /**
   * Guarda una respuesta en caché
   * @param {string} mensaje - Mensaje del usuario
   * @param {string} respuesta - Respuesta generada
   * @param {object} datosExpediente - Datos del expediente para contexto
   * @private
   */
  guardarEnCache(mensaje, respuesta, datosExpediente) {
    // Guardar en caché con metadatos para ayudar en búsquedas similares
    cacheService.set('chatgpt', mensaje, respuesta, this.cacheTTL, {
      query: mensaje,
      expedienteId: datosExpediente.expediente,
      timestamp: new Date().toISOString()
    });
    
    logger.debug('💾 Respuesta guardada en caché');
  }

  /**
   * Función auxiliar para esperar un tiempo determinado
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpia la caché de respuestas
   */
  clearCache() {
    cacheService.cleanup('chatgpt');
    logger.info('🧹 Caché de respuestas limpiada');
  }

  /**
   * Verifica la disponibilidad del servicio de OpenAI
   * @returns {Promise<boolean>} - true si el servicio está disponible
   */
  async checkHealth() {
    try {
      // Realizar una llamada simple para verificar disponibilidad
      await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return true;
    } catch (error) {
      logger.error('❌ Error al verificar disponibilidad de OpenAI', {
        error: error.message
      });
      
      return false;
    }
  }
}

module.exports = ChatGPTService;