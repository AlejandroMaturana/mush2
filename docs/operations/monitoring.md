# Monitoreo y Alertas

Guía operacional del sistema de observabilidad de Mush2.

## Arquitectura

```
Firmware (ESP32-S3)
  │ health (60s), telemetry (10s), status (60s)
  v
MQTT Broker (Mosquitto)
  │
  v
Backend (Node.js + Express)
  ├── Pino (logs estructurados JSON)
  ├── pino-http (request/response logging)
  ├── NotificationService (Telegram + Email + Webhook)
  ├── DeviceHealthService (state machine de 7 estados)
  └── Monitoring endpoints (metrics, logs, health)
  │
  v
Frontend (React)
  └── MonitoringPage (/operations/monitoring)
```

## Estados de Salud del Dispositivo

| Estado | Descripción |
|--------|-------------|
| `PROVISIONING` | Dispositivo registrado, aún no reporta |
| `ONLINE` | Último heartbeat dentro del intervalo |
| `DEGRADED` | Sensores parcialmente caídos |
| `STALE` | Sin heartbeat por > heartbeatInterval × staleMultiplier |
| `OFFLINE` | Sin heartbeat por > heartbeatInterval × offlineMultiplier |
| `MAINTENANCE` | En modo mantenimiento manual |
| `RETIRED` | Dado de baja |

## Logs

### Configuración

El logger central está en `backend/src/config/pino.js`. Configuración vía variables de entorno:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Nivel de log (trace, debug, info, warn, error, fatal) |
| `NODE_ENV` | `development` | En producción, logs en JSON a stdout. En desarrollo, pino-pretty con colores |

### Contrato de Log

Todos los logs operacionales usan el siguiente contrato:

```javascript
logger.info({
  module: 'MQTT',        // obligatorio
  event: 'CONNECTED',    // recomendado
  deviceId: 'mush2_001', // opcional
  error: err.message,    // cuando aplique
}, 'Mensaje descriptivo');
```

### Endpoint de Logs

```
GET /api/v1/monitoring/logs?level=error&module=MQTT&limit=100&offset=0
```

Parámetros:
- `level`: Filtrar por nivel mínimo (trace, debug, info, warn, error, fatal)
- `module`: Filtrar por módulo exacto (MQTT, AUTH, CONTROL, etc.)
- `limit`: Máximo de registros (default: 100)
- `offset`: Paginación (default: 0)

## Alertas

### Canales de Notificación

| Canal | Estado | Configuración |
|-------|--------|---------------|
| **Telegram** | Activo | `TELEGRAM_BOT_TOKEN`, vinculación vía `/link CODIGO` |
| **Email** | Activo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| **Webhook** | Stub | `UserPreference.webhookUrl` (futuro) |

### Flujo de Notificación

```
Alarm Event (EventEmitter)
  │
  v
NotificationService.notifyAlarm(alarm)
  │
  ├── TelegramProvider (si telegramEnabled + telegramChatId)
  ├── EmailProvider (si emailAlerts + SMTP configurado)
  └── WebhookProvider (si webhookUrl, stub)
```

### Configuración SMTP

Variables de entorno para email:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=Mush2 <noreply@mush2.local>
```

Timeout: 10s por intento. Reintentos: 3 con 5s de delay. SLA worst-case: ~40s.

### Configuración por Usuario

En la página de Configuración > Sistema, el usuario puede:
- Habilitar/deshabilitar alertas por email (`emailAlerts`)
- Habilitar/deshabilitar notificaciones Telegram (`telegramEnabled`)
- Configurar severidad mínima para notificaciones (`minNotificationSeverity`)

## Reset Reason (Reboot Cause)

El firmware reporta la razón del último reinicio via `esp_reset_reason()`.

| Código | Razón | Severidad |
|--------|-------|-----------|
| 0 | NO_MEAN | Info |
| 1 | POWER_ON | Info |
| 2 | INTERNAL | Info |
| 3 | SOFTWARE_RESET | Info |
| 4 | PANIC | Crítico |
| 5 | INT_WDT | Crítico |
| 6 | TASK_WDT | Crítico |
| 9 | BROWNOUT | Warning |
| 12 | POWER_ON | Info |
| 14 | BROWNOUT | Warning |

El mapper centralizado está en `backend/src/config/resetReasons.js`.

## Troubleshooting

### Logs no aparecen en /monitoring/logs
- Verificar que `backend/logs/` existe y tiene permisos de escritura
- Verificar que `LOG_LEVEL` no es más restrictivo que el nivel consultado

### Email no se envía
- Verificar variables `SMTP_*` en `.env`
- Verificar que `emailAlerts` está habilitado en UserPreference del usuario
- Revisar logs: `module=EMAIL event=FAILED`

### Telegram no notifica
- Verificar `TELEGRAM_BOT_TOKEN` en `.env` o SystemSetting
- Verificar vinculación del usuario (`/status` en el bot)
- Verificar `telegramEnabled` y `telegramChatId` en UserPreference

### Reset reason muestra "UNKNOWN"
- El firmware no está reportando `resetReason` (versión anterior)
- El mapper no tiene el código (agregar a `resetReasons.js`)

## API Reference

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/monitoring/metrics` | GET | Métricas del sistema (uptime, memoria, DB stats) |
| `/api/v1/monitoring/health/db` | GET | Health check de PostgreSQL |
| `/api/v1/monitoring/logs` | GET | Logs estructurados con filtros |
| `/health` | GET | Readiness del backend |
