/**
 * Genera un teclado tradicional para el menú principal
 * @returns {Object} - Objeto de configuración del teclado
 */
export function getMainMenuKeyboard() {
  return {
    keyboard: [
      ['📊 Seguimiento de Expediente']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * Genera un teclado tradicional para el menú de seguimiento
 * @param {Object} expedienteData - Datos del expediente
 * @returns {Object} - Objeto de configuración del teclado
 */
export function getSeguimientoKeyboard(expedienteData) {
  const opciones = [
    ['💰 Costo del Servicio', '🚚 Datos de la Unidad']
  ];
  
  // Agregar opción de ubicación si el estatus es "A Contactar"
  if (expedienteData && expedienteData.estatus === 'A Contactar') {
    opciones.push(['📍 Ubicación y Tiempo Restante']);
  }
  
  // Agregar opciones adicionales
  opciones.push(['⏰ Tiempos', '🔄 Consultar otro Expediente']);
  
  return {
    keyboard: opciones,
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * Elimina el teclado actual
 * @returns {Object} - Objeto de configuración para eliminar teclado
 */
export function removeKeyboard() {
  return {
    remove_keyboard: true
  };
}