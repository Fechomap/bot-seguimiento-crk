import dayjs from 'dayjs';

/**
 * Formatea un valor numérico como moneda ($XX.XX)
 */
export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '$0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(numValue) ? '$0.00' : `$${numValue.toFixed(2)}`;
}

/**
 * Formatea una fecha en formato DD/MM/YY HH:MM con formato Markdown para horas
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  return date ? dayjs(date).format('DD/MM/YY *HH:mm*') : 'N/A';
}

/**
 * Formatea una fecha en formato DD/MM/YYYY
 */
export function formatDate(date: string | Date | undefined | null): string {
  return date ? dayjs(date).format('DD/MM/YYYY') : 'N/A';
}

/**
 * Formatea un tiempo en formato HH:mm
 */
export function formatTime(date: string | Date | undefined | null): string {
  return date ? dayjs(date).format('HH:mm') : 'N/A';
}

/**
 * Convierte un código hexadecimal a nombre de color en español
 */
export function hexToColorName(hex: string | undefined | null): string {
  if (!hex) return 'N/A';
  // Normalizar a minúsculas para la comparación
  const hexNormalized = hex.toLowerCase();

  // Mapeo de los 20 colores más comunes
  const colorMap: Record<string, string> = {
    '#ffffff': 'Blanco',
    '#000000': 'Negro',
    '#ff0000': 'Rojo',
    '#00ff00': 'Verde',
    '#0000ff': 'Azul',
    '#ffff00': 'Amarillo',
    '#00ffff': 'Cian',
    '#ff00ff': 'Magenta',
    '#c0c0c0': 'Plata',
    '#808080': 'Gris',
    '#800000': 'Marrón',
    '#808000': 'Oliva',
    '#008000': 'Verde Oscuro',
    '#800080': 'Púrpura',
    '#008080': 'Teal',
    '#000080': 'Azul Marino',
    '#ffa500': 'Naranja',
    '#f5f5dc': 'Beige',
    '#a52a2a': 'Marrón',
    '#ffc0cb': 'Rosa',
  };

  return colorMap[hexNormalized] || hex;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(numValue) ? '0' : numValue.toLocaleString('es-MX');
}

/**
 * Capitaliza la primera letra de una cadena
 */
export function capitalize(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
