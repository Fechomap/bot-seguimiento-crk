import type { ReplyKeyboardMarkup, ReplyKeyboardRemove } from 'node-telegram-bot-api';
import type { DatosExpediente } from '../types/index.js';

/**
 * Genera un teclado tradicional para el menú principal
 */
export function getMainMenuKeyboard(): ReplyKeyboardMarkup {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    keyboard: [
      ['📊 Consultar Expediente'],
      ['📱 Mis Expedientes Recientes', '❓ Ayuda']
    ] as any,
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
  const opciones: string[][] = [];
  
  // Primera fila - Opciones principales
  opciones.push(['💰 Costo Total', '🚚 Unidad']);
  
  // Segunda fila - Opciones contextuales
  if (expedienteData?.estatus === 'A Contactar') {
    opciones.push(['📍 Ubicación', '⏰ Tiempos']);
  } else {
    opciones.push(['⏰ Tiempos', '📊 Estado']);
  }
  
  // Tercera fila - Acciones
  opciones.push(['🔄 Otro Expediente', '🏠 Menú Principal']);

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
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
