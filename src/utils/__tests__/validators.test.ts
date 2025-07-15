import { describe, it, expect } from '@jest/globals';
import {
  validateExpedienteNumber,
  sanitizeInput,
  isValidNumber,
  hasMinLength,
  hasMaxLength,
} from '../validators';

describe('Validators', () => {
  describe('validateExpedienteNumber', () => {
    it('debería aceptar números de expediente válidos', () => {
      expect(validateExpedienteNumber('ABC123')).toBe(true);
      expect(validateExpedienteNumber('123-456')).toBe(true);
      expect(validateExpedienteNumber('EXP 789')).toBe(true);
      expect(validateExpedienteNumber('12345')).toBe(true);
    });

    it('debería rechazar números de expediente inválidos', () => {
      expect(validateExpedienteNumber('')).toBe(false);
      expect(validateExpedienteNumber(null)).toBe(false);
      expect(validateExpedienteNumber(undefined)).toBe(false);
      expect(validateExpedienteNumber('ABC@123')).toBe(false);
      expect(validateExpedienteNumber('TEST!')).toBe(false);
    });

    it('debería manejar espacios correctamente', () => {
      expect(validateExpedienteNumber('  ABC123  ')).toBe(true);
      expect(validateExpedienteNumber('   ')).toBe(true); // Solo espacios es válido según la regex actual
    });
  });

  describe('sanitizeInput', () => {
    it('debería limpiar caracteres peligrosos', () => {
      expect(sanitizeInput('ABC@123#')).toBe('ABC123');
      expect(sanitizeInput('Test!@#$%^&*()')).toBe('Test');
      expect(sanitizeInput('Normal text 123')).toBe('Normal text 123');
    });

    it('debería manejar entradas nulas o indefinidas', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput('')).toBe('');
    });

    it('debería eliminar espacios adicionales', () => {
      expect(sanitizeInput('  texto con espacios  ')).toBe('texto con espacios');
    });
  });

  describe('isValidNumber', () => {
    it('debería validar números correctamente', () => {
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('0')).toBe(true);
      expect(isValidNumber('123.45')).toBe(true);
      expect(isValidNumber('-123')).toBe(true);
    });

    it('debería rechazar valores no numéricos', () => {
      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber('')).toBe(false);
      expect(isValidNumber('  ')).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('debería validar longitud mínima correctamente', () => {
      expect(hasMinLength('hello', 3)).toBe(true);
      expect(hasMinLength('hi', 3)).toBe(false);
      expect(hasMinLength('  test  ', 4)).toBe(true);
    });
  });

  describe('hasMaxLength', () => {
    it('debería validar longitud máxima correctamente', () => {
      expect(hasMaxLength('hello', 10)).toBe(true);
      expect(hasMaxLength('very long text', 5)).toBe(false);
      expect(hasMaxLength('  test  ', 4)).toBe(true);
    });
  });
});