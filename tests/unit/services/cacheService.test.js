// tests/unit/services/cacheService.test.js
const cacheService = require('../../../src/services/cacheService');
const cacheConfig = require('../../../src/config/cacheConfig');

describe('CacheService', () => {
  // Limpiar todas las cachés antes de cada prueba
  beforeEach(() => {
    // Acceder a las cachés internas directamente para limpiarlas
    Object.keys(cacheService.caches).forEach(cacheType => {
      cacheService.caches[cacheType].clear();
    });
    
    // Restablecer estadísticas
    cacheService.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      lastCleanup: Date.now()
    };
  });

  describe('Operaciones básicas', () => {
    test('debe almacenar y recuperar valores correctamente', () => {
      const cacheType = 'expediente';
      const key = 'ABC-12345';
      const value = { id: 'ABC-12345', nombre: 'Test Cliente' };
      
      // Almacenar valor
      const result = cacheService.set(cacheType, key, value);
      expect(result).toBe(true);
      
      // Recuperar valor
      const cachedValue = cacheService.get(cacheType, key);
      expect(cachedValue).toEqual(value);
      
      // Verificar estadísticas
      expect(cacheService.stats.sets).toBe(1);
      expect(cacheService.stats.hits).toBe(1);
      expect(cacheService.stats.misses).toBe(0);
    });
    
    test('debe retornar null para claves no existentes', () => {
      const result = cacheService.get('expediente', 'NO-EXISTE');
      expect(result).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
    });
    
    test('debe verificar correctamente la existencia de claves', () => {
      // Almacenar un valor
      cacheService.set('expediente', 'ABC-12345', { data: 'test' });
      
      // Verificar existencia
      expect(cacheService.has('expediente', 'ABC-12345')).toBe(true);
      expect(cacheService.has('expediente', 'NO-EXISTE')).toBe(false);
    });
    
    test('debe eliminar valores correctamente', () => {
      // Almacenar un valor
      cacheService.set('expediente', 'ABC-12345', { data: 'test' });
      
      // Verificar que existe
      expect(cacheService.has('expediente', 'ABC-12345')).toBe(true);
      
      // Eliminar
      const result = cacheService.delete('expediente', 'ABC-12345');
      expect(result).toBe(true);
      
      // Verificar que ya no existe
      expect(cacheService.has('expediente', 'ABC-12345')).toBe(false);
    });
  });

  describe('Expiración y limpieza', () => {
    test('debe respetar tiempo de expiración', async () => {
      // Almacenar con tiempo de vida corto (100ms)
      cacheService.set('expediente', 'TEMP-KEY', { data: 'temporal' }, 0.1);
      
      // Inmediatamente debe existir
      expect(cacheService.has('expediente', 'TEMP-KEY')).toBe(true);
      
      // Esperar a que expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Después de expirar no debe existir
      expect(cacheService.has('expediente', 'TEMP-KEY')).toBe(false);
      
      // Intentar recuperar valor expirado
      const result = cacheService.get('expediente', 'TEMP-KEY');
      expect(result).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
    });
    
    test('debe limpiar entradas expiradas', async () => {
      // Almacenar varias entradas con diferentes tiempos de vida
      cacheService.set('expediente', 'KEY1', { data: 'valor1' }, 0.1); // 100ms
      cacheService.set('expediente', 'KEY2', { data: 'valor2' }, 0.2); // 200ms
      cacheService.set('expediente', 'KEY3', { data: 'valor3' }, 10);  // 10s
      
      // Esperar a que expiren algunas
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Limpiar
      const removedCount = cacheService.cleanup('expediente');
      
      // Debe haber eliminado al menos una entrada
      expect(removedCount).toBe(1);
      expect(cacheService.has('expediente', 'KEY1')).toBe(false);
      expect(cacheService.has('expediente', 'KEY2')).toBe(true); // Aún no expira
      expect(cacheService.has('expediente', 'KEY3')).toBe(true); // Aún no expira
      
      // Esperar a que expire otra
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Limpiar de nuevo
      const secondRemoved = cacheService.cleanup('expediente');
      expect(secondRemoved).toBe(1);
      expect(cacheService.has('expediente', 'KEY2')).toBe(false);
      expect(cacheService.has('expediente', 'KEY3')).toBe(true);
    });
    
    test('debe limpiar todas las cachés', async () => {
      // Almacenar en diferentes cachés con tiempos cortos
      cacheService.set('expediente', 'EXP1', { data: 'exp' }, 0.1);
      cacheService.set('chatgpt', 'CHAT1', { data: 'chat' }, 0.1);
      cacheService.set('intents', 'INTENT1', { data: 'intent' }, 0.1);
      
      // Esperar a que expiren
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Limpiar todas
      const results = cacheService.cleanupAll();
      
      // Verificar resultados
      expect(results.expediente).toBe(1);
      expect(results.chatgpt).toBe(1);
      expect(results.intents).toBe(1);
      
      // Verificar que se actualizó lastCleanup
      expect(cacheService.stats.lastCleanup).toBeGreaterThan(0);
    });
  });

  describe('Estrategias de reemplazo', () => {
    test('debe aplicar estrategia LRU cuando se alcanza el límite', async () => {
      // Simular un límite bajo para la prueba
      const originalMaxItems = cacheConfig.cachePolicies.expediente.maxItems;
      const originalStrategy = cacheConfig.cachePolicies.expediente.replacementStrategy;
      
      // Ajustar configuración temporalmente
      cacheConfig.cachePolicies.expediente.maxItems = 3;
      cacheConfig.cachePolicies.expediente.replacementStrategy = 'lru';
      
      try {
        // Almacenar valores hasta alcanzar el límite
        cacheService.set('expediente', 'KEY1', { data: 'valor1' });
        await new Promise(resolve => setTimeout(resolve, 10));
        cacheService.set('expediente', 'KEY2', { data: 'valor2' });
        await new Promise(resolve => setTimeout(resolve, 10));
        cacheService.set('expediente', 'KEY3', { data: 'valor3' });
        
        // Acceder a KEY1 para hacerla más reciente
        cacheService.get('expediente', 'KEY1');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Añadir uno más para forzar reemplazo
        cacheService.set('expediente', 'KEY4', { data: 'valor4' });
        
        // Verificar que solo hay 3 elementos
        const stats = cacheService.getStats();
        expect(stats.sizes.expediente).toBe(3);
        
        // Verificar que KEY4 está presente
        expect(cacheService.has('expediente', 'KEY4')).toBe(true);
        
        // KEY1 debería estar presente porque fue accedida recientemente
        expect(cacheService.has('expediente', 'KEY1')).toBe(true);
        
        // Verificar que hay exactamente 3 elementos
        const totalPresent = 
          (cacheService.has('expediente', 'KEY1') ? 1 : 0) +
          (cacheService.has('expediente', 'KEY2') ? 1 : 0) +
          (cacheService.has('expediente', 'KEY3') ? 1 : 0) +
          (cacheService.has('expediente', 'KEY4') ? 1 : 0);
        
        expect(totalPresent).toBe(3);
      } finally {
        // Restaurar configuración
        cacheConfig.cachePolicies.expediente.maxItems = originalMaxItems;
        cacheConfig.cachePolicies.expediente.replacementStrategy = originalStrategy;
      }
    });
  });

  describe('Normalización de claves', () => {
    test('debe normalizar claves string', () => {
      const original = '  AbC-12345  ';
      const normalizada = 'abc-12345';
      
      // Almacenar con clave sin normalizar
      cacheService.set('expediente', original, { data: 'test' });
      
      // Recuperar con clave normalizada
      expect(cacheService.get('expediente', normalizada)).not.toBeNull();
    });
    
    test('debe generar hash para claves objeto', () => {
      const objetoClave = { id: 123, nombre: 'Test' };
      const valor = { resultado: 'datos de prueba' };
      
      // Almacenar con objeto como clave
      cacheService.set('chatgpt', objetoClave, valor);
      
      // Recuperar con el mismo objeto
      const objetoSimilar = { id: 123, nombre: 'Test' };
      const result = cacheService.get('chatgpt', objetoSimilar);
      expect(result).toEqual(valor);
    });
  });

  describe('Búsqueda por similitud', () => {
    test('debe encontrar consultas similares', () => {
      // Almacenar una consulta
      const consulta1 = '¿Cuánto cuesta el servicio?';
      const respuesta1 = 'El costo del servicio es $1,500';
      
      cacheService.set('chatgpt', consulta1, respuesta1, 3600, { query: consulta1 });
      
      // Buscar con consulta similar con umbral bajo
      const consultaSimilar = '¿Cuál es el costo del servicio?';
      const resultado = cacheService.findSimilar('chatgpt', consultaSimilar, 0.5);
      
      expect(resultado).toBe(respuesta1);
    });
    
    test('debe rechazar consultas no suficientemente similares', () => {
      // Almacenar una consulta
      const consulta1 = '¿Cuánto cuesta el servicio?';
      const respuesta1 = 'El costo del servicio es $1,500';
      
      cacheService.set('chatgpt', consulta1, respuesta1, 3600, { query: consulta1 });
      
      // Buscar con consulta no tan similar
      const consultaDiferente = '¿Dónde está la grúa en este momento?';
      const resultado = cacheService.findSimilar('chatgpt', consultaDiferente, 0.7);
      
      expect(resultado).toBeNull();
    });
  });

  describe('Estadísticas y métricas', () => {
    test('debe proporcionar estadísticas de uso', () => {
      // Generar algunas operaciones
      cacheService.set('expediente', 'KEY1', { data: 'valor1' });
      cacheService.get('expediente', 'KEY1');
      cacheService.get('expediente', 'NO-EXISTE');
      
      // Obtener estadísticas
      const stats = cacheService.getStats();
      
      // Verificar campos principales
      expect(stats).toHaveProperty('hits', 1);
      expect(stats).toHaveProperty('misses', 1);
      expect(stats).toHaveProperty('sets', 1);
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('sizes');
    });
  });

  // Limpiar después de todas las pruebas
  afterAll(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });
});