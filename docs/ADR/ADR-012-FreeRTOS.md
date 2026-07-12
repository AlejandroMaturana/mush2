# ADR-012: FreeRTOS como Base de Tiempo Real y Estrategia de Tareas

**Estado:** Aceptado (actualizado 2026-07-11)
**Fecha:** 2026-06-28
**Decisión:** Formalizar FreeRTOS como el núcleo de tiempo real del sistema, estableciendo una arquitectura de tareas basada en dominios funcionales con sincronización explícita, jerarquía de prioridades definida y un plan de refactorización del watchdog que consolide los dos mecanismos actuales (TWDT + SWDT) en un solo sistema jerárquico.

## Contexto

El firmware del ESP32-S3 ejecuta 6 tareas FreeRTOS sobre 2 núcleos Xtensa LX7. Desde el ADR-001 se definió la separación por dominio (Core 1: control/sensores, Core 0: red), pero la implementación actual presenta varias deficiencias que deben corregerse de forma estructural:

1. **Ausencia total de primitivas de sincronización**: No hay mutexes, semáforos ni colas. El intercambio de datos entre núcleos usa variables `volatile` compartidas sin protección, lo que puede producir lecturas inconsistentes (race conditions) en variables multi-byte como `sharedTemp` (float), `sharedEco2` (uint16_t) o `actuatorDesired[]`.

2. **Dos sistemas watchdog independientes y sin coordinación**:
   - **TWDT** (Task Watchdog Timer de IDF): Timeout de 12s, panic on timeout → abort() + reboot. Cada tarea debe resetearlo en su bucle.
   - **SWDT** (Software Watchdog en `StateMachine`): Timeout de 30s, solo lo alimenta `taskSSR`. Si expira → `ESP.restart()`.
   - Ambos pueden activarse simultáneamente sin jerarquía clara, y el SWDT depende de una sola tarea, lo que lo hace ciego ante fallos en otras tareas.

3. **Uso de `delay()` bloqueante en tareas FreeRTOS**: `aht_sensor.cpp` usa `delay(80)` dentro de `taskSensors`, bloqueando el core de control durante 80ms e impidiendo que `taskSSR` (misma prioridad, mismo core) ejecute su loop. Esto es la causa raíz de la mayoría de timeouts del TWDT documentados en los crash logs.

4. **Desequilibrio de carga**: Core 0 ejecuta 4 tareas (WiFi, Poller, OTA, Telemetry) mientras Core 1 ejecuta 2 (Sensors, SSR). Sin embargo, la tarea Sensors es la más propensa a timeout.

5. **Sin manejo de errores en recursos compartidos**: I2C y Serial no están protegidos. La impresión simultánea desde múltiples tareas produce salida intercalada (jitter en logs).

6. **Sin mecanismo de notificación entre tareas**: `taskPoller` escribe `actuatorDesired[]` y `taskSSR` lo lee en su siguiente ciclo, con hasta 250ms de latencia. No hay forma de señalización inmediata.

## Decisión

### 1. Arquitectura de Tareas (refinada)

Se mantienen los 6 dominios funcionales pero se redefine su asignación y prioridades, y se introducen colas FreeRTOS para la comunicación inter-tarea.

```
Core 1 (Control) — Scheduling: round-robin con prioridades estáticas
├── [P1] taskSensors    → I2C: AHT21 + ENS160. Delay basado en vTaskDelayUntil.
└── [P2] taskSSR        → Histeresis + actuadores + software watchdog multicore.

Core 0 (Red) — Scheduling: round-robin con prioridades estáticas
├── [P1] taskWiFi       → Gestión de conexión WiFi (dual SSID).
├── [P2] taskPoller     → HTTP polling al backend. Escribe cola de comandos.
├── [P3] taskOTA        → Over-the-air updates.
├── [P4] taskTelemetry  → ThingSpeak + stats periódicos.
└── [P5] taskMQTT       → Conexión MQTT + loop().
```

### 2. Sincronización entre tareas

Se introducen progresivamente las siguientes primitivas:

| Primitiva | Propósito | Prioridad |
|-----------|-----------|-----------|
| `xQueueHandle cmdQueue` | Cola de comandos del backend (Core 0 → Core 1). Reemplaza `actuatorDesired[]`/`actuatorMode[]`. | ALTA (refactorización 1) |
| `xSemaphoreHandle i2cMutex` | Proteger bus I2C si se accede desde múltiples contextos. | MEDIA |
| `xSemaphoreHandle serialMutex` | Evitar intercalado en `Serial.printf` desde múltiples tareas. | BAJA |
| `xQueueHandle sensorDataQueue` | Cola de lecturas de sensor (Core 1 → Core 0). Reemplaza `sharedTemp`, `sharedHum`, etc. | ALTA (refactorización 1) |

Las variables `volatile` compartidas se mantendrán como fallback inmediato para el control SSR (que necesita la lectura más reciente, no encolada), pero los datos críticos enviados a Core 0 (telemetría a ThingSpeak) migrarán a colas para evitar inconsistencias.

### 3. Estrategia de Watchdog Unificada (refactorización objetivo)

Se consolidarán los dos watchdog actuales en un **sistema jerárquico de tres niveles**:

```
Nivel 1: TWDT (IDF Task Watchdog) — 15s
├── Timeout → panic handler → abort() → reboot
├── Lo alimenta CADA tarea individualmente
└── Última línea de defensa. Timeout indica bug grave.

Nivel 2: SWDT (Software Watchdog) — 30s
├── Timeout → safe-mode recovery → estado DEGRADED
├── Lo alimenta taskMonitor (o taskSSR como transición)
├── Si una tarea deja de alimentar el TWDT, el SWDT detecta la anomalía
│   antes del panic si taskMonitor no recibe heartbeat
└── Permite recuperación controlada sin reboot

Nivel 3: Health Check por tarea — 60s
├── taskMonitor consulta heartbeats individuales
├── Cada tarea incrementa un contador de heartbeat en su ciclo
├── Si una tarea no late → transición a DEGRADED, log, notificación
└── Si todas laten → NORMAL
```

**Regla fundamental**: Ninguna tarea debe usar `delay()` bloqueante. Todo retardo debe ser `vTaskDelay()` o `vTaskDelayUntil()`. Para esperas cortas en I2C, usar `esp_timer_get_time()` con polling no bloqueante o `xTaskGetTickCount()` con `vTaskDelay()`.

### 4. Política de Prioridades y Stack

| Tarea | Prioridad | Stack (palabras) | Delay (ms) | Core |
|-------|-----------|-------------------|------------|------|
| Sensors | `configMAX_PRIORITIES-1` | 8192 | 8000 | 1 |
| SSR | `configMAX_PRIORITIES-2` | 4096 | 250 | 1 |
| WiFi | `configMAX_PRIORITIES-3` | 4096 | 1000 | 0 |
| Poller | `configMAX_PRIORITIES-4` | 8192 | 500 | 0 |
| OTA | `configMAX_PRIORITIES-4` | 4096 | 100 | 0 |
| MQTT | `configMAX_PRIORITIES-4` | 4096 | 500 | 0 |
| Telemetry | `configMAX_PRIORITIES-4` | 4096 | 5000 | 0 |
| Monitor | 1 | 4096 | 60000/300000 | 0 |

**Stack de Sensors se mantiene en 8192** por el uso de `ArduinoJson` y `printf` con floats. **Stack de Poller se mantiene en 8192** por las respuestas HTTP y parsing JSON.

### 5. Manejo de I2C No Bloqueante (objetivo de refactorización)

El I2C del AHT21 y ENS160 debe migrarse a un patrón no bloqueante:

- `aht.read()` → `aht.requestMeasurement()` (inicia conversión, retorna inmediatamente)
- El loop de `taskSensors` espera con `vTaskDelay(pdMS_TO_TICKS(80))` y luego `aht.readResult()` (no bloqueante)
- Alternativa: usar interrupción por timer o simplemente `vTaskDelay` (preferido por simplicidad)

**Mientras no se refactorice**: Se alimenta `esp_task_wdt_reset()` antes y después del `delay(80)` (ya implementado parcialmente), y se verifica que el timeout del TWDT sea holgadamente mayor que el delay máximo acumulado (actualmente 12s vs 80ms, no es el problema — el problema real es que `delay()` bloquea `taskSSR` del mismo core).

### 6. Eliminación de Dependencias Bloqueantes en Tareas FreeRTOS

| Práctica | Estado actual | Acción |
|----------|--------------|--------|
| `delay(ms)` en tareas | Presente en AHT21 (80ms) | Reemplazar por `vTaskDelay(pdMS_TO_TICKS(80))` |
| `delay(ms)` en setup | Presente (100ms, loops de safe-mode) | Aceptable en setup (aún no hay scheduler multitarea) |
| `Serial.print` sin mutex | Generalizado | Mutex opcional; de baja prioridad |
| `Wire.end(); Wire.begin()` para reset I2C | Propuesto en ADR-010 | Evaluar si es seguro desde una tarea |

## Consecuencias

### Positivas
- Eliminación de race conditions en datos compartidos entre núcleos
- El sistema watchdog unificado permite diagnóstico granular sin depender del panic de IDF
- La cola de comandos reduce latencia y elimina la necesidad de polling en `taskSSR`
- Las tareas pueden notificarse entre sí sin busy-wait
- El refactor de I2C no bloqueante mejora la capacidad de respuesta de Core 1
- El stack de Sensors puede reducirse una vez migrado a colas (eliminando `ArduinoJson` de esa tarea)

### Negativas
- Las colas y mutexes añaden ~200-400 bytes de RAM por primitiva
- La refactorización del watchdog requiere cambios en `state_machine.cpp` y todas las tareas
- Migrar `actuatorDesired[]` a cola implica cambiar la interfaz `httpPoller.getDesired()` y `taskSSR`
- El SWDT actual depende solo de `taskSSR`; el nuevo `taskMonitor` añade una tarea extra
- El `delay(80)` del AHT21 es un caso complejo de eliminar porque el datasheet exige 80ms de espera

## Roadmap de Refactorización

```
Fase 1 (inmediata): Sincronización
├── Introducir cmdQueue (xQueue) entre taskPoller y taskSSR
├── Introducir sensorDataQueue (xQueue) entre taskSensors y taskTelemetry
├── Mantener volatile compartidas como fallback de lectura inmediata para SSR
└── Verificar que no haya regresiones en control SSR

Fase 2 (corto plazo): Watchdog Unificado
├── Refactorizar StateMachine para operar como supervisor multicore
├── Cada tarea envía heartbeat periódico a state_machine
├── SWDT timeout se calcula dinámicamente según el delay configurado de cada tarea
├── Timeout de SWDT → DEGRADED + intento de recovery (no reboot inmediato)
├── TWDT se mantiene como última línea (panic si todo falla)
└── Migrar test suite de watchdog (S3_test-watchdog) al nuevo modelo

Fase 3 (medio plazo): I2C No Bloqueante
├── AHT21: split read() en requestMeasurement() + readResult()
├── ENS160: evaluar si también requiere espera bloqueante
└── taskSensors: usar vTaskDelay() entre request y read

Fase 4 (largo plazo): taskMonitor + Health Check
├── Implementado como HealthMonitor (health_monitor.h/cpp)
├── Tarea en Core 0 con prioridad baja (1)
├── Monitorea heap, task stacks, bus I2C, presencia de sensores
├── PublishEvent via EventBus (EVT_HEALTH_UPDATE)
└── Logging estructurado de eventos de watchdog ✓ (2026-07-11)
```

## Alternativas Descartadas

- **No usar FreeRTOS y operar en superloop Arduino**: Descartado porque perderíamos la capacidad de aislar tareas de red (bloqueantes) de tareas de control (tiempo real). El ADR-001 ya justifica el uso de RTOS.
- **Usar un solo core y dejar el otro para WiFi/BT dedicado**: El ESP-IDF ya usa el core 0 para WiFi internamente; no ganaríamos nada.
- **Reemplazar variables volatile por portENTER_CRITICAL/portEXIT_CRITICAL**: Factible pero menos escalable que las colas. Las secciones críticas son adecuadas para datos simples compartidos; las colas son mejores para datos estructurados y comunicación dirigida.
- **Usar FreeRTOS+: No hay necesidad de las extensiones comerciales.**

## Referencias

- `firmware/src/main.ino` — Setup + globals, 8 tareas FreeRTOS
- `firmware/src/tasks.h/.cpp` — Tareas FreeRTOS extraídas + helpers
- `firmware/src/health_monitor.h/.cpp` — taskMonitor: health checks periódicos
- `firmware/src/event_bus.h/.cpp` — Event Bus in-memory (pub/sub)
- `firmware/src/config.h` — Stack sizes, prioridades, delays, CORE_CONTROL/CORE_NETWORK
- `firmware/src/state_machine.cpp` — Software Watchdog (SWDT): `feedWatchdog()`, `handleWatchdog()`
- `docs/ADR/ADR-001-ESP32.md` — Decisión original de FreeRTOS + dual-core
- `docs/ADR/ADR-010-Mecanismo-Fail-Safe-Overheat.md` — Mecanismos de seguridad térmica
- `docs/ADR/ADR-017-Event-Bus.md` — Event Bus architecture decision
