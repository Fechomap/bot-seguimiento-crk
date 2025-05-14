import dayjs from 'dayjs';

/**
 * Formatea un valor numérico como moneda ($XX.XX)
 * @param {number|string} value - Valor a formatear
 * @returns {string} - Valor formateado como moneda
 */
export function formatCurrency(value) {
  return `$${parseFloat(value).toFixed(2)}`;
}

/**
 * Formatea una fecha en formato DD/MM/YY HH:MM con formato Markdown para horas
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada o 'N/A' si es nula
 */
export function formatDateTime(date) {
  return date ? dayjs(date).format("DD/MM/YY *HH:mm*") : 'N/A';
}

/**
 * Convierte un código hexadecimal a nombre de color en español
 * @param {string} hex - Código de color hexadecimal
 * @returns {string} - Nombre del color en español o el mismo código si no hay mapeo
 */
export function hexToColorName(hex) {
  if (!hex) return 'N/A';
  // Normalizar a minúsculas para la comparación
  const hexNormalized = hex.toLowerCase();
  
  // Mapeo de los 20 colores más comunes
  const colorMap = {
    "#ffffff": "Blanco",
    "#000000": "Negro",
    "#ff0000": "Rojo",
    "#00ff00": "Verde",
    "#0000ff": "Azul",
    "#ffff00": "Amarillo",
    "#00ffff": "Cian",
    "#ff00ff": "Magenta",
    "#c0c0c0": "Plata",
    "#808080": "Gris",
    "#800000": "Marrón",
    "#808000": "Oliva",
    "#008000": "Verde Oscuro",
    "#800080": "Púrpura",
    "#008080": "Teal",
    "#000080": "Azul Marino",
    "#ffa500": "Naranja",
    "#f5f5dc": "Beige",
    "#a52a2a": "Marrón",
    "#ffc0cb": "Rosa"
  };
  
  return colorMap[hexNormalized] || hex;
}