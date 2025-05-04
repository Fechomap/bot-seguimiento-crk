// tests/unit/controllers/chatModeController.test.js
const ChatModeController = require('../../../src/controllers/chatModeController');
const SessionService = require('../../../src/services/sessionService');
const ExpedienteService = require('../../../src/services/expedienteService');
const ChatGPTService = require('../../../src/services/chatGPTService');
const { ExpedienteModel } = require('../../../src/models/expedienteModel');

// Mock ExpedienteModel local para el mock de ExpedienteService
class mockExpedienteModel {
  constructor() {
    this.expediente = '';
    this.nombre = '';
    this.vehiculo = '';
    this.estatus = '';
    this.servicio = '';
    this.destino = '';
  }

  actualizarDatosGenerales(data) {
    Object.assign(this, data);
  }
}

// Mock de TelegramBot
const mockBot = {
  sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
  editMessageText: jest.fn().mockResolvedValue({}),
  sendChatAction: jest.fn().mockResolvedValue({}),
  deleteMessage: jest.fn().mockResolvedValue({})
};

// Mock de ChatGPTService
// En el mock de ChatGPTService
jest.mock('../../../src/services/chatGPTService', () => {
  return jest.fn().mockImplementation(() => {
    return {
      procesarConsulta: jest.fn().mockImplementation(async (mensaje, datosExpediente) => {
        if (mensaje.includes('error')) {
          throw new Error('Error simulado en ChatGPT');
        }
        
        // Corregir aquí para reconocer "cuesta" y "costo"
        if (mensaje.includes('costo') || mensaje.includes('cuesta')) {
          return '💰 El costo total del servicio es de $1,250.00 MXN.';
        } else if (mensaje.includes('operador') || mensaje.includes('unidad')) {
          return '🚚 El operador asignado es Juan Pérez con la unidad tipo Plataforma #7.';
        } else if (mensaje.includes('ubicación') || mensaje.includes('donde')) {
          return '📍 La grúa está en camino. Tiempo estimado de llegada: 20 minutos.';
        } else {
          return 'Aquí tienes la información que solicitaste sobre el expediente EXP-12345.';
        }
      })
    };
  });
});

// Mock de ExpedienteService
jest.mock('../../../src/services/expedienteService', () => {
  return function() {
    return {
      obtenerExpedienteCompleto: jest.fn().mockImplementation(async (numeroExp) => {
        if (numeroExp === 'ERROR') {
          throw new Error('Expediente no encontrado');
        }
        
        const expediente = new mockExpedienteModel();
        expediente.actualizarDatosGenerales({
          expediente: numeroExp,
          nombre: 'Cliente Prueba',
          vehiculo: 'Honda Civic',
          estatus: 'A Contactar',
          servicio: 'Carretero',
          destino: 'CDMX'
        });
        
        return expediente;
      }),
      actualizarDatosExpediente: jest.fn().mockResolvedValue(new mockExpedienteModel()),
      getCachedExpediente: jest.fn().mockReturnValue(new mockExpedienteModel())
    };
  };
});

describe('ChatModeController', () => {
  let chatModeController;
  let sessionService;
  const chatId = 123456789;
  
  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Crear instancia del servicio de sesión
    sessionService = new SessionService();
    sessionService.initSession(chatId);
    
    // Crear instancia del controlador
    chatModeController = new ChatModeController(mockBot, sessionService);
  });
  
  test('debe inicializarse correctamente', () => {
    expect(chatModeController).toBeDefined();
    expect(chatModeController.bot).toBe(mockBot);
    expect(chatModeController.sessionService).toBe(sessionService);
    expect(chatModeController.chatGPTService).toBeDefined();
    expect(chatModeController.expedienteService).toBeDefined();
  });
  
  test('handleStart debe configurar correctamente la sesión', async () => {
    await chatModeController.handleStart(chatId);
    
    // Verificar que se envió el mensaje de bienvenida
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('¡Bienvenido al sistema de atención al cliente!'),
      expect.any(Object)
    );
    
    // Verificar que se actualizó la sesión
    const session = sessionService.getSession(chatId);
    expect(session.etapa).toBe('esperando_expediente_chat');
    expect(session.modoConversacional).toBe(true);
  });
  
  test('handleMessage debe detectar solicitud de cambio de modo', async () => {
    const result = await chatModeController.handleMessage(
      chatId,
      sessionService.getSession(chatId),
      '📊 Cambiar a modo tradicional'
    );
    
    expect(result).toEqual({ action: 'cambiar_modo', mode: 'traditional' });
  });
  
  test('handleExpedienteInput debe validar correctamente el formato de expediente', async () => {
    // Probar con un formato inválido
    await chatModeController.handleExpedienteInput(
      chatId,
      sessionService.getSession(chatId),
      'Este no es un número de expediente válido'
    );
    
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('necesito el *número de expediente*'),
      expect.any(Object)
    );
  });
  
  test('handleExpedienteInput debe consultar y almacenar un expediente válido', async () => {
    // Establecer estado inicial
    const session = sessionService.getSession(chatId);
    session.etapa = 'esperando_expediente_chat';
    sessionService.updateSession(chatId, session);
    
    // Ejecutar el método con un expediente válido
    const result = await chatModeController.handleExpedienteInput(
      chatId,
      session,
      'ABC-12345'
    );
    
    // Verificar que se consultó el expediente
    expect(chatModeController.expedienteService.obtenerExpedienteCompleto).toHaveBeenCalledWith('ABC-12345');
    
    // Verificar que se actualizó la sesión
    const updatedSession = sessionService.getSession(chatId);
    expect(updatedSession.etapa).toBe('chat_activo');
    expect(updatedSession.expediente).toBe('ABC-12345');
    expect(updatedSession.datosExpediente).toBeDefined();
    
    // Verificar que se enviaron los mensajes esperados
    expect(mockBot.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('¡Expediente encontrado!'),
      expect.any(Object)
    );
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Ejemplos de lo que puedes preguntar'),
      expect.any(Object)
    );
    
    // Verificar el resultado
    expect(result).toEqual({ action: 'continue' });
  });
  
  test('handleExpedienteInput debe manejar errores en la consulta', async () => {
    // Establecer estado inicial
    const session = sessionService.getSession(chatId);
    session.etapa = 'esperando_expediente_chat';
    sessionService.updateSession(chatId, session);
    
    // Ejecutar el método con un expediente que generará error
    const result = await chatModeController.handleExpedienteInput(
      chatId,
      session,
      'ERROR'
    );
    
    // Verificar que se intentó consultar el expediente
    expect(chatModeController.expedienteService.obtenerExpedienteCompleto).toHaveBeenCalledWith('ERROR');
    
    // Verificar que se eliminó el mensaje de carga
    expect(mockBot.deleteMessage).toHaveBeenCalled();
    
    // Verificar que se mostró el mensaje de error
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('No pude encontrar información'),
      expect.any(Object)
    );
    
    // Verificar el resultado
    expect(result).toEqual({ action: 'continue' });
  });
  
  test('handleChatActive debe detectar solicitud de cambio de expediente', async () => {
    // Establecer estado inicial
    const session = sessionService.getSession(chatId);
    session.etapa = 'chat_activo';
    session.expediente = 'ABC-12345';
    session.datosExpediente = new ExpedienteModel();
    sessionService.updateSession(chatId, session);
    
    // Ejecutar el método con solicitud de cambio
    const result = await chatModeController.handleChatActive(
      chatId,
      session,
      '🔄 Consultar otro expediente'
    );
    
    // Verificar que se actualizó la etapa
    expect(sessionService.getSession(chatId).etapa).toBe('esperando_expediente_chat');
    
    // Verificar que se envió el mensaje adecuado
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('ingresa el número del nuevo expediente'),
      expect.any(Object)
    );
    
    // Verificar el resultado
    expect(result).toEqual({ action: 'continue' });
  });
  
  test('processChatGPTQuery debe procesar correctamente consultas con ChatGPT', async () => {
    // Establecer estado inicial
    const session = sessionService.getSession(chatId);
    session.etapa = 'chat_activo';
    session.expediente = 'ABC-12345';
    session.datosExpediente = new ExpedienteModel();
    session.contextoConversacion = [];
    sessionService.updateSession(chatId, session);
    
    // Ejecutar el método con una consulta
    const result = await chatModeController.processChatGPTQuery(
      chatId,
      session,
      '¿Cuánto cuesta el servicio?'
    );
    
    // Verificar que se mostró indicador de escritura
    expect(mockBot.sendChatAction).toHaveBeenCalledWith(chatId, 'typing');
    
    // Verificar que se procesó la consulta
    expect(chatModeController.chatGPTService.procesarConsulta).toHaveBeenCalledWith(
      '¿Cuánto cuesta el servicio?',
      session.datosExpediente,
      session.contextoConversacion
    );
    
    // Verificar que se actualizó el contexto de conversación
    const updatedSession = sessionService.getSession(chatId);
    expect(updatedSession.contextoConversacion.length).toBe(2);
    expect(updatedSession.contextoConversacion[0].role).toBe('user');
    expect(updatedSession.contextoConversacion[1].role).toBe('assistant');
    
    // Verificar que se envió la respuesta
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('El costo total del servicio'),
      expect.any(Object)
    );
    
    // Verificar el resultado
    expect(result).toEqual({ action: 'continue' });
  });
  
  test('processChatGPTQuery debe manejar errores en la consulta', async () => {
    // Establecer estado inicial
    const session = sessionService.getSession(chatId);
    session.etapa = 'chat_activo';
    session.expediente = 'ABC-12345';
    session.datosExpediente = new ExpedienteModel();
    session.contextoConversacion = [];
    sessionService.updateSession(chatId, session);
    
    // Ejecutar el método con una consulta que generará error
    const result = await chatModeController.processChatGPTQuery(
      chatId,
      session,
      'Esto generará un error'
    );
    
    // Verificar que se mostró indicador de escritura
    expect(mockBot.sendChatAction).toHaveBeenCalledWith(chatId, 'typing');
    
    // Verificar que se intentó procesar la consulta
    expect(chatModeController.chatGPTService.procesarConsulta).toHaveBeenCalled();
    
    // Verificar que se mostró el mensaje de error
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Lo siento, tuve un problema'),
      expect.any(Object)
    );
    
    // Verificar el resultado
    expect(result).toEqual({ action: 'continue' });
  });
});