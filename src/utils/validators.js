/**
 * Valida que el número de expediente tenga el formato correcto
 * @param {string} numeroExp - Número de expediente a validar
 * @returns {boolean} - Verdadero si el formato es válido
 */
export function validateExpedienteNumber(numeroExp) {
  if (!numeroExp) return false;
  
  // Solo letras, números, espacios y guiones
  const pattern = /^[a-zA-Z0-9\s-]*$/;
  return pattern.test(numeroExp.trim());
}

/**
 * Sanitiza una entrada para prevenir caracteres potencialmente peligrosos
 * @param {string} input - Entrada a sanitizar
 * @returns {string} - Entrada sanitizada
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  // Eliminar caracteres potencialmente peligrosos
  return input.replace(/[^\w\s-]/g, '').trim();
}