import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  Method,
  CancelTokenSource,
} from 'axios';

export class AxiosService {
  private readonly api: AxiosInstance;

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request<T = any>(
    method: Method,
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any = null,
    customHeaders: Record<string, string> = {},
    options: Partial<AxiosRequestConfig> = {}
  ): Promise<T> {
    const headers = { ...customHeaders };
    const source: CancelTokenSource = axios.CancelToken.source();

    const config: AxiosRequestConfig = {
      method,
      url,
      headers,
      cancelToken: source.token,
      ...options,
    };

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      config.data = data;
    }

    try {
      const response = await this.api(config);
      return response.data as T;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  // Manejo de errores mejorado
  private handleError(error: AxiosError): never {
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
