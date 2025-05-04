/**
 * Servicio para gestionar las sesiones de los usuarios
 * Proporciona funcionalidades para crear, actualizar, obtener y validar sesiones
 */
class SessionService {
  constructor() {
    // Objeto para almacenar el estado (sesión) de cada usuario
    this.sessions = {};
    
    // Configuración de tiempo de expiración desde variables de entorno (o valor por defecto de 60 minutos)
    this.sessionExpiryMinutes = parseInt(process.env.SESSION_EXPIRY || '60', 10);
  }

  /**
   * Inicializa o reinicia la sesión de un usuario
   * @param {number} chatId - ID del chat
   */
  initSession(chatId) {
    // Definir el modo por defecto según configuración
    const defaultMode = process.env.DEFAULT_MODE === 'traditional' ? false : true;
    
    this.sessions[chatId] = {
      etapa: 'initial',
      expediente: null,
      datosExpediente: null,
      modoConversacional: defaultMode, // Modo conversacional por defecto a menos que se configure lo contrario
      contextoConversacion: [], // Para guardar el contexto de la conversación con IA
      historicoConsultas: [], // Histórico de consultas realizadas
      ultimaActualizacion: new Date()
    };
    
    console.log(`📝 Sesión inicializada para usuario ${chatId} en modo ${defaultMode ? 'conversacional' : 'tradicional'}`);
    return this.sessions[chatId];
  }

  /**
   * Verifica si existe una sesión para el chatId especificado
   * @param {number} chatId - ID del chat
   * @returns {boolean} - true si existe la sesión, false en caso contrario
   */
  hasSession(chatId) {
    return !!this.sessions[chatId];
  }

  /**
   * Obtiene la sesión del usuario
   * @param {number} chatId - ID del chat
   * @returns {Object} - Objeto con la sesión del usuario o null si no existe
   */
  getSession(chatId) {
    if (!this.hasSession(chatId)) {
      return null;
    }
    
    // Actualizar timestamp de último acceso
    this.sessions[chatId].ultimaActualizacion = new Date();
    
    return this.sessions[chatId];
  }

  /**
   * Actualiza la sesión del usuario
   * @param {number} chatId - ID del chat
   * @param {Object} sessionData - Datos actualizados de la sesión
   */
  updateSession(chatId, sessionData) {
    if (this.hasSession(chatId)) {
      // Preservar la fecha de última actualización
      this.sessions[chatId] = {
        ...sessionData,
        ultimaActualizacion: new Date()
      };
      
      return true;
    }
    return false;
  }

  /**
   * Actualiza un campo específico de la sesión
   * @param {number} chatId - ID del chat
   * @param {string} field - Campo a actualizar
   * @param {any} value - Nuevo valor
   * @returns {boolean} - true si la actualización fue exitosa, false en caso contrario
   */
  updateSessionField(chatId, field, value) {
    if (this.hasSession(chatId)) {
      this.sessions[chatId][field] = value;
      this.sessions[chatId].ultimaActualizacion = new Date();
      return true;
    }
    return false;
  }

  /**
   * Cambia el modo del usuario entre conversacional y tradicional
   * @param {number} chatId - ID del chat
   * @param {boolean} conversational - Indica si debe usar modo conversacional
   * @returns {boolean} - true si el cambio fue exitoso, false en caso contrario
   */
  setConversationalMode(chatId, conversational) {
    if (this.updateSessionField(chatId, 'modoConversacional', !!conversational)) {
      console.log(`🔄 Usuario ${chatId} cambió a modo ${conversational ? 'conversacional' : 'tradicional'}`);
      return true;
    }
    return false;
  }

  /**
   * Registra una consulta en el histórico del usuario
   * @param {number} chatId - ID del chat
   * @param {string} tipo - Tipo de consulta (costo, unidad, ubicacion, tiempos)
   * @param {string} mensaje - Mensaje del usuario
   * @param {boolean} usedAI - Indica si se utilizó IA para procesar la consulta
   * @returns {boolean} - true si el registro fue exitoso, false en caso contrario
   */
  logConsulta(chatId, tipo, mensaje, usedAI = false) {
    if (this.hasSession(chatId)) {
      const registro = {
        tipo,
        mensaje,
        usedAI,
        timestamp: new Date()
      };
      
      if (!this.sessions[chatId].historicoConsultas) {
        this.sessions[chatId].historicoConsultas = [];
      }
      
      this.sessions[chatId].historicoConsultas.push(registro);
      this.sessions[chatId].ultimaActualizacion = new Date();
      
      // Limitar el tamaño del histórico (máximo 20 consultas)
      if (this.sessions[chatId].historicoConsultas.length > 20) {
        this.sessions[chatId].historicoConsultas = this.sessions[chatId].historicoConsultas.slice(-20);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Elimina la sesión de un usuario
   * @param {number} chatId - ID del chat
   */
  deleteSession(chatId) {
    if (this.hasSession(chatId)) {
      delete this.sessions[chatId];
      console.log(`🗑️ Sesión eliminada para usuario ${chatId}`);
      return true;
    }
    return false;
  }

  /**
   * Limpia sesiones antiguas según el tiempo de expiración configurado
   * @param {number} maxAgeMinutes - Edad máxima en minutos (opcional, usa la configuración por defecto)
   * @returns {number} - Número de sesiones eliminadas
   */
  cleanOldSessions(maxAgeMinutes = null) {
    const maxAge = maxAgeMinutes || this.sessionExpiryMinutes;
    const now = new Date();
    let count = 0;
    
    Object.keys(this.sessions).forEach(chatId => {
      const session = this.sessions[chatId];
      const ageInMinutes = (now - session.ultimaActualizacion) / (1000 * 60);
      
      if (ageInMinutes > maxAge) {
        this.deleteSession(chatId);
        count++;
      }
    });
    
    return count;
  }

  /**
   * Obtiene estadísticas sobre las sesiones actuales
   * @returns {Object} - Estadísticas de sesiones
   */
  getStats() {
    const totalSessions = Object.keys(this.sessions).length;
    let conversationalCount = 0;
    let traditionalCount = 0;
    let withExpedienteCount = 0;
    
    Object.values(this.sessions).forEach(session => {
      if (session.modoConversacional) {
        conversationalCount++;
      } else {
        traditionalCount++;
      }
      
      if (session.expediente) {
        withExpedienteCount++;
      }
    });
    
    return {
      totalSessions,
      conversationalCount,
      traditionalCount,
      withExpedienteCount,
      activeSessions: totalSessions,
      timestamp: new Date()
    };
  }
}

module.exports = SessionService;