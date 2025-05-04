// src/models/expedienteModel.js
/**
 * Modelo para representar los datos completos de un expediente
 * Proporciona estructura y validación para los datos
 */
class ExpedienteModel {
    constructor(data = {}) {
      // Datos generales
      this.expediente = data.expediente || null;
      this.nombre = data.nombre || null;
      this.vehiculo = data.vehiculo || null;
      this.estatus = data.estatus || null;
      this.servicio = data.servicio || null;
      this.destino = data.destino || null;
      
      // Datos de costo (se añadirán cuando estén disponibles)
      this.costo = {
        total: null,
        km: null,
        plano: null,
        banderazo: null,
        costoKm: null,
        casetaACobro: 0,
        casetaCubierta: 0,
        resguardo: 0,
        maniobras: 0,
        horaEspera: 0,
        Parking: 0,
        Otros: 0,
        excedente: 0
      };
      
      // Datos de unidad operativa
      this.unidad = {
        operador: null,
        tipoGrua: null,
        unidadOperativa: null,
        numeroEconomico: null,
        color: null,
        placas: null
      };
      
      // Datos de ubicación
      this.ubicacion = {
        ubicacionGrua: null,
        tiempoRestante: null
      };
      
      // Datos de tiempos
      this.tiempos = {
        tc: null, // tiempo de contacto
        tt: null  // tiempo de término
      };
    }
    
    /**
     * Actualiza los datos generales del expediente
     * @param {Object} data - Datos generales
     */
    actualizarDatosGenerales(data) {
      if (!data) return;
      
      this.expediente = data.expediente || this.expediente;
      this.nombre = data.nombre || this.nombre;
      this.vehiculo = data.vehiculo || this.vehiculo;
      this.estatus = data.estatus || this.estatus;
      this.servicio = data.servicio || this.servicio;
      this.destino = data.destino || this.destino;
    }
    
    /**
     * Actualiza los datos de costo del expediente
     * @param {Object} data - Datos de costo
     */
    actualizarDatosCosto(data) {
      if (!data) return;
      
      this.costo = {
        total: data.costo || this.costo.total,
        km: data.km || this.costo.km,
        plano: data.plano || this.costo.plano,
        banderazo: data.banderazo || this.costo.banderazo,
        costoKm: data.costoKm || this.costo.costoKm,
        casetaACobro: parseFloat(data.casetaACobro || 0),
        casetaCubierta: parseFloat(data.casetaCubierta || 0),
        resguardo: parseFloat(data.resguardo || 0),
        maniobras: parseFloat(data.maniobras || 0),
        horaEspera: parseFloat(data.horaEspera || 0),
        Parking: parseFloat(data.Parking || 0),
        Otros: parseFloat(data.Otros || 0),
        excedente: parseFloat(data.excedente || 0)
      };
    }
    
    /**
     * Actualiza los datos de unidad operativa
     * @param {Object} data - Datos de unidad
     */
    actualizarDatosUnidad(data) {
      if (!data) return;
      
      this.unidad = {
        operador: data.operador || this.unidad.operador,
        tipoGrua: data.tipoGrua || this.unidad.tipoGrua,
        unidadOperativa: data.unidadOperativa || this.unidad.unidadOperativa,
        numeroEconomico: this.extraerNumeroEconomico(data.unidadOperativa) || this.unidad.numeroEconomico,
        color: data.color || this.unidad.color,
        placas: data.placas || this.unidad.placas
      };
    }
    
    /**
     * Actualiza los datos de ubicación
     * @param {Object} data - Datos de ubicación
     */
    actualizarDatosUbicacion(data) {
      if (!data) return;
      
      this.ubicacion = {
        ubicacionGrua: data.ubicacionGrua || this.ubicacion.ubicacionGrua,
        tiempoRestante: data.tiempoRestante || this.ubicacion.tiempoRestante
      };
    }
    
    /**
     * Actualiza los datos de tiempos
     * @param {Object} data - Datos de tiempos
     */
    actualizarDatosTiempos(data) {
      if (!data) return;
      
      this.tiempos = {
        tc: data.tc || this.tiempos.tc,
        tt: data.tt || this.tiempos.tt
      };
    }
    
    /**
     * Extrae el número económico de la unidad operativa
     * @param {string} unidadOperativa - Texto de unidad operativa
     * @returns {string} - Número económico extraído
     * @private
     */
    extraerNumeroEconomico(unidadOperativa) {
      if (!unidadOperativa) return null;
      
      const match = unidadOperativa.match(/^(\d+)\s*(.*)$/);
      return match ? match[1] : unidadOperativa;
    }
    
    /**
     * Verifica si el expediente tiene todos los datos básicos
     * @returns {boolean} - true si tiene datos básicos completos
     */
    tieneDataBasica() {
      return !!(this.expediente && this.nombre);
    }
    
    /**
     * Crea una versión simplificada del expediente para enviar a ChatGPT
     * @returns {Object} - Versión simplificada del expediente
     */
    aContextoIA() {
      return {
        expediente: this.expediente,
        cliente: {
          nombre: this.nombre,
          vehiculo: this.vehiculo,
          servicio: this.servicio,
          estatus: this.estatus,
          destino: this.destino
        },
        costo: this.costo,
        unidad: this.unidad,
        ubicacion: this.ubicacion,
        tiempos: this.tiempos
      };
    }
  }
  
  // src/models/userSessionModel.js
  /**
   * Modelo para representar una sesión de usuario
   * Proporciona estructura y métodos para gestionar el estado de la conversación
   */
  class UserSessionModel {
    constructor(chatId) {
      this.chatId = chatId;
      this.etapa = 'initial';
      this.expediente = null;
      this.datosExpediente = null;
      this.modoConversacional = false;
      this.ultimaActualizacion = new Date();
      this.historicoConsultas = [];
      this.contextoConversacion = [];
    }
    
    /**
     * Actualiza la etapa de la conversación
     * @param {string} etapa - Nueva etapa
     */
    setEtapa(etapa) {
      this.etapa = etapa;
      this.actualizarTimestamp();
    }
    
    /**
     * Establece el número de expediente
     * @param {string} expediente - Número de expediente
     */
    setExpediente(expediente) {
      this.expediente = expediente;
      this.actualizarTimestamp();
    }
    
    /**
     * Establece los datos del expediente
     * @param {Object} datos - Datos del expediente
     */
    setDatosExpediente(datos) {
      this.datosExpediente = datos;
      this.actualizarTimestamp();
    }
    
    /**
     * Cambia el modo de interfaz
     * @param {boolean} modo - true para conversacional, false para tradicional
     */
    setModoConversacional(modo) {
      this.modoConversacional = !!modo;
      this.actualizarTimestamp();
    }
    
    /**
     * Añade un mensaje al contexto de la conversación
     * @param {string} role - Rol (user|assistant)
     * @param {string} content - Contenido del mensaje
     */
    addMensajeContexto(role, content) {
      this.contextoConversacion.push({ role, content });
      this.actualizarTimestamp();
    }
    
    /**
     * Registra una consulta realizada
     * @param {string} tipo - Tipo de consulta
     * @param {Object} datos - Datos recibidos
     */
    registrarConsulta(tipo, datos) {
      this.historicoConsultas.push({
        tipo,
        timestamp: new Date(),
        datos
      });
      this.actualizarTimestamp();
    }
    
    /**
     * Actualiza el timestamp de última actualización
     * @private
     */
    actualizarTimestamp() {
      this.ultimaActualizacion = new Date();
    }
    
    /**
     * Verifica si la sesión ha expirado
     * @param {number} maxMinutos - Tiempo máximo de inactividad en minutos
     * @returns {boolean} - true si la sesión ha expirado
     */
    haExpirado(maxMinutos = 60) {
      const now = new Date();
      const diffMinutos = (now - this.ultimaActualizacion) / (1000 * 60);
      return diffMinutos > maxMinutos;
    }
  }
  
  module.exports = {
    ExpedienteModel,
    UserSessionModel
  };