import TelegramBot from 'node-telegram-bot-api';
import { getConfig } from './config/env.js';
import { BotService } from './services/botService.js';
import { registerCommands } from './handlers/commandHandler.js';
import { registerMessageHandlers } from './handlers/messageHandler.js';

// Inicialización
console.log('🚀 Iniciando bot de Telegram...');

// Cargar configuración
const config = getConfig();
const TOKEN = config.TELEGRAM_TOKEN;

// Verificar token
if (!TOKEN) {
  console.error('❌ Error: TELEGRAM_TOKEN_SOPORTE no está definido en las variables de entorno.');
  process.exit(1);
}

// Crear servicio del bot
const botService = new BotService();

// Crear la instancia del bot en modo polling
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('✅ Bot conectado correctamente.');

// Objeto para almacenar el estado (sesión) de cada usuario
const usuarios = {};

// Registrar manejadores
registerCommands(bot, usuarios);
registerMessageHandlers(bot, usuarios, botService);

// Handlers de eventos globales
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo no manejado en:', promise, 'Razón:', reason);
});

console.log('✅ Bot listo y escuchando mensajes.');