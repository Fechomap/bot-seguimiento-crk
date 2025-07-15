import { describe, it, expect } from '@jest/globals';
import { validateExpedienteNumber } from '../../utils/validators';

describe('ExpedienteController', () => {
  describe('validación básica', () => {
    it('debería validar números de expediente correctamente', () => {
      expect(validateExpedienteNumber('EXP123')).toBe(true);
      expect(validateExpedienteNumber('123-ABC')).toBe(true);
      expect(validateExpedienteNumber('INVALID@!')).toBe(false);
    });

    it('debería rechazar entradas vacías', () => {
      expect(validateExpedienteNumber('')).toBe(false);
      expect(validateExpedienteNumber(null)).toBe(false);
      expect(validateExpedienteNumber(undefined)).toBe(false);
    });
  });
});
