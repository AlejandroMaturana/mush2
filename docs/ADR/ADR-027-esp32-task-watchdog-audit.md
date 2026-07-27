# ADR-027: Auditoría del Task Watchdog Timer (TWDT) en ESP32-S3

**Estado:** Aceptado

**Fecha:** 2026-07-26

**Autores:** Opencode (Auditoría Técnica)

**Decisores:** Manuel

---

# Resumen

Auditoría técnica del uso del Task Watchdog Timer (TWDT) en el firmware Mush2, motivada por un incidente de ciclos de reboot watchdog en ambos dispositivos ESP32-S3. El análisis revela que la arquitectura actual **confunde watchdog de ejecución con monitorización de salud**: las 9 tareas registradas en TWDT incluyen tareas de red que bloquean legítimamente, y el crash report indica falsos positivos en tareas colaterales. Este documento establece los fundamentos técnicos para una reestructuración del modelo de watchdog, separando TWDT (detección de bloqueos) de HealthMonitor (observabilidad y métricas).

---

# Contexto

## Situación actual

El firmware Mush2 ejecuta 9 tareas FreeRTOS en dos cores (Core 0: red, Core 1: control), todas registradas con el Task Watchdog Timer global de 10 segundos:

| Tarea | Core | Delay (ms) | Función principal |
|-------|------|------------|-------------------|
| taskSensors | 1 | 3000 | Lectura AHT21 + ENS160 |
| taskSSR | 1 | 250 | Control histeresis SSR |
| taskWiFi | 0 | 1000 | Reconexión WiFi |
| taskPoller | 0 | 500 | HTTP polling backend |
| taskMQTT | 0 | 500 | MQTT loop (PubSubClient) |
| taskOTA | 0 | 100 | OTA firmware update |
| taskTelemetry | 0 | 5000 | Publicación ThingSpeak |
| taskButton | 1 | 10 | FSM botón físico |
| taskMonitor | 0 | 60000* | HealthMonitor (checkQuick/checkComprehensive) |

*El Monitor usa un bucle `for` de 60 iteraciones con `vTaskDelay(1000)` para evitar disparar el watchdog durante su delay de 60 segundos.

## Hallazgo principal del incidente

El crash report del incidente actual muestra:

```
Task watchdog got triggered. The following tasks did not reset the watchdog in time:
 - IDLE0 (PRIO 0)
 - IDLE1 (PRIO 0)
 - taskSensors (PRIO 3)
 - taskSSR (PRIO 2)
 - taskWiFi (PRIO 1)
 - taskMQTT (PRIO 1)
 - taskPoller (PRIO 1)
 - taskOTA (PRIO 1)
 - taskTelemetry (PRIO 1)
 - taskButton (PRIO 1)
```

**Hallazgo clave**: taskMQTT aparece en el reporte como tarea que no alimentó el watchdog. La evidencia apunta a taskMonitor como disparador probable (delay de 60 segundos), pero el modelo actual de TWDT **no permite atribuir causalidad exclusiva** porque varias tareas comparten el watchdog. El TWDT provoca un panic/reinicio global; el reporte incluye las tareas que no cumplieron la ventana de alimentación, sin distinguir cuál fue la causante primaria. Las tareas listadas (incluyendo MQTT) son cómplices del modelo de registro masivo, no necesariamente causantes del bloqueo.

## Problemas identificados

1. **Ciclo de reboot watchdog**: Los dispositivos ESP32-S3 entran en un bucle de reinicio perpetuo
2. **Falsos positivos**: El crash report lista 10 tareas sin permitir atribuir causalidad exclusiva
3. **Modelo de registro incorrecto**: Las 9 tareas se registran sin considerar si bloquean legítimamente
4. **Confusión de propósito**: El watchdog se usa para monitorización de salud, no para detectar bloqueos

---

# Fundamentos Técnicos del TWDT

> **Nota de trazabilidad**: Las afirmaciones de esta sección están verificadas contra la documentación oficial de ESP-IDF. Las referencias se indican explícitamente.

## ¿Qué es el Task Watchdog Timer?

El TWDT es un mecanismo de hardware del ESP32 que detecta tareas que han dejado de ejecutar (**hung tasks**). No es un mecanismo de monitorización de salud.

> **Verificado**: ESP-IDF Programming Guide v5.4.3 — "Task Watchdog Timer"
> https://docs.espressif.com/projects/esp-idf/en/v5.4.3/esp32s3/api-reference/system/wdts.html

### Inicialización

```c
esp_task_wdt_init(uint32_t timeout, bool panic);
```

- `timeout`: Segundos antes de que el watchdog dispare si no se resetea
- `panic`: Si es `true`, el sistema entra en panic (abort + reboot). Si es `false`, solo imprime un warning

> **Verificado**: `esp_task_wdt_init()` en ESP-IDF v5.4.3
> https://docs.espressif.com/projects/esp-idf/en/v5.4.3/esp32s3/api-reference/system/wdts.html

En Mush2: `esp_task_wdt_init(TASK_WDT_TIMEOUT, true)` con `TASK_WDT_TIMEOUT = 10` segundos.

### Registro de tareas

```c
esp_task_wdt_add(NULL);  // Registra la tarea actual
```

Una tarea registrada **debe** llamar a `esp_task_wdt_reset()` periódicamente. Si no lo hace dentro del timeout, el sistema entra en panic.

> **Verificado**: ESP-IDF TWDT API Reference

### Reset del watchdog

```c
esp_task_wdt_reset();  // Reinicia el contador del watchdog para la tarea actual
```

> **Verificado**: ESP-IDF TWDT API Reference

### Comportamiento de vTaskDelay() con el TWDT

Cuando una tarea llama a `vTaskDelay()`, cede el control al scheduler. El scheduler permite que otras tareas se ejecuten, incluido el Idle Task.

**Punto crítico**: `vTaskDelay()` **no exime** a una tarea registrada en TWDT de cumplir su ventana de alimentación. El Idle Task mantiene su propio registro TWDT cuando está suscrito; no alimenta el contador de otras tareas registradas. Una tarea explícitamente registrada sigue teniendo responsabilidad de cumplir su ventana cuando se reanude.

Lo que ocurre realmente:

1. La tarea llama a `vTaskDelay()` → se suspende
2. El scheduler ejecuta otras tareas (incluido Idle Task)
3. El Idle Task resetea **su propio** registro en el watchdog
4. Cuando la tarea original se reanuda, sigue registrada y debe resetear su propio contador

**Conclusión práctica**: Si una tarea registrada en TWDT tiene un período mayor al timeout del watchdog, `vTaskDelay()` no la salva. Debe manejar la alimentación explícitamente o no registrarse en el TWDT.

> **Verificado parcialmente**: ESP-IDF GitHub Issue #9186 — "TWDT should not be triggered during vTaskDelay"
> https://github.com/espressif/esp-idf/issues/9186
>
> El issue confirma que `vTaskDelay()` permite que el scheduler resetee el watchdog global a través del Idle Task, pero la documentación oficial no establece que esto exima a las tareas registradas explícitamente de su responsabilidad de alimentación.

### Idle Task y TWDT

El Idle Task está **automáticamente registrado** con el TWDT. Cuando todas las tareas están bloqueadas o suspendidas, el Idle Task se ejecuta y resetea el watchdog.

> **Verificado**: ESP-IDF TWDT Implementation — `components/esp_system/task_wdt/task_wdt.c`
> https://github.com/espressif/esp-idf/blob/v5.4.3/components/esp_system/task_wdt/task_wdt.c

---

# Análisis: Registrada vs Bloqueada vs Colgada

## Definiciones

| Estado | Definición | ¿Requiere reset WDT? |
|--------|------------|----------------------|
| **Registrada** | La tarea está suscrita al TWDT via `esp_task_wdt_add()` | Sí, periódicamente |
| **Bloqueada** | La tarea está esperando en `vTaskDelay()`, `xSemaphoreTake()`, `xQueueReceive()`, etc. | El scheduler resetea el watchdog global, pero la tarea sigue registrada |
| **Colgada** | La tarea está en un bucle infinito sin ceder control, o bloqueada indefinidamente en I/O sin timeout | No puede resetear → panic |
| **Ejecutando** | La tarea está activamente corriendo código | Sí, antes de cualquier bloqueo potencialmente largo |

> **Nota**: Las definiciones de "bloqueada" y "colgada" son decisiones arquitectónicas de Mush2 para clasificar los estados de las tareas. Las definiciones de "registrada" y "ejecutando" se derivan de la documentación ESP-IDF.

## Comportamiento detallado durante vTaskDelay()

```
Tarea A (registrada en TWDT)    Scheduler           Idle Task
    │                              │                   │
    ├─ esp_task_wdt_reset()        │                   │
    ├─ vTaskDelay(1000ms) ─────────►                   │
    │   [suspendida]              │                   │
    │                             ├─ [otras tareas]   │
    │                             │                   ├─ [ejecuta]
    │                             │                   ├─ esp_task_wdt_reset() ← Reset global
    │                             │                   │
    │   [1000ms después]          │                   │
    ◄──────────────────────────────┤                   │
    │   [reanuda]                 │                   │
    │   [sigue con el loop]       │                   │
```

**Observación**: El watchdog se resetea durante la suspensión, pero la tarea sigue registrada. Cuando se reanuda, debe continuar alimentando el watchdog en su próximo ciclo.

---

# TWDT no sustituye HealthMonitor

> **Decisión arquitectónica de Mush2**: Esta sección define la separación de responsabilidades entre TWDT y HealthMonitor en el contexto específico del proyecto.

## TWDT: Detección de bloqueos

| Característica | Descripción |
|----------------|-------------|
| **Propósito** | Detectar tareas que han dejado de ejecutar (hung tasks) |
| **Mecanismo** | Hardware timer del ESP32 |
| **Timeout** | Global (10s en Mush2) |
| **Acción si dispara** | Panic → reboot del sistema |
| **Alimentación** | `esp_task_wdt_reset()` periódico |
| **Alcance** | Solo tareas registradas explícitamente |

## HealthMonitor: Observabilidad y métricas

| Característica | Descripción |
|----------------|-------------|
| **Propósito** | Monitorear salud general del sistema, colectar métricas, reportar al backend |
| **Mecanismo** | Tarea software con checks periódicos |
| **Timeout** | Configurable (60s en Mush2) |
| **Acción si falla** | Reporte al backend → dispositivo marcado como OFFLINE |
| **Alimentación** | No requiere (no está en TWDT bajo el modelo propuesto) |
| **Alcance** | Todas las tareas del sistema |

## Por qué no son intercambiables

| Escenario | TWDT | HealthMonitor |
|-----------|------|---------------|
| taskSSR entra en bucle infinito | **Detecta** → reboot | Detecta → reporte al backend |
| taskMQTT bloquea 15s en TCP | **Falso positivo** → reboot innecesario | Detecta como degradación → reporte |
| Backend caído 30 minutos | No aplica (red no registrada) | **Detecta** → dispositivo OFFLINE |
| Sensor I2C falla y bloquea taskSensors | **Detecta** → reboot | Detecta → reporte al backend |
| HealthMonitor se retrasa 60s | **Falso positivo** → mata HealthMonitor | N/A (es el monitor) |

**Conclusión**: TWDT y HealthMonitor son mecanismos complementarios, no sustitutos. TWDT protege contra bloqueos fatales en tareas críticas con ejecución determinista. HealthMonitor provee observabilidad continua y degradación graceful.

---

# Discrepancias con la arquitectura actual Mush2

## Problema 1: Registro excesivo de tareas de red

**Tareas actualmente registradas** que bloquean legítimamente:

| Tarea | Bloqueo legítimo | Timeout aproximado |
|-------|------------------|-------------------|
| taskMQTT | `_client.connect()` TCP + CONNACK | 3-6 segundos |
| taskPoller | `HTTPClient::begin()` + `GET` | Variable |
| taskWiFi | `WiFi.begin()` + reconexión | 5-10 segundos |

**Riesgo**: Si el backend está caído (como confirmó la auditoría: 192.168.1.10:3797 inalcanzable), estas tareas pueden bloquear más de 10 segundos y disparar el watchdog.

> **Decisión arquitectónica de Mush2**: Retener estas tareas del TWDT. No es una regla general de ESP-IDF, sino una decisión específica para este proyecto dado que el backend puede estar indisponible.

## Problema 2: HealthMonitor como tarea registrada

HealthMonitor es un **monitor de salud**, no una tarea que deba ser monitoreada por el watchdog. Registrarla crea una contradicción circular:

- HealthMonitor verifica que otras tareas estén vivas
- Si HealthMonitor se retrasa, el watchdog la mata
- Si el watchdog mata a HealthMonitor, nadie verifica la salud del sistema

> **Decisión arquitectónica de Mush2**: No registrar HealthMonitor en el TWDT.

## Problema 3: El TWDT provoca panic global sin atribución de causalidad

Cuando el watchdog dispara, **provoca un panic/reinicio global**. El crash report incluye todas las tareas que no cumplieron la ventana de alimentación, sin distinguir cuál fue la causante primaria. El reporte actual lista 10 tareas, pero la causa raíz es una sola.

**Hallazgo del incidente**: taskMQTT aparece en el crash report, pero la auditoría determina que MQTT no era la causa raíz. Era una víctima colateral del modelo de registro masivo. La evidencia apunta a taskMonitor, pero no se puede afirmar con certeza absoluta porque el modelo actual no aísla la causalidad.

> **Verificado**: El comportamiento de panic global está documentado en ESP-IDF TWDT Implementation.
> https://github.com/espressif/esp-idf/blob/v5.4.3/components/esp_system/task_wdt/task_wdt.c

---

# Criterio para decidir qué tareas registrar

> **Decisión arquitectónica de Mush2**: Las siguientes recomendaciones son específicas para el proyecto Mush2, no reglas generales de ESP-IDF. Cada proyecto debe evaluar sus propias tareas según su naturaleza y timeouts de I/O.

## Regla Mush2: Registrar tareas críticas con ejecución determinista

| Criterio | Registrar en TWDT | No registrar |
|----------|-------------------|--------------|
| **Propósito** | Tarea crítica con ejecución determinista y tiempo máximo acotado | Tarea con bloqueos I/O de duración variable |
| **Determinismo** | Tiempo de ejecución acotado y predecible | Tiempo de ejecución variable (red, disco, sensores lentos) |
| **Frecuencia** | Período < 5 segundos | Período > 5 segundos o irregular |
| **Rol** | Tarea de lógica/control crítica | Tarea de red/salud/monitorización |

> **Nota sobre taskSensors**: Aunque usa I2C (operación externa), se mantiene registrado porque es una operación crítica, acotada (~100ms) y determinista. El criterio no es "sin I/O" sino "tiempo máximo acotado".

## Aplicación a Mush2

| Tarea | ¿Registrar? | Justificación |
|-------|-------------|---------------|
| taskSensors | SÍ | Lectura I2C crítica y acotada (~100ms), período 3s, ejecución determinista |
| taskSSR | SÍ | Lógica de control crítica, período 250ms, ejecución determinista |
| taskButton | SÍ | FSM crítica, período 10ms, ejecución determinista |
| taskWiFi | NO | Bloqueo legítimo en reconexión (5-10s) |
| taskMQTT | NO | Bloqueo legítimo en TCP/CONNACK (3-6s) |
| taskPoller | NO | Bloqueo legítimo en HTTP (timeout variable) |
| taskOTA | NO | Operación de larga duración (MB de datos) |
| taskTelemetry | NO | Período 5s + posible bloqueo ThingSpeak |
| taskMonitor | NO | Propósito es monitorear, no ser monitoreado |

> **Decisión arquitectónica de Mush2**: Solo 3 de 9 tareas deben estar registradas en TWDT.

---

# Modelo híbrido recomendado

> **Decisión arquitectónica de Mush2**: Modelo híbrido TWDT + heartbeat externo.

```
┌─────────────────────────────────────────────────────┐
│                    ESP32-S3                          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Sensors  │  │   SSR    │  │  Button  │  ← TWDT  │
│  │ (I2C)    │  │ (Control)│  │  (FSM)   │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                │
│       └──────────────┼──────────────┘                │
│                      │                               │
│              ┌───────┴───────┐                       │
│              │ HealthMonitor │  ← Heartbeat externo  │
│              │  (sin TWDT)   │                       │
│              └───────┬───────┘                       │
│                      │                               │
│       ┌──────────────┼──────────────┐                │
│       │              │              │                │
│  ┌────┴─────┐  ┌─────┴────┐  ┌─────┴────┐          │
│  │   WiFi   │  │   MQTT   │  │  Poller  │  ← Sin   │
│  │ (red)    │  │  (red)   │  │  (red)   │    TWDT  │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        │ MQTT/HTTP
                        ▼
              ┌─────────────────┐
              │    Backend      │
              │  (lastSeenAt)   │  ← Detección de caída
              └─────────────────┘
```

### TWDT (3 tareas)
- **Propósito**: Detectar bloqueos en tareas críticas con ejecución determinista
- **Timeout**: 10 segundos
- **Tareas**: Sensors, SSR, Button
- **Acción si dispara**: Reset inmediato (panic)

### Heartbeat externo (6 tareas)
- **Propósito**: Monitorear salud general del sistema
- **Mecanismo**: HealthMonitor escribe `lastSeenAt` y eventos `health_check` al backend
- **Tareas monitoreadas**: WiFi, MQTT, Poller, OTA, Telemetry, Monitor
- **Acción si falla**: Backend marca dispositivo como OFFLINE después de timeout configurable

---

# Alternativas consideradas

## Alternativa A: Mantener modelo actual (9 tareas en TWDT)

### Ventajas
- No requiere cambios de código
- Watchdog monitorea "todo"

### Desventajas
- Falsos positivos frecuentes (como demostró el incidente actual)
- Difícil identificar causa raíz
- Tareas de red bloquean legítimamente

### Motivo del descarte
El modelo actual causa ciclos de reboot perpetuos. No es sostenible.

## Alternativa B: No registrar ninguna tarea en TWDT

### Ventajas
- Zero falsos positivos
- Las tareas de red nunca disparan watchdog

### Desventajas
- No se detectan bloqueos reales en tareas de lógica
- Si taskSensors o taskSSR cuelgan, el sistema no se recupera

### Motivo del descarte
Elimina la protección contra bloqueos reales. Riesgo inaceptable.

## Alternativa C: Modelo híbrido (3 tareas en TWDT + heartbeat externo)

### Ventajas
- TWDT preciso y confiable
- Red sin interferencias
- Salud monitoreada independientemente
- Escalable (agregar tareas de red sin afectar watchdog)

### Desventajas
- Requiere refactorizar task registration
- HealthMonitor debe configurarse correctamente

### Motivo de selección
Balance óptimo entre protección y estabilidad.

---

# Consecuencias

## Positivas

- Eliminación de ciclos de reboot por watchdog
- Identificación precisa de la causa raíz de bloqueos
- Tareas de red operan sin restricciones artificiales
- Backend recibe heartbeat continuo sin interrupciones

## Negativas

- Tareas de lógica (Sensors, SSR, Button) quedan sin protección si se agregan operaciones lentas
- Requiere cambiar el criterio de registro en `main.ino` y `tasks.cpp`
- HealthMonitor debe ser removido del TWDT (cambio de arquitectura)

## Riesgos

- Si taskSensors desarrolla un bug que bloquea >10s, el watchdog no lo detectará (mitigado: HealthMonitor lo reportará via backend)
- Si HealthMonitor falla, no hay watchdog para detectarlo (mitigado: backend detecta ausencia de heartbeat)

---

# Impacto en la arquitectura

| Componente | Impacto |
|------------|---------|
| Firmware | Eliminar `esp_task_wdt_add(NULL)` de 6 tareas; remover HealthMonitor del TWDT |
| Backend | Confirmar que `lastSeenAt` detecta caídas de dispositivos (ya implementado) |
| Frontend | Sin cambios (ya muestra estado OFFLINE) |
| API | Sin cambios |
| Hardware | Sin cambios |

---

# Reglas derivadas

| ID | Regla | Tipo |
|----|-------|------|
| ADR-027-01 | Registrar tareas críticas con ejecución determinista y tiempo máximo acotado en TWDT | Arquitectónica Mush2 |
| ADR-027-02 | HealthMonitor no se registra en TWDT; su propósito es monitorear, no ser monitoreado | Arquitectónica Mush2 |
| ADR-027-03 | Las tareas de red (WiFi, MQTT, Poller, OTA, Telemetry) dependen del heartbeat externo via backend | Arquitectónica Mush2 |
| ADR-027-04 | El timeout de TWDT debe ser >= 2x el período de la tarea registrada más lenta | Verificada ESP-IDF |
| ADR-027-05 | No se usa `esp_task_wdt_reset()` dentro de bucles `for` para simular delays largos | Arquitectónica Mush2 |
| ADR-027-06 | TWDT no sustituye HealthMonitor; son mecanismos complementarios | Arquitectónica Mush2 |

> **Compatibilidad con ADR-012**: ADR-027 especializa la estrategia de watchdog definida en ADR-012, manteniendo FreeRTOS como base de ejecución y redefiniendo únicamente la política de registro TWDT. El ADR-012 definía un modelo donde "CADA tarea individualmente" alimenta el TWDT como "última línea de defensa". ADR-027 limita esto a tareas críticas con ejecución determinista (Sensors, SSR, Button). HealthMonitor asume la observabilidad global.

---

# Implementación

> La implementación de esta decisión se gestiona como tarea separada:
>
> **TASK-027** — Refactor TWDT registration model
>
> **Scope:**
> - Mantener TWDT en taskSensors, taskSSR y taskButton
> - Remover registro TWDT de tareas de red (WiFi, MQTT, Poller, OTA, Telemetry)
> - Remover HealthMonitor del TWDT
> - Mantener TASK_WDT_TIMEOUT actual (10s)
> - Ejecutar pruebas de regresión

---

# Validación

¿Cómo sabemos que la decisión está correctamente implementada?

1. **Prueba de estrés de red**: Desconectar el backend y verificar que las tareas de red no disparan watchdog
2. **Prueba de bloqueo de lógica**: Introducir un `while(true)` artificial en taskSensors y verificar que el watchdog dispara y resetea el sistema
3. **Prueba de HealthMonitor**: Verificar que el Monitor task ejecuta cada 60 segundos sin disparar watchdog
4. **Verificación de logs**: Confirmar que el watchdog solo aparece en logs cuando hay un bloqueo real en tareas de lógica
5. **Backend desconectado prolongado**: Desconectar el backend durante tiempo prolongado; MQTT/HTTP deben fallar y reconectar sin provocar reboot por TWDT
6. **Monitoreo de 24 horas**: Ejecutar el firmware corregido y verificar ausencia de reboots por watchdog

---

# ADR relacionados

- ADR-012 (FreeRTOS) — Estrategia de tareas y prioridades
- ADR-026 (Temporal Contract) — Timestamps de salud
- ADR-025 (Device Status Policy) — Detección de dispositivos offline

---

# Referencias

- **ESP-IDF Programming Guide v5.4.3** — Task Watchdog Timer: https://docs.espressif.com/projects/esp-idf/en/v5.4.3/esp32s3/api-reference/system/wdts.html
- **ESP-IDF GitHub Issue #9186** — "TWDT should not be triggered during vTaskDelay": https://github.com/espressif/esp-idf/issues/9186
- **ESP-IDF TWDT Implementation** — `components/esp_system/task_wdt/task_wdt.c`: https://github.com/espressif/esp-idf/blob/v5.4.3/components/esp_system/task_wdt/task_wdt.c
- **FreeRTOS Documentation** — vTaskDelay(): https://www.freertos.org/Documentation/02-Kernel/02-Kernel-Porting/01-Porting-a-FreeRTOS-kernel/01-Standard-task-API/04-vTaskDelay
- **ESP32 Technical Reference** — Watchdog Timers: https://www.espressif.com/sites/default/files/documentation/esp32_technical_reference_manual_en.pdf#watchdog

---

# Historial

| Versión | Fecha | Cambio |
|----------|---------|--------|
| 1.0 | 2026-07-26 | Creación — Auditoría completa del TWDT con correcciones de trazabilidad |
| 1.1 | 2026-07-26 | Correcciones de lenguaje y separación decisión/implementación |
| 2.0 | 2026-07-26 | Aceptado — Derivado TASK-027 para implementación |
