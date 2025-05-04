// tests/unit/services/apiService.test.js

// Mock de variables de entorno primero
process.env.API_BASE_URL = 'https://test.api.com';

// Mock del logger antes de importar lo demás
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    time: () => {}
  })
}));

// Mock del metricService
jest.mock('../../../src/services/metricService', () => ({
  trackApiCall: () => {},
  trackError: () => {}
}));

// Mock de apiConfig
jest.mock('../../../src/config/apiConfig', () => ({
  globalConfig: { headers: {}, rejectUnauthorized: false },
  mainApiConfig: {
    timeout: 5000,
    retry: { 
      attempts: 2,
      delay: 1000,
      statusCodes: [500, 502, 503, 504],
      networkErrors: ['ECONNRESET', 'ECONNREFUSED']
    },
    circuitBreaker: {
      timeout: 30000,
      threshold: 5,
      semiOpenRate: 0.1
    }
  }
}));

// Mock axios
jest.mock('axios');

const AxiosService = require('../../../src/services/apiService');
const axios = require('axios');

describe('AxiosService', () => {
  let apiService;
  const baseURL = 'https://test.api.com';

  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Mock de CancelToken
    const mockCancelTokenSource = {
      token: {},
      cancel: jest.fn()
    };
    
    axios.CancelToken = {
      source: jest.fn(() => mockCancelTokenSource)
    };
    
    // Mock de axios.create que retorna una instancia mock
    const mockAxiosInstance = jest.fn();
    axios.create.mockReturnValue(mockAxiosInstance);
    
    apiService = new AxiosService(baseURL);
  });

  test('debe inicializarse correctamente', () => {
    expect(apiService).toBeDefined();
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: baseURL
      })
    );
    expect(apiService.api).toBeDefined();
  });

  describe('request()', () => {
    test('debe realizar petición GET exitosa', async () => {
      const mockResponse = { data: { success: true } };
      
      // Configurar el mock de api para que funcione como una función
      apiService.api.mockResolvedValue(mockResponse);
      
      const result = await apiService.request('GET', '/test');
      
      expect(result).toEqual(mockResponse.data);
      expect(apiService.api).toHaveBeenCalled();
    });

    test('debe manejar errores de petición', async () => {
      const mockError = new Error('Network error');
      mockError.code = 'ECONNRESET';
      
      // Configurar el mock de api para que falle
      apiService.api.mockRejectedValue(mockError);
      
      await expect(apiService.request('GET', '/test'))
        .rejects.toThrow('Network error');
    });

    test('debe reintentar peticiones fallidas', async () => {
      const mockError = new Error('Retry error');
      mockError.code = 'ECONNRESET';
      mockError.response = { status: 500 };
      
      let callCount = 0;
      
      apiService.api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw mockError;
        }
        return { data: { success: true } };
      });
      
      apiService.isRetryableError = jest.fn().mockReturnValue(true);
      
      const result = await apiService.request('GET', '/test');
      
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    });
  });

  describe('isRetryableError()', () => {
    test('debe identificar errores retriables por código HTTP', () => {
      const error = { response: { status: 500 } };
      const retryConfig = { statusCodes: [500] };
      
      const result = apiService.isRetryableError(error, retryConfig);
      expect(result).toBe(true);
    });

    test('debe identificar errores retriables por código de red', () => {
      const error = { code: 'ECONNRESET' };
      const retryConfig = { networkErrors: ['ECONNRESET'] };
      
      const result = apiService.isRetryableError(error, retryConfig);
      expect(result).toBe(true);
    });

    test('debe identificar errores retriables por mensaje de timeout', () => {
      const error = { message: 'timeout exceeded' };
      const retryConfig = { networkErrors: [] };
      
      const result = apiService.isRetryableError(error, retryConfig);
      expect(result).toBe(true);
    });

    test('no debe identificar errores no retriables', () => {
      const error = { response: { status: 404 } };
      const retryConfig = { statusCodes: [500] };
      
      const result = apiService.isRetryableError(error, retryConfig);
      expect(result).toBe(false);
    });
  });

  describe('sleep()', () => {
    test('debe esperar el tiempo especificado', async () => {
      jest.useFakeTimers();
      
      const sleepPromise = apiService.sleep(1000);
      
      jest.runAllTimers();
      await sleepPromise;
      
      jest.useRealTimers();
    });
  });

  describe('Circuit Breaker', () => {
    test('checkCircuitBreaker() debe permitir peticiones cuando está cerrado', async () => {
      apiService.circuitState = { status: 'closed' };
      
      await expect(apiService.checkCircuitBreaker()).resolves.not.toThrow();
    });

    test('checkCircuitBreaker() debe rechazar peticiones cuando está abierto', async () => {
      apiService.circuitState = {
        status: 'open',
        nextAttempt: Date.now() + 10000
      };
      
      await expect(apiService.checkCircuitBreaker())
        .rejects.toThrow('Circuit Breaker is open');
    });

    test('getCircuitBreakerStatus() debe retornar el estado actual', () => {
      const status = apiService.getCircuitBreakerStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('failures');
      expect(status).toHaveProperty('config');
    });
  });

  describe('Métodos convenientes', () => {
    test('get() debe llamar a request() con método GET', async () => {
      // Spy on method
      const requestSpy = jest.spyOn(apiService, 'request').mockResolvedValue({ data: 'test' });
      
      await apiService.get('/test');
      
      expect(requestSpy).toHaveBeenCalledWith('GET', '/test', null, {}, {});
      
      requestSpy.mockRestore();
    });

    test('post() debe llamar a request() con método POST', async () => {
      const requestSpy = jest.spyOn(apiService, 'request').mockResolvedValue({ data: 'test' });
      const data = { test: true };
      
      await apiService.post('/test', data);
      
      expect(requestSpy).toHaveBeenCalledWith('POST', '/test', data, {}, {});
      
      requestSpy.mockRestore();
    });

    test('put() debe llamar a request() con método PUT', async () => {
      const requestSpy = jest.spyOn(apiService, 'request').mockResolvedValue({ data: 'test' });
      const data = { test: true };
      
      await apiService.put('/test', data);
      
      expect(requestSpy).toHaveBeenCalledWith('PUT', '/test', data, {}, {});
      
      requestSpy.mockRestore();
    });

    test('delete() debe llamar a request() con método DELETE', async () => {
      const requestSpy = jest.spyOn(apiService, 'request').mockResolvedValue({ data: 'test' });
      
      await apiService.delete('/test');
      
      expect(requestSpy).toHaveBeenCalledWith('DELETE', '/test', null, {}, {});
      
      requestSpy.mockRestore();
    });
  });
});