# Arquitectura del Sistema — Mush2

## Visión General

Sistema IoT de control ambiental para hongos adaptógenos. Arquitectura de 3 capas (firmware, backend, frontend) comunicadas mediante MQTT, API REST y ThingSpeak.

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                             │
│                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│   │ Firmware  │───▶│  Broker  │───▶│    Backend       │  │
│   │ ESP8266   │◀───│  MQTT    │◀───│  Node/Express    │  │
│   │           │    │          │    │                  │  │
│   │ AHT21     │    │Mosquitto │    │ API REST (JWT)   │──┼──▶ DB PostgreSQL
│   │ ENS160    │    │ HiveMQ   │    │ WebSocket (SSE)  │  │
│   │ SSR 3ch   │    └──────────┘    │ Motor de reglas  │  │
│   └──────┬────┘                    └────────┬─────────┘  │
│          │                                   │            │
│          │  HTTP (GET)                       │  HTTP      │
│          └────────────────▶ ThingSpeak ◀─────┘            │
│                                                   │      │
│                                          ┌────────┴──┐   │
│                                          │  Frontend  │   │
│                                          │  React     │   │
│                                          │  Vite      │   │
│                                          │  Chart.js  │   │
│                                          └───────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Flujos de Datos

### 1. Telemetría (Sensor → Nube)
```
Sensor AHT21/ENS160 → Firmware (lectura cada 10s)
    ├── MQTT publish → Broker → Backend → PostgreSQL
    └── HTTP GET → ThingSpeak (campo de respaldo)
```

### 2. Control (Usuario → Actuador)
```
Usuario (Frontend React)
    └── API REST (JWT) → Backend
        ├── MQTT publish → Broker → Firmware → SSR Relay
        └── DB update (estado deseado persistido)

Firmware
    └── MQTT publish (ack) → Broker → Backend → WebSocket → Frontend
```

### 3. Automatización (Motor de Reglas)
```
Backend (ControlEngine)
    ├── Lee setpoints de receta activa
    ├── Compara con última telemetría
    ├── Decide acción (encender ventilador, calefactor, etc.)
    └── Publica comando MQTT

Firmware (Reglas locales)
    ├── Histéresis para evitar oscilaciones
    ├── Temporizadores de seguridad (mín/máx ON)
    └── Fallback a modo degradado si pierde conexión
```

## Comunicaciones

| Origen | Destino | Protocolo | Puerto | Frecuencia | Payload |
|---|---|---|---|---|---|
| Firmware | ThingSpeak | HTTP GET | 80 | Cada 20s | `field1=temp&field2=hum&field3=CO2` |
| Firmware | Broker MQTT | MQTT 3.1.1 | 1883 | Cada 20s | JSON telemetría |
| Firmware | Broker MQTT | MQTT 3.1.1 | 1883 | Bajo demanda | JSON estado SSR |
| Broker | Backend | MQTT 3.1.1 | 1883 | Tiempo real | JSON telemetría/eventos |
| Backend | Broker | MQTT 3.1.1 | 1883 | Bajo demanda | JSON comandos SSR |
| Backend | Frontend | REST/SSE | 3797 | Tiempo real | JSON |
| Frontend | Backend | REST (JWT) | 3797 | Acciones usuario | JSON |

## Modelo de Capacidades (Capability-Based Subscription)

La plataforma implementa un modelo de suscripción basado en capacidades (ADR-016). La suscripción determina políticas de acceso a recursos compartidos, no diferencias funcionales del controlador.

### Clasificación

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Capacidad** | Funcionalidad habilitada/deshabilitada | `automation.recipes`, `integrations.mqtt` |
| **Recurso** | Entidad consumible con límite | `devices.max`, `storage.gb` |
| **Cuota** | Límite medible sobre un recurso | `api.requests.per_month`, `data.retention.days` |
| **Política** | Regla de comportamiento del sistema | `qos.refresh_rate`, `disposition.cancel` |

### Planes

| Plan | API Calls/mes | Retención | Dispositivos | QoS |
|------|---------------|-----------|--------------|-----|
| FREE | 1,000 | 30 días | 1 | Polling 30s |
| BASIC | 10,000 | 90 días | 5 | WebSocket 5s |
| PREMIUM | 100,000 | 365 días | Ilimitado | Streaming < 1s |

Ver `docs/architecture/capability-catalog.md` para el catálogo completo de capacidades.

## Stack Tecnológico

### Firmware (ESP8266/ESP32-S3)
- **Lenguaje**: C++11 (PlatformIO / Arduino Core)
- **Sensores**: AHT21 (I2C), ENS160 (I2C)
- **Actuadores**: SSR 4 canales (active-high configurable)
- **Conectividad**: WiFi (2 redes failover), MQTT (2 brokers failover)
- **Watchdog**: Hardware (8s) + Software (30s) con contador de rebotes EEPROM
- **Configuración**: `config.h` generado desde `.env`

### Backend (Node.js)
- **Runtime**: Node.js 20+
- **Framework**: Express 5
- **ORM**: Sequelize 6 + PostgreSQL 16
- **Autenticación**: JWT (HS256) + API Key dual, bcryptjs
- **Autorización**: RBAC (4 roles) + capability-based rate limiting + tenant scope
- **MQTT Cliente**: mqtt.js
- **Seguridad**: Helmet, CORS, rate limiting
- **Pruebas**: Jest + Supertest

### Frontend (React)
- **Framework**: React 18 + Vite
- **Estado**: Context API + hooks
- **Visualización**: Chart.js + react-chartjs-2
- **Tiempo real**: Server-Sent Events (SSE), WebSocket
- **Estilos**: CSS Modules / Tailwind
- **Build**: Vite con chunks y lazy loading

### Base de Datos (PostgreSQL)
- **Entidades**: 19 (Chamber, Device, Sensor, Actuator, Telemetry, Recipe, Cycle, User, Subscription, etc.)
- **Backup**: pg_dump diario
- **Migraciones**: Sequelize `sync({ alter: true })` para desarrollo; migraciones versionadas para producción

## Seguridad

1. **JWT**: Token firmado con HS256, expiración configurable, renovación por refresh token
2. **API Key**: Autenticación alternativa para integraciones M2M (prefijo visible `mush2_*`)
3. **Cifrado**: AES-256-GCM para claves de ThingSpeak almacenadas en DB
4. **Rate Limiting**: Capa global (100/15min) + capa por suscripción (definida en `capability-catalog.md`)
5. **CSP**: Content-Security-Policy estricta (Helmet)
6. **CORS**: Solo orígenes autorizados
7. **Contraseñas**: bcryptjs (salt rounds 12)
8. **Secretos**: Todos en `.env`, validados con script `validate-env.js`

## Máquina de Estados del Dispositivo (Firmware)

```
            ┌──────────┐
            │   BOOT    │
            └────┬─────┘
                 │
            ┌────▼─────┐
            │   INIT    │─── Falla crítica ──▶┌──────────┐
            └────┬─────┘                      │  ERROR   │
                 │                            └────┬─────┘
            ┌────▼─────┐                           │
            │   WIFI    │─── Sin conexión ─────────▶│
            └────┬─────┘                           │
                 │                            ┌────▼─────┐
            ┌────▼─────┐                      │ RECOVERY │
            │  NORMAL   │◀────────────────────┘          │
            └────┬─────┘                      └──────────┘
                 │
            ┌────▼─────┐
            │ DEGRADED  │─── Sensor falla, actuadores OK
            └──────────┘
```

## Navegación de Archivos de Arquitectura

- `architecture.md` — Este archivo (visión general)
- `backend.md` — Arquitectura del backend (rutas, servicios, modelos)
- `frontend.md` — Arquitectura del frontend React (componentes, estados, rutas)
- `firmware.md` — Arquitectura del firmware (módulos, pines, estados)
- `database.md` — Esquema de base de datos y relaciones

### Documentación de Suscripción

- `docs/ADR/ADR-016-capability-based-subscription.md` — ADR del modelo (decisión arquitectónica)
- `docs/architecture/capability-catalog.md` — Catálogo completo de capacidades con valores y disposición
- `docs/architecture/authorization-model.md` — Modelo de autorización en 4 capas y matriz de decisión
- `docs/architecture/qos-policy.md` — Políticas de QoS por plan

### Planos (Pending / docs/diagrams/)

- `docs/diagrams/` — Diagramas de arquitectura, flujos de autorización y secuencia (pendiente de completar)
