# Protocolo Mush2 v1 — Especificación MQTT

> Versión del protocolo: **1.0.0**
> Estado: **Estable**
> Aplica a: Firmware v0.7.0+, Backend v0.7.0+

---

## 1. Estructura de Tópicos

```
mush2/{tipo}/{deviceId}/{accion}
```

| Segmento | Descripción | Valores |
|---|---|---|
| `mush2` | Raíz del proyecto fija | — |
| `{tipo}` | Categoría | `telemetry`, `state`, `cmd`, `event` |
| `{deviceId}` | ID del dispositivo | Ej: `esp8266_001` |
| `{accion}` | Acción específica | `sensors`, `state`, `actuator`, `config`, `ota`, `boot`, `ack`, `alarm`, `online` |

## 2. Tópicos

### 2.1 Telemetría (Firmware → Backend)

| Tópico | QoS | Retain |
|---|---|---|
| `mush2/telemetry/{deviceId}/sensors` | 1 | No |
| `mush2/telemetry/{deviceId}/state` | 1 | Sí |

### 2.2 Comandos (Backend → Firmware)

| Tópico | QoS | Retain |
|---|---|---|
| `mush2/cmd/{deviceId}/actuator` | 1 | No |
| `mush2/cmd/{deviceId}/config` | 1 | No |
| `mush2/cmd/{deviceId}/ota` | 1 | No |

### 2.3 Eventos (Firmware → Backend)

| Tópico | QoS | Retain |
|---|---|---|
| `mush2/event/{deviceId}/boot` | 1 | No |
| `mush2/event/{deviceId}/alarm` | 1 | No |
| `mush2/event/{deviceId}/ack` | 1 | No |

### 2.4 Estado (Firmware → Broker)

| Tópico | QoS | Retain |
|---|---|---|
| `mush2/state/{deviceId}/online` | 1 | Sí (LWT) |

## 3. Formatos de Mensaje

### 3.1 Telemetría de Sensores

**Tópico**: `mush2/telemetry/{deviceId}/sensors`
**Frecuencia**: Cada 10s

```json
{
  "protocol": "1.0.0",
  "deviceId": "esp8266_001",
  "ts": 1718201234,
  "sensors": {
    "temperature": 24.5,
    "humidity": 85.2,
    "co2": 420,
    "voc": 15
  },
  "status": {
    "state": "NORMAL",
    "mode": "LOCAL",
    "uptime": 12345,
    "wifiRssi": -65,
    "fwVersion": "0.7.0"
  }
}
```

### 3.2 Estado del Dispositivo

**Tópico**: `mush2/telemetry/{deviceId}/state`
**Frecuencia**: Cada 60s

```json
{
  "protocol": "1.0.0",
  "deviceId": "esp8266_001",
  "ts": 1718201234,
  "actuators": [
    { "channel": 1, "state": "ON" },
    { "channel": 2, "state": "OFF" },
    { "channel": 3, "state": "ON" },
    { "channel": 4, "state": "OFF" }
  ],
  "mode": "LOCAL"
}
```

### 3.3 Comando a Actuador

**Tópico**: `mush2/cmd/{deviceId}/actuator`

```json
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1740000000000",
  "ts": 1740000000,
  "target": "actuator",
  "channel": 1,
  "command": "ON"
}
```

**Respuesta (ACK)**: `mush2/event/{deviceId}/ack`

```json
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1740000000000",
  "deviceId": "esp8266_001",
  "ts": 1740000001,
  "status": "OK",
  "actuatorState": { "channel": 1, "state": "ON" }
}
```

### 3.4 Comando de Configuración

**Tópico**: `mush2/cmd/{deviceId}/config`

```json
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1740000000000",
  "ts": 1740000000,
  "target": "config",
  "tempMin": 20.0,
  "tempMax": 24.0,
  "humMin": 85.0,
  "humMax": 95.0,
  "co2Max": 1200,
  "mode": "LOCAL"
}
```

Campos opcionales — solo se actualizan los incluidos. `mode` acepta `LOCAL`, `REMOTE`, `OFF`.

### 3.5 Comando OTA

**Tópico**: `mush2/cmd/{deviceId}/ota`

```json
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1740000000000",
  "ts": 1740000000,
  "target": "ota",
  "action": "activate"
}
```

O para actualización HTTP:

```json
{
  "protocol": "1.0.0",
  "cmdId": "cmd_1740000000000",
  "ts": 1740000000,
  "target": "ota",
  "action": "update",
  "url": "http://ejemplo.com/firmware.bin"
}
```

| Action | Descripción |
|---|---|
| `activate` | Activa ArduinoOTA por 120s |
| `update` | Descarga firmware desde `url` y flashea |

### 3.6 Evento de Boot

**Tópico**: `mush2/event/{deviceId}/boot`

```json
{
  "protocol": "1.0.0",
  "deviceId": "esp8266_001",
  "ts": 1718201000,
  "event": "BOOT",
  "bootCount": 0,
  "fwVersion": "0.7.0"
}
```

### 3.7 Alarma

**Tópico**: `mush2/event/{deviceId}/alarm`

```json
{
  "protocol": "1.0.0",
  "deviceId": "esp8266_001",
  "ts": 1718201234,
  "event": "ALARM",
  "reason": "HIGH_TEMP:28.5"
}
```

Razones posibles: `HIGH_TEMP`, `LOW_TEMP`, `HIGH_HUM`, `LOW_HUM`, `HIGH_CO2`.

### 3.8 LWT (Last Will and Testament)

**Tópico**: `mush2/state/{deviceId}/online`

```json
{
  "deviceId": "esp8266_001",
  "status": "OFFLINE",
  "ts": 1718201234
}
```

## 4. Códigos de Error (ACK)

| Código | Significado |
|---|---|
| `OK` | Comando ejecutado |
| `INVALID_CHANNEL` | Canal fuera de rango (1-4) |
| `INVALID_STATE` | Estado no válido |
| `BUSY` | Mínimo tiempo ON no cumplido |
| `INVALID_PAYLOAD` | JSON mal formado |
| `UNKNOWN_CMD` | Comando no reconocido |

## 5. Versionado

El campo `protocol` en todo mensaje indica la versión usada.

| Versión | Estado |
|---|---|
| 1.0.0 | Actual |

## 6. Secuencia Completa

```
Boot:
  Firmware → mush2/event/{id}/boot
  Firmware → mush2/state/{id}/online → ONLINE (retain)

Cada 10s:
  Firmware → mush2/telemetry/{id}/sensors → {temperature, humidity, co2, voc}
  Firmware → HTTP → ThingSpeak (field1=temp&field2=hum&field3=co2&field4=voc)

Cada 60s:
  Firmware → mush2/telemetry/{id}/state → {actuators, mode}

Usuario enciende actuador:
  Frontend → REST → Backend → mush2/cmd/{id}/actuator (QoS 1)
  Firmware → mush2/event/{id}/ack → OK
  Backend → SSE → Frontend

Desconexión:
  Broker → mush2/state/{id}/online → OFFLINE (LWT retain)
```
