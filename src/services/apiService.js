const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class AxiosService {
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
    const headers = { ...this.defaultHeaders, ...customHeaders };
    const source = axios.CancelToken.source();

    const config = {
      method,
      url,
      headers,
      cancelToken: source.token,
      data: null,
      ...options,
    };

    if (data) {
      // config.data = data;
      Object.assign(config, { data: data });
    }

    try {
      const response = await this.api(config)
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Manejo de errores
  handleError(error) {
    if (error.response) {
      console.error('Error en la respuesta:', error.response.data);
    } else if (error.request) {
      console.error('Error en la solicitud:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

module.exports = AxiosService;