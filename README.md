# 🚚 Bot de Telegram - Troya Soporte

Bot de Telegram para seguimiento de expedientes de servicios de grúa desarrollado con **TypeScript**, **Jest** y siguiendo estándares de calidad profesional.

## 📋 Descripción

Este bot permite a los usuarios consultar información detallada sobre sus expedientes de servicio de grúa, incluyendo:

- 🔍 **Seguimiento de expedientes** en tiempo real con colores visuales por estado
- 💰 **Consulta de costos** del servicio con desglose detallado
- 🚚 **Información de la unidad** asignada (operador, tipo, placas)
- 📍 **Ubicación y tiempo restante** estimado (para servicios en tránsito)
- ⏰ **Tiempos** de contacto y término
- 📊 **Resumen completo** automático con toda la información

## 🎨 Estados Visuales

El bot muestra estados con colores identificativos:

- 🟢 **CONCLUIDO** - Servicio completado
- 🟣 **EN PROCESO** - Servicio en camino  
- 🔴 **CANCELADO** - Servicio cancelado
- ⚪ **SIN ASIGNAR** - En espera de asignación
- 🟠 **A CONTACTAR** - Pendiente de contacto
- 🔵 **ENFILADO** - Unidad en fila
- ⚫ **MUERTO** - Expediente archivado

## 🛠️ Tecnologías Utilizadas

- **TypeScript** - Type safety y desarrollo robusto
- **Node.js** - Runtime del servidor
- **grammY** - Framework moderno para bots de Telegram
- **Axios** - Cliente HTTP para APIs
- **Jest** - Framework de testing
- **ESLint** - Linting con estándares Airbnb
- **Prettier** - Formateo automático de código
- **Day.js** - Manejo de fechas

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Token de bot de Telegram (obtener de @BotFather)

### Pasos de instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd troya-soporte-tg-bot
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus valores:
```env
TELEGRAM_TOKEN_SOPORTE=tu_token_de_telegram_aqui
API_BASE_URL=https://tu-api.com/api
NODE_ENV=development
```

4. **Ejecutar el bot**
```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm run build
npm start
```

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Ejecutar con nodemon y recarga automática
npm run build        # Compilar TypeScript a JavaScript
npm start            # Ejecutar versión compilada

# Calidad de código
npm run lint         # Verificar errores de ESLint
npm run lint:fix     # Corregir errores automáticamente
npm run format       # Formatear código con Prettier
npm run typecheck    # Verificar tipos sin compilar

# Testing
npm test             # Ejecutar todos los tests
npm run test:watch   # Ejecutar tests en modo watch
npm run test:coverage # Reporte de cobertura
npm run test:ci      # Tests para CI/CD

# Utilidades
npm run clean        # Limpiar directorio dist
```

## 🏗️ Arquitectura del Proyecto

```
src/
├── app.ts                 # Punto de entrada principal
├── config/
│   └── env.ts            # Configuración de variables de entorno
├── controllers/          # Controladores de negocio
│   ├── costoController.ts
│   ├── expedienteController.ts
│   ├── tiemposController.ts
│   ├── ubicacionController.ts
│   └── unidadController.ts
├── handlers/             # Manejadores de eventos del bot
│   ├── commandHandler.ts
│   └── messageHandler.ts
├── services/             # Servicios externos
│   ├── apiService.ts
│   └── botService.ts
├── types/                # Definiciones de tipos TypeScript
│   └── index.ts
└── utils/                # Utilidades y helpers
    ├── formatters.ts
    ├── keyboards.ts
    └── validators.ts
```

## 📱 Uso del Bot

### Características principales:

- **Consulta automática**: Solo escribe el número de expediente para iniciar
- **Pre-carga completa**: Obtiene toda la información disponible automáticamente
- **Animación visual**: Indicadores de progreso durante la consulta
- **Resumen automático**: Información completa mostrada automáticamente
- **Estados con colores**: Identificación visual rápida del estado

### Comandos disponibles:
- `/start` - Iniciar conversación con el bot
- `/help` - Mostrar ayuda

### Flujo de uso:
1. Enviar `/start` para inicializar
2. Escribir directamente el número de expediente
3. Ver información completa con resumen automático
4. Navegar por las opciones del menú:
   - 💰 Costo Total
   - 🚚 Unidad
   - 📍 Ubicación (solo servicios en tránsito)
   - ⏰ Tiempos
   - 📊 Estado (con color visual)

### Optimizaciones UX:
- **Sin botón "Otro Expediente"**: Escribe directamente el nuevo número
- **Detección automática**: Cualquier texto válido inicia nueva consulta
- **Animación rápida**: 100ms por paso para mejor responsividad
- **Caché inteligente**: Respuestas más rápidas para consultas repetidas

## 🧪 Testing

El proyecto incluye un sistema completo de testing con Jest:

```bash
# Ejecutar todos los tests
npm test

# Ver cobertura detallada
npm run test:coverage
```

### Cobertura actual:
- **Validators**: 100% cobertura
- **Formatters**: ~92% cobertura
- **Services**: Tests básicos implementados
- **Controllers**: Tests de validación

## ✅ Métricas de Calidad

- ✅ **TypeScript strict mode** activado
- ✅ **ESLint** con reglas Airbnb y seguridad
- ✅ **Prettier** para formato consistente
- ✅ **Jest** con 27+ tests pasando
- ✅ **Type safety** completo

## 🔒 Seguridad

- 🛡️ Variables de entorno protegidas
- 🔍 Validación y sanitización de entradas
- ⚠️ Manejo seguro de errores
- 🚫 No exposición de datos sensibles en logs
- 🔑 **Importante**: Rotar el token de Telegram regularmente

## 🤝 Contribución

1. Fork el repositorio
2. Crear una rama: `git checkout -b feature/nueva-funcionalidad`
3. Realizar cambios y commits: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares de código:
- Usar **Conventional Commits**
- Ejecutar `npm run lint:fix` antes de commit
- Mantener cobertura de tests > 80%
- Documentar funciones públicas con JSDoc

## 📄 Licencia

ISC

## 🆘 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio.

---

**Desarrollado con ❤️ usando TypeScript y siguiendo las mejores prácticas de desarrollo.**