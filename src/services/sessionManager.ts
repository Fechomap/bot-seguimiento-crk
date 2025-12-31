import type { Usuario, DatosExpediente, ExpedienteCompleto } from '../types/index.js';

type Etapa = Usuario['etapa'];

/**
 * Maneja las sesiones de usuarios de forma inmutable
 */
export class SessionManager {
  private usuarios: Map<number, Usuario> = new Map();

  /**
   * Obtiene la sesión de un usuario, creándola si no existe
   */
  getOrCreate(chatId: number): Usuario {
    if (!this.usuarios.has(chatId)) {
      this.usuarios.set(chatId, {
        etapa: 'initial',
        expediente: undefined,
        datosExpediente: undefined,
        expedienteCompleto: undefined,
      });
    }
    return this.usuarios.get(chatId)!;
  }

  /**
   * Obtiene la sesión de un usuario si existe
   */
  get(chatId: number): Usuario | undefined {
    return this.usuarios.get(chatId);
  }

  /**
   * Inicializa/reinicia la sesión de un usuario
   */
  init(chatId: number): Usuario {
    const usuario: Usuario = {
      etapa: 'initial',
      expediente: undefined,
      datosExpediente: undefined,
      expedienteCompleto: undefined,
    };
    this.usuarios.set(chatId, usuario);
    return usuario;
  }

  /**
   * Actualiza la etapa del usuario
   */
  setEtapa(chatId: number, etapa: Etapa): void {
    const usuario = this.getOrCreate(chatId);
    this.usuarios.set(chatId, { ...usuario, etapa });
  }

  /**
   * Actualiza el expediente activo del usuario
   */
  setExpediente(chatId: number, expediente: string): void {
    const usuario = this.getOrCreate(chatId);
    this.usuarios.set(chatId, { ...usuario, expediente });
  }

  /**
   * Actualiza los datos del expediente
   */
  setDatosExpediente(chatId: number, datosExpediente: DatosExpediente): void {
    const usuario = this.getOrCreate(chatId);
    this.usuarios.set(chatId, { ...usuario, datosExpediente });
  }

  /**
   * Actualiza el expediente completo con todos sus datos
   */
  setExpedienteCompleto(
    chatId: number,
    expediente: string,
    expedienteCompleto: ExpedienteCompleto
  ): void {
    const usuario = this.getOrCreate(chatId);
    this.usuarios.set(chatId, {
      ...usuario,
      expediente,
      expedienteCompleto,
      datosExpediente: expedienteCompleto.expediente,
      etapa: 'menu_seguimiento',
    });
  }

  /**
   * Verifica si un usuario tiene sesión activa
   */
  has(chatId: number): boolean {
    return this.usuarios.has(chatId);
  }

  /**
   * Elimina la sesión de un usuario
   */
  delete(chatId: number): boolean {
    return this.usuarios.delete(chatId);
  }
}
