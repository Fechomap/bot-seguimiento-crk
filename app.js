// Cargar variables de entorno y librerías necesarias
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
// Servicio del bot para consultar datos (se asume su implementación en './src/services/botService')
const BotService = require('./src/services/botService');
const botService = new BotService();

// Obtener el token desde las variables de entorno
const TOKEN = process.env.TELEGRAM_TOKEN_SOPORTE;
if (!TOKEN) {
  console.error('❌ Error: TELEGRAM_TOKEN_SOPORTE no está definido en las variables de entorno.');
  process.exit(1);
}

// Crear la instancia del bot en modo polling
const bot = new TelegramBot(TOKEN, { polling: true });
bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error);
});

// Objeto para almacenar el estado (sesión) de cada usuario
const usuarios = {};

/**
 * Inicializa el estado de un usuario.
 * @param {number} chatId - Identificador del chat.
 */
function initUsuario(chatId) {
  usuarios[chatId] = {
    etapa: 'initial',
    expediente: null,
    datosExpediente: null, // Almacenará los datos del expediente consultado.
  };
}

/**
 * Envía un mensaje con un menú de opciones utilizando teclados personalizados.
 * @param {number} chatId - Identificador del chat.
 * @param {string} mensaje - Mensaje a enviar.
 * @param {Array} opciones - Opciones del menú (arreglo de arreglos para filas).
 */
function enviarMenu(chatId, mensaje, opciones) {
  bot.sendMessage(chatId, mensaje, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: opciones,
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
}

/**
 * Convierte un valor hexadecimal a un nombre de color en español.
 * Si no se encuentra en el mapeo, se devuelve el código hexadecimal.
 * @param {string} hex - Código hexadecimal del color.
 * @returns {string} - Nombre del color o el mismo código si no hay mapeo.
 */
function hexToColorName(hex) {
  if (!hex) return 'N/A';
  // Normalizar a minúsculas para la comparación
  const hexNormalized = hex.toLowerCase();
  
  // Mapeo de los 20 colores más comunes
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

// Comando /start para iniciar la conversación y mostrar el menú inicial
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  initUsuario(chatId);
  enviarMenu(
    chatId,
    '👋 *¡Bienvenido al sistema de atención al cliente!*\n\nPor favor, selecciona una opción para continuar:',
    [['📊 Seguimiento de Expediente']]
  );
});

// Manejo de mensajes generales del usuario
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const mensaje = msg.text ? msg.text.trim() : '';
  console.log('ℹ️ info Mensaje: ', mensaje);

  // Ignorar el comando /start (ya procesado)
  if (mensaje.toLowerCase() === '/start') return;

  // Si el usuario no está registrado, pedir que inicie con /start
  if (!usuarios[chatId]) {
    bot.sendMessage(chatId, 'ℹ️ Por favor, escribe "/start" para iniciar la conversación.');
    return;
  }

  const usuario = usuarios[chatId];
  // En función de la etapa en que se encuentre el usuario, se maneja el mensaje
  switch (usuario.etapa) {
    case 'initial':
      await handleEtapaInitial(chatId, usuario, mensaje);
      break;
    case 'esperando_numero_expediente':
      await handleObtenerExpediente(chatId, usuario, mensaje);
      break;
    case 'menu_seguimiento':
      await handleMenuSeguimiento(chatId, usuario, mensaje);
      break;
    default:
      bot.sendMessage(
        chatId,
        'ℹ️ No entendí tu respuesta. Por favor, selecciona una opción del menú o escribe "/start" para reiniciar.'
      );
      break;
  }
});

/**
 * Maneja la etapa inicial cuando el usuario selecciona una opción del menú.
 * @param {number} chatId - Identificador del chat.
 * @param {object} usuario - Estado actual del usuario.
 * @param {string} mensaje - Mensaje recibido.
 */
async function handleEtapaInitial(chatId, usuario, mensaje) {
  if (mensaje === '📊 Seguimiento de Expediente') {
    usuario.etapa = 'esperando_numero_expediente';
    await bot.sendMessage(chatId, '🔍 Por favor, *ingresa tu número de expediente* para realizar el seguimiento:', {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    });
  } else {
    bot.sendMessage(chatId, 'ℹ️ Opción no reconocida. Por favor, selecciona una opción del menú.');
  }
}

/**
 * Valida y maneja la entrada del número de expediente.
 * Consulta el expediente mediante botService y muestra las opciones correspondientes.
 * @param {number} chatId - Identificador del chat.
 * @param {object} usuario - Estado del usuario.
 * @param {string} mensaje - Número de expediente ingresado.
 */
async function handleObtenerExpediente(chatId, usuario, mensaje) {
  // Validación: solo letras, números, espacios y guiones
  if (/^[a-zA-Z0-9\s-]*$/.test(mensaje)) {
    const expediente = mensaje;
    console.log(`🔍 Buscando expediente: ${expediente}`);

    try {
      // Consulta del expediente a través del servicio
      const expedienteData = await botService.obtenerExpediente(expediente);
      console.log(`📄 Registros encontrados: ${expedienteData}`);

      if (expedienteData != null) {
        // Guardar datos del expediente en la sesión del usuario
        usuario.datosExpediente = expedienteData;
        usuario.expediente = expediente;

        // Configurar las opciones del menú según el estatus
        let opciones = [['💰 Costo del Servicio', '🚚 Datos de la Unidad o Grúa']];
        if (expedienteData.estatus === 'A Contactar') {
          opciones[0].push('📍 Ubicación y Tiempo Restante');
        }
        opciones.push(['🔄 Consultar otro Expediente', '⏰ Tiempos']);

        const detalles = `🔍 *Detalles del Expediente*\n- **Nombre:** ${expedienteData.nombre}\n- **Vehículo:** ${expedienteData.vehiculo}\n- **Estatus:** ${expedienteData.estatus}\n- **Servicio:** ${expedienteData.servicio}\n- **Destino:** ${expedienteData.destino}\n\n📋 *Selecciona una opción para ver más detalles:*`;
        await enviarMenu(chatId, detalles, opciones);
        usuario.etapa = 'menu_seguimiento';
      } else {
        bot.sendMessage(chatId, '❌ Lo siento, el número de expediente no es válido. Por favor, intenta nuevamente.');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      bot.sendMessage(chatId, '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.');
    }
  } else {
    bot.sendMessage(
      chatId,
      '⚠️ Por favor, *ingresa un número de expediente válido* (solo dígitos y caracteres permitidos).',
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Maneja las opciones del menú de seguimiento según la respuesta del usuario.
 * @param {number} chatId - Identificador del chat.
 * @param {object} usuario - Estado actual del usuario.
 * @param {string} mensaje - Opción seleccionada.
 */
async function handleMenuSeguimiento(chatId, usuario, mensaje) {
  const opcionesValidas = [
    '💰 Costo del Servicio',
    '🚚 Datos de la Unidad o Grúa',
    '📍 Ubicación y Tiempo Restante',
    '🔄 Consultar otro Expediente',
    '⏰ Tiempos'
  ];
  if (opcionesValidas.includes(mensaje)) {
    if (mensaje === '🔄 Consultar otro Expediente') {
      usuario.etapa = 'esperando_numero_expediente';
      await bot.sendMessage(chatId, '🔄 Por favor, *ingresa el número de otro expediente* para continuar:', {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      });
    } else {
      try {
        await handleAccionMenu(chatId, usuario, mensaje);
      } catch (error) {
        console.error('❌ Error:', error);
        bot.sendMessage(chatId, '❌ Hubo un error al consultar la información. Por favor, intenta más tarde.');
      }
    }
  } else {
    bot.sendMessage(chatId, 'ℹ️ Opción no reconocida. Por favor, selecciona una opción del menú.');
  }
}

/**
 * Ejecuta la acción correspondiente a la opción del menú seleccionada.
 * Se consulta la información mediante botService y se envía la respuesta formateada al usuario.
 * @param {number} chatId - Identificador del chat.
 * @param {object} usuario - Estado del usuario.
 * @param {string} tipo - Tipo de acción a ejecutar.
 */
async function handleAccionMenu(chatId, usuario, tipo) {
  const cliente = usuario.datosExpediente;
  const expediente = usuario.expediente;

  if (!cliente) {
    bot.sendMessage(chatId, '❌ No se encontraron detalles para el expediente proporcionado.');
    return;
  }

  let mensaje = '';

  switch (tipo) {
    case '💰 Costo del Servicio': {
      const expedienteCosto = await botService.obtenerExpedienteCosto(expediente);
      mensaje = `💰 *Costo del Servicio*\n`;

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
      break;
    }
    case '🚚 Datos de la Unidad o Grúa': {
      const expedienteUnidad = await botService.obtenerExpedienteUnidadOp(expediente);
      
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
      
      mensaje = `🚚 *Datos de la Unidad o Grúa*
- **Operador:** ${expedienteUnidad.operador || 'N/A'}
- **Tipo de Grúa:** ${tipoGrua}
- **Color:** ${hexToColorName(expedienteUnidad.color)}
- **Número Económico:** ${numeroEconomico}
- **Placas:** ${expedienteUnidad.placas || 'N/A'}`;
      break;
    }
    case '📍 Ubicación y Tiempo Restante': {
      const expedienteUbicacion = await botService.obtenerExpedienteUbicacion(expediente);
      let urlUbicacion = "";
      let coordsGrua = expedienteUbicacion?.ubicacionGrua?.trim()?.split(",");
      if (coordsGrua != null) {
        urlUbicacion = `https://www.google.com/maps/search/?api=1&query=${coordsGrua[0]}%2C${coordsGrua[1]}`;
      }
      mensaje = `📍 *Ubicación y Tiempo Restante*
- **Ubicación Actual de la Grúa:** ${`[Ver en maps](${coordsGrua != null ? urlUbicacion : ''})` || 'N/A'}
- **Tiempo Restante Estimado:** ${expedienteUbicacion.tiempoRestante || 'N/A'}`;
      break;
    }
    case '⏰ Tiempos': {
      const expedienteTiempos = await botService.obtenerExpedienteTiempos(expediente);
      mensaje = `⏰ *Tiempos del Expediente*
- **Contacto:** ${expedienteTiempos.tc ? `${dayjs(expedienteTiempos.tc).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin contacto'}
- **Termino:** ${expedienteTiempos.tt ? `${dayjs(expedienteTiempos.tt).format("DD/MM/YY *HH:mm*")} ⏳` : 'aún sin término'}`;
      break;
    }
    default:
      mensaje = 'ℹ️ Opción no reconocida.';
      break;
  }

  // Enviar la respuesta final con formato Markdown
  await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
}