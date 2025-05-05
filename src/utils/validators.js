// src/utils/validators.js
/**
 * Utilidades para validar datos de entrada
 */

/**
 * Valida si un número de expediente tiene un formato válido
 * @param {string} expediente - Número de expediente a validar
 * @returns {boolean} - true si es válido, false en caso contrario
 */
function isValidExpedienteNumber(expediente) {
    if (!expediente || typeof expediente !== 'string') {
      return false;
    }
    
    // Solo permitir letras, números, espacios y guiones
    return /^[a-zA-Z0-9\s-]*$/.test(expediente);
  }
  
  /**
   * Valida si un mensaje de entrada es un comando válido
   * @param {string} mensaje - Mensaje a validar
   * @returns {boolean} - true si es un comando válido, false en caso contrario
   */
  function isValidCommand(mensaje) {
    if (!mensaje || typeof mensaje !== 'string') {
      return false;
    }
    
    const comandos = [
      '📊 Seguimiento de Expediente',
      '💰 Costo del Servicio',
      '🚚 Datos de la Unidad o Grúa',
      '📍 Ubicación y Tiempo Restante',
      '🔄 Consultar otro Expediente',
      '⏰ Tiempos',
      '📊 Usar menú tradicional',
      '💬 Volver a modo conversacional'
    ];
    
    return comandos.includes(mensaje);
  }
  
  /**
   * Identifica el tipo de consulta basado en un mensaje en lenguaje natural
   * Para ser utilizado en fase posterior con ChatGPT
   * @param {string} mensaje - Mensaje del usuario
   * @returns {string|null} - Tipo de consulta o null si no se identifica
   */
  function identifyQueryType(mensaje) {
    // Esta función se implementará en fases posteriores
    // Aquí solo se incluye un esqueleto básico
    
    const lowerMsg = mensaje.toLowerCase();
    
    if (/costo|precio|valor|cobro|pago/i.test(lowerMsg)) {
      return 'costo';
    }
    
    if (/grúa|unidad|operador|chofer|conductor|placas/i.test(lowerMsg)) {
      return 'unidad';
    }
    
    if (/ubicación|ubicacion|donde|dónde|llega|llegada|maps|mapa/i.test(lowerMsg)) {
      return 'ubicacion';
    }
    
    if (/tiempo|hora|horario|cuando|cuándo|contacto|termino|fin/i.test(lowerMsg)) {
      return 'tiempos';
    }
    
    return null;
  }
  
  module.exports = {
    isValidExpedienteNumber,
    isValidCommand,
    identifyQueryType
  };