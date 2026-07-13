# QoS Policy — Mush2

> **Calidad de Servicio**: Define las frecuencias de actualización, protocolos de comunicación, latencia esperada y estrategias de degradación para cada plan de suscripción.

---

## Principios

1. **El hardware nunca degrada su operación**: El dispositivo IoT envía telemetría y recibe comandos independientemente del plan. La QoS solo afecta cómo la plataforma en la nube entrega esa información al usuario.
2. **Degradación gradual**: Al exceder los límites del plan, la plataforma degrada la frecuencia de actualización antes de bloquear el acceso.
3. **Transparencia**: El usuario siempre conoce su nivel de QoS actual y cuándo será degradado.

---

## Niveles de QoS

### QoS 1 — FREE

| Aspecto | Valor |
|---------|-------|
| **Dashboard refresh** | Polling cada 30 segundos |
| **Telemetría en vivo** | Polling REST cada 30s (sin WebSocket) |
| **SSE events** | No disponible |
| **Latencia máxima** | 30 segundos |
| **Data retention** | 30 días |
| **Exportaciones** | No disponible |

### QoS 2 — BASIC

| Aspecto | Valor |
|---------|-------|
| **Dashboard refresh** | Polling cada 10 segundos |
| **Telemetría en vivo** | WebSocket con updates cada 5s |
| **SSE events** | Disponible (filtrado por alarmas HIGH+) |
| **Latencia máxima** | 5 segundos |
| **Data retention** | 90 días |
| **Exportaciones** | CSV, hasta 1,000 filas |

### QoS 3 — PREMIUM

| Aspecto | Valor |
|---------|-------|
| **Dashboard refresh** | Streaming continuo vía WebSocket |
| **Telemetría en vivo** | WebSocket con updates en tiempo real (< 1s) |
| **SSE events** | Disponible (todos los eventos) |
| **Latencia máxima** | 1 segundo |
| **Data retention** | 365 días |
| **Exportaciones** | CSV, JSON, PDF — sin límite de filas |

---

## Protocolos de entrega

| Protocolo | Uso | QoS mínima requerida |
|-----------|-----|---------------------|
| **REST Polling** | Dashboard refresh, consultas under demanda | QoS 1 |
| **WebSocket** | Telemetría en vivo, comandos de actuadores | QoS 2 |
| **SSE** | Streaming de eventos (alarmas, cambios de estado) | QoS 2 |
| **MQTT (directo)** | Comunicación con el dispositivo (no depende del plan) | Siempre disponible |

---

## Estrategias de degradación

Cuando un usuario excede los límites de su plan, la plataforma aplica degradación en el siguiente orden:

1. **Frecuencia de refresco**: Se reduce al nivel inmediato inferior (si es BASIC → FREE; si es FREE se mantiene).
2. **WebSocket**: Se cierran conexiones WebSocket no esenciales, se fuerza a REST polling.
3. **SSE**: Se filtran eventos de baja severidad (solo CRITICAL y HIGH).
4. **Exportaciones**: Se bloquean hasta el próximo período.
5. **API calls**: Se bloquean con `429` al exceder `apiCallsPerMonth`.

---

## Monitoreo de QoS

| Métrica | Instrumentación |
|---------|----------------|
| Latencia promedio de entrega | Logs de WebSocket/SSE |
| Tasa de refresco real vs contratada | Dashboard de administración |
| Conexiones WebSocket activas | `monitoring/metrics` |
| Degradaciones aplicadas | AuditLog con acción `QOS_DEGRADE` |
