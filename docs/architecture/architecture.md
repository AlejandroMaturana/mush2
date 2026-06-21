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

## Stack Tecnológico

### Firmware (ESP8266)
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
- **Autenticación**: JWT (HS256), bcryptjs
- **MQTT Cliente**: mqtt.js
- **Seguridad**: Helmet, CORS, rate limiting
- **Pruebas**: Jest + Supertest

### Frontend (React)
- **Framework**: React 18 + Vite
- **Estado**: Context API + hooks
- **Visualización**: Chart.js + react-chartjs-2
- **Tiempo real**: Server-Sent Events (SSE)
- **Estilos**: CSS Modules (o Tailwind, por definir)
- **Build**: Vite con chunks y lazy loading

### Base de Datos (PostgreSQL)
- **Entidades**: 18+ (Chamber, Device, Sensor, Actuator, Telemetry, Recipe, Cycle, User, etc.)
- **Backup**: pg_dump diario
- **Migraciones**: Sequelize migrations con alter sync para desarrollo

## Seguridad

1. **JWT**: Token firmado con HS256, expiración configurable, renovación por refresh token
2. **Cifrado**: AES-256-GCM para claves de ThingSpeak almacenadas en DB
3. **Rate Limiting**: 100 peticiones/15min en `/api/*`
4. **CSP**: Content-Security-Policy estricta (Helmet)
5. **CORS**: Solo orígenes autorizados
6. **Contraseñas**: bcryptjs (salt rounds 12)
7. **Secretos**: Todos en `.env`, validados con script `validate-env.js`

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
