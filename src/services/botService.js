
const AxiosService = require('./apiService');
const apiService = new AxiosService(process.env.API_BASE_URL);

class BotService {

  async obtenerExpediente(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      throw error;
    }
  }

  async obtenerExpedienteCosto(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      throw error;
    }
  }

  async obtenerExpedienteUnidadOp(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      throw error;
    }
  }

  async obtenerExpedienteUbicacion(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      throw error;
    }
  }

  async obtenerExpedienteTiempos(numeroExp) {
    try {
      const response = await apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BotService;