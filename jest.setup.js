// jest.setup.js
require('dotenv').config();

// Variables de entorno de prueba
process.env.API_BASE_URL = 'https://test.api.com';
process.env.NODE_ENV = 'test';

// Mocks globales
jest.mock('./src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    time: jest.fn()
  })
}));

jest.mock('./src/services/metricService', () => ({
  trackApiCall: jest.fn(),
  trackError: jest.fn()
}));

jest.mock('./src/utils/errorHandler', () => ({
  categorizeError: jest.fn(() => ({
    type: 'test_error',
    severity: 'low',
    message: 'Test error',
    originalError: new Error('Test error')
  })),
  calculateRetryDelay: jest.fn(() => 1000),
  logError: jest.fn()
}));