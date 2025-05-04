/**
 * Servicio para consultas a la API externa
 * Proporciona métodos para obtener datos de expedientes
 */
const AxiosService = require('./apiService');

class BotService {
  constructor() {
    this.apiService = new AxiosService(process.env.API_BASE_URL);
  }

  /**
   * Obtiene los datos generales de un expediente
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<Object>} - Datos del expediente o null si no existe
   */
  async obtenerExpediente(numeroExp) {
    try {
      const response = await this.apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      console.error(`❌ Error al obtener expediente ${numeroExp}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene los datos de costo de un expediente
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<Object>} - Datos de costo del expediente
   */
  async obtenerExpedienteCosto(numeroExp) {
    try {
      const response = await this.apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteCostoBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      console.error(`❌ Error al obtener costo de expediente ${numeroExp}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene los datos de la unidad operativa de un expediente
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<Object>} - Datos de la unidad operativa
   */
  async obtenerExpedienteUnidadOp(numeroExp) {
    try {
      const response = await this.apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUnidadOpBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      console.error(`❌ Error al obtener unidad operativa de expediente ${numeroExp}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene los datos de ubicación de un expediente
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<Object>} - Datos de ubicación
   */
  async obtenerExpedienteUbicacion(numeroExp) {
    try {
      const response = await this.apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteUbicacionBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      console.error(`❌ Error al obtener ubicación de expediente ${numeroExp}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene los datos de tiempos de un expediente
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<Object>} - Datos de tiempos
   */
  async obtenerExpedienteTiempos(numeroExp) {
    try {
      const response = await this.apiService.request('GET', `/api/ConsultaExterna/ObtenerExpedienteTiemposBot?numero=${numeroExp}`);
      return response.dataResponse;
    } catch (error) {
      console.error(`❌ Error al obtener tiempos de expediente ${numeroExp}:`, error.message);
      throw error;
    }
  }
}

module.exports = BotService;