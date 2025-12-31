// Tipos principales del bot

export interface Config {
  TELEGRAM_TOKEN: string;
  API_BASE_URL: string;
  NODE_ENV: string;
  IS_PRODUCTION: boolean;
  PORT: number;
  WEBHOOK_URL: string | null;
}

export interface Usuario {
  etapa: 'initial' | 'esperando_numero_expediente' | 'menu_seguimiento';
  expediente?: string;
  datosExpediente?: DatosExpediente;
  expedienteCompleto?: ExpedienteCompleto;
}

export interface DatosExpediente {
  estatus: string;
  servicio: string;
  nombre: string;
  vehiculo: string;
  placas: string;
  destino: string;
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

export interface ExpedienteCompleto {
  expediente: DatosExpediente;
  costo?: ExpedienteCosto;
  unidad?: ExpedienteUnidad;
  ubicacion?: ExpedienteUbicacion;
  tiempos?: ExpedienteTiempos;
  fechaConsulta: Date;
}

export interface CacheEntry {
  data: ExpedienteCompleto;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

// Tipos para los handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageHandler = (msg: any) => Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallbackQueryHandler = (query: any) => Promise<void>;
