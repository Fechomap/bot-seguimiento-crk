// tests/unit/utils/intentDetector.test.js
const intentDetector = require('../../../src/utils/intentDetector');

describe('intentDetector', () => {
  
  describe('detectBasicIntent', () => {
    test('debe detectar intenciones relacionadas con costos', () => {
      const testCases = [
        '¿Cuánto cuesta el servicio?',
        '¿Cuál es el costo total?',
        'Quiero saber el precio',
        'Dime cuánto me van a cobrar',
        '¿Cuál es la tarifa?',
        '💰 Costo'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBe('costo');
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
    
    test('debe detectar intenciones relacionadas con la unidad o grúa', () => {
      const testCases = [
        '¿Quién es el operador de la grúa?',
        '¿Qué tipo de unidad viene?',
        'Dame los datos del chofer',
        'Necesito saber las placas de la grúa',
        '¿Cómo es el vehículo que me van a enviar?',
        '🚚 Datos de la unidad'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBe('unidad');
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
    
    test('debe detectar intenciones relacionadas con ubicación', () => {
      const testCases = [
        '¿Dónde está la grúa?',
        '¿Cuánto falta para que llegue?',
        'Quiero ver la ubicación en el mapa',
        '¿En qué parte va la unidad?',
        'Necesito saber el tiempo de llegada',
        '📍 Ubicación'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBe('ubicacion');
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
    
    test('debe detectar intenciones relacionadas con tiempos', () => {
      const testCases = [
        '¿A qué hora inició el servicio?',
        '¿Cuándo terminó el servicio?',
        'Quiero saber la hora de contacto',
        '¿Qué día fue el término?',
        'Necesito la duración total',
        '⏰ Tiempos'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBe('tiempos');
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
    
    test('debe manejar mensajes sin intención clara', () => {
      const testCases = [
        'Hola',
        'Buenos días',
        'Gracias por la información',
        'Ok',
        '¿Me pueden ayudar?'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBeNull();
        expect(result.confidence).toBeLessThan(0.4);
      });
    });
    
    test('debe tener confianza máxima para botones explícitos', () => {
      const testCases = [
        '💰 Costo',
        '💰 Costo del Servicio',
        '🚚 Datos de la unidad',
        '🚚 Datos de la Unidad o Grúa',
        '📍 Ubicación',
        '⏰ Tiempos'
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.confidence).toBe(1.0);
      });
    });
    
    test('debe manejar inputs inválidos', () => {
      const testCases = [
        null,
        undefined,
        '',
        123,
        {}
      ];
      
      testCases.forEach(message => {
        const result = intentDetector.detectBasicIntent(message);
        expect(result.intent).toBeNull();
        expect(result.confidence).toBe(0);
      });
    });
  });
  
  describe('requiresAIAnalysis', () => {
    test('debe identificar consultas complejas que requieren IA', () => {
      const testCases = [
        '¿Por qué el servicio es tan caro si solo recorrió 10 kilómetros?',
        'Quiero saber la diferencia entre el costo estimado y el final',
        'Explícame por qué hay un cargo por maniobras si no se realizaron',
        '¿Cuándo llegaría la grúa si hay tráfico en la zona?',
        'Compara el tiempo estimado con el tiempo real de llegada'
      ];
      
      testCases.forEach(message => {
        expect(intentDetector.requiresAIAnalysis(message)).toBe(true);
      });
    });
    
    test('no debe requerir IA para consultas simples o botones', () => {
      const testCases = [
        '💰 Costo',
        '🚚 Datos de la unidad',
        'Costo',
        'Tiempos',
        'OK',
        'Gracias'
      ];
      
      testCases.forEach(message => {
        expect(intentDetector.requiresAIAnalysis(message)).toBe(false);
      });
    });
  });
  
  describe('looksLikeExpedienteNumber', () => {
    test('debe identificar correctamente números de expediente válidos', () => {
      const validExpedientes = [
        'ABC-12345',
        'XYZ123',
        'EXP2022-01',
        '987654',
        'A-B-C-123'
      ];
      
      validExpedientes.forEach(expediente => {
        expect(intentDetector.looksLikeExpedienteNumber(expediente)).toBe(true);
      });
    });
    
    test('debe rechazar formatos que no parecen números de expediente', () => {
      const invalidExpedientes = [
        'Quiero consultar mi expediente',
        'El número es ABC-12345, ¿pueden verificarlo?',
        '@#$%^&*()',
        'AB',  // Demasiado corto
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ12345'  // Demasiado largo
      ];
      
      invalidExpedientes.forEach(expediente => {
        expect(intentDetector.looksLikeExpedienteNumber(expediente)).toBe(false);
      });
    });
    
    test('debe manejar inputs inválidos', () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        123,
        {}
      ];
      
      invalidInputs.forEach(input => {
        expect(intentDetector.looksLikeExpedienteNumber(input)).toBe(false);
      });
    });
  });
});