**✅ Análisis Detallado - Tercera Iteración (Log extenso - Boot #1 a #10+)**

He revisado **todo el log** que adjuntaste (más de 50k caracteres). El comportamiento es **altamente consistente** y confirma un problema grave y sistemático.

### 1. Resumen General
El firmware **v0.8.0** (ELF `8eb9472e230257e9`) no logra mantenerse estable.  
La tarea **Sensors** (CPU 1) **consistentemente** excede el tiempo del watchdog, provocando crashes, reboots y activación del Modo Seguro.  

El sistema logra:
- Inicializar sensores (AHT + ENS160)
- Conectarse a WiFi
- Hacer polling TCP correctamente (incluso con payloads de 220 bytes)
- Actualizar actuadores remotos

Pero **siempre falla en la tarea de sensores**.

---

### 2. Fallas Enlistadas por Criticidad

#### **🔴 CRÍTICAS (Rompen el dispositivo)**
| # | Fallo | Frecuencia | Evidencia |
|---|------|----------|---------|
| 1 | **Task Watchdog Timeout en tarea Sensors (CPU 1)** | Cada ~20-90 segundos | Aparece en **casi todos los ciclos**. Mensaje idéntico: `Task watchdog got triggered - Sensors (CPU 1)` |
| 2 | **Crash + Abort()** | Muy alta | `abort() was called at PC 0x42017c78 on core 0` (misma dirección en todas las caídas) |
| 3 | **Reboots en cadena** | Continua | Boot #1 hasta #10+ (y antes llegaste a #50+). Cada crash genera un nuevo boot. |
| 4 | **Activación constante del Modo Seguro (SAFE)** | Sistemática | Después de 5+ reinicios consecutivos entra en SAFE por 60 segundos. |

**Backtrace repetido**:
```
0x42017c78 ← Punto crítico (dentro de Sensors)
0x4208bddf
0x42017a05
...
```

Esto indica que el problema está **dentro o muy cerca** de la función que ejecuta la tarea Sensors.

---

#### **🟠 ALTAS (Degradan fuertemente la experiencia)**
| Fallo | Frecuencia | Detalle |
|------|----------|--------|
| **Inestabilidad WiFi** | Alta | Múltiples `[WARN] WiFi perdido — DEGRADED` y transiciones `NORMAL ↔ DEGRADED`. Aunque se recupera, genera ruido y posibles pérdidas de comandos. |
| **Corrupción de logs durante crash** | Frecuente | Líneas cortadas como `[WARN[STATE]`, `[Ch1[POLL]`, etc. |
| **Tiempo de ejecución excesivo en Sensors** | Siempre | La tarea no da tiempo al watchdog ni a otras tareas. |

---

#### **🟡 MEDIAS**
- **Polling TCP** funciona bien (respuestas de 220 bytes con múltiples actuadores).
- **Actuadores** se actualizan correctamente (Ch1 OFF, Ch2/3/4 ON).
- **Sensores** reportan valores coherentes (Temperatura subiendo lentamente ~19.6-19.9°C, HR bajando, eCO₂ y TVOC subiendo progresivamente — comportamiento normal).
- AQI se mantiene bajo (1-2).

---

#### **🟢 BAJAS / Informativas**
- PIO Core obsoleto (warning inicial).
- Inicialización de componentes (AHT, ENS160, Hysteresis, OTA) siempre exitosa.
- RSSI aceptable (-45 a -56 dBm).

---

### 3. Patrones Observados (Más Evidencia)

1. **El crash ocurre después de varias lecturas exitosas de sensores** (normalmente 3-6 lecturas `[SENSOR]` antes del timeout).
2. **El Poller y Sensors** compiten por CPU, pero el bottleneck está claramente en **Sensors**.
3. **No hay stack overflow** evidente (no aparece en los logs).
4. **El problema es determinista**: misma dirección de crash, mismo ELF, mismo comportamiento.
5. **Tiempo entre crashes** es relativamente constante (~25-90 segundos), lo que sugiere un loop que se vuelve lento progresivamente (posible acumulación de delays I2C).

---

### 4. Causas Más Probables (Ordenadas por Likelihood)

1. **Lecturas I2C bloqueantes** (ENS160 es especialmente problemático si no tiene timeout).
2. **Uso de `delay()`** en vez de `vTaskDelay()` dentro de la tarea Sensors.
3. **Cálculos pesados** (AQI, histéresis, promedios) sin yield.
4. **Mutex/Semáforo** tomado por mucho tiempo.
5. **Falta de `esp_task_wdt_reset()`** o `vTaskDelay()` en el loop principal de Sensors.

---

### Próximos Pasos (Recomendación Fuerte)

**Necesito ver el código** para darte un fix preciso. Por favor envíame:

1. El archivo de la **tarea Sensors** (`SensorsTask.cpp` o similar)
2. La función donde se crea la tarea (`xTaskCreate` para Sensors)
3. Si tienes, el wrapper de lectura de AHT y ENS160

Mientras tanto, **pruebas urgentes** que puedes hacer:

- Agregar `vTaskDelay(pdMS_TO_TICKS(50));` o `esp_task_wdt_reset();` dentro del loop principal de Sensors.
- Reducir frecuencia de lectura de sensores (por ejemplo, cada 5 segundos).
- Aumentar el timeout del watchdog temporalmente a 30-60 segundos para confirmar que es un tema de timing.

---
