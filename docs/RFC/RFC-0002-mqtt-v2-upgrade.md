# RFC-0002 — Migración MQTT a v2 (Broker Propio + QoS Mejorado)

## Metadata

| Campo             | Valor                       |
| ----------------- | --------------------------- |
| Autor             | Alejandro Maturana          |
| Estado            | DRAFT                       |
| Fecha de apertura | 2026-07-05                  |
| Fecha de cierre   | 2026-07-19                  |
| ADR resultado     | Pendiente                   |
| Área              | Infraestructura / Protocolo |

---

## Resumen

Reemplazar los brokers MQTT públicos (test.mosquitto.org, broker.hivemq.com) por un broker propio gestionado (Mosquitto o EMQX) con TLS, autenticación por usuario/contraseña o certificado, y calidad de servicio (QoS) mejorado.

---

## Motivación

El sistema actual depende de brokers MQTT **públicos y no autenticados** para comunicación backend → firmware (comandos) y backend → frontend (eventos SSE vía MQTT-to-SSE bridge). Esto implica:

1. **Sin garantía de disponibilidad**: test.mosquitto.org y broker.hivemq.com son servicios de prueba; pueden caer sin aviso
2. **Sin autenticación**: cualquier cliente puede suscribirse a los tópicos de Mush2 si conoce el patrón
3. **Sin cifrado**: mensajes MQTT en texto plano interceptables
4. **Sin retención garantizada**: los mensajes con `retain=true` pueden perderse al reiniciar el broker
5. **Límites de QoS**: broker.hivemq.com limita QoS en plan gratuito

A medida que el proyecto crece hacia N dispositivos físicos (Fase 8), la dependencia en brokers públicos se convierte en un riesgo operacional.

---

## Diseño detallado

### Broker candidatos

| Broker         | Pros                                         | Contras                 | Recomendación                |
| -------------- | -------------------------------------------- | ----------------------- | ---------------------------- |
| **Mosquitto**  | Ligero, amplio soporte, simple de configurar | Sin clustering nativo   | ✅ Recomendado para piloto   |
| EMQX Community | Clustering, dashboard web, reglas de routing | Más pesado (~200MB RAM) | 🟡 Para Nivel 3+             |
| VerneMQ        | Clustering, Erlang                           | Menos documentación     | ❌                           |
| HiveMQ Cloud   | Managed, escalable                           | Costo en producción     | 🟡 Si no se quiere gestionar |

### Configuración Mosquitto propuesta

```ini
# /etc/mosquitto/mosquitto.conf

# Puerto TLS
listener 8883
certfile /etc/letsencrypt/live/mqtt.mush2.io/cert.pem
cafile   /etc/letsencrypt/live/mqtt.mush2.io/chain.pem
keyfile  /etc/letsencrypt/live/mqtt.mush2.io/privkey.pem
require_certificate false

# Autenticación por usuario/contraseña
allow_anonymous false
password_file /etc/mosquitto/passwd

# Puerto no-TLS solo en localhost (para backend en misma máquina)
listener 1883 127.0.0.1
```

### Tópicos con autenticación por ACL

```ini
# /etc/mosquitto/acl

# Backend: puede publicar y suscribirse a todo
user mush2_backend
topic readwrite mush2/#

# Dispositivo ESP32: solo puede publicar en su tópico y leer comandos
user esp32_${deviceId}
topic write   mush2/devices/${deviceId}/telemetry
topic write   mush2/devices/${deviceId}/ack
topic read    mush2/devices/${deviceId}/command
topic read    mush2/devices/${deviceId}/ota
```

### Cambios en el backend

```javascript
// mqtt.js — conexión al broker propio
const mqttClient = mqtt.connect("mqtts://mqtt.mush2.io:8883", {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
  ca: fs.readFileSync("/etc/ssl/certs/ca-certificates.crt"),
  rejectUnauthorized: true, // Verificar certificado
});
```

### Impacto en firmware

El firmware (ESP32-S3) **no usa MQTT directamente** en la arquitectura actual (usa HTTP polling). Sin embargo, si en el futuro se agrega soporte MQTT al firmware, debe usar:

```cpp
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

void setupMqtt() {
  wifiClient.setCACert(root_ca);
  mqttClient.setServer("mqtt.mush2.io", 8883);
  mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD);
}
```

---

## Alternativas consideradas

| Opción                         | Pros                       | Contras                                                                       | Descartado por              |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------------- | --------------------------- |
| Mantener brokers públicos      | Sin infraestructura extra  | Inseguro, no confiable en producción                                          | Riesgo operacional          |
| AWS IoT Core                   | Managed, escalable, seguro | Costo, vendor lock-in                                                         | Excesivo para escala actual |
| Google Cloud IoT               | Managed                    | Descontinuado en 2023                                                         | Descartado                  |
| HTTP Streaming (ya existe SSE) | Sin MQTT                   | Ya implementado para frontend; MQTT sigue siendo útil para eventos del broker | Arquitectura mixta adecuada |

---

## Impacto en compatibilidad

- **Backend**: cambio de URL del broker (`.env`), sin cambios de código si mqtt.js soporta `mqtts://`
- **Firmware**: sin impacto (no usa MQTT directamente en v1)
- **Dispositivos existentes**: sin impacto durante transición (backend sigue con misma lógica)
- **Infraestructura**: requiere servidor con IP pública, dominio, certificado TLS

---

## Plan de migración

1. Aprovisionar servidor (VPS mínimo 1GB RAM)
2. Instalar y configurar Mosquitto con TLS + autenticación
3. Actualizar `.env` del backend: `MQTT_BROKER=mqtts://mqtt.mush2.io:8883`
4. Monitorear: verificar que todos los eventos MQTT llegan correctamente
5. Desactivar conexión a brokers públicos en el backend

---

## Preguntas abiertas

1. ¿El broker MQTT vive en el mismo servidor que el backend o en uno separado?
2. ¿Cómo gestionamos las credenciales MQTT de los dispositivos ESP32 en el futuro (NVS)?
3. ¿Se implementa TLS en el broker antes de HTTPS en el firmware (RFC-0001), o en paralelo?

---

## Decisión

**Estado final:** DRAFT — Pendiente de revisión

**ADR generado:** Pendiente de aceptación
