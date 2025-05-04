// tests/unit/services/sessionService.test.js
const SessionService = require('../../../src/services/sessionService');

describe('SessionService', () => {
  let sessionService;
  const testChatId = 123456789;

  beforeEach(() => {
    sessionService = new SessionService();
  });

  test('initSession debería crear una nueva sesión para un chatId', () => {
    sessionService.initSession(testChatId);
    expect(sessionService.hasSession(testChatId)).toBe(true);
    
    const session = sessionService.getSession(testChatId);
    expect(session).toHaveProperty('etapa', 'initial');
    expect(session).toHaveProperty('expediente', null);
    expect(session).toHaveProperty('datosExpediente', null);
    expect(session).toHaveProperty('modoConversacional', false);
  });

  test('updateSession debería actualizar una sesión existente', () => {
    // Crear sesión primero
    sessionService.initSession(testChatId);
    
    // Datos de actualización
    const updatedData = {
      etapa: 'esperando_numero_expediente',
      expediente: 'ABC-12345',
      datosExpediente: { nombre: 'Test User' },
      modoConversacional: true
    };
    
    // Actualizar sesión
    sessionService.updateSession(testChatId, updatedData);
    
    // Verificar que se actualizó correctamente
    const session = sessionService.getSession(testChatId);
    expect(session).toHaveProperty('etapa', 'esperando_numero_expediente');
    expect(session).toHaveProperty('expediente', 'ABC-12345');
    expect(session.datosExpediente).toHaveProperty('nombre', 'Test User');
    expect(session).toHaveProperty('modoConversacional', true);
  });

  test('updateSessionField debería actualizar un campo específico', () => {
    // Crear sesión primero
    sessionService.initSession(testChatId);
    
    // Actualizar un campo específico
    sessionService.updateSessionField(testChatId, 'etapa', 'menu_seguimiento');
    
    // Verificar la actualización
    const session = sessionService.getSession(testChatId);
    expect(session).toHaveProperty('etapa', 'menu_seguimiento');
  });

  test('setConversationalMode debería cambiar el modo', () => {
    // Crear sesión primero
    sessionService.initSession(testChatId);
    
    // Cambiar a modo conversacional
    sessionService.setConversationalMode(testChatId, true);
    
    // Verificar el cambio
    const session = sessionService.getSession(testChatId);
    expect(session).toHaveProperty('modoConversacional', true);
    
    // Cambiar de vuelta a modo tradicional
    sessionService.setConversationalMode(testChatId, false);
    
    // Verificar el cambio
    const updatedSession = sessionService.getSession(testChatId);
    expect(updatedSession).toHaveProperty('modoConversacional', false);
  });

  test('deleteSession debería eliminar una sesión', () => {
    // Crear sesión primero
    sessionService.initSession(testChatId);
    
    // Verificar que existe
    expect(sessionService.hasSession(testChatId)).toBe(true);
    
    // Eliminar la sesión
    sessionService.deleteSession(testChatId);
    
    // Verificar que ya no existe
    expect(sessionService.hasSession(testChatId)).toBe(false);
    expect(sessionService.getSession(testChatId)).toBeNull();
  });

  test('cleanOldSessions debería eliminar sesiones antiguas', () => {
    // Crear varias sesiones
    sessionService.initSession(testChatId);
    sessionService.initSession(987654321);
    
    // Modificar la última actualización de una sesión para que sea antigua
    sessionService.sessions[testChatId].ultimaActualizacion = new Date(Date.now() - (61 * 60 * 1000)); // 61 minutos atrás
    
    // Ejecutar limpieza con 60 minutos como límite
    sessionService.cleanOldSessions(60);
    
    // Verificar que la sesión antigua se eliminó pero la nueva permanece
    expect(sessionService.hasSession(testChatId)).toBe(false);
    expect(sessionService.hasSession(987654321)).toBe(true);
  });
});