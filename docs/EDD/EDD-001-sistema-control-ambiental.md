# EDD-001 — Sistema de Control Ambiental End-to-End

## Metadata

| Campo             | Valor                                                         |
| ----------------- | ------------------------------------------------------------- |
| Autor             | AlejandroMaturana                                            |
| Estado            | ACCEPTED                                                      |
| Fecha             | 2026-06-06                                                    |
| Versión           | 1.0.0                                                         |
| ADRs relacionados | ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-008, ADR-012 |
| RFC relacionados  | —                                                             |

---

## 1. Problema / Contexto

El cultivo de hongos adaptógenos requiere control preciso de 4 variables ambientales simultáneas: temperatura, humedad relativa, CO₂ y ventilación. Las soluciones existentes en el mercado son o demasiado costosas (sistemas de HVAC industrial), o demasiado limitadas (controladores de temperatura simples sin inteligencia).

Mush2 nace como una plataforma IoT accesible que permite a productores ocasionales y laboratorios micológicos automatizar el microclima de sus cámaras de cultivo mediante recetas configurables, telemetría en tiempo real y alertas proactivas.

El desafío de diseño es construir un sistema distribuido (firmware embebido + backend cloud + frontend web) que sea confiable en condiciones de red inestable, seguro para operar sin supervisión constante, y extensible a múltiples cámaras.

---

## 2. Objetivos

- Medir temperatura, humedad, CO₂ y VOC con ciclos de lectura ≤ 10 segundos
- Controlar 4 actuadores (ventilación, calefacción, humidificación, iluminación) con latencia de comando ≤ 5 segundos extremo a extremo
- Operar en **modo degradado** (actuadores según última receta + histéresis local) si el backend no es alcanzable
- Soportar **recetas de cultivo** con múltiples fases (incubación, primordia, fructificación, cosecha)
- Proveer **dashboard en tiempo real** accesible desde cualquier navegador moderno
- Garantizar **seguridad** del sistema sin intervención del operador (watchdog, fail-safe overheat, safe mode)

---

## 3. No-objetivos (Out of Scope — v1)

- Control de CO₂ activo (inyección de CO₂) — solo ventilación pasiva
- Sincronización entre múltiples cámaras con lógica compartida (cubierta en Fase 8)
- Aplicación móvil nativa (cubierta en Fase 17)
- Predicción ML de ciclos de cultivo (cubierta en Fase 15)
- Certificación regulatoria o exportación (cubierta en Fase 18)

---

## 4. Alternativas consideradas

### 4.1 Protocolo de comunicación Firmware → Backend

| Opción                     | Pros                                                                                     | Contras                                                                        | Decisión                      |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| **HTTP Polling (elegida)** | Simple, firewall-friendly, sin broker externo, funciona en ESP32 sin librerías complejas | Mayor latencia que push, overhead por polling frecuente                        | ✅ Elegida — ADR-008          |
| MQTT bidireccional         | Latencia mínima, push de comandos                                                        | Requiere broker siempre disponible; si broker cae, firmware queda sin comandos | ❌ Descartado para telemetría |
| WebSocket                  | Bidireccional, eficiente                                                                 | Complejo en firmware, requiere reconexión robusta                              | ❌ Descartado                 |
| HTTP/2 + Server Push       | Eficiente                                                                                | No soportado en Arduino Core ESP32 de forma nativa                             | ❌ Descartado                 |

> **Nota:** MQTT **sí** se usa en el backend para propagar eventos al frontend vía SSE. El firmware usa HTTP exclusivamente.

### 4.2 Hardware del microcontrolador

| Opción                 | Pros                                                                     | Contras                                                   | Decisión                          |
| ---------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------- |
| **ESP32-S3 (elegido)** | Dual-core, FreeRTOS, NVS nativo, particiones OTA duales, crypto hardware | Más costoso que ESP8266                                   | ✅ Elegido — ADR-001              |
| ESP8266                | Barato, amplio soporte                                                   | Single-core, sin OTA dual, sin NVS robusto, RTOS limitado | ❌ Usado en v1, reemplazado en v2 |
| Arduino Nano IoT       | Familiar                                                                 | WiFi limitado, sin FreeRTOS completo                      | ❌ Descartado                     |
| Raspberry Pi Zero      | Potente, Linux                                                           | Consumo alto, boot lento, no adecuado para RTOS           | ❌ Descartado                     |

### 4.3 Base de datos

| Opción                   | Pros                                                     | Contras                                           | Decisión             |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| **PostgreSQL (elegida)** | Relacional, transaccional, JSONB, TimescaleDB compatible | Requiere servidor                                 | ✅ Elegida — ADR-005 |
| InfluxDB                 | Optimizada para time-series                              | No relacional, dificulta CRUD de recetas/usuarios | ❌ Descartado        |
| SQLite                   | Sin servidor                                             | No escala a múltiples conexiones simultáneas      | ❌ Descartado        |
| MongoDB                  | Flexible                                                 | Sin transacciones ACID en versiones anteriores    | ❌ Descartado        |

---

## 5. Solución propuesta

### Arquitectura de 3 capas

```
┌─────────────────────────────────────────────────────────┐
│                        INTERNET                          │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────────┐ │
│  │   Firmware       │    │         Backend               │ │
│  │   ESP32-S3       │    │   Node.js + Express 5         │ │
│  │                  │    │                               │ │
│  │  AHT21  ENS160  │    │  API REST (JWT)               │ │
│  │  SSR 4ch         │    │  Motor de reglas             │ │
│  │  FreeRTOS 6t     │    │  MQTT bridge                 │ │
│  │                  │    │  WebSocket/SSE               │─┼──► DB PostgreSQL
│  └────────┬─────────┘    └──────────────┬───────────────┘ │
│           │ HTTP Polling                │                  │
│           │ (telemetría + comandos)     │ MQTT             │
│           │                        ┌───▼───────┐          │
│           │                        │  Broker   │          │
│           │                        │  MQTT     │          │
│           │                        └───────────┘          │
│           │ HTTP GET                    │ SSE              │
│           └──────► ThingSpeak     ┌────▼──────────┐       │
│                                   │   Frontend    │       │
│                                   │  React + Vite │       │
│                                   └───────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Flujo de telemetría

```
Sensor AHT21/ENS160 (cada 8s)
  └──► HTTP POST /api/v1/telemetry → Backend → PostgreSQL
  └──► HTTP GET → ThingSpeak (respaldo visual)
       └──► SSE → Frontend (tiempo real)
```

### Flujo de control

```
Usuario → Frontend → REST PATCH /actuators/:channel
  └──► Backend → MQTT publish → Broker
       └──► Backend suscribe ACK → SSE → Frontend
Firmware (polling cada 500ms) → GET /poll → recibe comando
  └──► SSR actuador → POST /ack → Backend
```

### Motor de reglas

```
Backend ControlEngine (cada 60s)
  ├── Lee setpoints de receta activa
  ├── Compara con última telemetría
  ├── Evalúa reglas de histéresis
  └── Publica comando MQTT si necesario

Firmware (local, sin red)
  ├── Histéresis local T/H/CO₂
  ├── Temporizadores minOn/maxOn
  └── Modo DEGRADED si pierde HTTP
```

---

## 6. Impacto en componentes

| Componente      | Impacto | Cambios requeridos                                               |
| --------------- | ------- | ---------------------------------------------------------------- |
| Firmware        | Alto    | 6 tareas FreeRTOS, HTTP polling, state machine 10 estados, OTA v3 |
| Backend         | Alto    | Motor de reglas, WebSocket/SSE, MQTT bridge, RBAC, PostgreSQL    |
| Frontend        | Medio   | React 18, SSE, Chart.js, dashboard en tiempo real                |
| Base de datos   | Alto    | 18+ entidades relacionadas, backup diario                        |
| Infraestructura | Bajo    | PostgreSQL local (dev), broker MQTT público temporal             |

---

## 7. Plan de implementación

Ver [`docs/roadmap/roadmap.md`](../roadmap/roadmap.md) — Fases 0–7 completadas.

La implementación sigue el principio **"contratos primero, slices verticales después"**:

- Fase 0: Contratos y arquitectura
- Fases 1–3: Cadena de telemetría + control + sensores
- Fases 4–5: Automatización + hardening
- Fases 6–7: Multiusuario + producción

---

## 8. Métricas de éxito

| Métrica                 | Objetivo           | Estado                 |
| ----------------------- | ------------------ | ---------------------- |
| Ciclo de telemetría     | ≤ 10s              | ✅ 8s                  |
| Latencia de comando E2E | ≤ 5s               | ✅ ~1s (polling 500ms) |
| API respuesta (p95)     | ≤ 200ms            | ✅                     |
| Operación sin red       | ✅ modo DEGRADED   | ✅ histéresis local    |
| Uptime firmware         | > 99% con watchdog | ✅ TWDT + SWDT         |
| Cobertura tests backend | > 60%              | 🟡 En progreso         |

---

## 9. Riesgos y mitigaciones

| Riesgo                                   | Prob. | Impacto | Mitigación                               |
| ---------------------------------------- | ----- | ------- | ---------------------------------------- |
| Red inestable → firmware sin comandos    | Alta  | Medio   | Modo DEGRADED + histéresis local         |
| Sensor falla → actuadores descontrolados | Media | Alto    | Fail-safe overheat (ADR-010), SAFE mode  |
| Backend caído → frontend sin datos       | Baja  | Medio   | ThingSpeak como respaldo visual          |
| OTA falla → dispositivo inoperable       | Baja  | Crítico | Rollback nativo del bootloader (ADR-014) |
| Credenciales expuestas                   | Baja  | Crítico | NVS, .env, config.h nunca commiteado     |

---

## 10. Referencias

- [`docs/architecture/architecture.md`](../architecture/architecture.md) — Diagrama de componentes
- [`docs/protocol/protocol-v1.md`](../protocol/protocol-v1.md) — Protocolo HTTP
- [`docs/contracts/api-contract.md`](../contracts/api-contract.md) — Contratos REST
- [`docs/ADR/ADR-001-ESP32.md`](../ADR/ADR-001-ESP32.md) — Elección hardware
- [`docs/ADR/ADR-008-HTTP-Command-Protocol.md`](../ADR/ADR-008-HTTP-Command-Protocol.md) — Protocolo HTTP polling
- [`docs/ADR/ADR-012-FreeRTOS.md`](../ADR/ADR-012-FreeRTOS.md) — FreeRTOS
