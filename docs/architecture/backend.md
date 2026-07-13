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
│   ├── server.js          # Punto de entrada, arranque
│   ├── app.js             # Configuración Express
│   ├── config/
│   │   ├── database.js    # Conexión Sequelize
│   │   └── env.js         # Variables de entorno validadas
│   ├── models/            # Modelos Sequelize (19)
│   │   ├── index.js       # Asociaciones
│   │   ├── Chamber.js
│   │   ├── Device.js
│   │   ├── Sensor.js
│   │   ├── Actuator.js
│   │   ├── Telemetry.js
│   │   ├── Recipe.js
│   │   ├── CultivationCycle.js
│   │   ├── CycleState.js
│   │   ├── Event.js
│   │   ├── Alarm.js
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   ├── AuditLog.js
│   │   ├── ApiKey.js
│   │   ├── IntegrationCredentials.js
│   │   ├── UserChamberAccess.js
│   │   └── UserPreference.js
│   ├── jobs/              # Tareas programadas
│   │   ├── dataRetention.js   # Purga según plan de suscripción
│   │   └── subscriptionExpiration.js # Cancelación al final del período
│   ├── controllers/       # Lógica de endpoints
│   │   ├── authController.js
│   │   ├── chamberController.js
│   │   ├── deviceController.js
│   │   ├── sensorController.js
│   │   ├── actuatorController.js
│   │   ├── telemetryController.js
│   │   ├── recipeController.js
│   │   ├── cycleController.js
│   │   ├── alarmController.js
│   │   ├── eventController.js
│   │   ├── userController.js
│   │   ├── subscriptionController.js
│   │   ├── auditLogController.js
│   │   └── systemController.js
│   ├── routes/            # Definición de rutas
│   │   ├── index.js       # Montaje de rutas
│   │   ├── auth.js
│   │   ├── api.js         # API REST versión 1
│   │   └── admin.js       # Rutas de administración
│   ├── middlewares/        # Middleware personalizado
│   │   ├── auth.js        # Verificación JWT + API Key dual
│   │   ├── rbac.js        # Control de roles (RBAC)
│   │   ├── capability.js  # Capability gate (requiere capacidades específicas)
│   │   ├── audit.js       # Logging de auditoría
│   │   ├── subscription.js # Límites por plan (rate limiting por suscripción)
│   │   └── validate.js    # Validación de entrada (express-validator)
│   ├── services/          # Lógica de negocio
│   │   ├── controlEngine.js   # Motor de reglas
│   │   ├── controlState.js    # Estado del controlador
│   │   ├── mqttService.js     # Cliente MQTT
│   │   ├── thingSpeakSync.js  # Sincronización TS
│   │   └── telegramService.js # Notificaciones
│   ├── routes/             # Vistas API
│   └── utils/             # Utilidades
│       └── encryption.js  # AES-256-GCM
├── migrations/            # Sequelize migrations
├── seeders/               # Datos de prueba
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

### mqttService.js
- Conexión a broker (con fallback)
- Suscripción a tópicos de telemetría
- Publicación de comandos
- Reconexión automática (exponential backoff)
- Parseo y validación de payloads JSON

### controlEngine.js
- Evalúa reglas cada 30s
- Compara telemetría vs setpoints de receta activa
- Genera comandos MQTT para actuadores
- Dispara alarmas si valores fuera de rango
- Persiste decisiones en tabla Events

### thingSpeakSync.js
- Sincroniza datos desde ThingSpeak cuando backend estuvo caído
- Batch de 5 minutos de datos perdidos
- Evita duplicados por timestamp
- Marca integridad en cada registro sincronizado

### dataRetention.js (Job)
- Ejecución diaria vía node-cron
- Purga telemetría según `data.retention.days` del plan (FREE=30d, BASIC=90d, PREMIUM=365d)
- Preserva eventos estructurales (alarmas, cambios de estado) independientemente del plan

### subscriptionExpiration.js (Job)
- Ejecución diaria vía node-cron
- Identifica suscripciones cuyo `currentPeriodEnd` ya venció
- Marca como `canceled` y programa purge de datos al final del período

### Telegram Service (notifications)
- Notificaciones de alarmas y eventos vía bot (`@Mush2_bot`)
- Canal de comunicación directo con el usuario
- Comandos de consulta rápida

## WebSockets / SSE

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
