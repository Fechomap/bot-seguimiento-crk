/**
 * Valida que el número de expediente tenga el formato correcto
 */
export function validateExpedienteNumber(numeroExp: string | undefined | null): boolean {
  if (!numeroExp) return false;

  // Solo letras, números, espacios y guiones
  const pattern = /^[a-zA-Z0-9\s-]*$/;
  return pattern.test(numeroExp.trim());
}

/**
 * Sanitiza una entrada para prevenir caracteres potencialmente peligrosos
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';

  // Eliminar caracteres potencialmente peligrosos
  return input.replace(/[^\w\s-]/g, '').trim();
}

/**
 * Valida si una cadena es un número válido
 */
export function isValidNumber(value: string): boolean {
  return !Number.isNaN(Number(value)) && value.trim() !== '';
}

/**
 * Valida si una cadena tiene una longitud mínima
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Valida si una cadena tiene una longitud máxima
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength;
}
