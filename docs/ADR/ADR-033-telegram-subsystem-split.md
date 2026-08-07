# ADR-033: División del Subsistema Telegram en Configuración y Ejecución

**Estado:** Aceptado

**Fecha:** 2026-08-06

**Autores:** Mush2 Architecture Governance

**Decisores:** Mush2 Backend Team

---

# Resumen

El subsistema Telegram se divide en tres piezas de responsabilidad única: `TelegramConfigurationService` (configuración), `TelegramBotService` (runtime/ejecución) y `TelegramErrors` (clasificación de errores). Se elimina el servicio monolítico `telegramService.js`. Es un refactor interno con comportamiento observable idéntico: no cambian endpoints, payloads ni flujos funcionales.

---

# Contexto

- `backend/src/services/telegramService.js` mezclaba configuración y ejecución: leía `SystemSetting`, administraba la instancia `TelegramBot`, el polling, la máquina de estados, los handlers de comandos y el envío de mensajes en un solo archivo.
- La configuración (token/username) se leía directamente en `server.js` y `routes/telegram.js` con `SystemSetting.findOrCreate`/`findOne`, duplicando la lógica de persistencia en dos lugares.
- Los errores se manejaban con heurísticas ad hoc dispersas (`err.original?.message`, `err.cause?.message`, `err.response?.body?.description`) repetidas en cada catch.
- ISSUE-047 ya entregó la máquina de estados, el runtime centralizado, la serialización, el Generation Guard y la observabilidad. Lo que quedaba era separar responsabilidades y centralizar la clasificación de errores.

**Requisitos:**
- Comportamiento externo idéntico (sin endpoints nuevos, sin payloads nuevos).
- `GET /telegram/bot-status`, `POST /telegram/configure`, `sendAlarm()` y `sendMessage()` intactos.
- Menor acoplamiento, mayor cohesión, menor deuda técnica.

**Riesgos si no se hace nada:** la mezcla configuración/ejecución obliga a tocar un archivo de ~360 líneas para cualquier cambio; la lógica de persistencia está duplicada; la clasificación de errores es ad hoc.

---

# Decisión

## 1. `TelegramConfigurationService`

Se crea `telegramConfigurationService.js`, responsable únicamente de:

- obtener la configuración (`getBotConfig`),
- guardar la configuración (`saveBotConfig`),
- validar la existencia de configuración (`isConfigured`),
- leer `SystemSetting` y aplicar los fallbacks `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME`.

No administra runtime, no conoce `TelegramBot`, no gestiona polling ni envía mensajes.

## 2. `TelegramBotService`

Se crea `telegramBotService.js`, responsable de:

- runtime, ciclo de vida, máquina de estados,
- polling, handlers de comandos,
- Generation Guard, promise queue,
- observabilidad y métricas,
- `sendMessage`, `sendAlarm`, `initBot`, `stopBot`, `reconfigureBot`, `getBotStatus`, `isBotReady`.

No lee `SystemSetting` directamente: toda la configuración llega por parámetro desde el caller (que resuelve la config con `TelegramConfigurationService`).

## 3. `TelegramErrors`

Se crea `telegramErrors.js` con `classifyTelegramError(error)`, que retorna `{ kind, code, retryable, stateEffect }` y clasifica 401, 403, 409, 429, timeouts, errores de red, 5xx e internos. La clasificación es informativa: **no introduce reintentos ni altera transiciones de estado**.

## 4. Eliminación del servicio legacy

Una vez migrados todos los importadores (rutas, `server.js`, `notificationService` y tests), se elimina `telegramService.js` por completo. No se dejan wrappers ni aliases.

---

# Justificación

- **Separación de responsabilidades (SRP):** configuración, ejecución y clasificación de errores viven en módulos distintos; cada uno puede evolucionar y probarse de forma independiente.
- **Menor acoplamiento:** el bot service no depende de `SystemSetting`; el config service no depende de `node-telegram-bot-api`.
- **Cohesión:** el config service centraliza la persistencia (elimina la duplicación entre `server.js` y `routes/telegram.js`).
- **Zero breaking:** los contratos públicos y el comportamiento observable se mantienen; el refactor se puede verificar con la suite de tests existente.
- **Preparación para capacidades futuras:** la separación facilita incorporar posteriormente webhooks, colas, retries o proveedores múltiples sin tocar la configuración.

**Trade-offs aceptados:** un archivo adicional por pieza; los importadores deben apuntar al servicio correcto.

---

# Alternativas consideradas

## Alternativa A — Mantener `telegramService.js` como facade

Conservar el archivo como re-export de los nuevos servicios.

### Ventajas
- No se tocan importadores externos.

### Desventajas
- Conserva el nombre/archivo legacy y difumina la separación; deuda técnica sin limpiar.

### Motivo del descarte
- No existen consumidores fuera del repositorio; actualizar los 4 importadores internos es trivial y elimina el archivo legacy por completo.

## Alternativa B — Extraer solo la configuración, mantener el resto

### Ventajas
- Menor movimiento de código.

### Desventajas
- El bot service seguiría mezclando runtime y clasificación de errores; la taxonomía quedaría sin centralizar.

### Motivo del descarte
- No cumple el objetivo de cohesión total del subsistema.

---

# Consecuencias

## Positivas

- `telegramBotService.js` queda autocontenido y testeable sin DB.
- `telegramConfigurationService.js` centraliza la persistencia y los fallbacks.
- Los logs de error ganan `errorKind`/`errorCode`/`retryable` de forma consistente.
- La matriz de capacidades y la documentación de arquitectura reflejan la estructura real.

## Negativas

- Tres archivos en lugar de uno (más superficie de navegación).
- Los importadores y tests debieron migrarse en el mismo cambio.

## Riesgos

- Error de importación rompe el arranque → mitigado con suites Jest/Vitest verdes y actualización de los 4 importadores en el mismo cambio.
- Regresión funcional → mitigado por la restricción de comportamiento observable idéntico y tests de ciclo de vida existentes.

---

# Impacto en la arquitectura

| Componente | Impacto |
|------------|---------|
| Firmware | Sin cambios |
| Backend | `telegramService.js` → `telegramConfigurationService.js` + `telegramBotService.js` + `telegramErrors.js` |
| Frontend | Sin cambios (payloads intactos) |
| API | Sin cambios (mismos endpoints y respuestas) |
| Hardware | Sin cambios |

---

# Reglas derivadas

| ID | Regla |
|----|--------|
| ADR-033-01 | `telegramBotService` no debe leer `SystemSetting`; la configuración se recibe por parámetro. |
| ADR-033-02 | `telegramConfigurationService` no debe importar `node-telegram-bot-api` ni administrar runtime. |
| ADR-033-03 | Toda clasificación de errores del subsistema Telegram debe usar `classifyTelegramError`; no heurísticas ad hoc. |
| ADR-033-04 | No se deben reintroducir archivos legacy ni wrappers de `telegramService`. |
| ADR-033-05 | Los cambios en el subsistema no deben alterar endpoints ni payloads existentes sin nuevo ADR. |

---

# Implementación

- Módulos nuevos: `telegramConfigurationService.js`, `telegramBotService.js`, `telegramErrors.js`.
- Importadores migrados: `routes/telegram.js`, `server.js`, `notifications/notificationService.js`.
- Tests migrados/creados: `telegramBotService.test.js`, `telegramConfigurationService.test.js`, `telegramErrors.test.js`, mock actualizado en `notificationService.test.js`.

---

# Validación

- Suite Jest backend verde (incluye tests de lifecycle, machine state, generation guard, observabilidad, clasificación y configuración).
- Suite Vitest backend verde.
- `pnpm test` y `vite build` del frontend verdes (sin cambios de frontend).
- Verificación explícita: `telegramService.js` eliminado y cero referencias en código.

---

# ADR relacionados

- ADR-006 — Logs y monitoreo
- ADR-032 — Gobernanza de configuración

---

# Referencias

- ISSUE-048 — Refactor Arquitectónico del Subsistema Telegram
- `docs/issues/Issue-Telegram.md`
- `docs/architecture/telegram-subsystem-architecture.md`

---

# Historial

| Versión | Fecha | Cambio |
|----------|---------|--------|
| 1.0 | 2026-08-06 | Creación |
