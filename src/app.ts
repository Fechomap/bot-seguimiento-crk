import { Bot, webhookCallback } from 'grammy';
import http from 'http';
import { getConfig } from './config/env.js';
import { BotService } from './services/botService.js';
import { SessionManager } from './services/sessionManager.js';
import { registerCommands } from './handlers/commandHandler.js';
import { registerMessageHandlers } from './handlers/messageHandler.js';

// Inicialización
console.info('🚀 Iniciando bot de Telegram...');

// Cargar configuración
const config = getConfig();
const TOKEN = config.TELEGRAM_TOKEN;

// Verificar token
if (!TOKEN) {
  console.error('❌ Error: TELEGRAM_TOKEN_SOPORTE no está definido en las variables de entorno.');
  process.exit(1);
}

// Crear instancia del bot
const bot = new Bot(TOKEN);

// Crear servicios
const botService = new BotService();
const sessionManager = new SessionManager();

// Registrar manejadores
registerCommands(bot, sessionManager);
registerMessageHandlers(bot, sessionManager, botService);

// Determinar modo de operación
const useWebhook = config.WEBHOOK_URL !== null;

if (useWebhook) {
  // === MODO WEBHOOK (Railway) ===
  console.info(`🌐 Configurando webhook en: ${config.WEBHOOK_URL}`);

  const handleUpdate = webhookCallback(bot, 'http');

  // Crear servidor HTTP para recibir webhooks
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      try {
        await handleUpdate(req, res);
      } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Internal error' }));
      }
    } else if (req.method === 'GET' && req.url === '/health') {
      // Health check para Railway
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: 'webhook' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.PORT, () => {
    console.info(`✅ Servidor HTTP escuchando en puerto ${config.PORT}`);
  });

  // Configurar webhook en Telegram
  bot.api
    .setWebhook(config.WEBHOOK_URL!)
    .then(() => {
      console.info('✅ Webhook configurado correctamente en Telegram');
    })
    .catch((error: Error) => {
      console.error('❌ Error configurando webhook:', error.message);
    });
} else {
  // === MODO POLLING (Local) ===
  console.info('📡 Usando modo polling (desarrollo local)');

  bot.start({
    onStart: () => {
      console.info('✅ Bot conectado en modo polling.');
    },
  });
}

// Handlers de eventos globales
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo no manejado en:', promise, 'Razón:', reason);
});

console.info(`✅ Bot listo y escuchando mensajes (modo: ${useWebhook ? 'webhook' : 'polling'}).`);
