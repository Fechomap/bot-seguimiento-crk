import axios from 'axios';

export class AxiosService {
  constructor(baseURL) {
    this.api = axios.create({
      baseURL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async request(method, url, data = null, customHeaders = {}, options = {}) {
    const headers = { ...customHeaders };
    const source = axios.CancelToken.source();

    const config = {
      method,
      url,
      headers,
      cancelToken: source.token,
      ...options,
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await this.api(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Manejo de errores mejorado
  handleError(error) {
    if (error.response) {
      console.error('❌ Error en la respuesta:', error.response.status, error.response.data);
      throw new Error(`Error en la respuesta: ${error.response.status}`);
    } else if (error.request) {
      console.error('❌ Error en la solicitud:', error.request);
      throw new Error('Error de conexión. No se recibió respuesta del servidor.');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

export default AxiosService;