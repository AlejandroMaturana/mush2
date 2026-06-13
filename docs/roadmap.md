# Roadmap — Mush2

> Actualizado: 2026-06-13 — Mush2 v0.7.0 — Fases 0-7 completadas

El orden de las fases minimiza retrabajo: primero se fijan contratos, luego se construyen slices verticales completos, después se endurece y finalmente se industrializa.

---

## FASE 0 — Definición y Contratos (COMPLETADA ✅)

- [x] `docs/protocol/protocol-v1.md` — Contrato MQTT: tópicos, payloads, QoS
- [x] `docs/contracts/mqtt-contract.md` — Responsabilidades MQTT
- [x] `docs/contracts/api-contract.md` — Endpoints REST
- [x] `docs/architecture/architecture.md` — Arquitectura general
- [x] `docs/architecture/backend.md` — Estructura backend
- [x] `docs/architecture/frontend.md` — Árbol React, routing, SSE
- [x] `docs/architecture/firmware.md` — Módulos, pinout, state machine
- [x] `docs/database.md` — Esquema DB
- [x] `docs/requirements.md` — Requerimientos
- [x] `docs/ADR/ADR-001-thingspeak.md` — ThingSpeak como respaldo
- [x] `docs/governance/versioning.md` — SemVer por componente

---

## FASE 1 — Cadena de Telemetría (COMPLETADA ✅)

```
[Sensor] → [Firmware] → MQTT → [Backend] → REST → [Frontend]
```

- [x] Firmware: WiFi, AHT21, MQTT publisher, config.h generado
- [x] Backend: Express 5 + Sequelize + PostgreSQL, suscripción MQTT, endpoints telemetría
- [x] Frontend: Vite + React Router, Dashboard con MetricCard
- [x] Protocolo MQTT v1.0.0 validado extremo a extremo

---

## FASE 2 — Bucle de Control (COMPLETADA ✅)

```
[SSR] ← [Firmware] ← MQTT ← [Backend] ← REST ← [Frontend]
```

- [x] Firmware: SSR 3 canales, suscripción comandos MQTT, ACK
- [x] Backend: modelo Actuator, PATCH actuator, publishCommand, SSE
- [x] Frontend: DeviceDetail con ActuatorControl, useSSE hook

---

## FASE 3 — Sensores Avanzados (COMPLETADA ✅)

- [x] Firmware: ENS160 (CO2/VOC/AQI) en bus I2C compartido
- [x] Backend: ThingSpeak sync, modelos Recipe/CultivationCycle/CycleState
- [x] Seed: receta Melena de León

---

## FASE 4 — Automatización (COMPLETADA ✅)

- [x] Firmware: histéresis T/H/CO2, modos LOCAL/REMOTE/OFF, alarmas
- [x] Backend: controlEngine.js, transición automática de fases, snapshots
- [x] Frontend: página Ciclos, panel de alarmas en Dashboard

---

## FASE 5 — Hardening (COMPLETADA ✅)

- [x] Firmware: state machine (8 estados), watchdog HW+SW, EEPROM, MQTT backoff + LWT
- [x] Backend: JWT auth + RBAC, rate limiting, Helmet CSP, audit logging, tests
- [x] Frontend: ErrorBoundary, Skeleton, AuthContext, responsive

---

## FASE 6 — Multiusuario (COMPLETADA ✅)

- [x] Backend: tenant middleware, UserChamberAccess, checkDeviceAccess
- [x] Frontend: login/logout, axios interceptors, rutas protegidas

---

## FASE 7 — Producción (COMPLETADA ✅)

- [x] Firmware: OTA (ArduinoOTA + HTTP Update vía MQTT)
- [x] Backend: metrics endpoint, health checks, backup script
- [x] CI/CD: GitHub Actions (firmware + backend + frontend)
- [x] Documentación: manual de usuario

---

## Resumen

| Fase | Entrega | Estado |
|---|---|---|
| 0. Contratos | Documentación, contratos, arquitectura | ✅ |
| 1. Cadena Telemetría | Sensor → MQTT → Backend → DB → Frontend | ✅ |
| 2. Bucle de Control | Frontend → API → MQTT → SSR → ACK | ✅ |
| 3. Sensores Avanzados | ENS160, ThingSpeak, recetas | ✅ |
| 4. Automatización | Reglas, ciclos, alarmas | ✅ |
| 5. Hardening | Seguridad, errores, tests, watchdog | ✅ |
| 6. Multiusuario | Múltiples usuarios, tenencia | ✅ |
| 7. Producción | OTA, CI/CD, monitoreo, docs | ✅ |
