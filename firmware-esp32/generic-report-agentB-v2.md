# Análisis — Segunda corrida (ventana de observación más larga)

Excelente, esta corrida más larga confirma el patrón anterior y agrega evidencia clave que cambia el diagnóstico de "posible falla de hardware/I2C intermitente" a **bug de software determinístico y 100% reproducible**.

## 🔴 CRÍTICO

**1. Crash determinístico de la tarea `Sensors` — mismo PC, mismo backtrace, intervalo fijo**
- En **absolutamente todos** los boots (#1 al #51 visibles) la tarea `Sensors` (CPU1) dispara el watchdog y el sistema hace `abort()`.
- El PC de falla es **siempre el mismo**: `0x42017c78` (en la corrida anterior era `0x42017ad0` — variación mínima por build, pero misma zona de código).
- El backtrace es **idéntico** en cada crash: `0x40377dce → 0x4037cd99 → 0x40382d9d → 0x42017c78 → 0x40379481 → 0x4208bddf → 0x42017a05 → 0x4037e340`.
- Esto descarta una falla aleatoria de bus I2C: es la **misma instrucción exacta** la que se cuelga cada vez.

**2. Tiempo de falla con periodicidad casi constante (firma de bug, no de hardware)**
- Boots sin espera SAFE (recién encendido en frío): el crash ocurre siempre entre **22,804–22,810 ms** de uptime.
- Boots que pasan por modo SAFE (60s de espera): el crash ocurre siempre entre **89,105–89,133 ms** de uptime — es decir, ~29s después de reanudar desde el SAFE.
- Esta consistencia de ±10ms en docenas de reinicios es prácticamente imposible de explicar con un sensor físico fallando — apunta a algo determinístico: un contador/temporizador que se desborda, un buffer que se llena a tasa fija, o una condición de carrera que siempre se resuelve igual bajo la misma carga de trabajo.

**3. Boot loop infinito — el dispositivo nunca alcanza operación estable**
- El contador de boot llega hasta **#51** sin que el firmware logre sostenerse más de ~89 segundos. El dispositivo está, en la práctica, inoperable en producción: jamás permanece arriba el tiempo suficiente para cumplir su función (control de actuadores, monitoreo ambiental).

**4. SAFE mode no soluciona la causa raíz, solo retrasa el síntoma**
- El modo seguro espera 60s tras 5 reinicios, pero el bug vuelve a manifestarse ~29s después de reanudar. El mecanismo de protección está funcionando como diseñado, pero es un parche que no ataca el problema real.

## 🟠 ALTA

**5. Independiente del estado de los actuadores**
- En esta corrida los canales remotos tienen un patrón distinto (`Ch1:OFF Ch2:ON Ch3:ON Ch4:ON`) comparado con la corrida anterior (`Ch1:ON resto OFF`), y el crash ocurre igual. Esto descarta que el problema esté ligado al estado de los relés/SSR — la falla es interna a la tarea Sensors, no depende de la actuación.

**6. Pérdida intermitente de WiFi sigue presente**
- `[WARN] WiFi perdido — DEGRADED` aparece en varios boots, normalmente justo tras la inicialización. Puede ser secundario al mismo problema de saturación de tareas (si `Sensors` consume CPU0/CPU1 de forma anómala antes de colgarse).

## 🟡 MEDIA

**7. Logging entrelazado/corrupto persiste**
- Igual que en la corrida anterior, las líneas de distintas tareas se siguen mezclando en la consola (`[POLL]...[SENSOR]...`), confirmando falta de mutex en el logging — dificulta el diagnóstico pero no es la causa raíz.

---

### Conclusión del diagnóstico
La consistencia del PC de crash y la periodicidad casi fija del tiempo hasta el fallo son la pista más fuerte hasta ahora: esto **no es un sensor físico fallando intermitentemente**, es muy probablemente:
- Un **buffer o array de muestras** dentro de la tarea `Sensors` que se llena a una tasa fija y, al llegar a su límite, ejecuta una operación bloqueante (ej. un `memmove`, una espera infinita en semáforo, o un cálculo que entra en bucle), o
- Una **llamada bloqueante sin timeout** dentro del loop de `Sensors` (I2C `Wire.requestFrom`/`endTransmission`, o un mutex compartido con otra tarea) que termina colgándose siempre tras N ciclos de lectura — y N ciclos a la tasa de muestreo configurada equivale a ~22.8s o ~29s.
