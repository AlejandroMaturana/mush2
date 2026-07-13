# RFC-0008 — Multi-Function Button (SMFB) Interaction Model

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | Alejandro Maturana |
| Estado | DRAFT |
| Fecha de apertura | 2026-07-12 |
| Fecha de cierre | — |
| ADR resultado | — |
| RFC relacionados | RFC-0005 (BLE Provisioning) |
| Dependencias | ADR-012 (FreeRTOS), ADR-017 (Event Bus) |

## Resumen

Implementar un Single Multi-Function Button (SMFB) como interfaz fisica principal del dispositivo, con deteccion de 4 gestos (click, doble-click, hold 3s, hold 10s), feedback LED, y despacho de acciones dependiente del estado del dispositivo. Arquitectura de 4 capas: Driver → FSM → Eventos → Handler.

## Contexto

El firmware Mush2 no tiene interaccion fisica. El dispositivo depende completamente de la aplicacion movil o MQTT para cualquier cambio de estado. Esto es inaceptable para un equipo industrial donde:

- No existe conectividad WiFi permanente.
- No hay aplicacion movil en la zona de cultivo.
- El usuario necesita recuperar el dispositivo sin acceso serial.
- El provisioning BLE requiere una forma de entrada local.

El ESP32-S3-DevKitC-1 tiene GPIO disponibles y un NeoPixel integrado (GPIO 48). El boton se conecta a GPIO 6 con pull-up interno (active LOW).

## Restricciones

- Hardware: 1 boton (GPIO 6), 1 LED NeoPixel (GPIO 48), sin buzzer.
- Memoria: ~3-4 KB flash, ~200 bytes RAM estatica + 12 KB stack task.
- Latencia: < 10ms desde confirmacion de debounce.
- Seguridad: Hold 10s (factory reset) requiere confirmacion visual. OTA bloquea toda interaccion.
- FreeRTOS: Task dedicado en Core 1, prioridad 2, stack 3072 words.

## Objetivos

1. 4 gestos clasificados: Click, Double-Click, Hold-3s, Hold-10s.
2. Debounce industrial de 20ms (sin `delay()`).
3. Feedback LED inmediato para cada gesto.
4. Acciones dependientes del estado del dispositivo.
5. Cancelacion durante hold (el usuario puede arrepentirse).
6. Separacion completa: Driver no conoce WiFi, MQTT, BLE, sensores, ni relés.
7. OTA bloquea toda interaccion del boton.

## No-Objetivos

- Buzzer o retroalimentacion haptica.
- Encoder rotatorio o multi-boton.
- Triple-click o gestos complejos.
- Persistencia de historial de gestos.

## Diseno detallado

### Arquitectura de 4 capas

```
GPIO 6 (Hardware)
    │ [interrupt CHANGE]
    ▼
ButtonDriver          ← GPIO + debounce 20ms
    │ [edge confirmed]
    ▼
ButtonFsm             ← Clasificacion de gesto
    │ [EVT_BUTTON via EventBus]
    ▼
ButtonHandler         ← Despacho por DeviceState
    │
    ├── setLEDColor()
    ├── sm.fsmTransition()
    └── NVS wipe
```

### Button Driver (`button_driver.h/.cpp`)

Capa mas baja. Configure GPIO con pull-up interno. Detecta edges via interrupt CHANGE. Aplica debounce de 20ms en la task loop (no en ISR). Publica edges confirmados para consumo del FSM.

### Button FSM (`button_fsm.h/.cpp`)

Maquina de estados de 5 estados:

| Estado | Descripcion |
|--------|-------------|
| `BFSM_IDLE` | Esperando primer press |
| `BFSM_PRESSED` | Press confirmado, cronometrando hold |
| `BFSM_HOLD_3S_REACHED` | 3s alcanzado, esperando release o 10s |
| `BFSM_HOLD_10S_REACHED` | 10s alcanzado, esperando release |
| `BFSM_WAIT_SECOND_PRESS` | Primer click liberado, esperando doble-click |

### Umbrales temporales

| Parametro | Constante | Valor | Razon |
|-----------|-----------|-------|-------|
| Debounce | `BUTTON_DEBOUNCE_MS` | 20ms | Estandar industrial |
| Click max | `BUTTON_CLICK_MAX_MS` | 300ms | Tap humano maximo |
| Double-click gap | `BUTTON_DOUBLE_GAP_MS` | 300ms | Ventana entre clicks |
| Hold 3s | `BUTTON_HOLD_3S_MS` | 3000ms | Entrada provisioning |
| Hold 10s | `BUTTON_HOLD_10S_MS` | 10000ms | Factory reset |

### Matriz de acciones por estado

| Estado | Click | Doble-Click | Hold 3s | Hold 10s |
|--------|-------|-------------|---------|----------|
| BOOT/INIT | Ignorado | Ignorado | Ignorado | Factory Reset |
| NORMAL | LED flash | Refresh sensores | Provisioning | Factory Reset |
| DEGRADED | LED flash | Refresh sensores | Provisioning | Factory Reset |
| ERROR | Mostrar error | Ignorado | Ignorado | Factory Reset |
| OTA | TODO BLOQUEADO | TODO BLOQUEADO | TODO BLOQUEADO | TODO BLOQUEADO |
| PROVISIONING | Cancelar | Ignorado | Cancelar | Factory Reset |

### Feedback LED

| Gesto | Patron LED | Colores |
|-------|-----------|---------|
| Click | Flash blanco 50ms | RGB(200, 200, 200) |
| Double-click | 2 flashes cyan | RGB(0, 200, 200) |
| Hold 0-3s | Rampa azul creciente | RGB(0, 0, 0-128) |
| Hold 3s confirm | Doble flash azul | RGB(0, 0, 255) |
| Hold 3-10s | Rampa roja creciente | RGB(0-255, 0, 0) |
| Factory reset | 5 blinks rojo rapido | RGB(255, 0, 0) |

### Task FreeRTOS

| Propiedad | Valor |
|-----------|-------|
| Nombre | `taskButton` |
| Core | 1 (Control) |
| Prioridad | 2 |
| Stack | 3072 words |
| Loop | 10ms |
| WDT | Registrado |
| Heartbeat | `HB_BUTTON` |

### Cambios en interfaces

- `event_bus.h`: Nuevo tipo `EVT_BUTTON`, struct `ButtonEventPayload`.
- `config.example.h`: 14 nuevas constantes.
- `health_monitor.h`: Nuevo `HB_BUTTON` en enum de heartbeats.
- `main.ino`: Init del boton + creacion de task.
- `tasks.h/.cpp`: Entry point + extern declarations.

## Alternativas consideradas

| Opcion | Pros | Contras | Descartada por |
|--------|------|---------|----------------|
| Polling sin ISR | Simple | Latencia depende de poll rate | No cumple < 10ms |
| ISR + delay() debounce | Simple | Bloquea task, anti-patron en FreeRTOS | Anti-industria |
| ISR + debounce por software | Responsivo, no bloqueante | Mas complejo | **SELECCIONADO** |
| Timer de hardware | Preciso, off-CPU | Complejo, excesivo para 1 boton | Sobredimensionado |
| Sin intermediario EventBus | Menos overhead | Acoplamiento directo driver→handler | Viola arquitectura por capas |

## Impacto en compatibilidad

- Solo adiciones al firmware (interfaces existentes no modificadas).
- Sin cambios en backend ni frontend.
- Dispositivos desplegados no afectados (boton es opcional via config).
- Si `BUTTON_PIN` se define como -1, el task no se crea.

## Plan de migracion

1. Merge de constantes en `config.example.h` con valores por defecto seguros.
2. Dispositivos sin boton fisico: `BUTTON_PIN = -1`.
3. Task solo se crea si `BUTTON_PIN >= 0`.
4. No requiere cambio simultaneo firmware/backend.

## Preguntas abiertas

1. ¿GPIO 6 es definitivo? (Es seguro; confirmar con hardware final).
2. ¿Publicar gestos via MQTT para telemetria? (futuro).
3. ¿Hold-3s toggla provisioning o solo entra? (actual: toggla).
4. ¿Factory reset: borrar TODA la NVS o solo credenciales? (actual: TODA).
5. ¿Double-click refresh de sensores visible mas alla del flash LED?

## Criterios de aceptacion

1. Click detectado correctamente (< 300ms, debounce 20ms).
2. Double-click detectado (2 clicks, gap < 300ms).
3. Hold 3s detectado y publica gesture a los 3000ms.
4. Hold 10s detectado y ejecuta factory reset.
5. Cancelacion: release entre 1s y 3s produce ningun gesture.
6. OTA_UPDATING bloquea todos los gestures.
7. Feedback LED correcto para cada gesture.
8. Task FreeRTOS en Core 1 sin watchdog resets.
9. Health monitor reporta heartbeat del boton.
10. Hardware test (S3_test-button) pasa todos los tests.
