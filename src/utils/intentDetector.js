/**
 * Detector básico de intenciones
 * Proporciona una forma rápida de identificar intenciones comunes
 * sin necesidad de consultar la API de OpenAI para casos simples
 */

/**
 * Patrones para detección rápida de intenciones
 * @private
 */
const INTENT_PATTERNS = {
  costo: {
    keywords: ['costo', 'precio', 'valor', 'cobro', 'pago', 'tarifa', 'cuánto cuesta', 'total', 'cuánto'],
    regex: /(?:cu[aá]nto\s*(?:cuesta|cobrar|cuesta|costo|vale|valor|es)?|(?:qu[eé]|el|el\s*|del\s*|de\s*|)(?:costo|precio|valor|cobro|tarifa|total))/i
  },
  unidad: {
    keywords: ['grúa', 'unidad', 'operador', 'conductor', 'chofer', 'placas', 'vehículo', 'datos', 'camioneta'],
    regex: /(?:(?:la\s*)?(?:gr[uú]a|unidad|camioneta|operador|conductor|chofer|placas)|(?:datos|qui[eé]n|cual|informaci[oó]n)\s*(?:de\s*la\s*)?(gr[uú]a|unidad|operador)|(?:qu[eé]\s*tipo\s*de\s*(?:unidad|gr[uú]a)))/i
  },
  ubicacion: {
    keywords: ['ubicación', 'posición', 'dónde', 'donde', 'llega', 'llegada', 'mapa', 'maps', 'gps', 'cuándo llega'],
    regex: /(?:d[oó]nde|ubicaci[oó]n|posici[oó]n|mapa|maps|(?:cu[aá]ndo\s*)?(?:llega|llegar)|tiempo\s*(?:de\s*)?(?:(?:(?:estimado|restante)|llegar)|llegada)|en\s*(?:qu[eé])\s*(?:parte|zona))/i
  },
  tiempos: {
    keywords: ['tiempo', 'hora', 'horario', 'cuando', 'cuándo', 'contacto', 'término', 'término', 'duración', 'inicio'],
    regex: /(?:cu[aá]ndo|hora\s*(?:de|del|inicio|contacto)?|(?:tiempo|horario)\s*(?:de|del|contacto|t[eé]rmino|duraci[oó]n)|inicio|(?:t[eé]rmino|finaliz[oó]|fin)|(?:a\s*qu[eé]\s*hora))/i
  }
};

/**
 * Botones que activan intenciones específicas
 * @private
 */
const BUTTON_INTENTS = {
  '💰 Costo': 'costo',
  '💰 Costo del Servicio': 'costo',
  '🚚 Datos de la unidad': 'unidad',
  '🚚 Datos de la Unidad o Grúa': 'unidad',
  '📍 Ubicación': 'ubicacion',
  '📍 Ubicación y Tiempo Restante': 'ubicacion',
  '⏰ Tiempos': 'tiempos'
};

/**
 * Detecta la intención básica de un mensaje
 * @param {string} message - Mensaje a analizar
 * @returns {Object} - Intención detectada con nivel de confianza
 */
function detectBasicIntent(message) {
  if (!message || typeof message !== 'string') {
    return { intent: null, confidence: 0, originalMessage: message };
  }
  
  // Verificar primero si es un botón predefinido
  if (BUTTON_INTENTS[message]) {
    return {
      intent: BUTTON_INTENTS[message],
      confidence: 1.0, // Confianza máxima para botones explícitos
      originalMessage: message
    };
  }
  
  const normalizedMessage = message.toLowerCase().trim();
  
  // Resultados para todas las intenciones
  const results = {};
  let bestMatch = { intent: null, confidence: 0 };
  
  // Evaluar cada patrón de intención
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    // Calcular puntuación combinada
    let score = calculateIntentScore(normalizedMessage, patterns);
    results[intent] = score;
    
    // Actualizar mejor coincidencia
    if (score > bestMatch.confidence) {
      bestMatch = { intent, confidence: score };
    }
  }
  
  // Si la confianza es muy baja, considerar que no hay intención clara
  if (bestMatch.confidence < 0.4) {
    bestMatch.intent = null;
  }
  
  return {
    ...bestMatch,
    originalMessage: message
  };
}

/**
 * Calcula la puntuación de una intención basada en coincidencias
 * @param {string} message - Mensaje normalizado
 * @param {Object} patterns - Patrones para la intención
 * @returns {number} - Puntuación entre 0 y 1
 * @private
 */
function calculateIntentScore(message, patterns) {
  // Verificar coincidencia de expresión regular (mayor peso)
  const regexMatch = patterns.regex.test(message);
  
  // Contar palabras clave presentes
  let keywordMatches = 0;
  let totalKeywords = patterns.keywords.length;
  
  for (const keyword of patterns.keywords) {
    if (message.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  
  // Calcular puntuación combinada
  // 70% de peso para regex, 30% para palabras clave
  const regexScore = regexMatch ? 0.7 : 0;
  const keywordScore = totalKeywords > 0 ? (keywordMatches / totalKeywords) * 0.3 : 0;
  
  return regexScore + keywordScore;
}

/**
 * Determina si un mensaje podría requerir análisis adicional con IA
 * @param {string} message - Mensaje a analizar
 * @returns {boolean} - true si el mensaje es complejo y requiere IA
 */
function requiresAIAnalysis(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  const normalizedMessage = message.toLowerCase().trim();
  
  // Características que indican complejidad
  const isComplex = 
    normalizedMessage.split(' ').length > 6 || // Más de 6 palabras
    normalizedMessage.includes('?') || // Contiene pregunta
    /comparar|diferencia|mejor|peor|versus|vs|cuando|porque|explicar|detallar/.test(normalizedMessage);
  
  // Si ya es un botón explícito, no requiere análisis adicional
  const isExplicitButton = !!BUTTON_INTENTS[message];
  
  return isComplex && !isExplicitButton;
}

/**
 * Determina si un mensaje parece ser un número de expediente
 * @param {string} message - Mensaje a analizar
 * @returns {boolean} - true si parece ser un número de expediente
 */
function looksLikeExpedienteNumber(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  // Patrón general para números de expediente (alfanumérico con posibles guiones)
  return /^[a-zA-Z0-9\s-]{3,20}$/.test(message.trim());
}

module.exports = {
  detectBasicIntent,
  requiresAIAnalysis,
  looksLikeExpedienteNumber
};