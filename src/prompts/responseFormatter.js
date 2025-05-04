/**
 * Formateador de respuestas de ChatGPT
 * Procesa y formatea las respuestas de la API para presentarlas adecuadamente al usuario
 */

/**
 * Formatea una respuesta de ChatGPT para presentarla al usuario
 * @param {string} response - Respuesta cruda de ChatGPT
 * @param {Object} expedienteData - Datos del expediente (para verificación)
 * @returns {string} - Respuesta formateada
 */
function formatResponse(response, expedienteData) {
    // Si no hay respuesta, devolver mensaje de error
    if (!response) {
      return '❌ Lo siento, no pude procesar tu consulta. Por favor, intenta reformularla.';
    }
    
    // Limpiar la respuesta (eliminar espacios y líneas en blanco extra)
    let cleanedResponse = response.trim()
      .replace(/(\n\s*){3,}/g, '\n\n') // Eliminar más de 2 líneas vacías consecutivas
      .replace(/^\s*[-_*]+\s*$/gm, ''); // Eliminar líneas que solo contienen separadores
      
    // Verificar si la respuesta contiene Markdown y aplicar correcciones si es necesario
    cleanedResponse = fixMarkdownFormatting(cleanedResponse);
    
    // Verificar y corregir posibles errores o inconsistencias en los datos
    cleanedResponse = verifyFactualAccuracy(cleanedResponse, expedienteData);
    
    // Asegurar que la respuesta tenga al menos un emoji para mejorar la legibilidad
    cleanedResponse = ensureEmoji(cleanedResponse);
    
    return cleanedResponse;
  }
  
  /**
   * Corrige problemas comunes con el formato Markdown
   * @param {string} text - Texto a corregir
   * @returns {string} - Texto con formato Markdown corregido
   * @private
   */
  function fixMarkdownFormatting(text) {
    let corrected = text;
    
    // Corregir negrita (* vs **)
    corrected = corrected.replace(/\*([^*\n]+)\*/g, (match, content) => {
      // Si ya tiene ** correctamente aplicados, no hacer nada
      if (match.startsWith('**') && match.endsWith('**')) {
        return match;
      }
      return `**${content}**`;
    });
    
    // Corregir uso incorrecto de los enlaces
    corrected = corrected.replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (match, text, url) => {
      // Verificar si la URL es válida
      if (!url.startsWith('http')) {
        if (url.includes('maps')) {
          return `[${text}](https://www.google.com/maps)`;
        }
        return text;
      }
      return match;
    });
    
    // Asegurar que los encabezados tengan espacio después de #
    corrected = corrected.replace(/^(#{1,3})([^#\s])/gm, '$1 $2');
    
    return corrected;
  }
  
  /**
   * Verifica la precisión factual de la respuesta
   * @param {string} response - Respuesta a verificar
   * @param {Object} expedienteData - Datos del expediente
   * @returns {string} - Respuesta corregida
   * @private
   */
  function verifyFactualAccuracy(response, expedienteData) {
    // Si no hay datos del expediente, no podemos verificar
    if (!expedienteData) {
      return response;
    }
    
    let corrected = response;
    
    // Verificar que no se hayan inventado datos del operador
    if (expedienteData.unidad && expedienteData.unidad.operador) {
      const operadorReal = expedienteData.unidad.operador;
      // Buscar menciones a nombres de operadores que no coincidan
      const operadorRegex = new RegExp(`operador(?:[^a-zA-Z0-9]|\\s)*([a-zA-Z0-9]+(\\s[a-zA-Z0-9]+){1,3})`, 'i');
      const match = corrected.match(operadorRegex);
      
      if (match && match[1] && !operadorReal.includes(match[1]) && !match[1].includes(operadorReal)) {
        // Reemplazar el nombre incorrecto por el real
        corrected = corrected.replace(match[1], operadorReal);
      }
    }
    
    // Verificar datos de costo
    if (expedienteData.costo && expedienteData.costo.total) {
      const costoReal = parseFloat(expedienteData.costo.total);
      
      // Buscar menciones a costos que no coincidan
      const costoRegex = /\$\s*([0-9,]+(\.[0-9]{2})?)/g;
      let costoMatch;
      
      while ((costoMatch = costoRegex.exec(corrected)) !== null) {
        const mencionadoCosto = parseFloat(costoMatch[1].replace(/,/g, ''));
        
        // Si el costo mencionado es muy diferente al real (margen del 5%)
        if (mencionadoCosto > 0 && Math.abs(mencionadoCosto - costoReal) / costoReal > 0.05) {
          // Solo corregir si parece ser el costo total
          if (corrected.substr(costoMatch.index - 30, 60).includes('total')) {
            const costoFormateado = `$${costoReal.toFixed(2)}`;
            corrected = corrected.substring(0, costoMatch.index) + 
                        costoFormateado + 
                        corrected.substring(costoMatch.index + costoMatch[0].length);
          }
        }
      }
    }
    
    return corrected;
  }
  
  /**
   * Asegura que la respuesta contenga al menos un emoji para mejorar la legibilidad
   * @param {string} response - Respuesta a verificar
   * @returns {string} - Respuesta con emoji añadido si es necesario
   * @private
   */
  function ensureEmoji(response) {
    // Comprobar si ya tiene al menos un emoji
    const emojiRegex = /[\u{1F300}-\u{1F6FF}]/u;
    if (emojiRegex.test(response)) {
      return response;
    }
    
    // Si no tiene emoji, añadir uno apropiado al inicio según el contenido
    if (response.match(/costo|precio|valor|pago/i)) {
      return `💰 ${response}`;
    } else if (response.match(/unidad|grúa|plataforma|operador/i)) {
      return `🚚 ${response}`;
    } else if (response.match(/ubicación|ubicacion|mapa|tiempo.*llega/i)) {
      return `📍 ${response}`;
    } else if (response.match(/tiempo|hora|contacto|termino/i)) {
      return `⏰ ${response}`;
    } else {
      return `ℹ️ ${response}`;
    }
  }
  
  /**
   * Formatea una respuesta de error para presentarla al usuario
   * @param {Error} error - Error producido
   * @returns {string} - Mensaje de error formateado
   */
  function formatErrorResponse(error) {
    if (!error) {
      return '❌ Ha ocurrido un error desconocido.';
    }
    
    const errorMessage = error.message || 'Error desconocido';
    
    // Diferentes mensajes según el tipo de error
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return '🌐 Parece que hay problemas de conexión. Por favor, intenta más tarde o usa el modo tradicional con botones.';
    }
    
    if (errorMessage.includes('expediente no existe')) {
      return '❌ No se encontró el expediente solicitado. Por favor, verifica el número e intenta nuevamente.';
    }
    
    if (errorMessage.includes('token limit')) {
      return '⚠️ Tu consulta es demasiado compleja. Por favor, intenta simplificarla o usa el modo tradicional con botones.';
    }
    
    return '❌ Ha ocurrido un error al procesar tu consulta. Por favor, intenta nuevamente o usa el modo tradicional con botones.';
  }
  
  module.exports = {
    formatResponse,
    formatErrorResponse
  };