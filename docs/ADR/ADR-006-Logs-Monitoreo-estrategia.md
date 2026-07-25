# ADR-006: Estrategia de logs y monitoreo del sistema

**Fecha**: 2026-06-13 (actualizado 2026-07-25)
**Estado**: Completado

## Contexto
El sistema es distribuido: un ESP32-S3 en el borde generando telemetría y ejecutando comandos de actuadores, un backend Node.js procesando HTTP y ThingSpeak, y una base de datos PostgreSQL almacenando históricos. Se necesita trazabilidad para diagnosticar fallos en la cadena: sensor → firmware → HTTP → backend → DB → control → actuador.

## Decisión
Implementar logs estructurados vía Pino en backend, con JSON output en producción y pino-pretty en desarrollo. El firmware publica eventos críticos vía MQTT (boot, alarmas, acks, health). El backend usa un NotificationService event-driven con providers (Telegram, Email, Webhook) para alertas.

## Decisiones Clave

### Logging Estructurado
- **Pino** como librería de logging (no Winston, por performance y simplicidad)
- **pino-http** para request/response logging automático
- **Contrato de log**: module (obligatorio), event (recomendado), deviceId, userId, error
- **LogReaderService**: abstracción para lectura de logs, preparada para cambio de storage (Loki, Elastic, CloudWatch)

### Notificaciones
- **NotificationService event-driven** con providers separados (Telegram, Email, Webhook)
- **TelegramProvider**: funcional, refactorizado de telegramService.js
- **EmailProvider**: nodemailer con timeout 10s, 3 reintentos, SLA worst-case ~40s
- **WebhookProvider**: stub para futura implementación
- **Centralización**: un solo punto de dispatch, no wiring directo en EventEmitter

### Monitoreo
- **MonitoringPage** en frontend con métricas del sistema, salud de dispositivos, y logs filtrables
- **Reset reason mapper**: backend normaliza código → string, frontend presenta

## Consecuencias
- **Logs persistentes**: Pino escribe a `backend/logs/backend.log` vía write stream
- **Performance**: Pino es ~5x más rápido que Winston en benchmarks
- **Trazabilidad**: Cada log incluye module, event, timestamp ISO
- **Escalabilidad**: LogReaderService permite cambiar storage sin tocar API

## Alternativas descartadas
- **Winston**: Más pesado, más features de las necesarias para este proyecto
- **ELK/Loki**: Infraestructura pesada para fase actual
- **Syslog en firmware**: El ESP32-S3 no tiene soporte nativo eficiente
- **console.log con interceptor**: Reemplazado por Pino (más performante, structured output)

## Referencias
- Logger central: `backend/src/config/pino.js`
- LogReaderService: `backend/src/services/logReaderService.js`
- NotificationService: `backend/src/services/notifications/notificationService.js`
- EmailProvider: `backend/src/services/notifications/emailProvider.js`
- MonitoringPage: `frontend/src/features/monitoring/pages/MonitoringPage.jsx`
- Documentation: `docs/operations/monitoring.md`
