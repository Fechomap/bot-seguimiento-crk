/**
 * Controlador principal del Bot
 * Responsable de gestionar el flujo general de comunicación con el usuario
 * y dirigir las solicitudes a los controladores específicos según el modo actual
 */
const TraditionalModeController = require('./traditionalModeController');
const ChatModeController = require('./chatModeController');

class BotController {
  /**
   * Constructor del controlador
   * @param {TelegramBot} bot - Instancia del bot de Telegram
   * @param {SessionService} sessionService - Servicio para gestionar sesiones de usuario
   */
  constructor(bot, sessionService) {
    this.bot = bot;
    this.sessionService = sessionService;
    
    // Inicializar controladores específicos
    this.traditionalModeController = new TraditionalModeController(bot, sessionService);
    this.chatModeController = new ChatModeController(bot, sessionService);
    
    // Preferencia por defecto (prioriza el modo conversacional)
    this.defaultMode = 'conversational';
  }

  /**
   * Maneja el comando /start
   * @param {Object} msg - Mensaje de Telegram
   */
  async handleStart(msg) {
    const chatId = msg.chat.id;
    
    // Inicializar o reiniciar la sesión del usuario
    this.sessionService.initSession(chatId);
    
    // Determinar modo inicial según la configuración
    const session = this.sessionService.getSession(chatId);
    
    // Establecer el modo según la preferencia por defecto
    const useConversationalMode = this.defaultMode === 'conversational';
    session.modoConversacional = useConversationalMode;
    this.sessionService.updateSession(chatId, session);
    
    // Iniciar el controlador correspondiente
    if (useConversationalMode) {
      await this.chatModeController.handleStart(chatId);
    } else {
      await this.traditionalModeController.handleStart(chatId);
    }
  }

  /**
   * Maneja cualquier mensaje recibido
   * @param {Object} msg - Mensaje de Telegram
   */
  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const mensaje = msg.text ? msg.text.trim() : '';
    
    // Si el usuario no está registrado, pedir que inicie con /start
    if (!this.sessionService.hasSession(chatId)) {
      await this.bot.sendMessage(chatId, 'ℹ️ Por favor, escribe "/start" para iniciar la conversación.');
      return;
    }
    
    // Obtener la sesión actual del usuario
    const session = this.sessionService.getSession(chatId);
    
    // Detectar solicitudes de cambio de modo
    if (mensaje === '📊 Cambiar a modo tradicional' || mensaje === '📊 Usar menú tradicional') {
      await this.switchToTraditionalMode(chatId, session);
      return;
    }
    
    if (mensaje === '💬 Cambiar a modo conversacional' || mensaje === '💬 Volver a modo conversacional') {
      await this.switchToConversationalMode(chatId, session);
      return;
    }
    
    // Decidir qué controlador debe manejar el mensaje según el modo actual
    if (session.modoConversacional) {
      const result = await this.chatModeController.handleMessage(chatId, session, mensaje);
      
      // Procesar resultado de la acción si existe
      if (result && result.action) {
        await this.processControllerAction(chatId, session, result);
      }
    } else {
      const result = await this.traditionalModeController.handleMessage(chatId, session, mensaje);
      
      // Procesar resultado de la acción si existe
      if (result && result.action) {
        await this.processControllerAction(chatId, session, result);
      }
    }
  }

  /**
   * Procesa acciones especiales retornadas por los controladores
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {Object} actionResult - Resultado de la acción
   * @private
   */
  async processControllerAction(chatId, session, actionResult) {
    switch (actionResult.action) {
      case 'cambiar_modo':
        if (actionResult.mode === 'traditional') {
          await this.switchToTraditionalMode(chatId, session);
        } else if (actionResult.mode === 'conversational') {
          await this.switchToConversationalMode(chatId, session);
        }
        break;
        
      case 'reload_expediente':
        // Acción para recargar datos de expediente si es necesario
        // Implementación futura
        break;
        
      case 'continue':
      default:
        // No se requiere acción adicional
        break;
    }
  }

  /**
   * Cambia al modo tradicional (botones)
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @private
   */
  async switchToTraditionalMode(chatId, session) {
    // Actualizar la sesión
    session.modoConversacional = false;
    this.sessionService.updateSession(chatId, session);
    
    // Notificar al usuario
    await this.bot.sendMessage(
      chatId,
      '📊 Cambiando a *modo tradicional* con botones. Ahora navegarás mediante las opciones del menú.',
      { parse_mode: 'Markdown' }
    );
    
    // Determinar el estado actual y redirigir adecuadamente
    if (session.expediente && session.datosExpediente) {
      // Si ya tiene un expediente cargado, mostrar el menú de opciones
      session.etapa = 'menu_seguimiento';
      this.sessionService.updateSession(chatId, session);
      
      // Configurar las opciones del menú según el estatus
      let opciones = [['💰 Costo del Servicio', '🚚 Datos de la Unidad o Grúa']];
      if (session.datosExpediente.estatus === 'A Contactar') {
        opciones[0].push('📍 Ubicación y Tiempo Restante');
      }
      opciones.push(['🔄 Consultar otro Expediente', '⏰ Tiempos']);
      opciones.push(['💬 Cambiar a modo conversacional']);
      
      // Enviar menú con detalles
      await this.traditionalModeController.enviarMenu(
        chatId,
        `🔍 *Detalles del Expediente*\n- **Nombre:** ${session.datosExpediente.nombre}\n- **Vehículo:** ${session.datosExpediente.vehiculo}\n- **Estatus:** ${session.datosExpediente.estatus}\n- **Servicio:** ${session.datosExpediente.servicio}\n- **Destino:** ${session.datosExpediente.destino}\n\n📋 *Selecciona una opción para ver más detalles:*`,
        opciones
      );
    } else {
      // Si no tiene expediente, iniciar desde el principio
      await this.traditionalModeController.handleStart(chatId);
    }
  }

  /**
   * Cambia al modo conversacional
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @private
   */
  async switchToConversationalMode(chatId, session) {
    // Actualizar la sesión
    session.modoConversacional = true;
    this.sessionService.updateSession(chatId, session);
    
    // Notificar al usuario
    await this.bot.sendMessage(
      chatId,
      '💬 Cambiando a *modo conversacional*. Ahora puedes realizar preguntas en lenguaje natural.',
      { parse_mode: 'Markdown' }
    );
    
    // Determinar el estado actual y redirigir adecuadamente
    if (session.expediente && session.datosExpediente) {
      // Si ya tiene un expediente cargado, activar el chat
      session.etapa = 'chat_activo';
      session.contextoConversacion = []; // Reiniciar contexto de conversación
      this.sessionService.updateSession(chatId, session);
      
      // Enviar mensaje con sugerencias
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
    } else {
      // Si no tiene expediente, iniciar desde el principio
      await this.chatModeController.handleStart(chatId);
    }
  }
}

module.exports = BotController;