# Roadmap — Mush2

> Actualizado: 2026-06-24 — Mush2 v0.8.0 — Fase 8 completada, Fases 0-7 completadas, Fases 9-18 planificadas

El orden de las fases minimiza retrabajo: primero se fijan contratos, luego se construyen slices verticales completos, después se endurece y finalmente se industrializa. Las fases 8+ siguen la misma filosofía: cada fase desbloquea la siguiente y entrega valor vertical completo.

---

## FASE 0 — Definición y Contratos (COMPLETADA ✅)

- [x] `docs/protocol/protocol-v1.md` — Contrato MQTT: tópicos, payloads, QoS
- [x] `docs/contracts/mqtt-contract.md` — Responsabilidades MQTT
- [x] `docs/contracts/api-contract.md` — Endpoints REST
- [x] `docs/architecture/architecture.md` — Arquitectura general
- [x] `docs/architecture/backend.md` — Estructura backend
- [x] `docs/architecture/frontend.md` — Árbol React, routing, SSE
- [x] `docs/architecture/firmware.md` — Módulos, pinout, state machine
- [x] `docs/database.md` — Esquema DB
- [x] `docs/requirements.md` — Requerimientos
- [x] `docs/ADR/ADR-001-thingspeak.md` — ThingSpeak como respaldo
- [x] `docs/governance/versioning.md` — SemVer por componente

---

## FASE 1 — Cadena de Telemetría (COMPLETADA ✅)

```
[Sensor] → [Firmware] → MQTT → [Backend] → REST → [Frontend]
```

- [x] Firmware: WiFi, AHT21, MQTT publisher, config.h generado
- [x] Backend: Express 5 + Sequelize + PostgreSQL, suscripción MQTT, endpoints telemetría
- [x] Frontend: Vite + React Router, Dashboard con MetricCard
- [x] Protocolo MQTT v1.0.0 validado extremo a extremo

---

## FASE 2 — Bucle de Control (COMPLETADA ✅)

```
[SSR] ← [Firmware] ← MQTT ← [Backend] ← REST ← [Frontend]
```

- [x] Firmware: SSR 3 canales, suscripción comandos MQTT, ACK
- [x] Backend: modelo Actuator, PATCH actuator, publishCommand, SSE
- [x] Frontend: DeviceDetail con ActuatorControl, useSSE hook

---

## FASE 3 — Sensores Avanzados (COMPLETADA ✅)

- [x] Firmware: ENS160 (CO2/VOC/AQI) en bus I2C compartido
- [x] Backend: ThingSpeak sync, modelos Recipe/CultivationCycle/CycleState
- [x] Seed: receta Melena de León

---

## FASE 4 — Automatización (COMPLETADA ✅)

- [x] Firmware: histéresis T/H/CO2, modos LOCAL/REMOTE/OFF, alarmas
- [x] Backend: controlEngine.js, transición automática de fases, snapshots
- [x] Frontend: página Ciclos, panel de alarmas en Dashboard

---

## FASE 5 — Hardening (COMPLETADA ✅)

- [x] Firmware: state machine (8 estados), watchdog HW+SW, EEPROM, MQTT backoff + LWT
- [x] Backend: JWT auth + RBAC, rate limiting, Helmet CSP, audit logging, tests
- [x] Frontend: ErrorBoundary, Skeleton, AuthContext, responsive

---

## FASE 6 — Multiusuario (COMPLETADA ✅)

- [x] Backend: tenant middleware, UserChamberAccess, checkDeviceAccess
- [x] Frontend: login/logout, axios interceptors, rutas protegidas

---

## FASE 7 — Producción (COMPLETADA ✅)

- [x] Firmware: OTA (ArduinoOTA + HTTP Update vía MQTT)
- [x] Backend: metrics endpoint, health checks, backup script
- [x] CI/CD: GitHub Actions (firmware + backend + frontend)
- [x] Documentación: manual de usuario

---

## FASE 8 — Multi-Cámara Física

**Objetivo**: Escalar de un nodo de prueba a N cámaras físicas simultáneas con firmware idéntico, cada una con receta independiente. El sistema descubre, registra y opera múltiples dispositivos sin intervención manual.

**Skills**: `embedded-systems`, `iot-firmware`, `backend-engineer`

```
[Cámara A: Melena de León] ──► MQTT ──► Backend ──► Dashboard multi-cámara
[Cámara B: Shiitake       ] ──► MQTT ──┘
[Cámara C: Reishi         ] ──► MQTT ──┘
```

### Entregables
- [ ] Firmware: `deviceId` dinámico derivado de MAC address, grabado en EEPROM al primer boot
- [ ] Firmware: todos los mensajes MQTT usan el deviceId real (no hardcoded)
- [ ] Firmware: cada nodo filtra comandos por su propio deviceId (ignora ajenos)
- [ ] Backend: auto-registro de nodos al recibir primer mensaje (findOrCreate por deviceId)
- [ ] Backend: modelo `Chamber` completado con campos faltantes (`thingSpeakChannelId`, `thingSpeakReadKey`)
- [ ] Backend: queries de telemetría optimizadas con índices compuestos por deviceId + timestamp
- [ ] Backend: load testing con 3-5 nodos simulados publicando cada 10s
- [ ] Frontend: vista multi-cámara con selector de dispositivo
- [ ] Frontend: Dashboard con métrica agregada (promedio de T°/HR entre cámaras activas)
- [ ] Frontend: `TemporalEngine` (port de `exWeb`) para agregación multi-resolución en charts
- [ ] Docs: `docs/architecture/multi-chamber.md` — Arquitectura multi-cámara

### Criterios de aceptación
- [ ] 3 nodos físicos funcionando 48h continuas sin mensajes cruzados entre cámaras
- [ ] Un nodo nuevo se registra automáticamente al enviar su primer mensaje de telemetría
- [ ] El dashboard cambia de cámara A a cámara B en < 1s
- [ ] Un comando enviado a cámara A no afecta los relés de cámara B
- [ ] Si un nodo se desconecta, los otros 2 siguen operando sin degradación

**Referencias**: `docs/roadmap/milestone.md` M8, `docs/protocol/protocol-v1.md`, `backend/src/services/mqttService.js`, `.example/exWeb/assets/js/temporal-engine.js`

---

## FASE 9 — Infraestructura MQTT Propia + TLS

**Objetivo**: Eliminar dependencia de brokers públicos (test.mosquitto.org, broker.hivemq.com). Comunicación cifrada entre firmware y backend con control total sobre disponibilidad y tópicos. Ataca directamente el problema de fiabilidad de actuadores.

**Skills**: `devops-engineer`, `mqtt-development`, `backend-engineer`

### Entregables
- [ ] Infraestructura: Mosquitto en contenedor Docker con persistencia en disco
- [ ] Infraestructura: certificados TLS (Let's Encrypt o autofirmados) para MQTT
- [ ] Firmware: soporte TLS en ESP8266 vía `WiFiClientSecure` con huella SHA256
- [ ] Firmware: conexión a broker propio en puerto 8883 con validación de certificado
- [ ] Firmware: configuración dinámica de broker via MQTT (`mush2/cmd/{id}/config`)
- [ ] Backend: conexión MQTT con TLS al broker propio
- [ ] Backend: autenticación MQTT por usuario/contraseña (no anónimo)
- [ ] Backend: script `deploy-broker.sh` para levantar Mosquitto en VPS/VM
- [ ] Protocolo: `docs/protocol/protocol-v2.md` con TLS como requisito recomendado
- [ ] ADR: redactar ADR-009 (Broker MQTT propio como reemplazo de brokers públicos)

### Criterios de aceptación
- [ ] Wireshark no muestra datos en texto plano entre ESP8266 y broker
- [ ] El broker propio tiene uptime >99% en una semana de prueba
- [ ] La migración de broker público a propio se hace con un cambio de config, sin recompilar firmware
- [ ] El broker maneja 10+ conexiones simultáneas sin degradación de throughput

**Referencias**: `docs/ADR/ADR-008-MQTT-QoS1.md`, `docs/roadmap/milestone.md` M9, `firmware/src/mqtt_handler.cpp`, `backend/src/services/mqttService.js`

---

## FASE 10 — Observabilidad, Alertas y Notificaciones

**Objetivo**: Visibilidad completa del sistema en producción. Logs estructurados, métricas en tiempo real, alertas proactivas y canales de notificación (email/push). Sin esto, diagnosticar fallos como actuadores sin respuesta es depender del serial del ESP8266.

**Skills**: `observability-engineer`, `backend-engineer`, `technical-writer`

### Entregables
- [ ] Backend: logging estructurado con Pino o Winston (reemplazar `console.log` disperso)
- [ ] Backend: endpoint `GET /monitoring/logs` con filtros por nivel/componente
- [ ] Backend: dashboard de salud del sistema (DB, MQTT, nodos conectados, tasa mensajes)
- [ ] Backend: notificaciones por email (alarmas CRITICAL + WARNING) vía nodemailer
- [ ] Backend: sistema de reglas de alerta configurables desde frontend
- [ ] Backend: health check para cada nodo (última telemetría, estado MQTT, watchdog)
- [ ] Firmware: reporte estructurado de estado en cada telemetría (heap libre, RSSI, uptime, reboots)
- [ ] Firmware: watchdog mejorado con reporte de causa de reinicio en EEPROM
- [ ] Firmware: ADR-0xx-Mecanismo-Fail-Safe-Overheat redactado e implementado
- [ ] Frontend: página `/monitoring` con estado de salud del sistema
- [ ] Frontend: panel de notificaciones con historial
- [ ] Frontend: configuración de umbrales de alerta por dispositivo
- [ ] Docs: `docs/operations/monitoring.md` — Guía de monitoreo y alertas

### Criterios de aceptación
- [ ] Una alarma CRITICAL se notifica por email en < 60s
- [ ] El panel de salud muestra el estado de todos los nodos en < 2s
- [ ] Un operador puede ver el log filtrado por "error" de las últimas 24h
- [ ] El firmware reporta heap libre y causa del último reinicio en cada telemetría
- [ ] El fail-safe por sobrecalentamiento apaga todos los SSR si T° > umbral crítico

**Referencias**: `docs/ADR/ADR-006-Logs-Monitoreo-estrategia.md`, `docs/ADR/ADR-010-Mecanismo-Fail-Safe-Overheat.md`, `docs/roadmap/milestone.md` M10, `.example/Hidroponic-INO/Arduino/SlaveMonitor/Storage.h`, `.agents/skills/observability-engineer`

---

## FASE 11 — Biblioteca de Especies y Recetas

**Objetivo**: Poblar el sistema con las 7 especies de hongos adaptógenos como datos de producción (no seeders desechables). Cada especie tiene perfil biológico, compuestos bioactivos documentados y al menos una receta validada con parámetros reales de bibliografía micológica.

**Skills**: `backend-engineer`, `technical-writer`

### Entregables
- [ ] Base de datos: modelo `SpeciesProfile` con campos completos (nombre científico, clase adaptógena, clima de origen, dificultad, compuestos bioactivos, notas de cultivo)
- [ ] Base de datos: migración de datos del seeder extendido a producción
- [ ] Base de datos: relación `Recipe.belongsTo(SpeciesProfile)` para herencia de parámetros
- [ ] Backend: endpoint `GET /api/species` con filtros por `adapterClass`, `originClimate`, `difficultyLevel`
- [ ] Backend: endpoint `GET /api/species/:id/recipes` que devuelve recetas asociadas
- [ ] Backend: endpoint `POST /api/recipes/:id/deprecate` para ciclo de vida de recetas
- [ ] Backend: seeders de producción con las 7 especies (Melena de León, Reishi, Shiitake, Cordyceps, Turkey Tail, Pleurotus Ostreatus, Pleurotus Djamor)
- [ ] Frontend: página "Biblioteca de Especies" con fichas visuales de cada hongo
- [ ] Frontend: página "Explorar Recetas" con filtros por especie, dificultad, tipo
- [ ] Frontend: comparador de recetas lado a lado (parámetros ambientales y perfil bioactivo)

### Criterios de aceptación
- [ ] Las 7 especies existen como datos de migración (no seeders volátiles)
- [ ] Un operador puede ver la ficha de Reishi y entender que requiere CO₂ <700ppm para formar concha
- [ ] El comparador de recetas muestra diferencias en FAE, temperatura de fructificación y perfil bioactivo
- [ ] Una receta nueva hereda automáticamente los parámetros de su especie base

**Referencias**: `.example/seed.extended.js` (modelo completo de SpeciesProfile), `docs/roadmap/milestone.md` M10, `backend/src/models/Recipe.js`, `.agents/skills/backend-engineer`

---

## FASE 12 — Automatización Adaptativa por Fase

**Objetivo**: Refinar el `controlEngine.js` para que las transiciones de fase no sean solo por tiempo sino por condiciones observadas por los sensores. El sistema decide cuándo pasar de INCUBATION a PRIMORDIA basándose en datos reales: caída de CO₂, estabilización de humedad, cumplimiento de shock térmico.

**Skills**: `state-machine-design`, `backend-engineer`, `embedded-systems`

### Entregables
- [ ] Backend: `PhaseTransitionEvaluator` que decide cambio de fase por condiciones de sensores
- [ ] Backend: reglas de transición específicas por especie (configurables en `SpeciesProfile`):
  - Shiitake: cold shock (ΔT -8°C por 48h) → PRIMORDIA
  - Reishi: CO₂ <700ppm sostenido 24h → FRUITING
  - Cordyceps: 12h/12h luz/oscuridad cumplido 5 días → STROMA_INITIATION
- [ ] Backend: bitácora de transiciones con trazabilidad de qué condición disparó el cambio
- [ ] Backend: modo "semi-automático" donde el sistema sugiere la transición y un operador la aprueba
- [ ] Backend: control de histéresis mejorado (ancho de banda configurable por canal, no global)
- [ ] Firmware: soporte para recepción de setpoints dinámicos por canal (no solo globales)
- [ ] ADR: redactar ADR-0xx-Automatizacion-por-Etapas-Recipes.md
- [ ] ADR: redactar ADR-0xx-Estrategia-Control-Histeresis-Fuzzy.md
- [ ] Frontend: notificación cuando el sistema propone un cambio de fase
- [ ] Frontend: timeline del ciclo con anotaciones de eventos (shock térmico, primera cosecha)
- [ ] Frontend: botón "Aprobar transición" en modo semi-automático

### Criterios de aceptación
- [ ] Un ciclo de Shiitake pasa a PRIMORDIA automáticamente tras 48h de T° <16°C
- [ ] El operador recibe una notificación "El sistema recomienda iniciar fructificación de Reishi"
- [ ] La bitácora muestra: "2026-07-20 14:30 — CO₂ <700ppm por 24h consecutivas → Transición a FRUITING"
- [ ] El operador puede ajustar la histéresis de temperatura de ±0.5°C a ±1.0°C desde el frontend

**Referencias**: `docs/ADR/ADR-011-Automatizacion-por-Etapas-Recipes.md`, `docs/ADR/ADR-009-Estrategia-Control-Histeresis-Fuzzy.md`, `backend/src/services/controlEngine.js`, `firmware/src/hysteresis_controller.cpp`, `.agents/skills/state-machine-design`, `.example/seed.extended.js`

---

## FASE 13 — Trazabilidad de Compuestos Bioactivos

**Objetivo**: Registrar condiciones ambientales durante todo el ciclo para correlacionarlas con la concentración de compuestos bioactivos. El sistema no solo cultiva hongos: demuestra que los beta-glucanos, triterpenos y erinacinas están en su punto óptimo. **Este es el diferenciador competitivo del proyecto.**

**Skills**: `backend-engineer`, `technical-writer`, `product-manager-toolkit`

### Entregables
- [ ] Base de datos: modelo `BioactiveProfile` vinculado a `CultivationCycle`
- [ ] Base de datos: campos por compuesto bioactivo relevante:
  - `betaGlucans_mg_g` (común a todas las especies)
  - `triterpenoids_mg_g` (Reishi)
  - `erinacines_mg_g` (Melena de León)
  - `cordycepin_mg_g` (Cordyceps)
  - `PSK_PSP_mg_g` (Turkey Tail)
  - `polysaccharides_mg_g` (común)
- [ ] Base de datos: relación con `Telemetry` para correlación temporal
- [ ] Backend: endpoint `POST /api/cycles/:id/bioactives` para registrar análisis de laboratorio
- [ ] Backend: endpoint `GET /api/cycles/:id/bioactives/correlation` — correlación automática:
  "Los ciclos con CO₂ promedio <750ppm durante fructificación produjeron 23% más erinacinas"
- [ ] Backend: endpoint `GET /api/cycles/:id/environment-summary` — resumen ambiental exportable
- [ ] Frontend: dashboard de compuestos bioactivos por ciclo
- [ ] Frontend: gráfico de dispersión: variable ambiental (T°, HR, CO₂) vs concentración de compuesto
- [ ] Frontend: página de comparación entre ciclos de la misma especie
- [ ] Docs: `docs/user/bioactive-traceability.md` — Manual de trazabilidad

### Criterios de aceptación
- [ ] Un ciclo completado tiene asociado al menos un perfil de compuestos bioactivos
- [ ] El sistema muestra: "Tus 3 ciclos de Melena de León con mayor FAE produjeron más erinacinas"
- [ ] Un operador puede filtrar ciclos por concentración de compuesto (>30% beta-glucanos)
- [ ] Un investigador puede exportar los datos ambientales + bioactivos como CSV para análisis externo

**Referencias**: `.example/seed.extended.js` (bioactives por especie), `.agents/skills/product-manager-toolkit`, `.agents/skills/technical-writer`

---

## FASE 14 — Endurecimiento Continuo (Pruebas E2E + CI/CD + Calidad)

**Objetivo**: Llevar la calidad del sistema a nivel producción industrial. Pruebas end-to-end, CI/CD automatizado para firmware y frontend, resolución de deuda técnica documentada y actualización de los 3 ADRs pendientes.

**Skills**: `devops-engineer`, `test-driven-development`, `technical-writer`

### Entregables
- [ ] Backend: tests E2E con Playwright (flujo completo: login → ver dashboard → enviar comando → ver ACK)
- [ ] Backend: tests de integración MQTT con broker mock (node-mqtt-test o similar)
- [ ] Firmware: test de compilación automático en CI (PlatformIO check + build)
- [ ] Firmware: test de integración con QEMU o simulador ESP8266 (Wokwi)
- [ ] CI/CD: GitHub Actions para firmware con build + lint + test
- [ ] CI/CD: workflow de deploy continuo para backend
- [ ] CI/CD: workflow de build + deploy para frontend (Vite → GitHub Pages / S3)
- [ ] CI/CD: badge de cobertura de tests en README
- [ ] Base de datos: migración de tipos de ID (INTEGER → UUID) donde aplica
- [ ] Base de datos: estrategia de retención de telemetría (raw 30 días, agregados 1 año)
- [ ] ADR: completar y cerrar los 3 ADRs pendientes:
  - `ADR-0xx-Automatizacion-por-Etapas-Recipes.md` (contenido desde Fase 12)
  - `ADR-0xx-Estrategia-Control-Histeresis-Fuzzy.md` (contenido desde Fase 12)
  - `ADR-0xx-Mecanismo-Fail-Safe-Overheat.md` (contenido desde Fase 10)
- [ ] Docs: `docs/ADR/ADR-010-CI-CD-estrategia.md` — Estrategia de CI/CD y despliegue
- [ ] Docs: `docs/governance/testing-policy.md` — Política de testing por componente

### Criterios de aceptación
- [ ] El pipeline de CI reporta éxito/fallo en < 5 min para backend y frontend
- [ ] < 15 min para firmware (compilación lenta en ESP8266)
- [ ] El test E2E cubre el flujo crítico: login → ver dispositivos → enviar comando → confirmar ACK
- [ ] La cobertura de tests del backend supera 70%
- [ ] Los 3 ADRs pendientes están redactados y cerrados
- [ ] El README muestra badges de CI/CD y cobertura

**Referencias**: `.example/KanbanPro/tests/kanban-e2e.spec.js` (Playwright pattern), `.example/Hidroponic-PARCE/SECURITY_FINDINGS_2026-03-01.md` (hardening audit), `.agents/skills/devops-engineer`, `.agents/skills/test-driven-development`, `backend/__tests__/`

---

## FASE 15 — Gemelo Digital del Cultivo

**Objetivo**: Modelo predictivo que simula el ciclo de cultivo completo antes de inocular. Dada una especie, receta y condiciones iniciales, el gemelo digital predice curva de temperatura, CO₂, fechas estimadas de cada fase, y rendimiento esperado. Se recalibra con datos reales del ciclo en curso.

**Skills**: `backend-engineer`, `state-machine-design`, `product-manager-toolkit`

### Entregables
- [ ] Backend: `DigitalTwinEngine` que toma `SpeciesProfile` + `Recipe` + condiciones iniciales
- [ ] Backend: simulación acelerada (1h de simulación = 1 día de cultivo real)
- [ ] Backend: recalibración del gemelo con datos reales del ciclo en curso
- [ ] Frontend: interfaz de gemelo digital con slider de tiempo
- [ ] Frontend: comparación visual curva predicha vs curva real (desviación en %)
- [ ] Frontend: alerta si la desviación predicha vs real supera el umbral configurable

### Criterios de aceptación
- [ ] El gemelo predice la fecha de cosecha de un ciclo de Pleurotus con ±2 días de error
- [ ] Si la T° real se desvía >2°C del gemelo, se genera una alerta
- [ ] Un operador puede simular "¿qué pasa si reduzco el FAE a 8 min?" y ver el impacto en CO₂ y rendimiento

**Referencias**: `backend/src/services/controlEngine.js`, `.agents/skills/state-machine-design`

---

## FASE 16 — Marketplace de Recetas Comunitarias

**Objetivo**: Permitir que operadores compartan, califiquen y forkear recetas. Una receta validada por la comunidad con 50 ciclos exitosos tiene más peso que una receta teórica.

**Skills**: `backend-engineer`, `product-manager-toolkit`

### Entregables
- [ ] Backend: modelo `Recipe` con campos `authorId`, `isPublic`, `forkedFrom`, `rating`, `timesUsed`
- [ ] Backend: endpoint `POST /api/recipes/:id/fork` (crea copia editable)
- [ ] Backend: endpoint `POST /api/recipes/:id/rate` (1-5 estrellas)
- [ ] Backend: endpoint `GET /api/recipes/popular` (más usadas, mejor calificadas)
- [ ] Frontend: página "Explorar Recetas" con filtros y ranking
- [ ] Frontend: botón "Usar esta receta" que crea un nuevo `CultivationCycle`
- [ ] Frontend: perfil de receta con métricas: tasa de éxito, rendimiento promedio, ciclos completados

### Criterios de aceptación
- [ ] Un operador puede publicar su receta de Melena de León Low-CO₂ como pública
- [ ] Otro operador puede forkearla, ajustar el FAE, y usarla en su cámara
- [ ] La receta original muestra "Usada en 23 ciclos, rendimiento promedio 0.22 kg/bag"

**Referencias**: `backend/src/models/Recipe.js`, `.agents/skills/product-manager-toolkit`

---

## FASE 17 — Aplicación Móvil de Monitoreo

**Objetivo**: Notificaciones push de alarmas críticas y vista rápida del estado de cámaras desde el teléfono. No replica el dashboard completo: es una interfaz de monitoreo y respuesta rápida.

**Skills**: `backend-engineer`, `technical-writer`

### Entregables
- [ ] App: React Native o PWA con notificaciones push
- [ ] App: vista de "Todas las cámaras" con indicador de salud (verde/amarillo/rojo)
- [ ] App: pantalla de detalle de cámara con últimas 4 métricas
- [ ] App: botones de acción rápida: "Silenciar alarma", "Modo REMOTO", "Abrir dashboard web"
- [ ] Backend: integración con Firebase Cloud Messaging o servicio de push
- [ ] Backend: endpoint `PUT /api/users/:id/device-token` para registrar token de notificaciones

### Criterios de aceptación
- [ ] Una alarma CRITICAL por CO₂ >1400ppm genera notificación push en <30s
- [ ] La app muestra el estado de 3 cámaras en una sola pantalla sin scroll
- [ ] Tocar "Abrir dashboard" lleva al navegador del teléfono con la sesión iniciada

**Referencias**: `docs/user/manual.md`, `backend/src/middleware/auth.js`

---

## FASE 18 — Certificación y Trazabilidad Regulatoria

**Objetivo**: El sistema genera un certificado de trazabilidad por lote que documenta todas las condiciones ambientales del ciclo. Útil para certificación orgánica, exportación, o cumplimiento normativo de suplementos alimenticios.

**Skills**: `backend-engineer`, `technical-writer`, `product-manager-toolkit`

### Entregables
- [ ] Backend: modelo `BatchCertificate` vinculado a `CultivationCycle`
- [ ] Backend: generación de PDF con:
  - Especie, cepa, fecha de inoculación, fecha de cosecha
  - Gráfico de T°/Humedad/CO₂ durante todo el ciclo
  - Desviaciones respecto a la receta (con justificación)
  - Perfil de compuestos bioactivos (si aplica)
  - Firma digital del operador responsable
- [ ] Backend: endpoint `GET /api/cycles/:id/certificate` devuelve PDF
- [ ] Frontend: botón "Generar certificado" en página de ciclo completado
- [ ] Blockchain opcional: hash del certificado en smart contract para inmutabilidad

### Criterios de aceptación
- [ ] Un certificado PDF se genera en <10s para un ciclo de 45 días
- [ ] El PDF incluye firma digital con timestamp
- [ ] Un auditor puede verificar el hash del certificado contra blockchain (si aplica)
- [ ] El certificado cumple con requisitos de trazabilidad para exportación a UE

**Referencias**: `docs/roadmap/milestone.md`, `.agents/skills/product-manager-toolkit`

---

## Resumen ampliado

| Fase | Entrega | Dependencia | Skills | Estado |
|---|---|---|---|---|
| 0. Contratos | Documentación, contratos, arquitectura | — | `technical-writer` | ✅ |
| 1. Cadena Telemetría | Sensor → MQTT → Backend → DB → Frontend | Fase 0 | `embedded-systems`, `backend-engineer` | ✅ |
| 2. Bucle de Control | Frontend → API → MQTT → SSR → ACK | Fase 1 | `iot-firmware`, `backend-engineer` | ✅ |
| 3. Sensores Avanzados | ENS160, ThingSpeak, recetas | Fase 1 | `embedded-systems`, `backend-engineer` | ✅ |
| 4. Automatización | Reglas, ciclos, alarmas | Fases 2+3 | `state-machine-design`, `backend-engineer` | ✅ |
| 5. Hardening | Seguridad, errores, tests, watchdog | Fase 0-4 | `firebase-security-rules-auditor`, `backend-engineer` | ✅ |
| 6. Multiusuario | Múltiples usuarios, tenencia | Fase 5 | `backend-engineer`, `technical-writer` | ✅ |
| 7. Producción | OTA, CI/CD, monitoreo, docs | Fase 0-6 | `devops-engineer`, `iot-firmware`, `technical-writer` | ✅ |
| **8. Multi-Cámara** | N nodos simultáneos, dashboard multi-dispositivo | Fase 7 | `embedded-systems`, `iot-firmware`, `backend-engineer` | 🔲 |
| **9. MQTT Propio** | Broker propio + TLS, sin brokers públicos | Fase 8 | `devops-engineer`, `mqtt-development` | 🔲 |
| **10. Observabilidad** | Alertas, notificaciones, logs estructurados | Fase 9 | `observability-engineer`, `backend-engineer` | 🔲 |
| **11. Especies** | Biblioteca de especies, recetas de producción | Fase 8 | `backend-engineer`, `technical-writer` | 🔲 |
| **12. Automatización Adaptativa** | Transiciones por sensor, histéresis por canal | Fases 10+11 | `state-machine-design`, `backend-engineer`, `embedded-systems` | 🔲 |
| **13. Trazabilidad Bioactivos** | Correlación ambiente → compuestos | Fases 11+12 | `backend-engineer`, `product-manager-toolkit` | 🔲 |
| **14. Endurecimiento** | E2E, CI/CD completo, 3 ADRs pendientes | Fase 7-13 | `devops-engineer`, `test-driven-development` | 🔲 |
| **15. Gemelo Digital** | Simulación y predicción de ciclos | Fases 12+13 | `backend-engineer`, `state-machine-design` | 🔲 |
| **16. Marketplace** | Recetas comunitarias, forks, rating | Fase 11 | `backend-engineer`, `product-manager-toolkit` | 🔲 |
| **17. App Móvil** | Notificaciones push, monitoreo rápido | Fase 8 | `backend-engineer`, `technical-writer` | 🔲 |
| **18. Certificación** | Trazabilidad regulatoria, PDF, blockchain | Fase 13 | `backend-engineer`, `product-manager-toolkit` | 🔲 |
