/**
 * Servicio unificado para gestión de datos de expedientes
 * Versión optimizada con caché, paralelización inteligente y manejo avanzado de errores
 */
const BotService = require('./botService');
const cacheService = require('./cacheService');
const metricService = require('./metricService');
const { ExpedienteModel } = require('../models/expedienteModel');
const apiConfig = require('../config/apiConfig');
const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger').createLogger('expedienteService');

class ExpedienteService {
  /**
   * Constructor del servicio
   */
  constructor() {
    this.botService = new BotService();
    // Usar métricas y logger para monitoreo
    this.logger = logger;
  }

  /**
   * Obtiene todos los datos de un expediente realizando consultas optimizadas
   * @param {string} numeroExp - Número de expediente a consultar
   * @returns {Promise<ExpedienteModel>} - Modelo completo con todos los datos del expediente
   * @throws {Error} - Si el expediente no existe o hay errores en la consulta
   */
  async obtenerExpedienteCompleto(numeroExp) {
    if (!numeroExp) {
      throw new Error('Se requiere un número de expediente');
    }
    
    // Normalizar número de expediente
    const expNormalizado = numeroExp.trim().toUpperCase();
    
    // Crear clave de caché
    const cacheKey = expNormalizado;
    
    // Verificar si el expediente completo está en caché
    const cachedExpediente = cacheService.get('expediente', cacheKey);
    if (cachedExpediente) {
      this.logger.info(`✅ Expediente ${expNormalizado} obtenido desde caché`);
      metricService.trackExpedienteQuery(expNormalizado, 'completo', null);
      return cachedExpediente;
    }
    
    // Medir tiempo de operación
    const startTime = Date.now();
    this.logger.info(`🔍 Consultando expediente completo: ${expNormalizado}`);
    
    try {
      // Consultar primero la información básica para verificar existencia
      const timerLabel = `consulta_expediente_${expNormalizado}`;
      console.time(timerLabel);
      
      const infoBasica = await this.logger.time(
        'obtener_info_basica', 
        () => this.botService.obtenerExpediente(expNormalizado),
        { numeroExp: expNormalizado }
      );
      
      if (!infoBasica) {
        const error = new Error(`El expediente ${expNormalizado} no existe`);
        metricService.trackError('not_found', 'low', { numeroExp: expNormalizado });
        throw error;
      }
      
      // Determinar qué endpoints consultar según el estatus
      const endpointsNeeded = apiConfig.getEndpointsForStatus(infoBasica);
      
      // Crear modelo de expediente e inicializar con datos básicos
      const expediente = new ExpedienteModel();
      expediente.actualizarDatosGenerales(infoBasica);
      
      // Consultar el resto de endpoints en paralelo
      const consultaPromises = [];
      const consultaLabels = [];
      
      if (endpointsNeeded.includes('costo')) {
        consultaPromises.push(this.botService.obtenerExpedienteCosto(expNormalizado));
        consultaLabels.push('costo');
      }
      
      if (endpointsNeeded.includes('unidad')) {
        consultaPromises.push(this.botService.obtenerExpedienteUnidadOp(expNormalizado));
        consultaLabels.push('unidad');
      }
      
      if (endpointsNeeded.includes('ubicacion')) {
        consultaPromises.push(this.botService.obtenerExpedienteUbicacion(expNormalizado));
        consultaLabels.push('ubicacion');
      }
      
      if (endpointsNeeded.includes('tiempos')) {
        consultaPromises.push(this.botService.obtenerExpedienteTiempos(expNormalizado));
        consultaLabels.push('tiempos');
      }
      
      // Ejecutar consultas en paralelo
      const results = await Promise.allSettled(consultaPromises);
      console.timeEnd(timerLabel);
      
      // Procesar resultados
      results.forEach((result, index) => {
        const label = consultaLabels[index];
        
        if (result.status === 'fulfilled' && result.value) {
          // Actualizar el modelo según el tipo de datos
          switch (label) {
            case 'costo':
              expediente.actualizarDatosCosto(result.value);
              break;
            case 'unidad':
              expediente.actualizarDatosUnidad(result.value);
              break;
            case 'ubicacion':
              expediente.actualizarDatosUbicacion(result.value);
              break;
            case 'tiempos':
              expediente.actualizarDatosTiempos(result.value);
              break;
          }
          
          // Almacenar en caché individual por tipo
          this.cachearDatosPorTipo(expNormalizado, label, result.value);
        } else if (result.status === 'rejected') {
          // Registrar error pero continuar con el resto de datos
          this.logger.warn(`⚠️ Error al obtener ${label} para expediente ${expNormalizado}`, {
            error: result.reason?.message
          });
          
          metricService.trackError('api', 'low', { 
            tipo: label, 
            numeroExp: expNormalizado,
            error: result.reason?.message
          });
        }
      });
      
      // Calcular tiempo total de operación
      const duration = Date.now() - startTime;
      
      // Guardar expediente completo en caché
      const ttl = apiConfig.getCacheExpiryTime('completo', infoBasica);
      cacheService.set('expediente', cacheKey, expediente, ttl, {
        estatus: infoBasica.estatus,
        consultadoEn: new Date().toISOString()
      });
      
      // Registrar métrica de consulta
      metricService.trackExpedienteQuery(expNormalizado, 'completo', null);
      
      this.logger.info(`✅ Expediente ${expNormalizado} consultado en ${duration}ms`);
      
      return expediente;
    } catch (error) {
      // Categorizar y registrar error
      const errorInfo = errorHandler.categorizeError(error);
      errorHandler.logError(errorInfo, { 
        operation: 'obtenerExpedienteCompleto', 
        numeroExp: expNormalizado
      });
      
      // Actualizar métricas
      metricService.trackError(errorInfo.type, errorInfo.severity, {
        numeroExp: expNormalizado
      });
      
      throw error;
    }
  }

  /**
   * Actualiza datos específicos de un expediente con manejo optimizado de caché
   * @param {string} numeroExp - Número de expediente
   * @param {string} tipo - Tipo de datos a actualizar (costo, unidad, ubicacion, tiempos)
   * @returns {Promise<ExpedienteModel>} - Expediente actualizado
   */
  async actualizarDatosExpediente(numeroExp, tipo) {
    if (!numeroExp) {
      throw new Error('Se requiere un número de expediente');
    }
    
    if (!tipo) {
      throw new Error('Se requiere un tipo de datos a actualizar');
    }
    
    // Normalizar entradas
    const expNormalizado = numeroExp.trim().toUpperCase();
    const tipoNormalizado = tipo.toLowerCase();
    
    // Validar tipo
    const tiposValidos = ['costo', 'unidad', 'ubicacion', 'tiempos'];
    if (!tiposValidos.includes(tipoNormalizado)) {
      throw new Error(`Tipo de datos inválido: ${tipo}. Valores permitidos: ${tiposValidos.join(', ')}`);
    }
    
    this.logger.info(`🔄 Actualizando datos de ${tipoNormalizado} para expediente ${expNormalizado}`);
    
    try {
      // Verificar si hay datos en caché para actualizar
      let expediente = cacheService.get('expediente', expNormalizado);
      let actualizarCompleto = false;
      
      // Si no hay expediente en caché, se requiere consulta completa
      if (!expediente) {
        this.logger.info(`📭 No hay datos en caché para expediente ${expNormalizado}, realizando consulta completa`);
        return this.obtenerExpedienteCompleto(expNormalizado);
      }
      
      // Consultar datos específicos
      let datosActualizados;
      
      // Usar bloques try-catch individuales para cada tipo de consulta
      // para manejar fallos específicos sin afectar el proceso general
      try {
        switch (tipoNormalizado) {
          case 'costo':
            datosActualizados = await this.botService.obtenerExpedienteCosto(expNormalizado);
            if (datosActualizados) {
              expediente.actualizarDatosCosto(datosActualizados);
            }
            break;
            
          case 'unidad':
            datosActualizados = await this.botService.obtenerExpedienteUnidadOp(expNormalizado);
            if (datosActualizados) {
              expediente.actualizarDatosUnidad(datosActualizados);
            }
            break;
            
          case 'ubicacion':
            datosActualizados = await this.botService.obtenerExpedienteUbicacion(expNormalizado);
            if (datosActualizados) {
              expediente.actualizarDatosUbicacion(datosActualizados);
            }
            break;
            
          case 'tiempos':
            datosActualizados = await this.botService.obtenerExpedienteTiempos(expNormalizado);
            if (datosActualizados) {
              expediente.actualizarDatosTiempos(datosActualizados);
            }
            break;
        }
      } catch (error) {
        // Registrar error pero continuar
        const errorInfo = errorHandler.categorizeError(error);
        this.logger.warn(`⚠️ Error al actualizar ${tipoNormalizado} del expediente ${expNormalizado}`, {
          errorType: errorInfo.type,
          message: errorInfo.message
        });
        
        // Si el error es grave, marcar para actualización completa
        if (errorInfo.severity === 'high' || errorInfo.severity === 'fatal') {
          actualizarCompleto = true;
        }
      }
      
      // Si se requiere actualización completa por error grave, hacerla
      if (actualizarCompleto) {
        this.logger.info(`🔄 Realizando actualización completa del expediente ${expNormalizado} debido a errores`);
        return this.obtenerExpedienteCompleto(expNormalizado);
      }
      
      // Actualizar caché con los nuevos datos
      if (datosActualizados) {
        // Guardar datos específicos
        this.cachearDatosPorTipo(expNormalizado, tipoNormalizado, datosActualizados);
        
        // Guardar expediente completo actualizado
        const ttl = apiConfig.getCacheExpiryTime('completo', expediente);
        cacheService.set('expediente', expNormalizado, expediente, ttl, {
          estatus: expediente.estatus,
          ultimaActualizacion: new Date().toISOString()
        });
        
        // Registrar métrica
        metricService.trackExpedienteQuery(expNormalizado, tipoNormalizado, null);
      }
      
      return expediente;
    } catch (error) {
      // Categorizar y registrar error principal
      const errorInfo = errorHandler.categorizeError(error);
      errorHandler.logError(errorInfo, { 
        operation: 'actualizarDatosExpediente', 
        numeroExp: expNormalizado,
        tipo: tipoNormalizado
      });
      
      throw error;
    }
  }

  /**
   * Almacena datos específicos por tipo en caché
   * @param {string} numeroExp - Número de expediente
   * @param {string} tipo - Tipo de datos
   * @param {Object} datos - Datos a almacenar
   * @private
   */
  cachearDatosPorTipo(numeroExp, tipo, datos) {
    if (!datos) return;
    
    const expNormalizado = numeroExp.trim().toUpperCase();
    const cacheKey = `${expNormalizado}:${tipo}`;
    
    // Obtener tiempo de vida según tipo y datos
    const ttl = apiConfig.getCacheExpiryTime(tipo, datos);
    
    // Guardar en caché
    cacheService.set('expediente', cacheKey, datos, ttl, {
      tipo,
      actualizadoEn: new Date().toISOString()
    });
    
    this.logger.debug(`💾 Datos de ${tipo} para expediente ${expNormalizado} guardados en caché (TTL: ${ttl}s)`);
  }

  /**
   * Obtiene el expediente desde caché
   * @param {string} numeroExp - Número de expediente
   * @returns {ExpedienteModel|null} - Expediente o null si no está en caché
   */
  getCachedExpediente(numeroExp) {
    if (!numeroExp) return null;
    
    const expNormalizado = numeroExp.trim().toUpperCase();
    return cacheService.get('expediente', expNormalizado);
  }

  /**
   * Verifica si un expediente está en caché
   * @param {string} numeroExp - Número de expediente
   * @returns {boolean} - true si está en caché
   */
  isExpedienteCached(numeroExp) {
    if (!numeroExp) return false;
    
    const expNormalizado = numeroExp.trim().toUpperCase();
    return cacheService.has('expediente', expNormalizado);
  }

  /**
   * Limpia la caché para un expediente o para todos
   * @param {string} [numeroExp] - Número de expediente (opcional)
   */
  clearCache(numeroExp) {
    if (numeroExp) {
      const expNormalizado = numeroExp.trim().toUpperCase();
      // Eliminar expediente completo
      cacheService.delete('expediente', expNormalizado);
      
      // Eliminar por tipo
      const tipos = ['costo', 'unidad', 'ubicacion', 'tiempos'];
      tipos.forEach(tipo => {
        cacheService.delete('expediente', `${expNormalizado}:${tipo}`);
      });
      
      this.logger.info(`🧹 Caché eliminada para expediente ${expNormalizado}`);
    } else {
      // Forzar limpieza de toda la caché de expedientes
      cacheService.cleanup('expediente');
      this.logger.info('🧹 Caché de expedientes limpiada completamente');
    }
  }

  /**
   * Obtiene estadísticas de la caché de expedientes
   * @returns {Object} - Estadísticas
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Realiza pre-fetch de los datos más prioritarios de un expediente
   * Útil para preparar datos que probablemente se necesitarán pronto
   * @param {string} numeroExp - Número de expediente
   * @param {Array<string>} [prioridades] - Lista de tipos por prioridad
   * @returns {Promise<boolean>} - true si se realizó el pre-fetch
   */
  async preFetchExpediente(numeroExp, prioridades = null) {
    if (!numeroExp) return false;
    
    try {
      const expNormalizado = numeroExp.trim().toUpperCase();
      
      // Verificar si ya existe en caché
      const existeEnCache = this.isExpedienteCached(expNormalizado);
      
      if (existeEnCache) {
        // Si ya existe, solo actualizamos el tipo más prioritario
        const tipoPrioritario = (prioridades && prioridades[0]) || 'ubicacion';
        await this.actualizarDatosExpediente(expNormalizado, tipoPrioritario);
        return true;
      } else {
        // Si no existe, obtenemos el expediente completo
        await this.obtenerExpedienteCompleto(expNormalizado);
        return true;
      }
    } catch (error) {
      this.logger.warn(`⚠️ Error en pre-fetch de expediente ${numeroExp}`, {
        error: error.message
      });
      return false;
    }
  }
}

module.exports = ExpedienteService;