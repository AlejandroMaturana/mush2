# Detalle Milestone

> Vinculado a `docs/roadmap.md` — Fases 0-8 completadas, Fase 9 (Refundación Domain-First) en curso, al 2026-07-22

Cada milestone agrupa una fase del roadmap en entregables verificables, con criterios de aceptación, issues de referencia y retrospectiva de riesgos encontrados.

---

## M0 — Contratos y Arquitectura (Fase 0)

**Período**: Inicio del proyecto — 2026-05-15  
**Objetivo**: Definir todos los contratos entre componentes antes de escribir código. Cero ambigüedad en interfaces.

### Entregables
- [x] `docs/protocol/protocol-v1.md` — Tópicos MQTT, payloads JSON, QoS 1, retained messages
- [x] `docs/contracts/mqtt-contract.md` — Responsabilidades: firmware publica, backend suscribe, comandos con ACK
- [x] `docs/contracts/api-contract.md` — Endpoints REST con request/response schema
- [x] `docs/architecture/architecture.md` — Diagrama de componentes: ESP8266 → MQTT → Backend → PostgreSQL → Frontend
- [x] `docs/architecture/backend.md` — Capas: routes → controllers → services → models
- [x] `docs/architecture/frontend.md` — Árbol de componentes React, routing, SSE
- [x] `docs/architecture/firmware.md` — Módulos, pinout, state machine de 8 estados
- [x] `docs/database.md` — Esquema con relaciones: User → Chamber → Device → Sensor → Telemetry
- [x] `docs/requirements.md` — Requerimientos funcionales y no funcionales
- [x] `docs/ADR/` — ADR-001 a ADR-006 documentados
- [x] `docs/governance/versioning.md` — SemVer para firmware, backend, frontend y protocolo

### Criterios de aceptación
- [x] Un desarrollador nuevo puede leer `architecture.md` y entender el flujo de datos sin preguntar
- [x] `api-contract.md` es suficiente para que frontend y backend se desarrollen en paralelo sin bloqueos
- [x] `protocol-v1.md` es suficiente para que firmware y backend se comuniquen sin ambigüedad

### Issues vinculados (retrospectiva)
| # | Título | Estado |
|---|--------|--------|
| 1 | Definir tópicos MQTT y payload | ✅ |
| 2 | Definir endpoints REST | ✅ |
| 3 | Diagrama de arquitectura general | ✅ |
| 4 | Esquema de base de datos inicial | ✅ |
| 5 | SemVer por componente | ✅ |

### Riesgos encontrados
- **R1**: El contrato MQTT asumía QoS 2, pero PubSubClient en ESP8266 no lo soporta fiablemente
  - Resuelto en: ADR-005 (revertido a QoS 1)


---

## M1 — Cadena de Telemetría (Fase 1)

**Período**: 2026-05-16 — 2026-05-22  
**Objetivo**: Un dato de sensor viaja del ESP8266 al dashboard sin intervención humana. Primer slice vertical completo.

### Entregables
- [x] Firmware: conexión WiFi con reconexión automática
- [x] Firmware: lectura de AHT21 (temperatura + humedad) cada 20s
- [x] Firmware: publicación MQTT en `nodo/telemetria` con JSON
- [x] Firmware: archivo `config.h` generado con credenciales WiFi y MQTT
- [x] Backend: Express 5 + Sequelize + PostgreSQL
- [x] Backend: suscriptor MQTT que persiste en tabla `telemetria`
- [x] Backend: endpoint `GET /api/telemetry?deviceId=&from=&to=`
- [x] Frontend: Vite + React Router
- [x] Frontend: Dashboard con componente `MetricCard` (temperatura, humedad)
- [x] Protocolo MQTT v1.0.0 validado extremo a extremo

### Criterios de aceptación
- [x] Una lectura del sensor aparece en el dashboard en < 5 segundos desde que se toma
- [x] El firmware se reconecta automáticamente si el WiFi cae (probado con router apagado 2 min)
- [x] El backend no pierde mensajes si MQTT se desconecta (buffer del broker)

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 10 | Inicializar proyecto PlatformIO para D1 R1 | `firmware` |
| 11 | Implementar lectura AHT21 vía I²C | `firmware` |
| 12 | Implementar WiFiManager o credenciales hardcoded | `firmware` |
| 13 | Implementar publicación MQTT | `firmware` |
| 14 | Configurar proyecto Node.js + Express + Sequelize | `backend` |
| 15 | Crear migración inicial: devices, sensors, telemetry | `database` |
| 16 | Implementar suscriptor MQTT en backend | `backend` |
| 17 | Implementar GET /api/telemetry con filtros | `backend` |
| 18 | Inicializar proyecto Vite + React | `frontend` |
| 19 | Implementar MetricCard con datos reales | `frontend` |

### Riesgos encontrados
- **R1**: PubSubClient en ESP8266 no reconecta automáticamente tras pérdida de WiFi
  - Resuelto con: state machine de 8 estados en Fase 5
- **R2**: La tabla `telemetria` crece ~4320 filas/día por dispositivo
  - Diferido a: estrategia de retención de datos (pendiente M8+)


---

## M2 — Bucle de Control (Fase 2)

**Período**: 2026-05-23 — 2026-05-28  
**Objetivo**: Un comando enviado desde el dashboard activa un relé físico. Circuito cerrado de control manual.

### Entregables
- [x] Firmware: control de SSR 3 canales (ventilador, calefactor, humidificador)
- [x] Firmware: suscripción a `nodo/cmd/relay` con ACK en `nodo/cmd/ack`
- [x] Firmware: fail-safe: todos los relés OFF al perder WiFi
- [x] Backend: modelo `Actuator` vinculado a `Device`
- [x] Backend: endpoint `PATCH /api/actuator/:id` con body `{ state: "ON" | "OFF" }`
- [x] Backend: `publishCommand()` que envía MQTT y espera ACK con timeout
- [x] Frontend: página `DeviceDetail` con componente `ActuatorControl`
- [x] Frontend: hook `useSSE` para recibir ACK en tiempo real
- [x] Backend: endpoint SSE `GET /api/events` para notificar cambios de estado

### Criterios de aceptación
- [x] Un click en "Encender Ventilador" activa el relé físico en < 2 segundos
- [x] El dashboard muestra el estado real del relé (no el comando enviado) vía ACK
- [x] Si el ESP8266 no responde en 5 segundos, el backend marca el comando como `TIMEOUT`
- [x] Al desconectar el ESP8266 de la corriente, todos los relés quedan físicamente OFF

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 20 | Implementar control GPIO para SSR 3CH | `firmware` |
| 21 | Implementar callback MQTT para `nodo/cmd/relay` | `firmware` |
| 22 | Implementar ACK MQTT tras ejecutar comando | `firmware` |
| 23 | Modelar Actuator en Sequelize | `database` |
| 24 | Implementar PATCH /api/actuator/:id | `backend` |
| 25 | Implementar publishCommand con espera de ACK | `backend` |
| 26 | Implementar SSE endpoint para eventos | `backend` |
| 27 | Implementar ActuatorControl con feedback visual | `frontend` |
| 28 | Implementar useSSE hook | `frontend` |

### Riesgos encontrados
- **R1**: El SSR G3MB-202P requiere lógica LOW para activar (confuso en debug)
  - Resuelto con: macros `RELAY_ON` / `RELAY_OFF` en firmware
- **R2**: El ACK puede perderse si el WiFi fluctúa justo tras ejecutar el comando
  - Resuelto con: timeout de 5s en backend; el estado real se obtiene del siguiente mensaje de telemetría


---

## M3 — Sensores Avanzados y Recetas (Fase 3)

**Período**: 2026-05-29 — 2026-06-04  
**Objetivo**: Medición de CO₂ y VOC. ThingSpeak como respaldo. Modelado de recetas de cultivo por especie.

### Entregables
- [x] Firmware: integración ENS160 en bus I²C compartido con AHT21
- [x] Firmware: compensación de ENS160 con temperatura/humedad del AHT21
- [x] Firmware: envío de CO₂ y VOC en payload de telemetría
- [x] Backend: sincronización desde ThingSpeak API (`thingSpeakSync.js`)
- [x] Backend: modelos `Recipe`, `CultivationCycle`, `CycleState`
- [x] Backend: seeders con receta para Melena de León (Lion's Mane)
- [x] Backend: endpoint `GET /api/recipes` y `POST /api/cycles`
- [x] Frontend: visualización de CO₂ y VOC en Dashboard

### Criterios de aceptación
- [x] El ENS160 reporta eCO₂ y TVOC en el mismo ciclo de 20s que el AHT21
- [x] Si el backend está caído 1 hora, al levantarse sincroniza datos desde ThingSpeak sin duplicados
- [x] Una receta incluye todos los parámetros: temp min/max, hum min/max, CO₂ max, FAE interval, luz
- [x] Los seeders generan datos de prueba sin necesidad de hardware

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 29 | Integrar ENS160 en bus I²C | `firmware` |
| 30 | Implementar setTempAndHum() para compensación | `firmware` |
| 31 | Ampliar payload MQTT con co2 y voc | `firmware` |
| 32 | Implementar cliente HTTP ThingSpeak en firmware | `firmware` |
| 33 | Implementar thingSpeakSync.js en backend | `backend` |
| 34 | Modelar Recipe, CultivationCycle, CycleState | `database` |
| 35 | Crear seeders de recetas | `database` |
| 36 | Implementar GET /api/recipes | `backend` |
| 37 | Mostrar CO₂ y VOC en Dashboard | `frontend` |

### Riesgos encontrados
- **R1**: El ENS160 requiere 48h de burn-in inicial para estabilizar baseline
  - Mitigado con: seeders usan datos simulados; burn-in en paralelo
- **R2**: ThingSpeak tiene rate limit de 15s entre updates
  - Resuelto con: ciclo de telemetría configurado a 20s (ADR-001)


---

## M4 — Automatización (Fase 4)

**Período**: 2026-06-05 — 2026-06-09  
**Objetivo**: El sistema controla automáticamente el ambiente según la receta activa. Cero intervención manual en régimen normal.

### Entregables
- [x] Firmware: lógica de histéresis para temperatura, humedad y CO₂
- [x] Firmware: modos de operación `LOCAL`, `REMOTE`, `OFF`
- [x] Firmware: sistema de alarmas por umbrales críticos
- [x] Backend: `controlEngine.js` que evalúa reglas cada 20s
- [x] Backend: transición automática de fases del ciclo (INCUBATION → PRIMORDIA → FRUITING → HARVESTING)
- [x] Backend: snapshots de estado de actuadores al cambiar de fase
- [x] Frontend: página `Ciclos` con timeline de fases
- [x] Frontend: panel de alarmas en Dashboard con severidad

### Criterios de aceptación
- [x] El calefactor se activa cuando T < receta.incubationTempMin - 0.5°C
- [x] El ventilador se activa cuando CO₂ > receta.co2PpmFruitingMax
- [x] Un ciclo pasa de INCUBATION a PRIMORDIA automáticamente tras cold-shock
- [x] Una alarma CRITICAL se genera en < 30s tras superar el umbral
- [x] El operador puede cambiar a modo REMOTE y tomar control manual

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 38 | Implementar histéresis T/H/CO₂ en firmware | `firmware` |
| 39 | Implementar modos LOCAL/REMOTE/OFF | `firmware` |
| 40 | Implementar alarmas en firmware | `firmware` |
| 41 | Implementar controlEngine.js | `backend` |
| 42 | Implementar transición automática de fases | `backend` |
| 43 | Implementar snapshots de actuadores | `backend` |
| 44 | Implementar página de Ciclos | `frontend` |
| 45 | Implementar panel de alarmas | `frontend` |

### Riesgos encontrados
- **R1**: La histéresis puede causar oscilaciones si la banda es muy estrecha
  - Resuelto con: histéresis configurable por receta (±0.5°C default)
- **R2**: Transición de fase errónea si los sensores fallan temporalmente
  - Resuelto con: se requiere N lecturas consecutivas fuera de rango antes de alarmar


---

## M5 — Hardening (Fase 5)

**Período**: 2026-06-10 — 2026-06-11  
**Objetivo**: El sistema sobrevive a fallos sin intervención humana. Seguridad básica implementada.

### Entregables
- [x] Firmware: state machine de 8 estados (INIT → CONNECTING_WIFI → CONNECTING_MQTT → OPERATIONAL → etc.)
- [x] Firmware: watchdog hardware (WDT) + watchdog software (timer de inactividad)
- [x] Firmware: configuración persistente en EEPROM (modo, setpoints)
- [x] Firmware: MQTT backoff exponencial + Last Will Testament (LWT)
- [x] Backend: autenticación JWT + RBAC (ADMIN, OPERATOR, VIEWER)
- [x] Backend: rate limiting (express-rate-limit)
- [x] Backend: Helmet.js para cabeceras de seguridad (CSP, X-Frame-Options)
- [x] Backend: audit logging (quién hizo qué y cuándo)
- [x] Backend: tests unitarios y de integración
- [x] Frontend: ErrorBoundary en cada ruta
- [x] Frontend: Skeleton loading mientras se cargan datos
- [x] Frontend: AuthContext con login/logout
- [x] Frontend: diseño responsive (mobile + desktop)

### Criterios de aceptación
- [x] El ESP8266 se recupera automáticamente de un crash (WDT reset) en < 10s
- [x] El backend rechaza >100 requests/min desde la misma IP
- [x] Un usuario sin token recibe 401 en cualquier endpoint protegido
- [x] Un VIEWER no puede hacer PATCH a un actuador (403)
- [x] El frontend muestra un fallback UI si un componente lanza excepción

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 46 | Implementar state machine en firmware | `firmware` |
| 47 | Configurar WDT + SW watchdog | `firmware` |
| 48 | Implementar EEPROM para configuración | `firmware` |
| 49 | Implementar MQTT backoff + LWT | `firmware` |
| 50 | Implementar auth JWT + RBAC | `backend` |
| 51 | Configurar rate limiting | `backend` |
| 52 | Configurar Helmet CSP | `backend` |
| 53 | Implementar audit logging | `backend` |
| 54 | Escribir tests unitarios | `backend` |
| 55 | Implementar ErrorBoundary + Skeleton | `frontend` |
| 56 | Implementar AuthContext | `frontend` |

### Riesgos encontrados
- **R1**: El WDT puede resetear el ESP8266 durante operaciones largas (OTA)
  - Resuelto con: desactivar WDT temporalmente durante OTA; reactivar al terminar
- **R2**: JWT en localStorage es vulnerable a XSS
  - Resuelto con: accessToken en memoria JS; refreshToken en httpOnly cookie


---

## M6 — Multiusuario (Fase 6)

**Período**: 2026-06-12  
**Objetivo**: Múltiples usuarios pueden usar el sistema simultáneamente viendo solo sus recursos asignados.

### Entregables
- [x] Backend: tenant middleware que inyecta `accessibleChamberIds`
- [x] Backend: modelo `UserChamberAccess` (userId, chamberId, grantedBy)
- [x] Backend: middleware `checkDeviceAccess` que valida que el dispositivo pertenece a cámara accesible
- [x] Backend: seeders con 2 usuarios de prueba (admin + operador)
- [x] Frontend: página de login/logout
- [x] Frontend: interceptors de Axios que inyectan token y redirigen en 401
- [x] Frontend: rutas protegidas con `<ProtectedRoute>`

### Criterios de aceptación
- [x] Un OPERATOR solo ve las cámaras donde tiene `UserChamberAccess`
- [x] Un ADMIN ve todas las cámaras
- [x] Un request sin token recibe 401 y el frontend redirige a /login
- [x] Un TENANT no puede ver telemetría de una cámara sin acceso

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 57 | Implementar tenant middleware | `backend` |
| 58 | Modelar UserChamberAccess | `database` |
| 59 | Implementar checkDeviceAccess | `backend` |
| 60 | Crear seeders de usuarios | `database` |
| 61 | Implementar página de login | `frontend` |
| 62 | Implementar Axios interceptors | `frontend` |
| 63 | Implementar ProtectedRoute | `frontend` |

### Riesgos encontrados
- **R1**: El middleware de tenencia añade una query por request
  - Resuelto con: caché en memoria con TTL de 60s


---

## M7 — Producción (Fase 7)

**Período**: 2026-06-13  
**Objetivo**: El sistema está listo para operación continua. OTA, CI/CD, backups y documentación de usuario.

### Entregables
- [x] Firmware: OTA vía ArduinoOTA + HTTP Update comandado por MQTT
- [x] Backend: endpoint `GET /health` con estado de DB, MQTT, nodos
- [x] Backend: endpoint `GET /metrics` para Prometheus (si aplica)
- [x] Backend: script de backup de PostgreSQL (`pg_dump` + rotación)
- [x] CI/CD: GitHub Actions para firmware (PlatformIO build)
- [x] CI/CD: GitHub Actions para backend (tests + lint)
- [x] CI/CD: GitHub Actions para frontend (build + lint)
- [x] Documentación: manual de usuario (`docs/user/manual.md`)
- [x] Documentación: README con instrucciones de despliegue

### Criterios de aceptación
- [x] Una actualización OTA se completa sin desconectar el nodo de su ciclo activo
- [x] `GET /health` devuelve 200 si DB, MQTT y nodos están sanos
- [x] El backup de PostgreSQL se ejecuta diariamente y se rota cada 7 días
- [x] Un push a `main` dispara CI/CD y reporta éxito/fallo en < 5 min
- [x] Un operador nuevo puede seguir el manual de usuario sin ayuda

### Issues vinculados
| # | Título | Etiqueta |
|---|--------|----------|
| 64 | Implementar ArduinoOTA + HTTP Update | `firmware` |
| 65 | Implementar health endpoint | `backend` |
| 66 | Implementar metrics endpoint | `backend` |
| 67 | Crear script de backup PostgreSQL | `devops` |
| 68 | Configurar GitHub Actions firmware | `devops` |
| 69 | Configurar GitHub Actions backend | `devops` |
| 70 | Configurar GitHub Actions frontend | `devops` |
| 71 | Escribir manual de usuario | `docs` |

### Riesgos encontrados
- **R1**: OTA puede brickear el ESP8266 si falla a mitad de la transferencia
  - Resuelto con: doble partición OTA; si falla, bootea de la partición anterior


---

## M8 — Multi-Cámara Física (Fase 8 del roadmap)

**Período**: 2026-06-24
**Objetivo**: Escalar de un nodo de prueba a N cámaras físicas simultáneas con firmware idéntico, cada una con receta independiente.

### Entregables
- [x] Firmware: `deviceId` dinámico derivado de MAC address, grabado en EEPROM al primer boot
- [x] Firmware: todos los mensajes MQTT usan el deviceId real (no hardcoded)
- [x] Firmware: cada nodo filtra comandos por su propio deviceId (ignora ajenos)
- [x] Backend: auto-registro de nodos al recibir primer mensaje (findOrCreate por deviceId)
- [x] Frontend: vista multi-cámara con selector de dispositivo
- [x] Frontend: Dashboard con métrica agregada (promedio de T°/HR entre cámaras activas)

### Criterios de aceptación
- [x] Un nodo nuevo se registra automáticamente al enviar su primer mensaje de telemetría
- [x] El dashboard cambia de cámara A a cámara B en < 1s
- [x] Un comando enviado a cámara A no afecta los relés de cámara B

---

## M9 — Refundación Domain-First (Fase 9 del roadmap)

**Período**: En curso — 2026-07-22
**Objetivo**: Reescribir el backend siguiendo arquitectura domain-first (ADR-019). El dominio se modela primero con cero dependencias de infraestructura.

**ADR**: `docs/ADR/ADR-019-domain-first.md`

### Entregables
- [ ] Paquete `@mush2/domain`: entidades puras (Run, Chamber, Recipe, Telemetry, Alarm), value objects, domain events, repository interfaces
- [ ] Paquete `@mush2/application`: use cases (StartRun, AbortRun, IngestTelemetry, EvaluateRun)
- [ ] Paquete `@mush2/control-engine`: PhaseEvaluator, ActuatorComputer, SafetyGuard, AlarmService
- [ ] Backend: implementar repositories sobre Sequelize/PostgreSQL
- [ ] Backend: traducir endpoints existentes a use cases
- [ ] Migración: mapear modelos actuales a nueva estructura sin perder datos

### Criterios de aceptación
- [ ] `@mush2/domain` compila y pasa tests sin importar infraestructura
- [ ] Un use case se puede testear con un repository mock
- [ ] Control Engine delega a sub-servicios especializados
- [ ] HistoryService reconstruye timeline completa
- [ ] El backend existente sigue funcionando durante la migración

### Decisiones clave
| ADR | Decisión | Impacto |
|-----|----------|---------|
| ADR-019 | Domain-first: dominio → use cases → control engine → persistencia → API | Orden de construcción invertido |
| ADR-020 | `Run` reemplaza `CultivationCycle` | Renombrado de entidad central |
| ADR-021 | Control Engine como orquestador con sub-servicios | Desacoplamiento del motor de reglas |
| ADR-022 | HistoryService como servicio activo | Consulta unificada de historial |

---

## M10 — MQTT Propio + TLS (Fase 10 del roadmap)

**Período**: Planificado — post M9
**Objetivo**: Eliminar dependencia de brokers públicos. Comunicación cifrada entre firmware y backend.

### Entregables
- [ ] Infraestructura: Mosquitto en contenedor Docker con persistencia en disco
- [ ] Infraestructura: certificados TLS para MQTT
- [ ] Firmware: soporte TLS en ESP32-S3 vía `WiFiClientSecure`
- [ ] Backend: conexión MQTT con TLS + autenticación
- [ ] Protocolo: `docs/protocol/protocol-v2.md`

### Criterios de aceptación
- [ ] Wireshark no muestra datos en texto plano
- [ ] Broker propio uptime >99%
- [ ] Migración con cambio de config, sin recompilar firmware

---

## M7e — Estabilización Funcional (Fase 7e)

**Período**: 2026-07-15
**Objetivo**: Eliminar inconsistencias entre firmware, backend, base de datos y frontend para garantizar que la información operacional represente fielmente el estado real del hardware.

**ADR**: `docs/ADR/ADR-018-functional-integrity-stabilization.md`

**Audit source**: Auditoría completa de integridad funcional — 28 hallazgos en 3 componentes.

### Entregables — Firmware (v0.21.0)
- [x] Reemplazar `millis()` por `getTimestamp()` en los 5 payloads MQTT (telemetry, status, alarm, health, maintenance)
- [x] Unificar mensaje de connect con `publishStatus()` en lugar de `{"status":"ONLINE"}` suelto
- [x] Declarar `getTimestamp()` en `tasks.h` para acceso desde `mqtt_client.cpp`

### Entregables — Backend (v0.23.0)
- [x] Mapear firmware state → Device.status (NORMAL→ONLINE, DEGRADED→MAINTENANCE, ERROR→ERROR)
- [x] Persistir `mode` del firmware en Device.controlMode
- [x] Almacenar campo `aqi` del sensor ENS160 en tabla telemetry
- [x] Enviar setpoints y phase en comandos MQTT a firmware
- [x] Fix SSE connected message (agregar `event:` header)
- [x] Forward eventos `health`, `maintenance`, `phase_transition` vía SSE
- [x] DELETE cascade para Device (todas las entidades relacionadas)
- [x] Almacenar `bootTestPassed` y `bootTestFailReason` en DeviceHealth
- [x] Fix `controlMode` en diagnostics (usar campo real, no fallback siempre 'AUTO')
- [x] Eliminar valor inválido `RUNNING` del query de analytics
- [x] Persistir sensorHistory del phaseEvaluator en DB (no en memoria)

### Entregables — Frontend (v1.10.0)
- [x] Null telemetry → gaps en charts (no ceros)
- [x] Marcar stale values en DeviceDetail cuando sensor no reporta
- [x] Obtener rangos de sensores de la receta activa (no hardcodeados)
- [x] Unificar versiones (leer de package.json)
- [x] Conectar datos de suscripción al backend (no hardcodeados)
- [x] Fix error suppression en Telegram config (rollback en error)
- [x] Consumir SSE health y maintenance events
- [x] Eliminar texto decorativo falso del Login ("NODES_ONLINE", "SPORE_SYNC")

### Entregables — Base de datos
- [x] Columna `lastFirmwareState` en tabla devices
- [x] Columna `controlMode` en tabla devices
- [x] Columnas `bootTestPassed`, `bootTestFailReason` en device_health
- [x] Valor `AQI` agregado al ENUM sensorType en telemetry

### Criterios de aceptación
- [x] `SELECT timestamp FROM telemetry LIMIT 5` retorna fechas > 2026-01-01
- [x] Simular status MQTT con `state: "ERROR"` → Device.status cambia a `ERROR`
- [x] Payload MQTT de topic `+/actuators` incluye `setpoints` y `phase`
- [x] `SELECT * FROM telemetry WHERE "sensorType" = 'AQI'` retorna datos
- [x] Eventos `health` llegan vía SSE al frontend
- [x] Sensor offline → gráfica muestra gap, no línea en 0
- [x] Sensor offline >30s → valor con opacidad reducida en DeviceDetail
- [x] Gauge zones coinciden con rangos de la receta activa
- [x] StatusFooter, Landing y Login muestran la misma versión
- [x] Datos de suscripción son reales del backend, no hardcodeados

### Issues vinculados
| # | Título | Componente | Severidad |
|---|--------|-----------|-----------|
| 1 | millis() en payloads MQTT → timestamps epoch 1970 | Firmware | Crítico |
| 2 | Device.status siempre ONLINE, nunca refleja firmware state | Backend | Crítico |
| 3 | MQTT commands sin setpoints/phase → firmware ciego a recetas | Backend | Crítico |
| 4 | Campo aqi silenciosamente descartado | Backend | Alto |
| 5 | SSE connected message sin event type | Backend | Alto |
| 6 | controlMode no existe en Device → diagnósticos siempre AUTO | Backend | Alto |
| 7 | DELETE devices deja registros huérfanos | Backend | Alto |
| 8 | health/maintenance/phase_transition events sin consumers | Backend | Alto |
| 9 | bootTestPassed/bootTestFailReason descartados | Backend | Alto |
| 10 | control_eval forward pero sin consumidor frontend | Frontend | Alto |
| 11 | refreshFrequency preferencia guardada pero nunca usada | Frontend | Alto |
| 12 | Null telemetry se renderiza como 0 en charts | Frontend | Medio |
| 13 | Stale telemetry persiste sin indicador | Frontend | Medio |
| 14 | Rangos de sensores hardcodeados | Frontend | Medio |
| 15 | Versiones inconsistentes entre componentes | Frontend | Medio |
| 16 | Datos de suscripción hardcodeados | Frontend | Medio |
| 17 | Telegram config errores silenciados | Frontend | Medio |
| 18 | TEMP_CRITICAL/TEMP_RECOVERY no configurables | Backend | Medio |
| 19 | Logging DB siempre deshabilitado | Backend | Medio |
| 20 | Encription key deriva de JWT_SECRET | Backend | Medio |
| 21 | phaseEvaluator sensorHistory en memoria | Backend | Medio |
| 22 | Texto decorativo falso en Login | Frontend | Bajo |
| 23 | Datos seed con credenciales de prueba | Backend | Bajo |
| 24 | Broker MQTT público por defecto | Backend | Bajo |
| 25 | JWT_SECRET fallback predecible | Backend | Bajo |
| 26 | Secuencia de fases duplicada en 4 archivos | Backend | Bajo |
| 27 | actuatorState en memoria se pierde en reinicio | Backend | Bajo |
| 28 | Endpoint de migración expuesto vía HTTP | Backend | Bajo |

### Riesgos encontrados
- **R1**: Cambio de timestamps requiere que todos los dispositivos se actualicen simultáneamente
  - Mitigación: el backend acepta ambos formatos temporalmente con detección de rango
- **R2**: Agregar columnas a ENUM existente puede fallar en某些 PostgreSQL versions
  - Mitigación: usar ALTER TYPE ... ADD VALUE IF NOT EXISTS

---

## Resumen de milestones

| Milestone | Fase | Fecha | Entregables | Estado |
|-----------|------|-------|-------------|--------|
| M0 | 0. Contratos | 2026-05-15 | 11 documentos | ✅ |
| M1 | 1. Telemetría | 2026-05-22 | Sensor → Dashboard | ✅ |
| M2 | 2. Control | 2026-05-28 | Dashboard → SSR | ✅ |
| M3 | 3. Sensores | 2026-06-04 | ENS160 + Recetas | ✅ |
| M4 | 4. Automatización | 2026-06-09 | Ciclos + Alarmas | ✅ |
| M5 | 5. Hardening | 2026-06-11 | Seguridad + Tests | ✅ |
| M6 | 6. Multiusuario | 2026-06-12 | Tenencia | ✅ |
| M7 | 7. Producción | 2026-06-13 | OTA + CI/CD + Docs | ✅ |
| **M7e** | **7e. Estabilización** | **2026-07-15** | **Integridad funcional** | ✅ |
| **M8** | **8. Multi-Cámara** | **2026-06-24** | **N nodos simultáneos** | ✅ |
| **M9** | **9. Refundación Domain-First** | **En curso** | **Reescritura backend** | 🔄 |
| **M10** | **10. MQTT Propio + TLS** | **Planificado** | **Broker propio + cifrado** | 🔲 |

---

## Cómo usar este documento para planificar

1. **Nuevo feature** → ¿Encaja en M8, M9, M10 o requiere nuevo milestone?
2. **Nuevo issue en GitHub** → Linkear al milestone correspondiente
3. **Milestone completado** → Verificar criterios de aceptación; mover a "completado"; actualizar `roadmap.md`
4. **Retrabajo** → Si un milestone completado falla en producción, se crea un milestone de hotfix (ej: M7.1 — Hotfix OTA)

---
