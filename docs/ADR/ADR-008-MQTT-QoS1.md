# ADR-008: brokers MQTT públicos con failover y QoS 1 para comandos

**Fecha**: 2026-06-13 (actualizado 2026-06-14)
**Estado**: Aceptado

## Contexto
El sistema requiere comunicación bidireccional entre el nodo ESP8266 y el backend para telemetría (nodo → backend) y comandos de actuadores (backend → nodo). Se necesita un broker MQTT público durante la fase de prototipado, con failover automático y garantía de entrega de comandos.

## Decisión
Usar **test.mosquitto.org** como broker MQTT primario y **broker.hivemq.com** como broker de respaldo, con todas las suscripciones y publicaciones configuradas a **QoS 1**. El firmware implementa reconexión automática con alternancia entre brokers ante fallos persistentes.

## Motivos

### Elección de brokers públicos
1. **Cero coste de infraestructura**: Ambos brokers son servicios públicos gratuitos.
2. **Alta disponibilidad comprobada**: test.mosquitto.org (Eclipse Mosquitto) y broker.hivemq.com (HiveMQ).
3. **Sin autenticación requerida**: Conexiones anónimas en puerto 1883 (TCP sin TLS).
4. **Independencia organizativa**: Operados por entidades diferentes, proporcionando redundancia efectiva.

### Elección de QoS 1
5. **Garantía suficiente para comandos**: QoS 1 asegura "al menos una vez". Los comandos de actuadores son idempotentes (encender relé ya encendido es inofensivo).
6. **Menor overhead que QoS 2**: 2 mensajes por publicación vs 4 de QoS 2.
7. **Compatibilidad con limitaciones del ESP8266**: QoS 2 requiere más memoria RAM para el handshake.

## Consecuencias
- **Posible duplicación de comandos**: Con QoS 1, el broker reenvía mensajes no reconocidos. Los comandos deben ser idempotentes.
- **Sin encriptación en tránsito**: Puerto 1883 (sin TLS). Aceptable para prototipado con datos no sensibles.
- **Sin SLA en brokers públicos**: Pueden tener mantenimientos sin previo aviso.
- **Latencia de failover**: Si el broker primario falla, la reconexión al secundario puede tardar hasta ~75s en el peor caso.

## Alternativas descartadas
- **QoS 2**: Mayor overhead sin beneficio práctico para comandos idempotentes.
- **Un solo broker**: Punto único de fallo inaceptable.
- **Broker MQTT privado**: Coste de operación innecesario en fase de prototipado.
- **QoS 0**: Sin garantía de entrega, inaceptable para comandos de actuadores.

## Detalle técnico

### Tópicos MQTT (protocolo v1.0.0)
| Dirección | Tópico | Propósito |
|-----------|--------|-----------|
| Firmware → Backend | `mush2/telemetry/{deviceId}/sensors` | Telemetría de sensores |
| Firmware → Backend | `mush2/telemetry/{deviceId}/state` | Estado de actuadores (retained) |
| Firmware → Backend | `mush2/event/{deviceId}/boot` | Evento de arranque |
| Firmware → Backend | `mush2/event/{deviceId}/ack` | Confirmación de comandos |
| Firmware → Backend | `mush2/event/{deviceId}/alarm` | Alarmas |
| Firmware → Backend | `mush2/state/{deviceId}/online` | Estado online/offline (retained) |
| Backend → Firmware | `mush2/cmd/{deviceId}/actuator` | Comandos de actuadores |
| Backend → Firmware | `mush2/cmd/{deviceId}/config` | Configuración de setpoints |
| Backend → Firmware | `mush2/cmd/{deviceId}/ota` | Comandos OTA |

### Configuración en firmware
```cpp
// config.h
#define MQTT_BROKER "test.mosquitto.org"
#define MQTT_PORT 1883
#define MQTT_BROKER_FALLBACK "broker.hivemq.com"
#define MQTT_PORT_FALLBACK 1883
#define MQTT_KEEPALIVE 30
```

### Keepalive MQTT
- Firmware: 30 segundos (`mqtt_handler.cpp`)
- Backend: 30 segundos (`mqttService.js`)

### Formato de mensajes
```json
// Telemetría (mush2/telemetry/{deviceId}/sensors)
{
  "protocol": "1.0.0",
  "deviceId": "esp8266_001",
  "ts": 1718366400,
  "sensors": {
    "temperature": 22.3,
    "humidity": 88.5,
    "co2": 750,
    "voc": 120
  },
  "status": {
    "state": "NORMAL",
    "mode": "LOCAL",
    "uptime": 3600,
    "wifiRssi": -45,
    "fwVersion": "0.7.0"
  }
}

// Comando (mush2/cmd/{deviceId}/actuator)
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1718366400",
  "target": "actuator",
  "channel": 1,
  "command": "ON"
}
```

### Failover en firmware
El `MQTTHandler` implementa:
1. Intento de conexión al broker primario
2. Si falla, backoff exponencial (5s → 10s → 20s → ... → máx 60s)
3. Tras agotar intentos, cambia al broker fallback
4. Publica will message al conectar: `mush2/state/{deviceId}/online` con payload OFFLINE

## Referencias
- Implementación firmware: `firmware/src/mqtt_handler.cpp`
- Implementación backend: `backend/src/services/mqttService.js`
- Protocolo: `docs/protocol/protocol-v1.md`
- Configuración: `firmware/src/config.h`, `backend/src/config/env.js`