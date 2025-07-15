import { AxiosService } from './apiService.js';
import { getConfig } from '../config/env.js';
import type {
  ApiResponse,
  DatosExpediente,
  ExpedienteCosto,
  ExpedienteUnidad,
  ExpedienteUbicacion,
  ExpedienteTiempos,
  ExpedienteCompleto,
  CacheEntry,
} from '../types/index.js';

const config = getConfig();
const apiService = new AxiosService(config.API_BASE_URL);

// Sistema de caché en memoria
const expedienteCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

export class BotService {
  async obtenerExpediente(numeroExp: string): Promise<DatosExpediente | null> {
    try {
      const response = await apiService.request<ApiResponse<DatosExpediente>>(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteBot?numero=${encodeURIComponent(numeroExp)}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener expediente:', (error as Error).message);
      throw error;
    }
  }

  async obtenerExpedienteCosto(numeroExp: string): Promise<ExpedienteCosto | null> {
    try {
      const response = await apiService.request<ApiResponse<ExpedienteCosto>>(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=${encodeURIComponent(numeroExp)}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener costo del expediente:', (error as Error).message);
      throw error;
    }
  }

  async obtenerExpedienteUnidadOp(numeroExp: string): Promise<ExpedienteUnidad | null> {
    try {
      const response = await apiService.request<ApiResponse<ExpedienteUnidad>>(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=${encodeURIComponent(numeroExp)}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener unidad operativa:', (error as Error).message);
      throw error;
    }
  }

  async obtenerExpedienteUbicacion(numeroExp: string): Promise<ExpedienteUbicacion | null> {
    try {
      const response = await apiService.request<ApiResponse<ExpedienteUbicacion>>(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=${encodeURIComponent(numeroExp)}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener ubicación:', (error as Error).message);
      throw error;
    }
  }

  async obtenerExpedienteTiempos(numeroExp: string): Promise<ExpedienteTiempos | null> {
    try {
      const response = await apiService.request<ApiResponse<ExpedienteTiempos>>(
        'GET',
        `/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=${encodeURIComponent(numeroExp)}`
      );
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener tiempos:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Obtiene información completa del expediente (todos los endpoints) con caché
   */
  async obtenerExpedienteCompleto(
    numeroExp: string,
    forceRefresh = false
  ): Promise<ExpedienteCompleto | null> {
    const cacheKey = numeroExp.toLowerCase().trim();

    // Verificar caché si no es refresh forzado
    if (!forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.info(`📦 Expediente ${numeroExp} obtenido desde caché`);
        return cached;
      }
    }

    try {
      console.info(`🔄 Iniciando pre-carga completa para expediente: ${numeroExp}`);

      // Obtener datos base del expediente primero
      const expedienteBase = await this.obtenerExpediente(numeroExp);

      if (!expedienteBase) {
        console.warn(`❌ Expediente ${numeroExp} no encontrado`);
        return null;
      }

      // Ejecutar todas las consultas en paralelo para máximo rendimiento
      const [costo, unidad, ubicacion, tiempos] = await Promise.allSettled([
        this.obtenerExpedienteCosto(numeroExp),
        this.obtenerExpedienteUnidadOp(numeroExp),
        this.obtenerExpedienteUbicacion(numeroExp),
        this.obtenerExpedienteTiempos(numeroExp),
      ]);

      const expedienteCompleto: ExpedienteCompleto = {
        expediente: expedienteBase,
        costo: costo.status === 'fulfilled' ? costo.value || undefined : undefined,
        unidad: unidad.status === 'fulfilled' ? unidad.value || undefined : undefined,
        ubicacion: ubicacion.status === 'fulfilled' ? ubicacion.value || undefined : undefined,
        tiempos: tiempos.status === 'fulfilled' ? tiempos.value || undefined : undefined,
        fechaConsulta: new Date(),
      };

      // Guardar en caché
      this.saveToCache(cacheKey, expedienteCompleto);

      console.info(`✅ Pre-carga completa finalizada para expediente: ${numeroExp}`);
      return expedienteCompleto;
    } catch (error) {
      console.error(
        `❌ Error en pre-carga completa del expediente ${numeroExp}:`,
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * Obtiene datos desde el caché si están vigentes
   */
  private getFromCache(numeroExp: string): ExpedienteCompleto | null {
    const entry = expedienteCache.get(numeroExp);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      expedienteCache.delete(numeroExp);
      console.info(`🗑️ Cache expirado para expediente: ${numeroExp}`);
      return null;
    }

    return entry.data;
  }

  /**
   * Guarda datos en el caché
   */
  private saveToCache(numeroExp: string, data: ExpedienteCompleto): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    };

    expedienteCache.set(numeroExp, entry);
    console.info(`💾 Expediente ${numeroExp} guardado en caché por ${CACHE_TTL / 1000}s`);
  }

  /**
   * Limpia el caché manualmente
   */
  clearCache(): void {
    expedienteCache.clear();
    console.info('🧹 Caché limpiado completamente');
  }

  /**
   * Obtiene estadísticas del caché
   */
  getCacheStats(): { total: number; entries: string[] } {
    return {
      total: expedienteCache.size,
      entries: Array.from(expedienteCache.keys()),
    };
  }
}

export default BotService;
