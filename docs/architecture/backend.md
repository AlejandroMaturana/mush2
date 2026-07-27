# Arquitectura del Backend — Mush2

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| ORM | Sequelize 6 |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (HS256) + bcryptjs + API Key |
| Autorización | RBAC (4 roles) + capability gate + tenant scope |
| MQTT Cliente | mqtt.js |
| Seguridad | Helmet, CORS, express-rate-limit |
| Jobs | node-cron (data retention, expiration) |
| Validación | express-validator |
| Pruebas | Jest + Supertest |
| Package manager | pnpm |

## Estructura de Directorios

```
backend/
├── src/
│   ├── server.js              # Punto de entrada, arranque
│   ├── app.js                 # Configuración Express
│   ├── composition-root.js    # Inyección de dependencias
│   ├── config/
│   │   ├── database.js        # Conexión Sequelize
│   │   ├── env.js             # Variables de entorno validadas
│   │   ├── pino.js            # Logger estructurado (Pino)
│   │   ├── resetReasons.js    # Mapa de razones de reinicio (ADR-027)
│   │   └── readiness.js       # Estado de readiness del sistema
│   ├── models/                # Modelos Sequelize (25)
│   │   ├── index.js           # Asociaciones
│   │   ├── Chamber.js
│   │   ├── Device.js
│   │   ├── Sensor.js
│   │   ├── Actuator.js
│   │   ├── Telemetry.js
│   │   ├── Recipe.js
│   │   ├── CultivationCycle.js
│   │   ├── CycleState.js
│   │   ├── PhaseTransition.js
│   │   ├── DeviceHealth.js
│   │   ├── DeviceMaintenance.js
│   │   ├── Event.js
│   │   ├── Alarm.js
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   ├── AuditLog.js
│   │   ├── ApiKey.js
│   │   ├── IntegrationCredentials.js
│   │   ├── UserChamberAccess.js
│   │   ├── UserPreference.js
│   │   └── ... (+5 modelos adicionales)
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Run.ts         # Entidad de dominio (ADR-020, persiste como CultivationCycle)
│   │   └── valueObjects/
│   ├── jobs/                  # Tareas programadas
│   │   ├── dataRetentionJob.js        # Purga según plan de suscripción
│   │   ├── subscriptionExpiration.js  # Cancelación al final del período
│   │   └── offlineWatchdog.js         # Detección de dispositivos offline
│   ├── middlewares/            # Middleware personalizado
│   │   ├── auth.js            # Verificación JWT + API Key dual
│   │   ├── rbac.js            # Control de roles (RBAC)
│   │   ├── subscriptionRateLimit.js   # Rate limiting por suscripción
│   │   └── tenant.js          # Scope de tenant
│   ├── routes/                # Definición de rutas
│   │   ├── index.js           # Montaje de rutas
│   │   ├── auth.js
│   │   ├── api.js             # API REST versión 1
│   │   ├── runs-pilot.js      # Endpoints de Run (ADR-020)
│   │   ├── monitoring.js      # Health + maintenance endpoints
│   │   ├── admin.js           # Rutas de administración
│   │   └── diagnostics.js     # Diagnósticos MQTT
│   ├── services/              # Lógica de negocio (17)
│   │   ├── controlEngine.js       # Motor de reglas (ADR-021)
│   │   ├── phaseEvaluator.js      # Evaluador de fases (ADR-021)
│   │   ├── mqttBridge.js          # Cliente MQTT (renombrado desde mqttService)
│   │   ├── mqtt-adapter.ts        # Adaptador MQTT (domain layer)
│   │   ├── mqttProvisioningService.js  # Provisión de credenciales MQTT
│   │   ├── mosquittoProvisioningService.js  # Provisioning Mosquitto
│   │   ├── deviceHealthService.js  # Health + maintenance (ADR-025)
│   │   ├── notificationService.js  # Servicio centralizado de notificaciones
│   │   ├── notifications/         # Proveedores de notificación
│   │   │   ├── emailProvider.js
│   │   │   ├── webhookProvider.js
│   │   │   └── telegramService.js  # Proveedor Telegram (interno)
│   │   ├── thingSpeakSync.js      # Sincronización TS
│   │   ├── eventBus.js            # Event bus in-memory (ADR-017)
│   │   ├── webSocketServer.js     # Server para eventos SSE
│   │   ├── auditService.js        # Servicio de auditoría
│   │   ├── encryption.js          # AES-256-GCM
│   │   ├── logger.js              # Logger legacy (usar pino.js)
│   │   └── logReaderService.js    # Lector de logs del firmware
│   └── utils/                 # Utilidades
├── tests/
│   ├── unit/
│   └── integration/
├── VERSION
├── package.json
└── .env.local
```

## Modelo de Datos (Relaciones Principales)

```
Chamber 1──N Device
Device 1──N Sensor
Device 1──N Actuator
Device 1──N Telemetry
Device 1──N Event
Sensor 1──N Telemetry
Chamber 1──N CultivationCycle
Recipe 1──N CultivationCycle
User 1──N Subscription
User N──N Chamber (UserChamberAccess)
User 1──N AuditLog
```

## API REST — Endpoints Principales

### Autenticación
- `POST /api/v1/auth/register` — Registro
- `POST /api/v1/auth/login` — Login (devuelve JWT)
- `POST /api/v1/auth/refresh` — Renovar token

### Dispositivos
- `GET /api/v1/devices` — Listar (filtro por chamberId)
- `GET /api/v1/devices/:id` — Detalle
- `POST /api/v1/devices` — Registrar
- `PATCH /api/v1/devices/:id` — Actualizar
- `DELETE /api/v1/devices/:id` — Eliminar

### Telemetría
- `GET /api/v1/devices/:id/telemetry` — Últimos N registros
- `GET /api/v1/devices/:id/telemetry/latest` — Última lectura

### Control
- `GET /api/v1/devices/:id/actuators` — Estado actuadores
- `PATCH /api/v1/devices/:id/actuators/:actuatorId` — Comando

### Recetas y Ciclos
- `GET /api/v1/recipes` — Listar recetas
- `POST /api/v1/recipes` — Crear receta
- `GET /api/v1/cycles` — Ciclos activos
- `POST /api/v1/cycles` — Iniciar ciclo

### Suscripción
- `GET /api/v1/subscriptions` — Plan activo del usuario autenticado
- `GET /api/v1/subscriptions/usage` — Consumo actual vs límites del plan
- `POST /api/v1/subscriptions/check` — Verifica si una acción está permitida
- `PATCH /api/v1/subscriptions` — Cambiar de plan
- `DELETE /api/v1/subscriptions` — Cancelar suscripción (fin del período)

## Servicios Clave

### mqttBridge.js
- Conexión a broker (sin fallback)
- Suscripción a tópicos de telemetría, status, alarm, ack, health, maintenance
- Publicación de comandos
- Reconexión automática (exponential backoff)
- Parseo y validación de payloads JSON
- Delega a `deviceHealthService.js` para health/maintenance

### controlEngine.js
- Evalúa reglas cada 8s
- Compara telemetría vs setpoints de receta activa
- Genera comandos MQTT para actuadores
- Dispara alarmas si valores fuera de rango
- Persiste decisiones en tabla Events

### phaseEvaluator.js
- Evaluador de fases del ciclo de cultivo (ADR-021)
- Transiciones de fase automáticas según reglas temporales y condicionales

### deviceHealthService.js
- Health checks del dispositivo (ADR-025)
- Métricas: heap, task stacks, I2C, sensor checks
- Mantenimiento preventivo con estimación de fallo

### notificationService.js
- Servicio centralizado de notificaciones
- Proveedores internos: emailProvider, webhookProvider, telegramService
- Patrón: notificationService → TelegramProvider (`telegramService`)

### thingSpeakSync.js
- Sincroniza datos desde ThingSpeak cuando backend estuvo caído
- Batch de 5 minutos de datos perdidos
- Evita duplicados por timestamp

### dataRetentionJob.js
- Ejecución diaria vía node-cron
- Purga telemetría según `data.retention.days` del plan (FREE=30d, BASIC=90d, PREMIUM=365d)
- Preserva eventos estructurales (alarmas, cambios de estado) independientemente del plan

### offlineWatchdog.js
- Detección de dispositivos sin reportar por más de 5 minutos
- Marca estado incierto y notifica

### Telegram Service (notifications/telegramService.js)
- Proveedor interno de `notificationService`
- Notificaciones de alarmas y eventos vía bot (`@Mush2_bot`)

## Server-Sent Events (SSE)

El backend expone eventos Server-Sent Events en `GET /api/v1/events`:

```
event: telemetry
data: {"deviceId":1,"temperature":24.5,"humidity":85,"co2":420,"timestamp":"..."}

event: actuator
data: {"deviceId":1,"actuatorId":2,"state":"ON"}

event: alarm
data: {"deviceId":1,"type":"HIGH_TEMP","severity":"HIGH","message":"..."}
```

## Roles y Permisos

### RBAC (Identidad)

| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | Todo el sistema |
| `ADMIN` | CRUD en su organización |
| `OPERATOR` | Control y monitoreo |
| `VIEWER` | Solo lectura |

### Capability Gate (Suscripción)

Independientemente del rol RBAC, cada acción se verifica contra el plan del usuario:

1. ¿El usuario tiene una suscripción activa?
2. ¿La capacidad requerida está disponible en su plan?
3. ¿El recurso solicitado está dentro del límite de su plan?
4. ¿La cuota del período actual no se ha agotado?

Ver `docs/architecture/authorization-model.md` para la matriz detallada de decisión request→response.
