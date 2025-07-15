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
      ['❓ Ayuda']
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
  
  // Primera fila - Resumen Completo (NUEVO BOTÓN PRINCIPAL)
  opciones.push(['📋 Resumen Completo']);
  
  // Segunda fila - Opciones principales
  opciones.push(['💰 Costo Total', '🚚 Unidad']);
  
  // Tercera fila - Opciones contextuales
  if (expedienteData?.estatus === 'A Contactar') {
    opciones.push(['📍 Ubicación', '⏰ Tiempos']);
  } else {
    opciones.push(['⏰ Tiempos', '📊 Estado']);
  }
  
  // Cuarta fila - Acciones
  opciones.push(['🔄 Otro Expediente']);

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
