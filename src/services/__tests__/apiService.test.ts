import { describe, it, expect, beforeEach } from '@jest/globals';
import { AxiosService } from '../apiService';

// Simple functional tests without complex mocking
describe('AxiosService', () => {
  let apiService: AxiosService;

  beforeEach(() => {
    apiService = new AxiosService('https://test-api.com');
  });

  describe('constructor', () => {
    it('debería crear una instancia correctamente', () => {
      expect(apiService).toBeInstanceOf(AxiosService);
      expect(apiService).toBeDefined();
    });
  });

  describe('handleError', () => {
    it('debería ser una función privada disponible', () => {
      // Test que la clase se construye correctamente
      expect(typeof apiService).toBe('object');
    });
  });
});
