import { Keyboard } from 'grammy';
import type { DatosExpediente } from '../types/index.js';

/**
 * Genera un teclado tradicional para el menú principal
 */
export function getMainMenuKeyboard(): Keyboard {
  return new Keyboard().text('📊 Consultar Expediente').row().text('❓ Ayuda').resized();
}

/**
 * Genera un teclado tradicional para el menú de seguimiento
 */
export function getSeguimientoKeyboard(expedienteData: DatosExpediente | undefined): Keyboard {
  const keyboard = new Keyboard();

  // Primera fila - Opciones principales
  keyboard.text('💰 Costo Total').text('🚚 Unidad').row();

  // Segunda fila - Opciones contextuales según estatus
  const estatusConUbicacion = ['A Contactar'];
  const debeMostrarUbicacion = estatusConUbicacion.includes(expedienteData?.estatus || '');

  if (debeMostrarUbicacion) {
    // Para servicios en tránsito: mostrar ubicación y tiempos
    keyboard.text('📍 Ubicación').text('⏰ Tiempos');
  } else {
    // Para otros estatus: solo tiempos y estado
    keyboard.text('⏰ Tiempos').text('📊 Estado');
  }

  return keyboard.resized();
}

/**
 * Elimina el teclado actual
 */
export function removeKeyboard(): { remove_keyboard: true } {
  return { remove_keyboard: true };
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
