// tests/unit/utils/errorHandler.test.js
const errorHandler = require('../../../src/utils/errorHandler');

describe('errorHandler', () => {
  describe('categorizeError', () => {
    test('debe categorizar error de red', () => {
      const error = new Error('connection refused');
      error.code = 'ECONNREFUSED';
      
      const result = errorHandler.categorizeError(error);
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.NETWORK);
      expect(result.severity).toBe(errorHandler.SEVERITY.MEDIUM);
      expect(result.retryable).toBe(true);
    });

    test('debe categorizar error de timeout', () => {
      const error = new Error('timeout exceeded');
      error.code = 'ETIMEDOUT';
      
      const result = errorHandler.categorizeError(error);
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.TIMEOUT);
      expect(result.severity).toBe(errorHandler.SEVERITY.MEDIUM);
      expect(result.retryable).toBe(true);
    });

    test('debe categorizar error de autenticación', () => {
      const error = new Error('unauthorized');
      error.code = 401;
      
      const result = errorHandler.categorizeError(error);
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.AUTH);
      expect(result.severity).toBe(errorHandler.SEVERITY.HIGH);
      expect(result.retryable).toBe(false);
    });

    test('debe categorizar error de validación', () => {
      const error = new Error('invalid data');
      error.code = 400;
      
      const result = errorHandler.categorizeError(error);
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.VALIDATION);
      expect(result.severity).toBe(errorHandler.SEVERITY.LOW);
      expect(result.retryable).toBe(false);
    });

    test('debe categorizar error de rate limit', () => {
      const error = new Error('rate limit exceeded');
      error.code = 429;
      
      const result = errorHandler.categorizeError(error);
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.RATE_LIMIT);
      expect(result.severity).toBe(errorHandler.SEVERITY.MEDIUM);
      expect(result.retryable).toBe(true);
      expect(result.retryDelay).toBe(2000);
    });

    test('debe manejar error sin parámetros', () => {
      const result = errorHandler.categorizeError();
      
      expect(result.type).toBe(errorHandler.ERROR_TYPES.UNKNOWN);
      expect(result.severity).toBe(errorHandler.SEVERITY.MEDIUM);
    });
  });

  describe('shouldRetry', () => {
    test('debe reintentar errores de red', () => {
      const errorInfo = {
        type: errorHandler.ERROR_TYPES.NETWORK,
        retryable: true
      };
      
      const result = errorHandler.shouldRetry(errorInfo, 1, 3);
      expect(result).toBe(true);
    });

    test('no debe reintentar errores de autenticación', () => {
      const errorInfo = {
        type: errorHandler.ERROR_TYPES.AUTH,
        retryable: false
      };
      
      const result = errorHandler.shouldRetry(errorInfo, 1, 3);
      expect(result).toBe(false);
    });

    test('no debe reintentar si se alcanzó el máximo de intentos', () => {
      const errorInfo = {
        type: errorHandler.ERROR_TYPES.NETWORK,
        retryable: true
      };
      
      const result = errorHandler.shouldRetry(errorInfo, 3, 3);
      expect(result).toBe(false);
    });

    test('no debe reintentar errores fatales', () => {
      const errorInfo = {
        type: errorHandler.ERROR_TYPES.UNKNOWN,
        severity: errorHandler.SEVERITY.FATAL,
        retryable: true
      };
      
      const result = errorHandler.shouldRetry(errorInfo, 1, 3);
      expect(result).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    test('debe calcular delay con backoff exponencial', () => {
      const delay1 = errorHandler.calculateRetryDelay(1, 1000);
      const delay2 = errorHandler.calculateRetryDelay(2, 1000);
      const delay3 = errorHandler.calculateRetryDelay(3, 1000);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    test('debe respetar el delay máximo', () => {
      const delay = errorHandler.calculateRetryDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    test('debe usar delay específico del error', () => {
      const errorInfo = { retryDelay: 3000 };
      const delay = errorHandler.calculateRetryDelay(1, 1000, 10000, errorInfo);
      expect(delay).toBeGreaterThanOrEqual(2550); // 3000 * 0.85
      expect(delay).toBeLessThanOrEqual(3450); // 3000 * 1.15
    });
  });

  describe('getFriendlyMessage', () => {
    test('debe retornar mensaje amigable para error de red', () => {
      const errorInfo = { type: errorHandler.ERROR_TYPES.NETWORK };
      const message = errorHandler.getFriendlyMessage(errorInfo);
      
      expect(message).toContain('problemas de conexión');
    });

    test('debe retornar mensaje amigable para error de timeout', () => {
      const errorInfo = { type: errorHandler.ERROR_TYPES.TIMEOUT };
      const message = errorHandler.getFriendlyMessage(errorInfo);
      
      expect(message).toContain('tardando demasiado');
    });

    test('debe retornar mensaje amigable para error de OpenAI', () => {
      const errorInfo = { type: errorHandler.ERROR_TYPES.OPENAI };
      const message = errorHandler.getFriendlyMessage(errorInfo);
      
      expect(message).toContain('inteligencia artificial');
      expect(message).toContain('modo tradicional');
    });
  });

  describe('shouldSwitchMode', () => {
    test('debe cambiar modo para errores fatales', () => {
      const errorInfo = { severity: errorHandler.SEVERITY.FATAL };
      const result = errorHandler.shouldSwitchMode(errorInfo, 1);
      
      expect(result).toBe(true);
    });

    test('debe cambiar modo para errores persistentes de OpenAI', () => {
      const errorInfo = { type: errorHandler.ERROR_TYPES.OPENAI };
      const result = errorHandler.shouldSwitchMode(errorInfo, 2);
      
      expect(result).toBe(true);
    });

    test('no debe cambiar modo para errores simples', () => {
      const errorInfo = { type: errorHandler.ERROR_TYPES.NETWORK };
      const result = errorHandler.shouldSwitchMode(errorInfo, 1);
      
      expect(result).toBe(false);
    });
  });

  describe('logError', () => {
    test('debe registrar errores correctamente', () => {
      // Mock console.error
      const originalError = console.error;
      console.error = jest.fn();
      
      const errorInfo = {
        type: errorHandler.ERROR_TYPES.API,
        severity: errorHandler.SEVERITY.HIGH,
        message: 'Test error'
      };
      
      errorHandler.logError(errorInfo);
      
      expect(console.error).toHaveBeenCalled();
      const loggedContent = console.error.mock.calls[0][0];
      expect(loggedContent).toContain('ERROR CRÍTICO');
      
      console.error = originalError;
    });
  });
});