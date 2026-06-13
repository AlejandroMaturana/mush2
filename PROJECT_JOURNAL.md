# Mush2 — Bitácora del Proyecto

> Registro cronológico de decisiones, hitos y aprendizajes.

---

## 2026-06-12 — Fundación del proyecto

**Decisión**: Migrar desde mushprodview (monolito appweb) a arquitectura separada frontend/backend.

**Motivación**: Mantenibilidad, escalabilidad y separación clara de responsabilidades. El monolito con Handlebars dificulta la evolución independiente de la interfaz.

**Cambios respecto a mushprodview v1**:
- Frontend separado con React (Vite) en lugar de Handlebars
- Backend Node.js/Express con API REST desacoplada
- Mismo protocolo MQTT v1 (hereda de mushprodview) pero con documentación formal
- Mismos sensores objetivo: AHT21 (temp/humedad), ENS160 (CO2/VOC)
- Base de datos PostgreSQL, misma capa ORM con Sequelize 6

**Archivos definidos en esta sesión**:
- `PROJECT_CONTEXT.md` — Definición, componentes, reglas
- `PROJECT_JOURNAL.md` — Esta bitácora
- `docs/architecture/architecture.md` — Arquitectura general
- `docs/architecture/backend.md` — Arquitectura backend
- `docs/architecture/frontend.md` — Arquitectura frontend
- `docs/architecture/firmware.md` — Arquitectura firmware
- `docs/protocol/protocol-v1.md` — Protocolo MQTT v1
- `docs/contracts/mqtt-contract.md` — Contrato MQTT
- `docs/contracts/api-contract.md` — Contrato API REST
- `docs/requirements.md` — Requerimientos
- `docs/deployment.md` — Estrategia de despliegue
- `docs/database.md` — Esquema de base de datos
- `docs/roadmap.md` — Roadmap actualizado
- `docs/governance/versioning.md` — Estrategia de versionado
- `docs/ADR/ADR-001-thingspeak.md` — Decisión ThingSpeak

**Stack elegido**:

| Capa | Tecnología | Versión |
|---|---|---|
| Firmware | C++ (PlatformIO / ESP8266) | v0.1.0 |
| Backend | Node.js + Express 5 + Sequelize 6 | v0.1.0 |
| Frontend | React 18 + Vite + Chart.js | v0.1.0 |
| Base de datos | PostgreSQL 16 | — |
| Broker MQTT | Mosquitto / HiveMQ | — |
| Telemetría | ThingSpeak (API REST) | — |

---

## 2026-06-12 — ADR-001: ThingSpeak como respaldo de telemetría

Se documenta la decisión de usar ThingSpeak como canal secundario de telemetría. El canal primario es MQTT → Backend → PostgreSQL. ThingSpeak actúa como buffer de datos cuando el backend no está disponible y como fuente para diagnósticos rápidos.

---

## 2026-06-12 — Fase 1 completada

**Logro**: Cadena de telemetría completa funcionando extremo a extremo.

**Verificación**:
1. Backend Node.js/Express arranca, conecta PostgreSQL y broker MQTT.
2. Firmware ESP8266 compila (RAM 36.8%, Flash 28.5%).
3. Frontend React/Vite build exitoso.
4. Prueba de integración: MQTT publish simulado → Backend recibe → DB persiste → API responde.

**Artefactos generados**:
- Backend: 4 modelos, 4 endpoints, servicio MQTT con failover
- Frontend: Dashboard con MetricCards, polling 10s, proxy API
- Firmware: wifi_manager (2 redes), aht_sensor (I2C 0x38), mqtt_handler (2 brokers), thingspeak_client (HTTP)
- `generate_config.py`: genera `config.h` desde `.env`

**Dependencias eliminadas por innecesarias**: DHT sensor library, Adafruit Unified Sensor (AHT21 usa I2C directo por Wire)

**Grabado en protocolo**: El payload real del firmware y los tópicos MQTT coinciden con `docs/protocol/protocol-v1.md`.

---

## 2026-06-12 — Fase 2 completada

**Logro**: Bucle de control cerrado extremo a extremo. El sistema no solo lee sensores, sino que actúa sobre el ambiente.

**Verificación**:
1. Firmware compila con `ssr_controller` (RAM 37.7%, Flash 29.4%)
2. Backend publica comandos MQTT QoS 2 y procesa ACK
3. SSE endpoint responde con `text/event-stream` + `{"type":"connected"}`
4. API PATCH actuator retorna 404 correcto para dispositivos inexistentes
5. Frontend build exitoso (215KB JS + 4KB CSS)

**Artefactos generados**:
- Firmware: `ssr_controller` (3 canales SSR, minOn/maxOn), comando MQTT (QoS 2), ACK, estado retain
- Backend: modelo `Actuator`, PATCH endpoint, `publishCommand()`, SSE `/events`, manejo ACK
- Frontend: `DeviceDetail` page, `ActuatorControl`, `useSSE` hook, routing

**Correcciones**:
- Path de `.env` corregido en `backend/src/config/env.js` (de `../../.env` a `../../../.env`)
- `platformio.ini`: añadida dependencia `arduinojson@^7.0`

**Grabado en protocolo**: Comandos (`mush2/cmd/{id}/actuator`) y ACK (`mush2/event/{id}/ack`) siguen especificación de `protocol-v1.md`.

---

## 2026-06-12 — Fase 3 completada

**Logro**: Sensor ENS160 (CO₂/VOC) integrado con el módulo combinado ENS160+AHT21 (un solo board I2C). Backend con recetas y ciclos de cultivo. Seed de Lion's Mane.

**Lección importante**: El ENS160 y el AHT21 NO son sensores separados en pines distintos. Vienen en un **módulo único** que comparte el bus I2C (SDA=D2/GPIO4, SCL=D1/GPIO5). El ENS160 requiere calibración con T/H del AHT21 vía `setTempAndHum()` antes de cada lectura.

**Verificación**:
1. Firmware compila con ENS160 + AHT21 + SSR (RAM 38.0%, Flash 29.6%)
2. Backend sincroniza modelos Recipe, CultivationCycle, CycleState
3. Seed Lion's Mane creado en DB (18d incubación 20-24°C / 10d fructificación 18-22°C)
4. API recetas responde con datos seedeados
5. Frontend build exitoso (224KB JS + 6KB CSS)

**Artefactos generados**:
- Firmware: `ens160_sensor` (DFRobot_ENS160, I2C 0x53, AQI/eCO₂/TVOC), modo DEGRADED
- Backend: `Recipe`, `CultivationCycle`, `CycleState` modelos; CRUD recetas/ciclos; `thingSpeakSync.js`; seed Lion's Mane
- Frontend: página `Recipes` con tabla + formulario de creación

---

## 2026-06-12 — Fase 4 completada

**Logro**: Motor de reglas y automatización funcionando. El firmware puede operar en modo LOCAL con histéresis; el backend evalúa ciclos activos contra recetas y transiciona fases automáticamente.

**Verificación**:
1. Firmware compila con hysteresis_controller (RAM 38.4%, Flash 30.0%)
2. Backend control engine evaluó 0 ciclos activos (correcto — no hay ciclos aún)
3. API cycles + recipes responden con datos seedeados
4. Frontend build exitoso (227KB JS + 7.8KB CSS)
5. SSE emite eventos `control_eval`

**Artefactos generados**:
- Firmware: `hysteresis_controller` (histéresis T/H/CO2, 3 modos, alarmas), `onConfig` callback, publishAlarm
- Backend: `controlEngine.js` (evaluación 60s, comparación setpoints, transición fases, snapshots)
- Frontend: página `Cycles`, panel de alertas en dashboard

---

## 2026-06-12 — Fase 5 completada

**Logro**: Sistema endurecido para entornos productivos. Seguridad JWT + RBAC, watchdog hardware/software en firmware, manejo de reconexiones con exponential backoff, y pruebas unitarias.

**Verificación**:
1. Firmware compila con state machine + WDT (RAM 38.9%, Flash 30.2%)
2. MQTT exponential backoff firmware (5s—180s) + backend (5s—180s)
3. Backend JWT auth login/refresh/logout + RBAC jerárquico
4. Rate limiting (100 req/15min) + Helmet CSP
5. Seed admin user (SUPER_ADMIN)
6. Frontend ErrorBoundary + Skeleton + responsive build exitoso
7. Backend startup OK con MQTT conectado

**Artefactos generados**:
- Firmware: `state_machine` (WDT, EEPROM, SAFE mode), MQTT backoff + LWT
- Backend: `User/AuditLog` models, auth routes, RBAC middleware, encryption/audit services, tests
- Frontend: `ErrorBoundary`, `Skeleton`, `AuthContext`, responsive CSS

---

## 2026-06-12 — Fase 6 completada

**Logro**: El backend soporta múltiples usuarios con aislamiento completo por tenant. Cada usuario ve solo sus dispositivos, recetas y ciclos. Planes FREE/BASIC/PREMIUM con límites.

**Verificación**:
1. Backend inicia con modelos Subscription, UserChamberAccess, ApiKey
2. Login JWT + refresh token automático en frontend
3. Filtrado tenant funcionando (devices, recipes, cycles por userId)
4. Límite de plan FREE: 1 dispositivo validado
5. Frontend build exitoso (235KB JS)
6. Settings page con info de plan

**Artefactos generados**:
- Backend: `Subscription/UserChamberAccess/ApiKey` models, tenant middleware, admin routes, subscription routes
- Frontend: `Login`, `Settings` pages, axios interceptors, protected routes

---

## 2026-06-12 — Fase 7 completada — Mush2 v0.7.0

**Logro**: Mush2 alcanza madurez productiva con OTA, CI/CD, monitoreo y documentación completa. Todas las fases planificadas (0–7) están completadas.

**Verificación final**:
1. Firmware OTA compila (RAM 40.4%, Flash 34.4%)
2. Backend metrics + health endpoints OK
3. CI/CD GitHub Actions con 3 jobs paralelos
4. Frontend build exitoso (235KB JS)
5. Manual de usuario completo
6. DB backup script funcional

**Artefactos generados**:
- Firmware: `ota_handler` (ArduinoOTA + HTTP Update), suscripción `mush2/cmd/{id}/ota`
- Backend: `monitoring.js` routes, `backup-db.js` script
- CI/CD: `.github/workflows/ci.yml`
- Docs: `docs/user/manual.md` — manual de usuario completo en español

---
