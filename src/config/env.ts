import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Config } from '../types/index.js';

// Obtener la ruta del directorio actual en ESM
// eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(dirname(__dirname), '..', '.env') });

export function getConfig(): Config {
  // Validar variables requeridas
  const requiredVars = ['TELEGRAM_TOKEN_SOPORTE', 'API_BASE_URL'] as const;
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Variables de entorno requeridas no encontradas: ${missingVars.join(', ')}`);
  }

  // Validaciones adicionales de seguridad
  const token = process.env['TELEGRAM_TOKEN_SOPORTE']!;
  if (token.length < 40) {
    throw new Error('Token de Telegram inválido: longitud insuficiente');
  }

  const apiUrl = process.env['API_BASE_URL']!;
  if (!apiUrl.startsWith('https://') && process.env['NODE_ENV'] === 'production') {
    throw new Error('API_BASE_URL debe usar HTTPS en producción');
  }

  // Prevenir exposición accidental
  if (process.env['NODE_ENV'] === 'development') {
    console.info('🔒 Variables de entorno cargadas correctamente (modo desarrollo)');
  }

  return {
    TELEGRAM_TOKEN: token,
    API_BASE_URL: apiUrl,
    NODE_ENV: process.env['NODE_ENV'] || 'development',
    IS_PRODUCTION: process.env['NODE_ENV'] === 'production',
  };
}

export default getConfig;
