# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Telegram bot for tow truck service ("grúa") tracking. Users query expedition numbers to get real-time status, costs, unit info, location, and timing details.

## Commands

```bash
# Development
npm run dev          # Run with nodemon (hot reload)
npm run build        # Compile TypeScript
npm start            # Run compiled version

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Code Quality
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run typecheck    # Type check without emit
```

## Architecture

### Entry Point & Flow
- `src/app.ts` - Initializes bot using grammY framework, supports polling (dev) and webhooks (prod)
- User sessions stored in-memory as `Record<number, Usuario>` keyed by chat ID

### User Flow State Machine
```
initial → esperando_numero_expediente → menu_seguimiento
```
Users can enter expedition numbers at any stage; the bot auto-detects valid formats.

### Layer Structure

**Handlers** (`src/handlers/`)
- `commandHandler.ts` - `/start`, `/help` commands
- `messageHandler.ts` - Text message routing based on user stage

**Controllers** (`src/controllers/`)
- `expedienteController.ts` - Main expedition processing, auto-preloads all data
- `costoController.ts`, `unidadController.ts`, `ubicacionController.ts`, `tiemposController.ts` - Menu option handlers

**Services** (`src/services/`)
- `apiService.ts` - Axios wrapper for external API calls
- `botService.ts` - Business logic, parallel API fetching with `Promise.allSettled`, 5-minute in-memory cache

**Utils** (`src/utils/`)
- `validators.ts` - Input sanitization and expedition number validation
- `formatters.ts` - Currency, date formatting, status color emojis
- `keyboards.ts` - Telegram reply keyboards

### API Integration
External API endpoints follow pattern: `/api/ConsultaExterna/ObtenerExpediente*Bot?numero=`
- Base URL configured via `API_BASE_URL` env var
- All expedition data fetched in parallel for performance

### Key Types (`src/types/index.ts`)
- `Usuario` - User session state with stage and cached expedition data
- `ExpedienteCompleto` - Aggregated data from all API endpoints
- `DatosExpediente`, `ExpedienteCosto`, `ExpedienteUnidad`, etc. - API response types

## Environment Variables

```
TELEGRAM_TOKEN_SOPORTE  # Bot token from @BotFather
API_BASE_URL            # External API base URL
NODE_ENV                # development/production
```

## TypeScript Configuration

Strict mode enabled with additional checks:
- `noUncheckedIndexedAccess: true`
- `noPropertyAccessFromIndexSignature: true`
- ES2022 target with ESM modules

## Testing

Tests located in `__tests__/` directories alongside source files. Jest with ts-jest preset.

Run single test file:
```bash
npx jest src/utils/__tests__/validators.test.ts
```

## Conventions

- Use Conventional Commits
- Spanish language for user-facing messages
- Status colors: green (Concluido), purple (En Proceso), red (Cancelado), etc.
