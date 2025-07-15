import type { ReplyKeyboardMarkup, ReplyKeyboardRemove } from 'node-telegram-bot-api';
import type { DatosExpediente } from '../types/index.js';

/**
 * Genera un teclado tradicional para el menú principal
 */
export function getMainMenuKeyboard(): ReplyKeyboardMarkup {
  return {
    keyboard: [['📊 Seguimiento de Expediente']] as any,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/**
 * Genera un teclado tradicional para el menú de seguimiento
 */
export function getSeguimientoKeyboard(
  expedienteData: DatosExpediente | undefined
): ReplyKeyboardMarkup {
  const opciones: string[][] = [['💰 Costo del Servicio', '🚚 Datos de la Unidad']];

  // Agregar opción de ubicación si el estatus es "A Contactar"
  if (expedienteData?.estatus === 'A Contactar') {
    opciones.push(['📍 Ubicación y Tiempo Restante']);
  }

  // Agregar opciones adicionales
  opciones.push(['⏰ Tiempos', '🔄 Consultar otro Expediente']);

  return {
    keyboard: opciones as any,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/**
 * Elimina el teclado actual
 */
export function removeKeyboard(): ReplyKeyboardRemove {
  return {
    remove_keyboard: true,
  };
}

/**
 * Genera un teclado inline con botones
 */
export function getInlineKeyboard(buttons: Array<{ text: string; callback_data: string }>): {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
} {
  return {
    inline_keyboard: buttons.map((button) => [button]),
  };
}
