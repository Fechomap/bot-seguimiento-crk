/**
 * Configuración centralizada para la integración con OpenAI
 * Define modelos, parámetros y estrategias para las llamadas a la API
 */

// Cargar configuraciones desde variables de entorno
const API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-0125';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);
const TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
const RETRY_ATTEMPTS = parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '2', 10);
const RETRY_DELAY = parseInt(process.env.OPENAI_RETRY_DELAY || '1000', 10);
const TIMEOUT = parseInt(process.env.OPENAI_TIMEOUT || '15000', 10);

// Validar configuración
if (!API_KEY) {
  console.warn('⚠️ Advertencia: OPENAI_API_KEY no está configurado en las variables de entorno');
}

/**
 * Configuración global para la API de OpenAI
 */
const openaiConfig = {
  apiKey: API_KEY,
  defaultModel: DEFAULT_MODEL,
  timeout: TIMEOUT,
  retry: {
    attempts: RETRY_ATTEMPTS,
    delay: RETRY_DELAY,
    // Códigos de error que provocan reintentos
    statusCodes: [429, 500, 502, 503, 504],
    // Errores específicos que provocan reintentos
    errorTypes: ['rate_limit_exceeded', 'server_error', 'timeout']
  },
  // Estrategia de fallback en caso de error persistente
  fallback: {
    // Respuestas genéricas para cada tipo de consulta
    responses: {
      costo: '💰 Lo siento, no pude obtener la información de costos en este momento. Por favor, intenta más tarde o usa el modo tradicional con botones.',
      unidad: '🚚 Lo siento, no pude obtener la información de la unidad en este momento. Por favor, intenta más tarde o usa el modo tradicional con botones.',
      ubicacion: '📍 Lo siento, no pude obtener la información de ubicación en este momento. Por favor, intenta más tarde o usa el modo tradicional con botones.',
      tiempos: '⏰ Lo siento, no pude obtener la información de tiempos en este momento. Por favor, intenta más tarde o usa el modo tradicional con botones.',
      default: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta más tarde o usa el modo tradicional con botones.'
    }
  }
};

/**
 * Configuraciones específicas para diferentes tipos de prompts
 */
const promptConfigs = {
  // Configuración para consultas sobre expedientes
  expediente: {
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  },
  
  // Configuración para detección de intenciones (requiere mayor precisión)
  intencion: {
    model: DEFAULT_MODEL,
    max_tokens: 100,
    temperature: 0.1, // Temperatura baja para respuestas más deterministas
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  },
  
  // Configuración para generación de respuestas sencillas
  simple: {
    model: DEFAULT_MODEL,
    max_tokens: 150,
    temperature: 0.5,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  }
};

/**
 * Calcula el número estimado de tokens para un texto
 * Esta es una estimación aproximada (promedio de 4 caracteres por token)
 * @param {string} text - Texto a analizar
 * @returns {number} - Número estimado de tokens
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Limita el contexto de conversación para no exceder el límite de tokens
 * @param {Array} messages - Mensajes del contexto de conversación
 * @param {number} maxTokens - Número máximo de tokens permitidos
 * @returns {Array} - Contexto ajustado
 */
function truncateContext(messages, maxTokens = 3000) {
  if (!messages || messages.length === 0) return [];
  
  // Comenzar con el mensaje del sistema (si existe)
  const systemMessage = messages.find(m => m.role === 'system');
  let result = systemMessage ? [systemMessage] : [];
  let tokenCount = systemMessage ? estimateTokens(systemMessage.content) : 0;
  
  // Filtrar mensajes que no son del sistema
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  // Si no hay mensajes de conversación, devolver solo el mensaje del sistema
  if (conversationMessages.length === 0) return result;
  
  // Garantizar que siempre se incluya el último mensaje del usuario
  const lastUserMessage = [...conversationMessages].reverse().find(m => m.role === 'user');
  
  // Si hay un último mensaje del usuario, reservar tokens para él
  if (lastUserMessage) {
    const lastUserTokens = estimateTokens(lastUserMessage.content);
    maxTokens -= lastUserTokens;
  }
  
  // Agregar mensajes desde el más reciente hasta agotar tokens
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i];
    
    // Evitar duplicar el último mensaje del usuario
    if (message === lastUserMessage) continue;
    
    const messageTokens = estimateTokens(message.content);
    
    // Si agregar este mensaje excedería el límite, detenerse
    if (tokenCount + messageTokens > maxTokens) break;
    
    // Agregar mensaje y actualizar contador
    result.push(message);
    tokenCount += messageTokens;
  }
  
  // Asegurar que el último mensaje del usuario esté al final
  if (lastUserMessage) {
    result.push(lastUserMessage);
  }
  
  // Ordenar por orden cronológico (primero sistema, luego conversación)
  result.sort((a, b) => {
    if (a.role === 'system') return -1;
    if (b.role === 'system') return 1;
    return 0;
  });
  
  return result;
}

/**
 * Obtiene la configuración adecuada según el tipo de consulta
 * @param {string} promptType - Tipo de prompt (expediente, intencion, simple)
 * @returns {Object} - Configuración para la API
 */
function getConfigForPromptType(promptType) {
  return promptConfigs[promptType] || promptConfigs.expediente;
}

/**
 * Determina si una respuesta debería ser almacenada en caché
 * @param {string} query - Consulta original
 * @param {string} response - Respuesta generada
 * @returns {boolean} - true si debe ser almacenada
 */
function shouldCacheResponse(query, response) {
  // No almacenar en caché respuestas de error o fallback
  if (response.includes('Lo siento, no pude') || 
      response.includes('error') || 
      response.includes('intenta más tarde')) {
    return false;
  }
  
  // No almacenar en caché consultas muy cortas
  if (query.length < 10) {
    return false;
  }
  
  // No almacenar en caché respuestas muy cortas
  if (response.length < 30) {
    return false;
  }
  
  return true;
}

module.exports = {
  openaiConfig,
  promptConfigs,
  estimateTokens,
  truncateContext,
  getConfigForPromptType,
  shouldCacheResponse
};