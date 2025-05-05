const ChatModeController = require('../../../src/controllers/chatModeController');
const SessionService = require('../../../src/services/sessionService');
const AssistantService = require('../../../src/services/assistantService');

// Mock de TelegramBot
const mockBot = {
  sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
  editMessageText: jest.fn().mockResolvedValue({}),
  sendChatAction: jest.fn().mockResolvedValue({}),
  deleteMessage: jest.fn().mockResolvedValue({})
};

// Mock de AssistantService
jest.mock('../../../src/services/assistantService', () => {
  return jest.fn().mockImplementation(() => {
    return {
      createThread: jest.fn().mockResolvedValue('thread_123'),
      processMessage: jest.fn().mockResolvedValue('Respuesta del assistant')
    };
  });
});

describe('ChatModeController', () => {
  let chatModeController;
  let sessionService;
  const chatId = 123456789;
  
  beforeEach(() => {
    jest.clearAllMocks();
    sessionService = new SessionService();
    sessionService.initSession(chatId);
    chatModeController = new ChatModeController(mockBot, sessionService);
  });
  
  test('debe procesar correctamente consultas con Assistant', async () => {
    const session = sessionService.getSession(chatId);
    session.etapa = 'chat_activo';
    session.datosExpediente = { expediente: 'TEST-001' };
    sessionService.updateSession(chatId, session);
    
    const result = await chatModeController.processChatGPTQuery(
      chatId,
      session,
      '¿Cuánto cuesta el servicio?'
    );
    
    expect(chatModeController.assistantService.createThread).toHaveBeenCalled();
    expect(chatModeController.assistantService.processMessage).toHaveBeenCalledWith(
      'thread_123',
      '¿Cuánto cuesta el servicio?'
    );
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Respuesta del assistant',
      { parse_mode: 'Markdown' }
    );
    expect(result).toEqual({ action: 'continue' });
  });
});