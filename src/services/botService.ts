import { AxiosService } from './apiService.js';
import { getConfig } from '../config/env.js';
import type {
  ApiResponse,
  DatosExpediente,
  ExpedienteCosto,
  ExpedienteUnidad,
  ExpedienteUbicacion,
  ExpedienteTiempos,
} from '../types/index.js';

const config = getConfig();
const apiService = new AxiosService(config.API_BASE_URL);

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
}

export default BotService;
