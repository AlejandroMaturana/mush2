# Contrato MQTT — Mush2

> Este contrato define las obligaciones formales entre los actores del sistema Mush2 respecto a la comunicación MQTT. Es vinculante para firmware, backend y cualquier cliente MQTT integrado.

---

## 1. Actores

| Actor | Rol | Responsabilidades |
|---|---|---|
| **Firmware** (ESP32-S3) | Dispositivo de campo | Publicar telemetría, ejecutar comandos, publicar ACK, reportar estado |
| **Backend** (Node.js) | Controlador central | Publicar comandos, recibir telemetría, persistir datos, emitir SSE |
| **Broker MQTT** (Mosquitto/HiveMQ) | Mensajería | Rutear mensajes, mantener sesiones, entregar LWT, persistir retains |
| **Frontend** (React) | Interfaz de usuario | No habla MQTT directamente (usa REST + SSE) |

## 2. Configuración del Broker

### 2.1 Conectividad

| Parámetro | Valor | Notas |
|---|---|---|
| Protocolo | MQTT 3.1.1 | TCP/IP, no WebSocket |
| Puerto | 1883 | Sin TLS (desarrollo), 8883 (producción) |
| Keep Alive | 30 segundos | Configurable en firmware |
| Clean Session | `true` | Firmware no necesita sesión persistente |
| Tamaño máximo de payload | 2048 bytes | Suficiente para JSON de telemetría |

### 2.2 Autenticación (producción)

> Implementado en ADR-028. Cada dispositivo obtiene credenciales MQTT únicas durante el registro HTTP.

| Parámetro | Valor |
|---|---|
| Username | `dev_{deviceId}` (e.g. `dev_mush2_A0F262E55CBC`) |
| Password | Generada por backend (32 bytes, base64url) |
| Provisión | `POST /api/v1/devices/register` → respuesta incluye `mqtt.user` y `mqtt.pass` |
| Persistencia en firmware | NVS (`mush2_prov` namespace, keys `mqtt_user` / `mqtt_pass`) |
| Fallback | Si no hay credenciales provisionadas, usa `MQTT_USER`/`MQTT_PASS` de `config.h` |
| Broker auth | `mosquitto_passwd` password_file, reinicio automático del container |

## 3. Calidad de Servicio (QoS)

### 3.1 Por tipo de mensaje

| Tipo de Mensaje | QoS Publicación | QoS Suscripción | Justificación |
|---|---|---|---|
| Telemetría sensores | **QoS 1** | QoS 1 | Tolerante a duplicados, intolerante a pérdida |
| Estado actuadores | **QoS 1** (retain) | QoS 1 | Último valor conocido siempre disponible |
| Comandos actuador | **QoS 1** | QoS 1 | PubSubClient no maneja QoS 2 de forma confiable |
| Comandos configuración | **QoS 1** | QoS 1 | PubSubClient no maneja QoS 2 de forma confiable |
| Evento boot | **QoS 1** | QoS 1 | Notificación de arranque |
| ACK | **QoS 1** | QoS 1 | Confirmación de comando |
| Alarmas | **QoS 1** | QoS 1 | Tolerante a pérdida ocasional |
| LWT | **QoS 1** (retain) | QoS 1 | Última voluntad |

### 3.2 Reglas de QoS

- El broker entrega con el mínimo QoS entre la QoS de publicación y la QoS de suscripción.
- Firmware publica siempre con la QoS especificada, independientemente de la suscripción.
- Backend se suscribe con QoS igual o superior a la de publicación esperada.

## 4. Retained Messages

### 4.1 Mensajes con retain

| Tópico | Propósito | Actualización |
|---|---|---|
| `mush2/{deviceId}/status` | Estado de conexión | Al conectar (ONLINE) y vía LWT (OFFLINE) |
| `mush2/{deviceId}/health` | Último estado de salud | Cada ciclo de health check (ADR-025) |

### 4.2 Reglas de retain

- Solo los tópicos listados arriba usan retain.
- Al conectar, el backend lee los retains de todos sus dispositivos para reconstruir estado.
- Firmware publica retain `ONLINE` en cada boot.
- Si un dispositivo no reporta por más de 5 minutos, backend considera estado incierto.

## 5. Last Will and Testament (LWT)

### 5.1 Configuración LWT del firmware

| Parámetro | Valor |
|---|---|
| Tópico | `mush2/{deviceId}/status` |
| Payload | `{"deviceId":"{deviceId}","status":"OFFLINE","ts":<epoch>,"reason":"unexpected"}` |
| QoS | 1 |
| Retain | `true` |

### 5.2 Comportamiento esperado

- Broker publica LWT cuando detecta conexión perdida (keep alive expirado).
- Backend recibe LWT y marca dispositivo como `OFFLINE` en DB.
- Backend emite evento SSE `device:offline` al frontend.
- Firmware, al reconectar, publica retain `ONLINE` para sobrescribir.

## 6. Suscripciones

### 6.1 Backend

```
mush2/+/telemetry          → QoS 1 (telemetría de todos los dispositivos)
mush2/+/status             → QoS 1 (estado de todos los dispositivos)
mush2/+/alarm              → QoS 1 (alarmas de cualquier dispositivo)
mush2/+/ack                → QoS 1 (ACK de cualquier dispositivo)
mush2/+/health             → QoS 1 (salud del dispositivo — ADR-025)
mush2/+/maintenance        → QoS 1 (mantenimiento preventivo)
```

### 6.2 Firmware

```
mush2/{deviceId}/actuators     → QoS 1 (comandos para este dispositivo)
mush2/{deviceId}/config        → QoS 1 (cambios de configuración)
mush2/{deviceId}/ota           → QoS 1 (comandos OTA)
```

El firmware NO debe suscribirse a `#` ni a tópicos de otros dispositivos.

### 6.3 Frontend

El frontend NO se suscribe directamente a MQTT. Recibe eventos en tiempo real vía Server-Sent Events desde el backend.

## 7. Formato de Payload

### 7.1 Reglas generales

- Todo payload es **JSON** codificado en UTF-8.
- Todo mensaje debe incluir el campo `"protocol"` con la versión del protocolo.
- Todo mensaje debe incluir el campo `"ts"` con timestamp Unix en segundos.
- Todo mensaje debe incluir el campo `"deviceId"` con el identificador del dispositivo.
- Los campos adicionales son específicos del tipo de mensaje (ver `protocol-v1.md`).

### 7.2 Validación de payload

| Condición | Acción |
|---|---|
| Payload no es JSON válido | Descartar, log de error |
| Falta campo `protocol` | Descartar, log de advertencia |
| Protocolo no soportado | Descartar, log de error |
| Falta campo `deviceId` | Descartar |
| `deviceId` no coincide con tópico | Descartar (seguridad) |

## 8. Reconexión y Degradado

### 8.1 Firmware

| Condición | Comportamiento |
|---|---|
| WiFi desconectado | Reintentar cada 5s, rotar entre redes |
| Broker MQTT caído | Reintentar cada 10s, rotar entre brokers |
| Sin conexión MQTT | Operar en modo LOCAL con reglas de histéresis |
| Reconexión exitosa | Publicar retain ONLINE + estado actual actuadores |
| Buffer de mensajes | No hay buffer — los mensajes no enviados se pierden (telemetría es idempotente) |

### 8.2 Backend

| Condición | Comportamiento |
|---|---|
| Conexión MQTT perdida | Reintentar con exponential backoff (1s, 2s, 4s, ... 60s max) |
| Backend reiniciado | Leer retains de todos los dispositivos para reconstruir estado |
| Mensaje duplicado (QoS 1) | Detección por `cmdId` duplicado, ignorar segundo |
| Payload inválido | Log de error + reporte de monitoreo |

## 9. Seguridad

### 9.1 Restricciones de tópicos

- El firmware SOLO publica en tópicos que comienzan con `mush2/{deviceId}/telemetry`, `mush2/{deviceId}/status`, `mush2/{deviceId}/alarm`, `mush2/{deviceId}/ack`, `mush2/{deviceId}/health`, `mush2/{deviceId}/maintenance`.
- El firmware SOLO se suscribe a tópicos que comienzan con `mush2/{deviceId}/actuators`, `mush2/{deviceId}/config`, `mush2/{deviceId}/ota`.
- El backend puede publicar en cualquier tópico `mush2/*/actuators`.
- El backend se suscribe a `mush2/+/telemetry`, `mush2/+/status`, `mush2/+/alarm`, `mush2/+/ack`, `mush2/+/health`, `mush2/+/maintenance`.

### 9.2 ACLs recomendadas (producción)

> ACLs usan `%c` (client_id) para topic isolation. Username es `dev_{deviceId}`.

```
# Firmware devices — client_id = mush2_{deviceId}
# Cada dispositivo solo puede publicar en sus propios tópicos
topic write mush2/${client_id}/telemetry
topic write mush2/${client_id}/status
topic write mush2/${client_id}/alarm
topic write mush2/${client_id}/ack
topic write mush2/${client_id}/health
topic write mush2/${client_id}/maintenance
topic read  mush2/${client_id}/actuators
topic read  mush2/${client_id}/config
topic read  mush2/${client_id}/ota

# Backend
topic read  mush2/+/telemetry
topic read  mush2/+/status
topic read  mush2/+/alarm
topic read  mush2/+/ack
topic read  mush2/+/health
topic read  mush2/+/maintenance
topic write mush2/+/actuators
```

## 10. Monitoreo del Contrato

| Métrica | Umbral | Acción |
|---|---|---|
| Mensajes inválidos recibidos | > 1% del total | Revisar firmware, alertar |
| Tiempo sin telemetría por dispositivo | > 5 minutos | Marcar OFFLINE, notificar |
| Comandos sin ACK | > 3 por hora | Revisar conectividad del dispositivo |
| Reconexiones frecuentes | > 10 por hora | Revisar calidad de WiFi |
| Payloads malformados | > 5 por hora | Revisar versión de firmware |
