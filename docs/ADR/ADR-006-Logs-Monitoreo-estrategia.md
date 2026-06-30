# ADR-006: Estrategia de logs y monitoreo del sistema

**Fecha**: 2026-06-13 (actualizado 2026-06-14)
**Estado**: Aceptado (implementación parcial)

## Contexto
El sistema es distribuido: un ESP32-S3 en el borde generando telemetría y ejecutando comandos de actuadores, un backend Node.js procesando HTTP y ThingSpeak, y una base de datos PostgreSQL almacenando históricos. Se necesita trazabilidad para diagnosticar fallos en la cadena: sensor → firmware → HTTP → backend → DB → control → actuador.

## Decisión
Implementar logs estructurados vía Serial en firmware (desarrollo) y consola en backend. El firmware publica eventos críticos vía HTTP (boot, alarmas, acks). El backend usa `console.log` con prefijos de módulo para desarrollo, sin sistema de logs estructurado externo en esta fase.

## Motivos

### Enfoque actual (prototipado)
1. **Simplicidad**: `console.log` en backend y `Serial.println()` en firmware son suficientes para desarrollo.
2. **Cero dependencias externas**: No se requieren librerías de logging adicionales (winston, pino).
3. **Eventos vía HTTP**: El firmware publica eventos estructurados (boot, alarmas, acks) que el backend persiste.
4. **Máquina de estados visible**: El firmware imprime transiciones de estado vía Serial.

### Limitaciones reconocidas
5. **Sin logs persistentes en firmware**: Sin conexión USB, no hay trazabilidad local de fallos.
6. **Sin health check endpoint**: No implementado en esta fase.
7. **Sin agregación centralizada**: Los logs del backend van a stdout/stderr.

## Consecuencias
- **Debug limitado en producción**: Sin conexión Serial, solo eventos HTTP proporcionan visibilidad.
- **Logs efímeros en backend**: Sin rotación de archivos, los logs se pierden al reiniciar.
- **Monitoreo manual**: No hay alertas automáticas; se requiere revisión proactiva.

## Alternativas descartadas (para fase futura)
- **Winston/Pino**: Añade dependencias sin beneficio inmediato en prototipado.
- **Health check endpoint**: Se evaluará cuando el dashboard de monitoreo sea un entregable formal.
- **ELK/Loki**: Infraestructura pesada para fase actual.
- **Syslog en firmware**: El ESP32-S3 no tiene soporte nativo eficiente.

## Detalle técnico

### Logs en firmware
El firmware usa `Serial.printf()` con prefijos de módulo:
```
[STATE] BOOT → INIT
[AHT] Sensor inicializado
[ENS160] Inicializado OK
[HTTP] Conectando a backend:3797...
[HTTP] Conectado al backend
[SENSOR] T: 22.3°C | HR: 88.5% | eCO₂: 750 ppm | TVOC: 120 ppb
[SSR] Canal 1 activado
```

### Eventos HTTP (logs estructurados)
El firmware envía eventos que sirven como logs remotos vía heartbeat y telemetría:

| Evento | Endpoint HTTP | Payload |
|--------|---------------|---------|
| Boot | `POST /api/v1/device/{id}/heartbeat` | `{event:"BOOT", deviceId, ts, bootCount, fwVersion}` |
| Alarma | `POST /api/v1/telemetry` (status.alarm) | `{event:"ALARM", deviceId, ts, reason}` |
| Ack | `POST /api/v1/commands/{cmdId}/ack` | `{deviceId, ts, status:"OK", actuatorState}` |

### Logs en backend
El backend usa `console.log`/`console.error` con prefijos de módulo:
```
[HTTP] Polling backend:3797/api/v1/actuators... 200 OK
[HTTP] Device boot: mush2_s3_001 v1.0.0
[TS] Synced mush2_s3_001 from ThingSpeak (entry 12345)
[HTTP] GET /api/devices → 200 (45ms)
```

### Máquina de estados del firmware
El firmware implementa una máquina de estados visible vía Serial:
```
BOOT → INIT → WIFI → NORMAL
                      ↘ DEGRADED (sin WiFi)
                       ↗ ERROR (fallo sensor/comunicación)
                      → RECOVERY (reinicio controlado)
                      → SAFE (tras 5 reinicios consecutivos)
```

### Watchdog
- Hardware watchdog: 8 segundos (ESP32-S3)
- Software watchdog: 30 segundos (reinicia si `feedWatchdog()` no se llama)

## Referencias
- Implementación firmware: `firmware/src/main.ino`, `firmware/src/state_machine.cpp`
- Implementación backend: `backend/src/services/controlEngine.js`
- Ver también: ADR-001 (máquina de estados), ADR-006 (eventos HTTP)