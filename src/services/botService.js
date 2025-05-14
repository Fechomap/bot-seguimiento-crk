import { AxiosService } from './apiService.js';
import { getConfig } from '../config/env.js';

const config = getConfig();
const apiService = new AxiosService(config.API_BASE_URL);

export class BotService {
  async obtenerExpediente(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteBot?numero=${encodeURIComponent(numeroExp)}`);
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener expediente:', error.message);
      throw error;
    }
  }

  async obtenerExpedienteCosto(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=${encodeURIComponent(numeroExp)}`);
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener costo del expediente:', error.message);
      throw error;
    }
  }

  async obtenerExpedienteUnidadOp(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=${encodeURIComponent(numeroExp)}`);
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener unidad operativa:', error.message);
      throw error;
    }
  }

  async obtenerExpedienteUbicacion(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=${encodeURIComponent(numeroExp)}`);
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener ubicación:', error.message);
      throw error;
    }
  }

  async obtenerExpedienteTiempos(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=${encodeURIComponent(numeroExp)}`);
      return response.dataResponse;
    } catch (error) {
      console.error('❌ Error al obtener tiempos:', error.message);
      throw error;
    }
  }
}

export default BotService;