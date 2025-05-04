// Importar servicios
const BotService = require('../services/botService');
const formatters = require('../utils/formatters');
const validators = require('../utils/validators');

/**
 * Controlador para el modo tradicional del bot basado en botones
 * Gestiona la interfaz con botones y el flujo de navegación existente
 */
class TraditionalModeController {
  /**
   * Constructor del controlador
   * @param {TelegramBot} bot - Instancia del bot de Telegram
   * @param {SessionService} sessionService - Servicio para gestionar sesiones de usuario
   */
  constructor(bot, sessionService) {
    this.bot = bot;
    this.sessionService = sessionService;
    this.botService = new BotService();
  }

  /**
   * Maneja el inicio del modo tradicional
   * @param {number} chatId - ID del chat
   */
  async handleStart(chatId) {
    await this.enviarMenu(
      chatId,
      '👋 *¡Bienvenido al sistema de atención al cliente!*\n\nPor favor, selecciona una opción para continuar:',
      [['📊 Seguimiento de Expediente']]
    );
    
    // Actualizar el estado del usuario a 'initial'
    const session = this.sessionService.getSession(chatId);
    session.etapa = 'initial';
    this.sessionService.updateSession(chatId, session);
  }

  /**
   * Maneja mensajes en el modo tradicional
   * @param {number} chatId - ID del chat
   * @param {Object} session - Sesión del usuario
   * @param {string} mensaje - Texto del mensaje
   */
  async handleMessage(chatId, session, mensaje) {
    // En función de la etapa en que se encuentre el usuario, se maneja el mensaje
    switch (session.etapa) {
      case 'initial':
        await this.handleEtapaInitial(chatId, session, mensaje);
        break;
      case 'esperando_numero_expediente':
        await this.handleObtenerExpediente(chatId, session, mensaje);
        break;
      case 'menu_seguimiento':
        await this.handleMenuSeguimiento(chatId, session, mensaje);
        break;
      default:
        await this.bot.sendMessage(
          chatId,
          'ℹ️ No entendí tu respuesta. Por favor, selecciona una opción del menú o escribe "/start" para reiniciar.'
        );
        break;
    }
  }

  /**
   * Maneja la etapa inicial cuando el usuario selecciona una opción del menú.
   * @param {number} chatId - Identificador del chat.
   * @param {object} session - Estado actual del usuario.
   * @param {string} mensaje - Mensaje recibido.
   */
  async handleEtapaInitial(chatId, session, mensaje) {
    if (mensaje === '📊 Seguimiento de Expediente') {
      session.etapa = 'esperando_numero_expediente';
      this.sessionService.updateSession(chatId, session);
      
      await this.bot.sendMessage(chatId, '🔍 Por favor, *ingresa tu número de expediente* para realizar el seguimiento:', {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      });
    } else {
      await this.bot.sendMessage(chatId, 'ℹ️ Opción no reconocida. Por favor, selecciona una opción del menú.');
    }
  }

  /**
   * Valida y maneja la entrada del número de expediente.
   * Consulta el expediente mediante botService y muestra las opciones correspondientes.
   * @param {number} chatId - Identificador del chat.
   * @param {object} session - Estado del usuario.
   * @param {string} mensaje - Número de expediente ingresado.
   */
  async handleObtenerExpediente(chatId, session, mensaje) {
    // Validación del número de expediente
    if (!validators.isValidExpedienteNumber(mensaje)) {
      await this.bot.sendMessage(
        chatId,
        '⚠️ Por favor, *ingresa un número de expediente válido* (solo dígitos y caracteres permitidos).',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const expediente = mensaje;
    console.log(`🔍 Buscando expediente: ${expediente}`);

    try {
      // Consulta del expediente a través del servicio
      const expedienteData = await this.botService.obtenerExpediente(expediente);
      console.log(`📄 Registros encontrados: ${expedienteData}`);

      if (expedienteData != null) {
        // Guardar datos del expediente en la sesión del usuario
        session.expediente = expediente;
        session.datosExpediente = expedienteData;
        this.sessionService.updateSession(chatId, session);

        // Configurar las opciones del menú según el estatus
        let opciones = [['💰 Costo del Servicio', '🚚 Datos de la Unidad o Grúa']];
        if (expedienteData.estatus === 'A Contactar') {
          opciones[0].push('📍 Ubicación y Tiempo Restante');
        }
        opciones.push(['🔄 Consultar otro Expediente', '⏰ Tiempos']);

        const detalles = formatters.formatDetallesExpediente(expedienteData);
        await this.enviarMenu(chatId, detalles, opciones);
        
        session.etapa = 'menu_seguimiento';
        this.sessionService.updateSession(chatId, session);
      } else {
        await this.bot.sendMessage(chatId, '❌ Lo siento, el número de expediente no es válido. Por favor, intenta nuevamente.');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      await this.bot.sendMessage(chatId, '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.');
    }
  }

  /**
   * Maneja las opciones del menú de seguimiento según la respuesta del usuario.
   * @param {number} chatId - Identificador del chat.
   * @param {object} session - Estado actual del usuario.
   * @param {string} mensaje - Opción seleccionada.
   */
  async handleMenuSeguimiento(chatId, session, mensaje) {
    const opcionesValidas = [
      '💰 Costo del Servicio',
      '🚚 Datos de la Unidad o Grúa',
      '📍 Ubicación y Tiempo Restante',
      '🔄 Consultar otro Expediente',
      '⏰ Tiempos'
    ];
    
    if (opcionesValidas.includes(mensaje)) {
      if (mensaje === '🔄 Consultar otro Expediente') {
        session.etapa = 'esperando_numero_expediente';
        this.sessionService.updateSession(chatId, session);
        
        await this.bot.sendMessage(chatId, '🔄 Por favor, *ingresa el número de otro expediente* para continuar:', {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true },
        });
      } else {
        try {
          await this.handleAccionMenu(chatId, session, mensaje);
        } catch (error) {
          console.error('❌ Error:', error);
          await this.bot.sendMessage(chatId, '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.');
        }
      }
    } else {
      await this.bot.sendMessage(chatId, 'ℹ️ Opción no reconocida. Por favor, selecciona una opción del menú.');
    }
  }

  /**
   * Ejecuta la acción correspondiente a la opción del menú seleccionada.
   * Se consulta la información mediante botService y se envía la respuesta formateada al usuario.
   * @param {number} chatId - Identificador del chat.
   * @param {object} session - Estado del usuario.
   * @param {string} tipo - Tipo de acción a ejecutar.
   */
  async handleAccionMenu(chatId, session, tipo) {
    const cliente = session.datosExpediente;
    const expediente = session.expediente;

    if (!cliente) {
      await this.bot.sendMessage(chatId, '❌ No se encontraron detalles para el expediente proporcionado.');
      return;
    }

    let mensaje = '';

    switch (tipo) {
      case '💰 Costo del Servicio': {
        const expedienteCosto = await this.botService.obtenerExpedienteCosto(expediente);
        mensaje = formatters.formatCostoServicio(cliente, expedienteCosto);
        break;
      }
      case '🚚 Datos de la Unidad o Grúa': {
        const expedienteUnidad = await this.botService.obtenerExpedienteUnidadOp(expediente);
        mensaje = formatters.formatDatosUnidad(expedienteUnidad);
        break;
      }
      case '📍 Ubicación y Tiempo Restante': {
        const expedienteUbicacion = await this.botService.obtenerExpedienteUbicacion(expediente);
        mensaje = formatters.formatUbicacionTiempo(expedienteUbicacion);
        break;
      }
      case '⏰ Tiempos': {
        const expedienteTiempos = await this.botService.obtenerExpedienteTiempos(expediente);
        mensaje = formatters.formatTiempos(expedienteTiempos);
        break;
      }
      default:
        mensaje = 'ℹ️ Opción no reconocida.';
        break;
    }

    // Enviar la respuesta final con formato Markdown
    await this.bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
  }

  /**
   * Envía un mensaje con un menú de opciones utilizando teclados personalizados.
   * @param {number} chatId - Identificador del chat.
   * @param {string} mensaje - Mensaje a enviar.
   * @param {Array} opciones - Opciones del menú (arreglo de arreglos para filas).
   */
  async enviarMenu(chatId, mensaje, opciones) {
    await this.bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: opciones,
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }
}

module.exports = TraditionalModeController;