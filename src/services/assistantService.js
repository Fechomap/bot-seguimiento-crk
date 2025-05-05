/**
 * Servicio para integración con OpenAI Assistant API
 */
const { OpenAI } = require('openai');
const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger').createLogger('assistantService');

class AssistantService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID;
    
    if (!this.assistantId) {
      logger.warn('OPENAI_ASSISTANT_ID no está configurado');
    }
  }

  async createThread() {
    try {
      const thread = await this.openai.beta.threads.create();
      return thread.id;
    } catch (error) {
      const errorInfo = errorHandler.categorizeError(error);
      logger.error('Error creando thread', { error: errorInfo });
      throw error;
    }
  }

  async processMessage(threadId, message) {
    try {
      // Agregar mensaje al thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });

      // Ejecutar el assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId
      });

      // Esperar a que termine la ejecución
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 500));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Manejar function calling si es necesario
      if (runStatus.status === 'requires_action') {
        return this.handleToolCalls(threadId, runStatus);
      }

      // Obtener la respuesta
      const messages = await this.openai.beta.threads.messages.list(threadId);
      return messages.data[0].content[0].text.value;
    } catch (error) {
      const errorInfo = errorHandler.categorizeError(error);
      logger.error('Error procesando mensaje con Assistant', { error: errorInfo });
      throw error;
    }
  }

  async handleToolCalls(threadId, run) {
    const toolOutputs = [];
    
    for (const toolCall of run.required_action.submit_tool_outputs.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      try {
        const output = await this.executeFunction(functionName, args);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(output)
        });
      } catch (error) {
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: error.message })
        });
      }
    }

    // Enviar los resultados de vuelta al assistant
    await this.openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
      tool_outputs: toolOutputs
    });

    // Esperar y obtener la respuesta final
    let finalRun = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (finalRun.status === 'in_progress' || finalRun.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 500));
      finalRun = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await this.openai.beta.threads.messages.list(threadId);
    return messages.data[0].content[0].text.value;
  }

  async executeFunction(functionName, args) {
    const ExpedienteService = require('./expedienteService');
    const expedienteService = new ExpedienteService();
    
    switch (functionName) {
      case 'obtener_expediente':
        const expediente = await expedienteService.obtenerExpedienteCompleto(args.numero);
        return expediente ? expediente.aContextoIA() : { error: 'Expediente no encontrado' };
      
      case 'obtener_costo':
        await expedienteService.actualizarDatosExpediente(args.numero, 'costo');
        const expedienteCosto = await expedienteService.getCachedExpediente(args.numero);
        return expedienteCosto?.costo || { error: 'No se pudo obtener información de costo' };
      
      case 'obtener_unidad':
        await expedienteService.actualizarDatosExpediente(args.numero, 'unidad');
        const expedienteUnidad = await expedienteService.getCachedExpediente(args.numero);
        return expedienteUnidad?.unidad || { error: 'No se pudo obtener información de la unidad' };
      
      case 'obtener_ubicacion':
        await expedienteService.actualizarDatosExpediente(args.numero, 'ubicacion');
        const expedienteUbicacion = await expedienteService.getCachedExpediente(args.numero);
        return expedienteUbicacion?.ubicacion || { error: 'No se pudo obtener información de ubicación' };
      
      case 'obtener_tiempos':
        await expedienteService.actualizarDatosExpediente(args.numero, 'tiempos');
        const expedienteTiempos = await expedienteService.getCachedExpediente(args.numero);
        return expedienteTiempos?.tiempos || { error: 'No se pudo obtener información de tiempos' };
      
      default:
        throw new Error(`Función no reconocida: ${functionName}`);
    }
  }
}

module.exports = AssistantService;