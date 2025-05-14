import { getMainMenuKeyboard } from '../utils/keyboards.js';

/**
 * Registra los comandos del bot
 * @param {TelegramBot} bot - Instancia del bot
 * @param {Object} usuarios - Objeto para almacenar el estado de los usuarios
 */
export function registerCommands(bot, usuarios) {
  // Comando /start para iniciar la conversación
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    initUsuario(chatId, usuarios);
    sendWelcomeMessage(bot, chatId);
  });

  // Comando /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    sendHelpMessage(bot, chatId);
  });
}

/**
 * Inicializa el estado de un usuario
 * @param {number} chatId - ID del chat
 * @param {Object} usuarios - Objeto para almacenar el estado de los usuarios
 */
export function initUsuario(chatId, usuarios) {
  usuarios[chatId] = {
    etapa: 'initial',
    expediente: null,
    datosExpediente: null,
  };
}

/**
 * Envía un mensaje de bienvenida con el menú principal
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 */
function sendWelcomeMessage(bot, chatId) {
  bot.sendMessage(
    chatId,
    '👋 *¡Bienvenido al sistema de atención al cliente!*\n\nPor favor, selecciona una opción para continuar:',
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard()
    }
  );
}

/**
 * Envía un mensaje de ayuda
 * @param {TelegramBot} bot - Instancia del bot
 * @param {number} chatId - ID del chat
 */
function sendHelpMessage(bot, chatId) {
  bot.sendMessage(
    chatId,
    '*Ayuda del Bot de Seguimiento*\n\n' +
    'Este bot te permite consultar información sobre tu expediente de servicio.\n\n' +
    '*Comandos disponibles:*\n' +
    '/start - Iniciar o reiniciar el bot\n' +
    '/help - Mostrar este mensaje de ayuda',
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard()
    }
  );
}