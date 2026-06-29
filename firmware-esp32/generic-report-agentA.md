**✅ Análisis del Monitor Serie - Firmware Mush2 ESP32**

He revisado todo el log completo. El firmware está fallando de forma **repetitiva y grave**.

### 1. Resumen General
El dispositivo entra en un **ciclo constante de crashes y reboots**. Llega hasta Boot #10 y activa el **modo seguro** (SAFE) porque detecta más de 5 reinicios consecutivos. El problema principal es un **Task Watchdog Timeout** en la tarea **Sensors** (CPU 1).

---

### 2. Fallas por Criticidad

#### **🔴 CRÍTICAS (Bloquean el funcionamiento)**
| # | Fallo | Frecuencia | Detalle |
|---|------|----------|-------|
| 1 | **Task Watchdog Timeout - Tarea Sensors** | Muy alta (casi cada 20-90 segundos) | La tarea `Sensors` no alimenta el watchdog. Se aborta el sistema con `abort() at PC 0x42017ad0`. Siempre el mismo backtrace. |
| 2 | **Crashes + Reboots continuos** | Continua | Boot #2 → #10. El equipo nunca logra mantenerse estable más de ~1-2 minutos. |
| 3 | **Activación de Modo Seguro (SAFE)** | Múltiple | Después de 5+ reinicios consecutivos entra en SAFE y espera 60s. |

**Causa más probable**: La tarea `Sensors` está bloqueada o tarda demasiado (lectura I2C de AHT + ENS160, o alguna operación pesada sin `vTaskDelay()` / yield).

---

#### **🟠 ALTAS (Impacto importante)**
| # | Fallo | Detalle |
|---|------|--------|
| 1 | **Inestabilidad WiFi** | Múltiples transiciones `NORMAL ↔ DEGRADED` y warnings `[WARN] WiFi perdido`. Aunque luego se reconecta, genera inestabilidad. |
| 2 | **Mensajes de log corruptos** | Durante los crashes se cortan líneas (`[POLL] TCP coE`, `[SENSOR] T: 16.7°C | HR: 63.2% | eCO`, etc.). |

---

#### **🟡 MEDIAS**
- Poller y Sensors compitiendo por tiempo de CPU (en uno de los crashes también se vio timeout del **Poller** en CPU 0).
- Uso repetido de TCP polling cada pocos segundos (parece estar funcionando, pero bajo mucha presión por los resets).

---

#### **🟢 BAJAS / Informativas**
- PIO Core obsoleto (`v6.1.18`).
- Backtrace siempre idéntico → el bug es determinista y reproducible.
- Sensor readings parecen normales cuando logra leer (temperatura subiendo lentamente, humedad bajando, eCO₂ y TVOC dentro de rangos esperados).

---

### 3. Observaciones Importantes

1. **El crash siempre ocurre en la misma dirección** (`0x42017ad0`). Esto apunta a un lugar específico en el código de la tarea Sensors (probablemente dentro de la lectura de sensores o alguna función que llama).
2. El sistema logra conectarse al backend (`192.168.1.6:3797`) y recibe comandos correctamente antes de caer.
3. El firmware **v0.8.0** tiene claramente un problema de **tiempo de ejecución** en la tarea Sensors.

---

### Recomendaciones Inmediatas

1. **Aumentar el timeout del watchdog** temporalmente (solo para debug) o alimentarlo más frecuentemente dentro de la tarea Sensors.
2. **Añadir `vTaskDelay(10)` o `yield()`** dentro del loop principal de lectura de sensores.
3. Revisar si las lecturas I2C del **ENS160** o **AHT** están bloqueando (usar timeouts o modo non-blocking si es posible).
4. Separar lecturas: leer AHT y ENS160 en tiempos diferentes o con mayor espaciado.
5. Activar **Core Debug** y **ESP Exception Decoder** para obtener mejor información del backtrace.

---
