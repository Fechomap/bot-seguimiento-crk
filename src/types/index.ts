// Tipos principales del bot

export interface Config {
  TELEGRAM_TOKEN: string;
  API_BASE_URL: string;
  NODE_ENV: string;
  IS_PRODUCTION: boolean;
}

export interface Usuario {
  etapa: 'initial' | 'esperando_numero_expediente' | 'menu_seguimiento';
  expediente?: string;
  datosExpediente?: DatosExpediente;
}

export interface DatosExpediente {
  estatus: string;
  servicio: string;
  nombre: string;
  vehiculo: string;
  destino: string;
  // Agregar más campos según la respuesta de la API
}

export interface ApiResponse<T> {
  dataResponse: T;
  success?: boolean;
  message?: string;
}

export interface ExpedienteCosto {
  costo: number;
  costoTotal?: number;
  costoServicio?: number;
  costoAdicional?: number;
  moneda?: string;
  km?: string;
  plano?: string;
  banderazo?: string;
  costoKm?: string;
  casetaACobro?: number;
  casetaCubierta?: number;
  resguardo?: number;
  maniobras?: number;
  horaEspera?: number;
  Parking?: number;
  Otros?: number;
  excedente?: number;
}

export interface ExpedienteUnidad {
  numeroUnidad?: string;
  placas?: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  año?: string;
  unidadOperativa?: string;
  operador?: string;
  tipoGrua?: string;
  color?: string;
}

export interface ExpedienteUbicacion {
  ubicacionActual?: string;
  ubicacionGrua?: string;
  latitud?: number;
  longitud?: number;
  tiempoRestante?: string;
}

export interface ExpedienteTiempos {
  fechaInicio?: string;
  fechaEstimada?: string;
  tiempoTranscurrido?: string;
  porcentajeAvance?: number;
  tc?: string; // Tiempo de contacto
  tt?: string; // Tiempo de término
}

// Tipos para los handlers
export type MessageHandler = (msg: any) => Promise<void>;
export type CallbackQueryHandler = (query: any) => Promise<void>;
