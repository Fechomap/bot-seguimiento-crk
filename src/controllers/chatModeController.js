/**
 * Controlador para el modo conversacional
 * Gestiona la interacción mediante lenguaje natural y la comunicación con OpenAI Assistant
 */
const AssistantService = require('../services/assistantService');
const ExpedienteService = require('../services/expedienteService');
const formatters = require('../utils/formatters');

class ChatModeController {
  /**
   * Constructor del controlador
   * @param {TelegramBot} bot - Instancia del bot de Telegram
   * @param {SessionService} sessionService - Servicio para gestionar sesiones de usuario
   */
  constructor(bot, sessionService) {
    this.bot = bot;
    this.sessionService = sessionService;
    this.assistantService = new AssistantService();
    this.expedienteService = new ExpedienteService();
  }

  /**
   * Maneja el inicio del modo conversacional
   * @param {number} chatId - ID del chat
   */
  async handleStart(chatId) {
    const welcomeMessage = `👋 *¡Bienvenido al sistema de atención al cliente!*

Ahora puedes consultar información de tu expediente mediante lenguaje natural. Para comenzar:

*¿Cuál es el número de expediente que deseas consultar?*`;

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [['📊 Cambiar a modo tradicional']],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });

    // Actualizar el estado del usuario
    const session = this.sessionService.getSession(chatId);
    session.etapa = 'esperando_expediente_chat';
    session.modoConversacional = true;
    this.sessionService.updateSession(chatId, session);
  }

  /**
   * Maneja los mensajes en el modo conversacional
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {string} mensaje - Texto del mensaje
   */
  async handleMessage(chatId, session, mensaje) {
    // Si es una solicitud para cambiar de modo, delegarla al controlador principal
    if (mensaje === '📊 Cambiar a modo tradicional') {
      return { action: 'cambiar_modo', mode: 'traditional' };
    }

    // Manejar según la etapa actual
    switch (session.etapa) {
      case 'esperando_expediente_chat':
        return await this.handleExpedienteInput(chatId, session, mensaje);
      case 'chat_activo':
        return await this.handleChatActive(chatId, session, mensaje);
      default:
        await this.bot.sendMessage(
          chatId,
          'ℹ️ Parece que hubo un problema. Por favor, escribe "/start" para reiniciar la conversación.'
        );
        return { action: 'continue' };
    }
  }

  /**
   * Maneja la entrada del número de expediente en modo conversacional
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {string} mensaje - Texto del mensaje (número de expediente)
   * @returns {Object} - Acción a realizar
   * @private
   */
  async handleExpedienteInput(chatId, session, mensaje) {
    // Verificar si el mensaje parece ser un número de expediente
    const isExpediente = mensaje.match(/^[a-zA-Z0-9\s-]{3,20}$/);
    
    if (!isExpediente) {
      // Si no parece un expediente, mostrar mensaje de ayuda
      await this.bot.sendMessage(
        chatId,
        'ℹ️ Para iniciar, necesito el *número de expediente* que quieres consultar. Por favor, ingresa un número de expediente válido.',
        { parse_mode: 'Markdown' }
      );
      return { action: 'continue' };
    }

    // Mostrar mensaje de carga
    const loadingMessage = await this.bot.sendMessage(
      chatId, 
      '🔍 Buscando información del expediente, un momento por favor...'
    );

    try {
      // Consultar el expediente completo
      const expedienteData = await this.expedienteService.obtenerExpedienteCompleto(mensaje);
      
      // Actualizar la sesión con los datos del expediente
      session.expediente = mensaje;
      session.datosExpediente = expedienteData;
      session.etapa = 'chat_activo';
      session.contextoConversacion = []; // Reiniciar el contexto de conversación
      this.sessionService.updateSession(chatId, session);

      // Editar el mensaje de carga para mostrar la confirmación
      await this.bot.editMessageText(
        `✅ *¡Expediente encontrado!*\n\nHe obtenido la información para ${expedienteData.nombre}. Ahora puedes preguntarme lo que necesites saber sobre este expediente.`,
        {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
          parse_mode: 'Markdown'
        }
      );

      // Enviar mensaje con ejemplos de preguntas
      const sugerencias = `💡 *Ejemplos de lo que puedes preguntar:*

• "¿Cuánto cuesta el servicio?"
• "¿Quién es el operador de la grúa?"
• "¿Dónde está la unidad y cuánto falta para que llegue?"
• "Dime los tiempos del servicio"`;

      await this.bot.sendMessage(chatId, sugerencias, {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['💰 Costo', '🚚 Datos de la unidad'],
            ['📍 Ubicación', '⏰ Tiempos'],
            ['🔄 Consultar otro expediente', '📊 Cambiar a modo tradicional']
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      });

      return { action: 'continue' };
    } catch (error) {
      console.error('❌ Error al obtener expediente:', error);
      
      // Eliminar mensaje de carga
      await this.bot.deleteMessage(chatId, loadingMessage.message_id);
      
      // Mostrar mensaje de error
      await this.bot.sendMessage(
        chatId,
        '❌ No pude encontrar información para ese número de expediente. Por favor, verifica el número e intenta nuevamente.',
        {
          reply_markup: {
            keyboard: [['📊 Cambiar a modo tradicional']],
            resize_keyboard: true,
            one_time_keyboard: false
          }
        }
      );
      return { action: 'continue' };
    }
  }

  /**
   * Maneja mensajes cuando el chat está activo y hay un expediente cargado
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {string} mensaje - Texto del mensaje del usuario
   * @returns {Object} - Acción a realizar
   * @private
   */
  async handleChatActive(chatId, session, mensaje) {
    // Si es una solicitud para consultar otro expediente
    if (mensaje === '🔄 Consultar otro expediente') {
      session.etapa = 'esperando_expediente_chat';
      this.sessionService.updateSession(chatId, session);
      
      await this.bot.sendMessage(
        chatId,
        '🔄 Por favor, ingresa el número del nuevo expediente que deseas consultar:',
        {
          reply_markup: {
            keyboard: [['📊 Cambiar a modo tradicional']],
            resize_keyboard: true,
            one_time_keyboard: false
          }
        }
      );
      
      return { action: 'continue' };
    }
  
    // Procesar con Assistant API
    return await this.processChatGPTQuery(chatId, session, mensaje);
  }

  /**
   * Procesa una consulta mediante ChatGPT
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {string} mensaje - Mensaje del usuario
   * @returns {Object} - Acción a realizar
   * @private
   */
  async processChatGPTQuery(chatId, session, mensaje) {
    // Mostrar indicador de escritura
    await this.bot.sendChatAction(chatId, 'typing');
    
    try {
      // Si no tiene threadId, crear uno nuevo
      if (!session.threadId) {
        session.threadId = await this.assistantService.createThread();
        this.sessionService.updateSession(chatId, session);
      }
  
      // Procesar mensaje con Assistant
      const respuesta = await this.assistantService.processMessage(session.threadId, mensaje);
      
      // Enviar respuesta al usuario
      await this.bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('❌ Error al procesar consulta con Assistant:', error);
      
      // Mensaje de error amigable
      await this.bot.sendMessage(
        chatId,
        '❌ Lo siento, tuve un problema al procesar tu consulta. Puedes intentar reformularla o usar los botones para consultar información específica.',
        { parse_mode: 'Markdown' }
      );
    }
    
    return { action: 'continue' };
  }
}

module.exports = ChatModeController;