import { describe, it, expect } from '@jest/globals';
import {
  formatCurrency,
  formatDateTime,
  hexToColorName,
  formatNumber,
  capitalize,
} from '../formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('debería formatear números como moneda', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(99.99)).toBe('$99.99');
      expect(formatCurrency('150.5')).toBe('$150.50');
    });

    it('debería manejar valores nulos o indefinidos', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('invalid')).toBe('$0.00');
    });
  });

  describe('formatDateTime', () => {
    it('debería formatear fechas correctamente', () => {
      const testDate = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(testDate);
      expect(result).toMatch(/15\/01\/24 \*14:30\*/);
    });

    it('debería retornar N/A para fechas inválidas', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
    });
  });

  describe('hexToColorName', () => {
    it('debería convertir códigos hex a nombres de colores', () => {
      expect(hexToColorName('#ffffff')).toBe('Blanco');
      expect(hexToColorName('#000000')).toBe('Negro');
      expect(hexToColorName('#ff0000')).toBe('Rojo');
      expect(hexToColorName('#FFFFFF')).toBe('Blanco'); // Case insensitive
    });

    it('debería retornar el código original para colores desconocidos', () => {
      expect(hexToColorName('#123abc')).toBe('#123abc');
    });

    it('debería manejar valores nulos', () => {
      expect(hexToColorName(null)).toBe('N/A');
      expect(hexToColorName(undefined)).toBe('N/A');
    });
  });

  describe('formatNumber', () => {
    it('debería formatear números con separadores de miles', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber('5000')).toBe('5,000');
    });

    it('debería manejar valores inválidos', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber('invalid')).toBe('0');
    });
  });

  describe('capitalize', () => {
    it('debería capitalizar texto correctamente', () => {
      expect(capitalize('hello world')).toBe('Hello world');
      expect(capitalize('UPPERCASE')).toBe('Uppercase');
      expect(capitalize('mixedCASE')).toBe('Mixedcase');
    });

    it('debería manejar cadenas vacías y nulas', () => {
      expect(capitalize('')).toBe('');
      expect(capitalize(null)).toBe('');
      expect(capitalize(undefined)).toBe('');
    });
  });
});