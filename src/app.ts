import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import { getConfig } from './config/env.js';
import { BotService } from './services/botService.js';
import { registerCommands } from './handlers/commandHandler.js';
import { registerMessageHandlers } from './handlers/messageHandler.js';
import type { Usuario } from './types/index.js';

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

// Crear servicio del bot
const botService = new BotService();

// Objeto para almacenar el estado (sesión) de cada usuario
const usuarios: Record<number, Usuario> = {};

// Determinar modo de operación
const useWebhook = config.WEBHOOK_URL !== null;

let bot: TelegramBot;

if (useWebhook) {
  // === MODO WEBHOOK (Railway) ===
  console.info(`🌐 Configurando webhook en: ${config.WEBHOOK_URL}`);

  bot = new TelegramBot(TOKEN, { webHook: true });

  // Crear servidor HTTP para recibir webhooks
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      let body = '';

      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const update = JSON.parse(body) as TelegramBot.Update;
          bot.processUpdate(update);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.error('❌ Error procesando webhook:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
        }
      });
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
  bot
    .setWebHook(config.WEBHOOK_URL!)
    .then(() => {
      console.info('✅ Webhook configurado correctamente en Telegram');
    })
    .catch((error: Error) => {
      console.error('❌ Error configurando webhook:', error.message);
    });
} else {
  // === MODO POLLING (Local) ===
  console.info('📡 Usando modo polling (desarrollo local)');

  bot = new TelegramBot(TOKEN, { polling: true });
  console.info('✅ Bot conectado en modo polling.');
}

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

console.info(`✅ Bot listo y escuchando mensajes (modo: ${useWebhook ? 'webhook' : 'polling'}).`);
