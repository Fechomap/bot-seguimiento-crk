// tests/unit/prompts/contextBuilder.test.js
const contextBuilder = require('../../../src/prompts/contextBuilder');
const { ExpedienteModel } = require('../../../src/models/expedienteModel');

describe('contextBuilder', () => {
  let mockExpediente;
  
  beforeEach(() => {
    // Crear un expediente de prueba
    mockExpediente = new ExpedienteModel();
    mockExpediente.actualizarDatosGenerales({
      expediente: 'EXP-12345',
      nombre: 'Juan Pérez',
      vehiculo: 'Honda Civic 2022',
      estatus: 'A Contactar',
      servicio: 'Carretero',
      destino: 'Querétaro'
    });
    
    mockExpediente.actualizarDatosCosto({
      costo: 1250.00,
      km: 85,
      banderazo: 'A',
      casetaACobro: 150,
      maniobras: 100
    });
    
    mockExpediente.actualizarDatosUnidad({
      operador: 'Juan Pérez',
      tipoGrua: 'Plataforma',
      unidadOperativa: '7 Plataforma Tipo A',
      color: '#FFFFFF',
      placas: 'ABC-123'
    });
    
    mockExpediente.actualizarDatosUbicacion({
      ubicacionGrua: '19.4326,-99.1332',
      tiempoRestante: '20 minutos'
    });
    
    mockExpediente.actualizarDatosTiempos({
      tc: '2023-04-20T14:30:00',
      tt: null
    });
  });
  
  test('buildExpedienteContext debe crear un contexto completo', () => {
    const contexto = contextBuilder.buildExpedienteContext(mockExpediente);
    
    // Verificaciones generales
    expect(contexto).toBeDefined();
    expect(typeof contexto).toBe('string');
    
    // Debe contener secciones específicas
    expect(contexto).toContain('---DATOS GENERALES---');
    expect(contexto).toContain('---COSTOS---');
    expect(contexto).toContain('---DATOS DE LA UNIDAD---');
    expect(contexto).toContain('---UBICACIÓN Y TIEMPO---');
    expect(contexto).toContain('---TIEMPOS---');
    
    // Debe contener datos específicos del expediente
    expect(contexto).toContain('EXP-12345');
    expect(contexto).toContain('Juan Pérez');
    expect(contexto).toContain('Honda Civic 2022');
    expect(contexto).toContain('Carretero');
    expect(contexto).toContain('$1250.00');
    expect(contexto).toContain('Plataforma');
    expect(contexto).toContain('ABC-123');
    expect(contexto).toContain('20 minutos');
    expect(contexto).toContain('14:30');
  });
  
  test('buildExpedienteContext debe manejar correctamente coordenadas y URL de Google Maps', () => {
    const contexto = contextBuilder.buildExpedienteContext(mockExpediente);
    
    // Verificar que contenga las coordenadas y la URL
    expect(contexto).toContain('19.4326,-99.1332');
    expect(contexto).toContain('https://www.google.com/maps/search/');
  });
  
  test('buildExpedienteContext debe manejar datos faltantes', () => {
    // Crear expediente con datos incompletos
    const expedienteIncompleto = new ExpedienteModel();
    expedienteIncompleto.actualizarDatosGenerales({
      expediente: 'EXP-INCOMPLETO',
      nombre: 'Cliente Prueba'
      // Sin más datos
    });
    
    const contexto = contextBuilder.buildExpedienteContext(expedienteIncompleto);
    
    // Debe seguir formateando correctamente
    expect(contexto).toBeDefined();
    expect(contexto).toContain('EXP-INCOMPLETO');
    expect(contexto).toContain('Cliente Prueba');
    expect(contexto).toContain('No disponible');
  });
  
  test('buildExpedienteContext debe manejar expedientes nulos', () => {
    const contexto = contextBuilder.buildExpedienteContext(null);
    
    expect(contexto).toBeDefined();
    expect(contexto).toContain('No hay datos disponibles');
  });
  
  test('buildIntentContext debe crear un contexto resumido para detección de intenciones', () => {
    const contexto = contextBuilder.buildIntentContext(mockExpediente);
    
    // Verificaciones generales
    expect(contexto).toBeDefined();
    expect(typeof contexto).toBe('string');
    
    // Debe ser un formato resumido
    expect(contexto.split('\n').length).toBe(1);
    
    // Debe contener datos esenciales
    expect(contexto).toContain('EXP-12345');
    expect(contexto).toContain('Juan Pérez');
    expect(contexto).toContain('Honda Civic 2022');
    expect(contexto).toContain('A Contactar');
    expect(contexto).toContain('Carretero');
  });
  
  test('buildIntentContext debe manejar expedientes nulos o incompletos', () => {
    // Probar con null
    expect(contextBuilder.buildIntentContext(null)).toContain('Sin datos');
    
    // Probar con expediente vacío
    const expedienteVacio = new ExpedienteModel();
    expect(contextBuilder.buildIntentContext(expedienteVacio)).toContain('N/A');
  });
});