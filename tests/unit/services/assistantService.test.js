const AssistantService = require('../../../src/services/assistantService');
const { OpenAI } = require('openai');

jest.mock('openai');

describe('AssistantService', () => {
  let assistantService;
  let mockOpenAI;

  beforeEach(() => {
    mockOpenAI = {
      beta: {
        threads: {
          create: jest.fn(),
          messages: {
            create: jest.fn(),
            list: jest.fn()
          },
          runs: {
            create: jest.fn(),
            retrieve: jest.fn(),
            submitToolOutputs: jest.fn()
          }
        }
      }
    };
    
    OpenAI.mockImplementation(() => mockOpenAI);
    assistantService = new AssistantService();
  });

  describe('createThread', () => {
    test('debe crear un thread correctamente', async () => {
      const mockThread = { id: 'thread_123' };
      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      
      const threadId = await assistantService.createThread();
      
      expect(threadId).toBe('thread_123');
      expect(mockOpenAI.beta.threads.create).toHaveBeenCalled();
    });
  });

  describe('processMessage', () => {
    test('debe procesar un mensaje correctamente', async () => {
      const threadId = 'thread_123';
      const message = '¿Cuánto cuesta el servicio?';
      const expectedResponse = 'El costo del servicio es $1,500';

      // Mock de todos los pasos del proceso
      mockOpenAI.beta.threads.messages.create.mockResolvedValue({});
      
      const mockRun = { id: 'run_123', status: 'completed' };
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue(mockRun);
      
      mockOpenAI.beta.threads.messages.list.mockResolvedValue({
        data: [{ content: [{ text: { value: expectedResponse } }] }]
      });

      const response = await assistantService.processMessage(threadId, message);

      expect(response).toBe(expectedResponse);
      expect(mockOpenAI.beta.threads.messages.create).toHaveBeenCalledWith(
        threadId,
        { role: "user", content: message }
      );
    });
  });

  // Más tests...
});