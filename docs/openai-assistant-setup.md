1. Crear docs/openai-assistant-setup.md
Crear este nuevo archivo:
markdown# Configuración de OpenAI Assistant

## 1. Crear Assistant

1. Acceder a https://platform.openai.com/assistants
2. Click en "Create Assistant"
3. Configurar:
   - Name: "Bot Soporte Gruas"
   - Model: gpt-4-turbo
   - Instructions: (copiar de PLAN ESTRATEGICO.md)

## 2. Definir Functions

Para cada función, agregar en la sección Functions:

### obtener_expediente
```json
{
  "name": "obtener_expediente",
  "description": "Obtiene información general de un expediente",
  "parameters": {
    "type": "object",
    "properties": {
      "numero": {
        "type": "string",
        "description": "Número de expediente a consultar"
      }
    },
    "required": ["numero"]
  }
}
obtener_costo
json{
  "name": "obtener_costo",
  "description": "Obtiene información de costos de un expediente",
  "parameters": {
    "type": "object",
    "properties": {
      "numero": {
        "type": "string",
        "description": "Número de expediente"
      }
    },
    "required": ["numero"]
  }
}
obtener_unidad
json{
  "name": "obtener_unidad",
  "description": "Obtiene información de la unidad/grúa",
  "parameters": {
    "type": "object",
    "properties": {
      "numero": {
        "type": "string",
        "description": "Número de expediente"
      }
    },
    "required": ["numero"]
  }
}
obtener_ubicacion
json{
  "name": "obtener_ubicacion",
  "description": "Obtiene ubicación y tiempo restante de la unidad",
  "parameters": {
    "type": "object",
    "properties": {
      "numero": {
        "type": "string",
        "description": "Número de expediente"
      }
    },
    "required": ["numero"]
  }
}
obtener_tiempos
json{
  "name": "obtener_tiempos",
  "description": "Obtiene tiempos de contacto y término del servicio",
  "parameters": {
    "type": "object",
    "properties": {
      "numero": {
        "type": "string",
        "description": "Número de expediente"
      }
    },
    "required": ["numero"]
  }
}
3. Obtener Assistant ID
Copiar el Assistant ID de la consola y agregarlo a .env:
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx

## 2. Actualizar `README.md`

**Busca la sección de configuración y agrega:**

```markdown
## 🤖 OpenAI Assistant API

Este bot utiliza OpenAI Assistant API para proporcionar respuestas conversacionales. 
La configuración del comportamiento del Assistant se gestiona completamente desde la consola de OpenAI.

### Configuración

1. Crear un Assistant en https://platform.openai.com/assistants
2. Configurar las functions necesarias
3. Agregar el Assistant ID al archivo `.env`:
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx

Para más detalles, consultar `docs/openai-assistant-setup.md`