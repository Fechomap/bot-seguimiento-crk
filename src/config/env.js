import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtener la ruta del directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(dirname(__dirname), '..', '.env') });

export function getConfig() {
  // Validar variables requeridas
  const requiredVars = ['TELEGRAM_TOKEN_SOPORTE', 'API_BASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Variables de entorno requeridas no encontradas: ${missingVars.join(', ')}`);
  }

  return {
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN_SOPORTE,
    API_BASE_URL: process.env.API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
}

export default getConfig;