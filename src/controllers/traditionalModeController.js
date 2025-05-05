// src/controllers/traditionalModeController.js
const BotService = require('../services/botService');
const validators = require('../utils/validators');
const dayjs = require('dayjs');

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
   * Convierte un valor hexadecimal a un nombre de color en español.
   * @param {string} hex - Código hexadecimal del color.
   * @returns {string} - Nombre del color o el mismo código si no hay mapeo.
   * @private
   */
  hexToColorName(hex) {
    if (!hex) return 'N/A';
    const hexNormalized = hex.toLowerCase();
    
    const colorMap = {
      "#ffffff": "Blanco",
      "#000000": "Negro",
      "#ff0000": "Rojo",
      "#00ff00": "Verde",
      "#0000ff": "Azul",
      "#ffff00": "Amarillo",
      "#00ffff": "Cian",
      "#ff00ff": "Magenta",
      "#c0c0c0": "Plata",
      "#808080": "Gris",
      "#800000": "Marrón",
      "#808000": "Oliva",
      "#008000": "Verde Oscuro",
      "#800080": "Púrpura",
      "#008080": "Teal",
      "#000080": "Azul Marino",
      "#ffa500": "Naranja",
      "#f5f5dc": "Beige",
      "#a52a2a": "Marrón",
      "#ffc0cb": "Rosa"
    };
    
    return colorMap[hexNormalized] || hex;
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

        const detalles = `🔍 *Detalles del Expediente*\n- **Nombre:** ${expedienteData.nombre}\n- **Vehículo:** ${expedienteData.vehiculo}\n- **Estatus:** ${expedienteData.estatus}\n- **Servicio:** ${expedienteData.servicio}\n- **Destino:** ${expedienteData.destino}\n\n📋 *Selecciona una opción para ver más detalles:*`;
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
        mensaje = this.formatCostoServicio(cliente, expedienteCosto);
        break;
      }
      case '🚚 Datos de la Unidad o Grúa': {
        const expedienteUnidad = await this.botService.obtenerExpedienteUnidadOp(expediente);
        mensaje = this.formatDatosUnidad(expedienteUnidad);
        break;
      }
      case '📍 Ubicación y Tiempo Restante': {
        const expedienteUbicacion = await this.botService.obtenerExpedienteUbicacion(expediente);
        mensaje = this.formatUbicacionTiempo(expedienteUbicacion);
        break;
      }
      case '⏰ Tiempos': {
        const expedienteTiempos = await this.botService.obtenerExpedienteTiempos(expediente);
        mensaje = this.formatTiempos(expedienteTiempos);
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

  /**
   * Formatea los datos de costo del servicio
   * @param {Object} cliente - Datos generales del cliente
   * @param {Object} expedienteCosto - Datos de costo
   * @returns {string} - Mensaje formateado
   * @private
   */
  formatCostoServicio(cliente, expedienteCosto) {
    let mensaje = `💰 *Costo del Servicio*\n`;

    // Si el expediente fue cancelado, solo se muestra el costo total
    if (cliente.estatus === 'Cancelado') {
      mensaje += `- **Costo Total:** $${parseFloat(expedienteCosto.costo).toFixed(2)}\n`;
    } else {
      // Servicio Local: agregar coma en desglose
      if (cliente.servicio === 'Local') {
        mensaje += `- **Desglose:** ${expedienteCosto.km} km, plano ${expedienteCosto.plano}\n`;
      }
      // Servicio Carretero: agregar coma y formatear la línea de desglose
      else if (cliente.servicio === 'Carretero') {
        let recorridoInfo = `${expedienteCosto.km} km, `;
        if (expedienteCosto.banderazo && expedienteCosto.banderazo !== 'N/A') {
          recorridoInfo += `banderazo ${expedienteCosto.banderazo} `;
        }
        if (expedienteCosto.costoKm && expedienteCosto.costoKm !== 'N/A') {
          recorridoInfo += `costo Km ${expedienteCosto.costoKm}`;
        }
        mensaje += `- **Desglose:** ${recorridoInfo.trim()}\n`;
      }
      // Otros servicios
      else {
        mensaje += `- **Desglose:** ${expedienteCosto.km} km, plano ${expedienteCosto.plano}\n`;
      }
      
      // Desgloses adicionales (formateados con dos decimales)
      const desgloses = [];
      if (expedienteCosto.casetaACobro > 0) desgloses.push(`- **Caseta de Cobro:** $${parseFloat(expedienteCosto.casetaACobro).toFixed(2)}`);
      if (expedienteCosto.casetaCubierta > 0) desgloses.push(`- **Caseta Cubierta:** $${parseFloat(expedienteCosto.casetaCubierta).toFixed(2)}`);
      if (expedienteCosto.resguardo > 0) desgloses.push(`- **Resguardo:** $${parseFloat(expedienteCosto.resguardo).toFixed(2)}`);
      if (expedienteCosto.maniobras > 0) desgloses.push(`- **Maniobras:** $${parseFloat(expedienteCosto.maniobras).toFixed(2)}`);
      if (expedienteCosto.horaEspera > 0) desgloses.push(`- **Hora de Espera:** $${parseFloat(expedienteCosto.horaEspera).toFixed(2)}`);
      if (expedienteCosto.Parking > 0) desgloses.push(`- **Parking:** $${parseFloat(expedienteCosto.Parking).toFixed(2)}`);
      if (expedienteCosto.Otros > 0) desgloses.push(`- **Otros:** $${parseFloat(expedienteCosto.Otros).toFixed(2)}`);
      if (expedienteCosto.excedente > 0) desgloses.push(`- **Excedente:** $${parseFloat(expedienteCosto.excedente).toFixed(2)}`);

      if (desgloses.length > 0) {
        mensaje += desgloses.join('\n') + '\n';
      }
      mensaje += `- **Costo Total:** $${parseFloat(expedienteCosto.costo).toFixed(2)}`;
    }
    
    return mensaje;
  }

  /**
   * Formatea los datos de la unidad operativa
   * @param {Object} expedienteUnidad - Datos de la unidad
   * @returns {string} - Mensaje formateado
   * @private
   */
  formatDatosUnidad(expedienteUnidad) {
    // Extraer el número económico y el tipo de grúa desde 'unidadOperativa'
    const unidadOperativa = expedienteUnidad.unidadOperativa || '';
    let numeroEconomico = unidadOperativa;
    let tipoGrua = expedienteUnidad.tipoGrua || 'N/A';
    
    // Suponemos que 'unidadOperativa' tiene el formato "7 Plataforma Tipo A"
    const match = unidadOperativa.match(/^(\d+)\s*(.*)$/);
    if (match) {
      numeroEconomico = match[1]; // Solo el número
      if (match[2].trim().length > 0) {
        // El tipo de grúa se tomará del texto adicional
        tipoGrua = match[2].trim();
      }
    }
    
    return `🚚 *Datos de la Unidad o Grúa*
- **Operador:** ${expedienteUnidad.operador || 'N/A'}
- **Tipo de Grúa:** ${tipoGrua}
- **Color:** ${this.hexToColorName(expedienteUnidad.color)}
- **Número Económico:** ${numeroEconomico}
- **Placas:** ${expedienteUnidad.placas || 'N/A'}`;
  }

  /**
   * Formatea los datos de ubicación y tiempo restante
   * @param {Object} expedienteUbicacion - Datos de ubicación
   * @returns {string} - Mensaje formateado
   * @private
   */
  formatUbicacionTiempo(expedienteUbicacion) {
    let urlUbicacion = "";
    let coordsGrua = expedienteUbicacion?.ubicacionGrua?.trim()?.split(",");
    if (coordsGrua != null) {
      urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coordsGrua[0]}%2C${coordsGrua[1]}`;
    }
    
    return `📍 *Ubicación y Tiempo Restante*
- **Ubicación Actual de la Grúa:** ${`[Ver en maps](${coordsGrua != null ? urlUbicacion : ''})` || 'N/A'}
- **Tiempo Restante Estimado:** ${expedienteUbicacion.tiempoRestante || 'N/A'}`;
  }

  /**
   * Formatea los datos de tiempos
   * @param {Object} expedienteTiempos - Datos de tiempos
   * @returns {string} - Mensaje formateado
   * @private
   */
  formatTiempos(expedienteTiempos) {
    return `⏰ *Tiempos del Expediente*
- **Contacto:** ${expedienteTiempos.tc ? `${dayjs(expedienteTiempos.tc).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin contacto'}
- **Termino:** ${expedienteTiempos.tt ? `${dayjs(expedienteTiempos.tt).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin término'}`;
  }
}

module.exports = TraditionalModeController;