# ADR-017: Event Bus in-memory para desacoplamiento interno

**Fecha**: 2026-07-11
**Estado**: Aceptado

## Contexto

El firmware ESP32-S3 originalmente acoplaba directamente cada modulo con sus consumidores. Los sensores publicaban a traves de variables globales volatile, el MQTT client dependia de externs, y los modulos de logging/telemetria/health-check estaban directamente invocados desde tareas specificas. Esto generaba:

1. **Acoplamiento bidireccional**: cambios en un modulo requerian modificar tareas y otros modulos.
2. **Dependencia de red para eventos criticos**: si MQTT fallaba, los eventos de telemetria, health y logs se perdian.
3. **Falta de flexibilidad**: agregar un nuevo consumidor (ej: SPIFFS logger, buffer offline) requeria modificar multiples puntos del codigo.

El sistema necesita un mecanismo de publicacion/suscripcion que funcione independientemente de la red, permita multiples consumidores, y opere con overhead minimo en un microcontrolador con ~320KB RAM.

## Decision

Implementar un **Event Bus in-memory** basado en FreeRTOS Queue, con interfaz de suscripcion/publish tipo publish-subscribe.

## Motivos

1. **Desacoplamiento total**: los productores no conocen a los consumidores. El sensor publica `EVT_SENSOR_READING` y cualquiera puede suscribirse (MQTT, HTTP, SPIFFS logger, ring buffer).
2. **Supervivencia ante fallos de red**: el bus opera en RAM. Si WiFi/MQTT caen, los eventos siguen disponibles para consumidores locales (logger a SPIFFS, telemetry buffer).
3. **Extensibilidad**: agregar un nuevo consumidor es una sola llamada `subscribe()` sin modificar productores.
4. **Bajo overhead**: FreeRTOS Queue es parte del SO, sin heap allocation dinamico. Un solo task (`taskSSR` a 250ms) hace `loop()` para despachar eventos.
5. **Soporte para ISR**: `publishFromISR()` permite publicar desde interrupciones (futuro: pulsadores, encoder).

## Consecuencias

- Los modulos existentes (mqtt_client, thingspeak_client, hysteresis_controller) deben migrarse gradualmente a publicar via EventBus en lugar de variables globales.
- El bus tiene limite fijo: 16 eventos en cola, 4 suscriptores por tipo. Esto es suficiente para un nodo individual pero debe escalarse si se agregan mas consumidores.
- El despacho es serial (un solo task llama `loop()`). No hay paralelismo en el procesamiento de eventos, lo cual es correcto para un MCU single-bus.

## Alternativas descartadas

- **Callbacks directas**: mas rapido pero acoplado; agregar un segundo consumidor requiere modificar el productor.
- **Cola FreeRTOS por consumidor**: mas flexible pero duplica la memoria y complica la gestion.
- **Mutex + shared state**: no soporta multiples consumidores de forma natural.
- **Reactive Streams**: demasiado overhead para ESP32-S3.

## Detalle tecnico

### Arquitectura

```
┌─────────────┐    publish()    ┌───────────┐    subscribe()   ┌──────────────┐
│  taskSensors │ ──────────────>│           │ ────────────────>│ mqtt_client   │
│  taskSSR     │ ──────────────>│ Event Bus │ ────────────────>│ logger        │
│  HealthMon.  │ ──────────────>│ (Queue)   │ ────────────────>│ telemetryBuff │
│  MQTT (cmd)  │ ──────────────>│           │ ────────────────>│ http_poller   │
└─────────────┘                └───────────┘                   └──────────────┘
```

### Tipos de eventos (EventType)

| Evento | Payload | Productor | Consumidores |
|---|---|---|---|
| `EVT_SENSOR_READING` | temp, hum, co2, voc, aqi, timestamp | taskSensors | mqtt_client, logger, telemetryBuffer |
| `EVT_ACTUATOR_COMMAND` | channel, state, source | mqtt_client, hysteresis | ssr_controller, logger |
| `EVT_STATE_CHANGE` | oldState, newState | state_machine | mqtt_client, logger |
| `EVT_HEALTH_UPDATE` | heap, taskStacks, i2cOk, sensorsOk | health_monitor | mqtt_client, logger |
| `EVT_OTA_EVENT` | stage, version, success | ota_* | mqtt_client, logger |
| `EVT_WIFI_STATUS` | connected, rssi, ssid | wifi_manager | logger |
| `EVT_SENSOR_FAIL` | sensor, failCount | aht_sensor, ens160 | state_machine, logger |
| `EVT_LOG_MSG` | level, component, message | logger | mqtt_client (si level >= WARN) |
| `EVT_TELEMETRY_SENT` | success, responseCode | thingspeak_client | logger |
| `EVT_COMMAND_RECEIVED` | command, payload | mqtt_client | hysteresis, ota_decisor |

### Interfaz C++

```cpp
// event_bus.h
typedef void (*EventCallback)(const Event& event);

class EventBus {
public:
    bool subscribe(EventType type, EventCallback callback);
    bool unsubscribe(EventType type, EventCallback callback);
    bool publish(const Event& event);
    bool publishFromISR(const Event& event);
    void loop(); // llama callbacks de eventos pendientes
};
```

### Integracion con tareas

- `taskSSR` (Core 1, 250ms): ejecuta `eventBus.loop()` — buen compromiso entre latencia y overhead.
- `taskPoller` (Core 0, 500ms): ejecuta `eventBus.loop()` como respaldo.
- Productores llaman `eventBus.publish()` inline (no esperan al loop).

### Limites configurables

```cpp
#define EVENT_BUS_QUEUE_SIZE    16
#define EVENT_BUS_MAX_SUBSCRIBERS_PER_TYPE 4
```

## Referencias

- Implementacion: `firmware-esp32/src/event_bus.h`, `firmware-esp32/src/event_bus.cpp`
- Integracion: `firmware-esp32/src/tasks.cpp` (taskSSR)
- Consumidor MQTT: `firmware-esp32/src/mqtt_client.cpp`
- Consumidor Logger: `firmware-esp32/src/logger.cpp`
- Consumidor TelemetryBuffer: `firmware-esp32/src/telemetry_buffer.cpp`
- ADR-012-FreeRTOS: Decision de usar FreeRTOS con 6 tareas
- ADR-014-OTA-v3: Sistema OTA que ahora publica eventos via bus
