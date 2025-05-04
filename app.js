// Cargar variables de entorno
require('dotenv').config();

// Importar dependencias
const TelegramBot = require('node-telegram-bot-api');

// Importar controlador principal
const BotController = require('./src/controllers/botController');

// Importar servicio de sesión
const SessionService = require('./src/services/sessionService');

// Obtener el token desde las variables de entorno
const TOKEN = process.env.TELEGRAM_TOKEN_SOPORTE;
if (!TOKEN) {
  console.error('❌ Error: TELEGRAM_TOKEN_SOPORTE no está definido en las variables de entorno.');
  process.exit(1);
}

// Verificar otras variables de entorno requeridas
if (!process.env.API_BASE_URL) {
  console.error('❌ Error: API_BASE_URL no está definido en las variables de entorno.');
  process.exit(1);
}

// Verificar configuración de OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ Advertencia: OPENAI_API_KEY no está definido. El modo conversacional podría no funcionar correctamente.');
}

// Crear la instancia del bot en modo polling
const bot = new TelegramBot(TOKEN, { polling: true });
bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error);
});

// Inicializar servicios
const sessionService = new SessionService();

// Inicializar controlador principal
const botController = new BotController(bot, sessionService);

// Configurar limpieza periódica de sesiones antiguas (cada hora)
setInterval(() => {
  console.log('🧹 Limpiando sesiones antiguas...');
  const cleanedCount = sessionService.cleanOldSessions(60); // 60 minutos de inactividad
  console.log(`🧹 Se eliminaron ${cleanedCount} sesiones inactivas.`);
}, 60 * 60 * 1000); // 1 hora

// Configurar el manejo del comando /start
bot.onText(/\/start/, (msg) => {
  console.log(`🚀 Comando /start recibido de usuario ${msg.chat.id}`);
  botController.handleStart(msg);
});

// Configurar el manejo de mensajes generales
bot.on('message', async (msg) => {
  // Ignorar el comando /start (ya tiene su manejador específico)
  if (msg.text && msg.text.trim().toLowerCase() === '/start') return;
  
  console.log(`📩 Mensaje recibido de usuario ${msg.chat.id}: ${msg.text?.substring(0, 50) || '[no text]'}${msg.text?.length > 50 ? '...' : ''}`);
  
  // Procesar el mensaje a través del controlador principal
  try {
    await botController.handleMessage(msg);
  } catch (error) {
    console.error('❌ Error no controlado al procesar mensaje:', error);
    
    // Intentar enviar mensaje de error al usuario
    try {
      await bot.sendMessage(
        msg.chat.id,
        '❌ Lo siento, ocurrió un error inesperado. Por favor, intenta nuevamente o escribe "/start" para reiniciar.'
      );
    } catch (sendError) {
      console.error('❌ Error al enviar mensaje de error:', sendError);
    }
  }
});

// Iniciar el bot
console.log('🤖 Bot de soporte iniciado en modo dual (tradicional + conversacional)');
console.log(`📊 Modo por defecto: ${process.env.DEFAULT_MODE === 'traditional' ? 'tradicional (botones)' : 'conversacional (ChatGPT)'}`);