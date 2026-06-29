# Análisis del monitor serie — Firmware Mush2 ESP32-S3

## 🔴 CRÍTICO

**1. Task Watchdog Timeout recurrente en tarea "Sensors" (Core 1) → crash loop**
- Patrón que se repite en **todos los boots** (#2 al #10): la tarea `Sensors` deja de resetear el watchdog, dispara `task_wdt`, y el sistema hace `abort()` y reinicia.
- Tiempos de falla: la mayoría ocurre a los **~23 segundos** de uptime, pero en boots #6 y #7 ocurre a los **~89 segundos** — sugiere que algo bloquea la tarea Sensors (probablemente una lectura I2C del AHT o ENS160 que se cuelga, o un mutex/semáforo tomado y nunca liberado).
- Esto provocó **10 reinicios consecutivos** documentados en el log, sin que el sistema logre estabilizarse.

**2. Activación de modo SAFE por reinicios en cascada**
- A partir del Boot #6 se activa `[SAFE] Modo seguro — 5+ reinicios consecutivos`, confirmando que el contador de reinicios detectó el ciclo de crashes. El sistema queda atrapado en boot loop, nunca llega a operación estable por más de ~90s.

**3. Watchdog también afecta a la tarea "Poller" (Core 0)**
- En el Boot #6, el log muestra que además de `Sensors`, la tarea **`Poller`** tampoco resetea el watchdog: `E (23016) task_wdt: - Poller (CPU 0)`. Esto indica que el bloqueo no es exclusivo de I2C/sensores — algo más amplio (posible recurso compartido, red, o memoria) podría estar afectando múltiples tareas simultáneamente.

## 🟠 ALTA

**4. Pérdida intermitente de WiFi**
- Mensajes `[WARN] WiFi perdido` y transición `NORMAL → DEGRADED` aparecen varias veces, justo después de reconectar. Esto degrada el modo de operación (`Mode: LOCAL` en lugar de remoto) y puede estar relacionado con la misma causa raíz del bloqueo de tareas (saturación de CPU0 o interferencia).

**5. Salida corrupta/intercalada en consola**
- Numerosas líneas se ven entremezcladas (ej. `E (23018) task_wdt: - Sensor[SENSOR] T: 17.1°C...s (CPU 1)`), lo cual indica que el logging desde distintas tareas no está sincronizado (falta de mutex en `Serial.print` o buffer compartido). Es un síntoma más que una causa, pero dificulta el diagnóstico.

## 🟡 MEDIA

**6. PIO Core duplicado / versión obsoleta**
- Advertencia de entorno: `Obsolete PIO Core v6.1.18 is used (previous was 6.1.19)`. No afecta al firmware en sí, pero puede generar builds inconsistentes entre máquinas de desarrollo.

**7. Conexión TCP "frágil" / mensaje "datos pendientes" sin contexto claro**
- Aparece un mensaje suelto `datos pendientes` sin etiqueta de módulo, lo que sugiere falta de logging estructurado en esa ruta del código (posiblemente cola de envío al servidor 192.168.1.6:3797).

---

### Diagnóstico probable
Todo apunta a que la **tarea `Sensors`** (lectura de AHT + ENS160 vía I2C) se queda bloqueada esperando algo —muy probablemente una llamada I2C que no tiene timeout (`Wire.requestFrom`, `endTransmission`, etc., colgada por bus en mal estado, pull-ups, o un semáforo compartido con la tarea que hace polling TCP). El watchdog dispara el `abort()` antes de que la tarea pueda completar, y el ciclo se repite indefinidamente hasta entrar en modo SAFE.
