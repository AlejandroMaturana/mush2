# Engineering Backlog — Mush2

**Fuente de verdad operacional para la gestión del trabajo técnico de Mush2 durante la etapa de madurez.**

- **Fecha:** 2026-08-07
- **Línea base:** rama `develop` @ `dcbc8fa` (release v1.8.4) · `main` @ `f0deed4` (v1.8.2)
- **Fuentes trazadas:**
  - **AUD-004** → `AUDITORIA-TECNICA-2026-08-07.md` (110 hallazgos)
  - **Roadmap-V2** → `ultimate-roadmap2.md` (Programas 1–11)
  - **Actual-ISSUE** → `Actual-ISSUE.md` (procedimiento de backlog)
  - **Fase 0** → `docs/project/baseline-snapshot-001.md`
  - **Fase 1** → `docs/project/phase-1-validation-matrix.md`
- **Orquestador:** `docs/project/engineering-execution-plan.md`
- **Decisiones:** `docs/project/architecture-decisions-pending.md` — registro central de la serie DECISION-NNN (estados: NONE/PENDING/ACCEPTED/REJECTED/SUPERSEDED).
- **DoR Ciclo 0:** `docs/project/dor-readiness-review.md` — auditoría de Definition of Ready de los 16 ISSUEs del primer ciclo de ejecución.
- **Restricciones:** solo lectura de código; sin features nuevas; sin borrar documentación; sin reemplazar ADRs existentes (supersesión explícita); sin refactors sin evidencia; la implementación prevalece sobre la documentación; trazabilidad completa; los ISSUEs del backlog existen como elementos del backlog, **no** como GitHub Issues hasta cumplir Definition of Ready.

---

## 0. Jerarquía definitiva

Nunca se omiten niveles.

```
Roadmap-V2
   ↓
Engineering Execution Plan
   ↓
Engineering Backlog (este documento)
   ↓
Program
   ↓
Epic
   ↓
Initiative
   ↓
Issue
   ↓
Task
   ↓
DDD / ADR / EDD / Contract
   ↓
Implementation
   ↓
Tests
   ↓
PR (a nivel Epic)
   ↓
Merge
```

**Trazabilidad:** cada Issue referencia su Hallazgo (AUD-004), Programa, Epic, Initiative, Capability, Contrato, ADR y DDD. Recorrible en ambos sentidos.

**Trazabilidad de decisión:** cada Issue lleva los campos `Decisión` (ID) y `Estado decisión`. `Decision ID` = DECISION-NNN asociada (o `NONE` si no aplica); `Decision Status` ∈ {NONE, PENDING, ACCEPTED, REJECTED, SUPERSEDED}. Un ISSUE con decisión `PENDING` no cumple el check DoR "No requiere decisión pendiente". Las resoluciones se registran en `docs/project/architecture-decisions-pending.md`.

---

## 1. Definición de Ready (DoR)

Un Issue puede pasar de `BACKLOG → READY` solo si cumple **todos**:

- [ ] Alcance definido (elimina exactamente un problema; sin mezclar dominios).
- [ ] Contrato(s) afectado(s) identificado(s) y versión correcta.
- [ ] ADR(s) afectado(s) evaluado(s) (nuevo ADR o supersesión si aplica).
- [ ] DDD(s) afectado(s) evaluado(s).
- [ ] Riesgos conocidos y documentados (incl. riesgo de tránsito).
- [ ] Estrategia de pruebas definida (tests que fallan primero, verde→rojo→verde).
- [ ] Archivos afectados listados.
- [ ] Dependencias satisfechas o plan de desbloqueo.
- [ ] No requiere decisión pendiente sin resolver (DECISION-NNN abierta).

## 2. Definición de Done (DoD)

Un Issue está `DONE` solo si cumple **todo** (extendido de `docs/governance/definition-of-done.md`):

- [ ] Implementación completa del alcance.
- [ ] Tests: Fix 80 % / Security 100 % de cobertura mínima en el cambio; test de regresión en el mismo PR para P0/P1.
- [ ] Documentación actualizada (backend.md/frontend.md/capability-matrix según aplique).
- [ ] Contratos actualizados y versionados (API/MQTT/BLE) si el contrato cambia.
- [ ] ADR actualizados vía supersesión (nunca edición directa de ADR existente).
- [ ] CHANGELOG del componente + raíz actualizados.
- [ ] CI exitoso (`pnpm test` en raíz, lint, build).
- [ ] Revisión completada (PR a nivel Epic, ver plan §10).
- [ ] Sin secretos nuevos en el árbol.

**Exención docs-only/config:** ISSUEs puramente documentales o de configuración no exigen tests de regresión, pero sí revisión y CI/build verdes.

---

## 3. Programas, Epics e Initiatives

### Programa 1 — Seguridad y Corrección de Producción (P0) 🔴

- **Objetivo:** cerrar todos los hallazgos que comprometen el despliegue productivo actual.
- **Alcance (incluye):** seed/sync productivos, authz, aprovisionamiento, observabilidad, broker MQTT, backups, secretos firmware, tokens de sesión, RBAC UI.
- **Alcance (no incluye):** features nuevas, rediseño visual, migración de infraestructura, tests ampliados (Programa 2).
- **Riesgos que elimina:** credenciales por defecto, endpoints anónimos, IDOR, secretos en repo/proceso, tráfico de control en claro, ausencia de DR.
- **Dependencias:** P2.1 (autorización negativa) acompaña en el mismo PR; P2.2 soporta contratos.
- **Exit Gate:** pentest/auto-revisión sobre el despliegue no encuentra: credenciales por defecto, endpoints sensibles anónimos, IDOR demostrable, secretos en repo/proceso, tráfico de control en claro.
- **Métricas:** 14 P0 cerrados (INF-001/002/009/006/011, BE-001…005, FW-001/002, FE-001/002); secretos en repo = 0; endpoints sensibles anónimos = 0; backups restaurables verificados.

#### Epic EPIC-BOOTSTRAP — Bootstrap productivo seguro
- **Descripción:** elimina seed/sync destructivos del arranque productivo y asegura la configuración.
- **Objetivo:** producción sin credenciales por defecto, sin `alter:true`, sin fixtures de test.
- **Prioridad:** P0 · **Complejidad:** Media · **Dependencias:** DECISION-004, DECISION-008.
- **DoD:** `Dockerfile` CMD sin seed/sync; `NODE_ENV` guard efectivo; validación fail-fast; test de regresión verde→rojo→verde.
- **Criterios de aceptación:** arranque productivo sin seed; catálogo idempotente separado; configuración inválida aborta antes de tocar la BD.

#### Epic EPIC-AUTHZ — Denegación por defecto y autenticación de flujos críticos
- **Descripción:** cierra la superficie crítica de autorización (lectura multi-tenant, actuadores, mutaciones).
- **Objetivo:** 401/403 por defecto; propiedad verificada en toda mutación.
- **Prioridad:** P0 · **Complejidad:** Alta · **Dependencias:** ninguna (autocontenido); acompaña a P2.1.
- **DoD:** suite de autorización negativa pasando en el mismo PR.
- **Criterios de aceptación:** anónimo no lee datos de ningún tenant; anónimo no actúa; no hay IDOR demostrable.

#### Epic EPIC-CREDENTIALS — Secretos y sesiones
- **Descripción:** elimina secretos del firmware/repo y protege el ciclo de vida de tokens.
- **Objetivo:** sin JWT en `localStorage`; credenciales firmware en NVS; tokens con revocación.
- **Prioridad:** P0 · **Complejidad:** Alta · **Dependencias:** DECISION-005, DECISION-007, DECISION-008.
- **DoD:** refresh en cookie httpOnly; access en memoria; `config.h` con placeholders.
- **Criterios de aceptación:** ningún JWT en `localStorage`; ningún secreto real en el árbol.

#### Epic EPIC-PROVISIONING — Aprovisionamiento seguro
- **Descripción:** asegura `/devices/register` y el provisioning MQTT.
- **Objetivo:** registro autenticado/acotado; recarga de ACL idempotente sin `docker restart`; credenciales fuera de argv.
- **Prioridad:** P0 · **Complejidad:** Alta · **Dependencias:** ADR-028, ADR-023; coordinar con EPIC-BROKER.
- **DoD:** sin llamador anónimo capaz de acuñar credenciales; sin credenciales en argv.
- **Criterios de aceptación:** un solo uso con rate limit y cuota; recarga en job en segundo plano.

#### Epic EPIC-OBSERVABILITY-SECURITY — Observabilidad protegida
- **Descripción:** protege `/monitoring` y los errores expuestos.
- **Objetivo:** solo `/health` público; logs/stream tras auth+ADMIN.
- **Prioridad:** P0 · **Complejidad:** Baja · **Dependencias:** RBAC funcional (middleware `rbac.js`).
- **DoD:** `/monitoring` requiere ADMIN; `err.message` no llega al cliente.
- **Criterios de aceptación:** llamada anónima a `/monitoring/*` → 401/403.

#### Epic EPIC-BROKER — Broker MQTT seguro
- **Descripción:** despliega el broker de producción con TLS y ACL correctas.
- **Objetivo:** telemetría/comandos/control engine operativos y cifrados.
- **Prioridad:** P0 · **Complejidad:** Alta · **Dependencias:** DECISION-006, INF-015, INF-022; EPIC-PROVISIONING.
- **DoD:** broker desplegado con 8883 TLS; ACL prod incluye `mush2/+/alarm`; 1883 no expuesto al host.
- **Criterios de aceptación:** `mqttBridge` conecta en prod; alarmas fluyen; conectividad sin TLS falla en prod.

#### Epic EPIC-BACKUP — Backups y DR
- **Descripción:** automatiza backups y documenta RPO/RTO real.
- **Objetivo:** pérdida de datos recuperable; RPO documentado cumplible.
- **Prioridad:** P0 · **Complejidad:** Media · **Dependencias:** INF-012 (plan).
- **DoD:** scheduler + rotación + verificación de restore real.
- **Criterios de aceptación:** restore probado desde backup real.

#### Epic EPIC-RBAC-UI — RBAC en frontend
- **Descripción:** aplica autorización por rol en la UI y corrige el registro.
- **Objetivo:** UI refleja permisos; role nunca proviene del cliente.
- **Prioridad:** P0 · **Complejidad:** Media · **Dependencias:** EPIC-CREDENTIALS (sesión estable).
- **DoD:** `RequireRole` activo; acciones administrativas ocultas por rol; registro con `[username,password]`.
- **Criterios de aceptación:** rol VIEWER no ve ni alcanza acciones admin.

#### Epic EPIC-TELEMETRY-CHANNEL — Canal de telemetría seguro
- **Descripción:** elimina la API key ThingSpeak en claro por HTTP.
- **Objetivo:** ThingSpeak por HTTPS con CA o consolidado por MQTT.
- **Prioridad:** P0 · **Complejidad:** Media · **Dependencias:** DECISION-007.
- **DoD:** sin clave en query string; `WiFiClientSecure` con CA (o canal MQTT).
- **Criterios de aceptación:** tráfico de telemetría cifrado.

#### Initiatives del Programa 1

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 1.1 | Bloquear seed en prod | `backend/src/seed.js`, `Dockerfile`, `env.js` | Catastrófico | 0.5 sprint | DECISION-008 |
| 1.2 | Migraciones versionadas | `sync-db.js`, `Dockerfile`, modelos | Alto | 1–2 sprints | DECISION-004, INF-011 (backup pre-deploy) |
| 1.3 | Denegación por defecto | `middlewares/tenant.js`, rutas | Alto | 1 sprint | — |
| 1.4 | Asegurar aprovisionamiento | `routes/api.js`, `mosquittoProvisioningService.js` | Alto | 1 sprint | ADR-028 |
| 1.5 | Proteger observabilidad | `routes/index.js`, `monitoring.js`, `app.js` | Medio | 0.5 sprint | RBAC |
| 1.6 | Desplegar broker + TLS | `render.yaml`, `mosquitto.prod.conf`, `acl.conf`, `env.js` | Alto | 1–2 sprints | DECISION-006, INF-015/022 |
| 1.7 | Backups automatizados | `scripts/backup-db.js`, Render cron | Alto | 0.5 sprint | INF-012 |
| 1.8 | Secretos firmware → NVS | `firmware/src/config.h`, `ota_handler.cpp`, NVS | Alto | 1 sprint | FW-003 (OTA TLS) |
| 1.9 | ThingSpeak seguro | `thingspeak_client.cpp` | Medio | 0.5 sprint | DECISION-007 |
| 1.10 | Tokens de sesión seguros | FE auth providers + backend `/auth` | Alto | 1–2 sprints | DECISION-005, BE-017 |
| 1.11 | RBAC en UI | `routes.jsx`, `App.jsx`, `RequireRole` | Medio | 1 sprint | EPIC-CREDENTIALS |

---

### Programa 2 — Testing y Quality Gates 🟠

- **Objetivo:** que el CI demuestre la seguridad e integridad que el Programa 1 implementa (TDD como ley de hierro).
- **Alcance (incluye):** autorización negativa, conformidad de contratos, cobertura runtime backend, tests nativos firmware, frontend, gates CI, integración de cascadas.
- **Alcance (no incluye):** implementación de features (es red de seguridad).
- **Riesgos que elimina:** tests que validan forma y no autorización; cobertura falsa; gates inexistentes.
- **Dependencias:** P1.3 para autorización negativa en verde (TDD: red + fix en el mismo PR).
- **Exit Gate:** `pnpm test` en raíz corre todas las suites; todo fix P0 del Programa 1 llega con su test de regresión en el mismo PR.
- **Métricas:** suites en CI = 100 %; autorización negativa presente y verde; frontend vitest en CI; `pnpm audit` 0 high.

#### Epic EPIC-AUTHZ-NEGATIVE — Suite de autorización negativa
- **Prioridad:** P0 · **Complejidad:** Media · **Dependencias:** P1.3 (mismo PR).
- **DoD:** matriz de roles (anónimo/VIEWER/OPERATOR/ADMIN) sobre endpoints mutantes y de lectura, en verde.
- **Criterios de aceptación:** cualquier permiso indebido hace fallar el test.

#### Epic EPIC-CONTRACTS — Conformidad de contratos ampliada
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** P3.4 (canonización).
- **DoD:** filtros `deviceId`, tipos, errores MQTT, SSE cubiertos.

#### Epic EPIC-RUNTIME-COVERAGE — Cobertura de la ruta runtime backend
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** P3.3 (alcance DDD).
- **DoD:** controlEngine.js, mqttBridge.js, encryption.js, eventBus.js, provisioning, jobs con cobertura ≥ objetivo.

#### Epic EPIC-FW-NATIVE — Tests nativos de firmware
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** P6.7 (habilitar suite).
- **DoD:** state_machine, hysteresis, ota_decisor/executor, mqtt parseo, telemetry_buffer ≥60 %.

#### Epic EPIC-FE-TESTS — Tests frontend
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** EPIC-CREDENTIALS (migración tokens).
- **DoD:** tests de auth/refresh/SSE (mock EventSource); tests que codificaban el patrón inseguro corregidos.

#### Epic EPIC-CI-GATES — Gates en CI
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** INF-007, INF-021, INF-017.
- **DoD:** script `test` en raíz; frontend vitest en CI; `pnpm audit`; coverage gates por módulo crítico.

#### Epic EPIC-INTEGRATION-TESTS — Integración de cascadas y retención
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** P4.1 (cascada), P4.2 (watchdog), P4.3 (retención).
- **DoD:** tests de device delete, retención por dispositivo, transiciones offline.

#### Initiatives del Programa 2

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 2.1 | Autorización negativa | tests de conformidad, rutas | Alto | 1 sprint | P1.3 |
| 2.2 | Conformidad de contratos | conformance tests, schemas | Medio | 1 sprint | P3.4 |
| 2.3 | Cobertura runtime backend | tests DDD/Jest | Medio | 1–2 sprints | P3.3 |
| 2.4 | Tests nativos firmware | Unity tests | Medio | 1–2 sprints | P6.7 |
| 2.5 | Tests frontend | vitest frontend | Medio | 1 sprint | EPIC-CREDENTIALS |
| 2.6 | Gates CI | root scripts, ci.yml | Bajo | 0.5–1 sprint | — |
| 2.7 | Integración cascadas/retención/offline | integration tests | Medio | 1 sprint | P4.1/4.2/4.3 |

---

### Programa 3 — Arquitectura y Contratos 🟠

- **Objetivo:** resolver la brecha entre ADR/DDD/contratos y la implementación real.
- **Alcance (incluye):** Run vs CultivationCycle, HistoryService, cableado DDD, canonización de contratos, limpieza de routers, Capability Matrix, roadmap fuente única.
- **Alcance (no incluye):** rediseño de funcionalidad.
- **Riesgos que elimina:** ADR aceptados sin implementar; contratos falsos; matrices stale; doble fuente de roadmap.
- **Dependencias:** P1.2 (migraciones) para cambios de modelo; P2 (tests) para validar conformidad.
- **Exit Gate:** ningún ADR "Aceptado" sin implementación o nota de supersesión; la matriz y los contratos reflejan el repositorio.
- **Métricas:** ADR con implementación/nota = 100 %; contratos sincronizados con rutas = 100 %; rutas frontend de la matriz correctas.

#### Epic EPIC-ADR-COMPLIANCE — Cumplimiento de ADR
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** DECISION-002, DECISION-003.
- **DoD:** ADR-020/021/022 con nota de supersesión o implementación verificable.

#### Epic EPIC-CONTRACTS-CANON — Contratos canónicos
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** — 
- **DoD:** usage endpoint, SSE URL, `macAddress`, error MQTT, roles/planes enum unificados en una sola fuente.

#### Epic EPIC-MATRIX — Capability Matrix regenerada
- **Prioridad:** P2 · **Complejidad:** Baja · **Dependencias:** árbol de rutas real.
- **DoD:** matriz refleja rutas y cobertura reales.

#### Initiatives del Programa 3

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 3.1 | Decidir Run vs CultivationCycle | ADR-020, `models/CultivationCycle.js`, rutas `cycles` | Alto | 0.5 sprint | DECISION-002 |
| 3.2 | HistoryService | ADR-022 | Medio | 0.5 sprint | DECISION-003 |
| 3.3 | Cablear DDD o declarar alcance | `src/application`, `control-engine`, `services/controlEngine.js` | Medio | 1–2 sprints | — |
| 3.4 | Canonizar contratos | `api-contract.md`, `backend.md`, `frontend.md` | Medio | 1 sprint | — |
| 3.5 | Contratos para todo | contracts nuevos | Medio | Fase 3 | evidencias reales (hallazgos) |
| 3.6 | Limpieza de routers/alias | `routes/index.js`, `models/index.js` | Bajo | 0.5 sprint | contract drift limpio |
| 3.7 | Regenerar Capability Matrix | `capability-matrix.md` | Bajo | 0.5 sprint | — |
| 3.8 | Fuente única de roadmap | `roadmap.md`, `milestone.md` | Bajo | 0.5 sprint | DECISION-010 |

---

### Programa 4 — Backend: Integridad y Resiliencia 🟠

- **Objetivo:** integridad de datos, resiliencia y robustez del backend.
- **Alcance (incluye):** cascadas transaccionales, watchdog offline, entitlement/cuotas, secretos backend, realtime seguro, rendimiento, validación de entrada.
- **Riesgos que elimina:** huérfanos, transiciones offline no detectadas, bypass de billing, secretos en claro, WS sin auth, N+1, mass assignment.
- **Dependencias:** P1.2 (migraciones) para P4.1/P9.1; P3.4 (contratos) para P4.5.
- **Exit Gate:** mutaciones con propiedad verificada; cascadas transaccionales; sin secretos en claro.
- **Métricas:** cascada delete probada; watchdog cableado; cuotas monótonas; secretos cifrados; WS autenticado.

#### Epic EPIC-DATA-INTEGRITY — Integridad de datos
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** P1.2 (migraciones).
- **DoD:** `DELETE /devices/:id` transaccional con cascada + test de integración.

#### Epic EPIC-DEVICE-HEALTH — Watchdog offline
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** BE-028.
- **DoD:** `offlineWatchdog` cableado al scheduler con guard de solapamiento y eventos offline.

#### Epic EPIC-ENTITLEMENT — Entitlement y cuotas
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** ADR-016.
- **DoD:** cuotas monótonas; upgrades con flujo billing/entitlement; retención por dispositivo.

#### Epic EPIC-SECRETS — Gestión de secretos backend
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** DECISION sobre `DATA_ENC_KEY`.
- **DoD:** token Telegram cifrado y enmascarado; `DATA_ENC_KEY` dedicada; fallos de descifrado logueados.

#### Epic EPIC-REALTIME — Realtime seguro
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** P3.4, P1.6.
- **DoD:** WS `/ws` autenticado; unificado con SSE autenticado.

#### Epic EPIC-PERF — Rendimiento backend
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** P1.2.
- **DoD:** `limit` acotado; sin N+1; índices; last-used throttled; EventEmitter con manejo de error.

#### Epic EPIC-INPUT-VALIDATION — Validación de entrada
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** BE-005.
- **DoD:** whitelist/DTO en recetas/especies; dedup ThingSpeak; límite de `sensorHistory`.

#### Initiatives del Programa 4

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 4.1 | Cascada transaccional | `routes/api.js`, modelos, migración | Alto | 1 sprint | P1.2 |
| 4.2 | Watchdog offline | `jobs/offlineWatchdog.js`, `server.js` | Medio | 1 sprint | — |
| 4.3 | Entitlement y cuotas | `models/Subscription.js`, `subscriptions.js` | Medio | 1–2 sprints | ADR-016 |
| 4.4 | Secretos backend | `telegramConfigurationService.js`, `encryption.js` | Medio | 1 sprint | — |
| 4.5 | Realtime seguro | `webSocketServer.js`, SSE | Alto | 1–2 sprints | P3.4, P1.6 |
| 4.6 | Rendimiento | `api.js`, `analytics.js`, `eventBus.js` | Medio | 1–2 sprints | P1.2 |
| 4.7 | Validación y dedup | `recipes.js`, `species.js`, `thingSpeakSync.js`, `phaseEvaluator.js` | Bajo | 1 sprint | BE-005 |

---

### Programa 5 — Frontend: Robustez y Accesibilidad 🟠

- **Objetivo:** frontend robusto, accesible y alineado a contratos.
- **Alcance (incluye):** SSE singleton, refresh single-flight, 404, lint/typecheck, diálogos accesibles, capa API, UX fixes, README.
- **Riesgos que elimina:** pérdida de telemetría, logouts aleatorios, rutas rotas, deuda de calidad, inaccesibilidad.
- **Dependencias:** P1.10 (sesión) para flujos auth; P4.5 (backend `/events` auth) para SSE.
- **Exit Gate:** SSE singleton autenticado; RBAC UI; 404 real; lint/typecheck en CI.
- **Métricas:** EventSource = 1 por pestaña; 0 llamadas raw a client; a11y diálogos; CI con lint/typecheck.

#### Epic EPIC-SSE — SSE singleton
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** backend `/events` autenticado (P4.5/P3.4).
- **DoD:** singleton con backoff/heartbeat/`Last-Event-ID`; sin polling duplicado.

#### Epic EPIC-AUTH-FLOW — Flujo de autenticación robusto
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** EPIC-CREDENTIALS.
- **DoD:** refresh single-flight; logout controlado.

#### Epic EPIC-A11Y — Accesibilidad
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** diálogo accesible único; ToggleSwitch como `button role="switch"`; focus trap.

#### Epic EPIC-QUALITY — Calidad frontend
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** lint + typecheck en CI; capa API centralizada; toaster de errores; código muerto eliminado.

#### Epic EPIC-README — Documentación frontend
- **Prioridad:** P2 · **Complejidad:** Baja · **Dependencias:** —
- **DoD:** README al estado real.

#### Initiatives del Programa 5

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 5.1 | SSE singleton | `useSSE.js` | Medio | 1 sprint | P4.5/P3.4 |
| 5.2 | Refresh single-flight | `axiosInstance.js` | Medio | 0.5 sprint | — |
| 5.3 | 404 real | `routes.jsx` | Bajo | 0.5 sprint | — |
| 5.4 | Lint + typecheck | eslint config, CI | Bajo | 1 sprint | — |
| 5.5 | Diálogo accesible + limpieza | `Modal.jsx`, componentes muertos | Bajo | 1 sprint | — |
| 5.6 | Capa API + toaster | feature API modules | Medio | 1–2 sprints | — |
| 5.7 | UX/visual fixes | gráficos, tema, proxy, manifest | Bajo | 1 sprint | — |
| 5.8 | README frontend | `frontend/README.md` | Bajo | 0.5 sprint | — |

---

### Programa 6 — Firmware: Seguridad, Watchdog y Concurrencia 🟠

- **Objetivo:** firmware seguro, con watchdog real y sin condiciones de carrera.
- **Alcance (incluye):** OTA TLS+hash, gate de estados, watchdog 9 tasks, mutex, reboot count, confirmación OTA, tests nativos.
- **Riesgos que elimina:** MITM OTA, actuadores activos en SAFE/OTA, cuelgues no detectados, corrupción por concurrencia, modo seguro permanente.
- **Dependencias:** P6.7 (tests nativos) precede a P6.1–6.6; EPIC-CREDENTIALS (P1.8) para secretos.
- **Exit Gate:** OTA TLS+hash; SSR gate por estado; watchdog 9 tasks; mutex; tests nativos ≥60 % en módulos críticos.
- **Métricas:** módulos críticos con tests ≥60 %; tasks con watchdog = 9; mutex por recurso; reboot count reseteado.

#### Epic EPIC-OTA-SECURITY — OTA segura
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** FW-001, ADR-014.
- **DoD:** `WiFiClientSecure` + CA/host pinning; SHA-256 obligatorio en `ota/command`.

#### Epic EPIC-SAFETY — Safety de actuadores
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** SSR apagado en `ST_SAFE`/`ST_OTA_UPDATING`; safe shutdown real.

#### Epic EPIC-WATCHDOG — Watchdog de 9 tasks
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** FW-008.
- **DoD:** TWDT/HealthMonitor cubre tasks críticos; ADR-027 alineado.

#### Epic EPIC-CONCURRENCY — Mutex
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** FW-006.
- **DoD:** mutex en MQTT publish, I2C, SPIFFS.

#### Epic EPIC-NATIVE-TESTS — Suite nativa habilitada
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** runner Unity integrado al CI; tests de state_machine/hysteresis/ota/mqtt.

#### Initiatives del Programa 6

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 6.1 | OTA segura | `ota_executor.cpp`, `ota_decisor.cpp` | Alto | 1 sprint | FW-001, ADR-014 |
| 6.2 | Gate de estados SSR | `tasks.cpp`, `state_machine.cpp` | Alto | 0.5 sprint | — |
| 6.3 | Watchdog 9 tasks | `main.ino`, `health_monitor.cpp` | Alto | 1 sprint | — |
| 6.4 | Mutex | mqtt/i2c/spiffs | Alto | 1 sprint | — |
| 6.5 | Reboot count | `state_machine.cpp` | Medio | 0.5 sprint | — |
| 6.6 | Confirmación OTA | `main.ino`, rollback | Medio | 1 sprint | FW-004 |
| 6.7 | Tests nativos | Unity, CI | Medio | 1–2 sprints | — |

---

### Programa 7 — Observabilidad y Reliability 🟡

- **Objetivo:** observabilidad real y resiliencia a fallos.
- **Alcance (incluye):** healthchecks diferenciados, métricas, correlation ID, resiliencia degradada, EventEmitter robusto.
- **Riesgos que elimina:** arranque sin healthchecks, ciegos a degradación, eventos perdidos.
- **Dependencias:** P1.6 (broker) para resiliencia MQTT; P3.4 para contract de `/health`.
- **Exit Gate:** healthchecks diferenciados; métricas; correlation ID.
- **Métricas:** `/health`, `/ready`, `/live` responden; healthcheck en contenedor; correlation ID end-to-end.

#### Epic EPIC-HEALTH — Healthchecks
- **Prioridad:** P1 · **Complejidad:** Baja · **Dependencias:** INF-010.
- **DoD:** `/health`, `/ready`, `/live` diferenciados + HEALTHCHECK.

#### Epic EPIC-RESILIENCE — Resiliencia degradada
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** P1.6.
- **DoD:** degradación documentada y probada ante caídas de MQTT/DB/Telegram/OTA.

#### Epic EPIC-EVENTBUS — Event bus robusto
- **Prioridad:** P2 · **Complejidad:** Baja · **Dependencias:** ADR-017.
- **DoD:** handler global de error; jobs con `unref`.

#### Initiatives del Programa 7

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 7.1 | Healthchecks | Dockerfile, compose, `/health` | Bajo | 0.5 sprint | — |
| 7.2 | Métricas | metrics endpoint | Medio | Fase 3 | evidencias reales |
| 7.3 | Correlation ID | request→EventBus→MQTT→FW | Medio | Fase 3 | evidencias reales |
| 7.4 | Resiliencia a fallos | mqttBridge, controlEngine, OTA | Medio | 1–2 sprints | P1.6 |
| 7.5 | EventEmitter robusto | `eventBus.js`, jobs | Bajo | 0.5 sprint | ADR-017 |

> **Nota:** P7.2 y P7.3 no tienen hallazgos de AUD-004 concretos (referencian "Programa 3 previo"). No generan ISSUE en este backlog; se formalizan solo si aparece evidencia. Ver Fase 1 §7.

---

### Programa 8 — Infraestructura y Release Engineering 🟡

- **Objetivo:** releases trazables y despliegues reproducibles.
- **Alcance (incluye):** release train, deploy pipeline, unificación de versiones, provisioning MQTT en contenedor, toolchain pinneada, docs de despliegue.
- **Riesgos que elimina:** releases no trazables, despliegue manual, drift de versiones, builds no reproducibles.
- **Dependencias:** P1 (producción estable) para deploy seguro.
- **Exit Gate:** tags + merge a `main`; deploy automático; versiones unificadas.
- **Métricas:** HEAD con tag; `main` == release; deploy automático en push a `main`/tag; PG16/Node 22 en CI/Docker/docs.

#### Epic EPIC-RELEASE-TRAIN — Release train
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** INF-008, INF-023.
- **DoD:** tags retroactivos; merge a `main`; automatización con changesets.

#### Epic EPIC-DEPLOY — Deploy pipeline
- **Prioridad:** P1 · **Complejidad:** Alta · **Dependencias:** INF-003, INF-010.
- **DoD:** job de deploy (GHCR + Render hook) + verificación de salud.

#### Epic EPIC-ENV-CONSISTENCY — Consistencia de entorno
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** INF-004/005/014/020.
- **DoD:** PG16 y Node 22 en CI/Docker/docs; lockfile estricto; imágenes pinneadas.

#### Epic EPIC-PROVISIONING-CONTAINER — Provisioning MQTT en contenedor
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** P1.6, INF-015.
- **DoD:** provisioning por dispositivo funcional en la imagen prod.

#### Epic EPIC-FW-TOOLCHAIN — Toolchain firmware pinneada
- **Prioridad:** P2 · **Complejidad:** Baja · **Dependencias:** —
- **DoD:** PlatformIO/python fijados en CI con cache.

#### Epic EPIC-DOCS-OPS — Documentación operacional
- **Prioridad:** P3 · **Complejidad:** Baja · **Dependencias:** —
- **DoD:** `deployment.md` y `version-manifest` correctos; artefactos VitePress limpiados.

#### Initiatives del Programa 8

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 8.1 | Release train | tags, changesets | Medio | 1 sprint | — |
| 8.2 | Deploy pipeline | ci.yml, Render | Alto | 1–2 sprints | INF-003, INF-010 |
| 8.3 | Unificar versiones | ci.yml, Dockerfile, docs | Medio | 1 sprint | — |
| 8.4 | Provisioning en contenedor | Dockerfile, env.js, mosquitto | Medio | 1 sprint | P1.6, INF-015 |
| 8.5 | Toolchain firmware | ci.yml | Bajo | 0.5 sprint | — |
| 8.6 | Docs de despliegue | `deployment.md`, manifest | Bajo | 0.5 sprint | — |

---

### Programa 9 — Performance y Escalabilidad 🟡

- **Objetivo:** rendimiento bajo carga y sin amplificaciones.
- **Alcance (incluye):** pooling/índices, rate limiting coherente, límites/N+1, bundle frontend, memoria control engine.
- **Riesgos que elimina:** degradación multi-tenant, agotamiento de recursos, bundle grande.
- **Dependencias:** P1.2 (migraciones) para índices/pooling.
- **Exit Gate:** `limit` acotado; sin N+1; índices; bundle dividido.
- **Métricas:** `limit` máx = 100; N+1 = 0; índices en columnas de filtro; bundle por ruta.

#### Epic EPIC-PERF-QUERIES — Performance de consultas
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** P1.2, tech-debt #001/#004.
- **DoD:** pooling + índices; N+1 eliminado; `limit` acotado.

#### Epic EPIC-PERF-RATE — Rate limiting coherente
- **Prioridad:** P2 · **Complejidad:** Baja · **Dependencias:** BE-019.
- **DoD:** sin skip en rutas sensibles; límites anónimos estrictos.

#### Epic EPIC-PERF-BUNDLE — Bundle frontend
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** FE-009.
- **DoD:** code splitting por ruta; tree-shake Chart.js.

#### Initiatives del Programa 9

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 9.1 | Pooling + índices | backend, migración | Medio | 1 sprint | P1.2 |
| 9.2 | Rate limiting | `app.js`, subscriptionRateLimit | Bajo | 0.5 sprint | — |
| 9.3 | Límites/N+1/dedup | rutas, thingSpeakSync | Medio | 1 sprint | — |
| 9.4 | Bundle frontend | vite config, imports | Medio | 1 sprint | — |
| 9.5 | Memoria control engine | `phaseEvaluator.js` | Bajo | 0.5 sprint | — |

---

### Programa 10 — Developer Experience 🟡

- **Objetivo:** tooling, gates y documentación para DX sostenible.
- **Alcance (incluye):** architecture tests, coverage/lint gates, scripts monorepo, regeneración de docs.
- **Riesgos que elimina:** imports cruzados, gates ausentes, docs falsas.
- **Dependencias:** P2.6 (gates CI) para fusiones.
- **Exit Gate:** architecture tests; coverage/lint gates; scripts monorepo.
- **Métricas:** architecture tests en CI; coverage gates; `test`/`lint` en raíz.

#### Epic EPIC-TOOLING — Tooling y gates
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** INF-007, FE-011.
- **DoD:** architecture tests (prohibir imports cruzados); coverage gates; scripts monorepo.

#### Epic EPIC-DOCS — Documentación de arquitectura
- **Prioridad:** P2 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** backend.md/frontend.md/READMEs reflejan el repo.

#### Initiatives del Programa 10

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 10.1 | Architecture tests | tests de estructura | Bajo | 1 sprint | — |
| 10.2 | Coverage/lint gates | ci.yml | Bajo | 0.5 sprint | INF-017, FE-011 |
| 10.3 | Scripts monorepo | root package.json | Bajo | 0.5 sprint | INF-007 |
| 10.4 | Docs de arquitectura | backend.md, frontend.md, READMEs | Bajo | 1 sprint | — |

---

### Programa 11 — Reliability Operacional (revisión continua) 🟢

- **Objetivo:** operación continua y confiable (sin fin puntual; cadencia definida).
- **Alcance (incluye):** backup/recovery mensual probado, runbooks reales, canary OTA, actualización de `tech-debt.md` y re-vinculación ADR-032.
- **Riesgos que elimina:** DR no probado, runbooks falsos, tech-debt stale.
- **Dependencias:** P1.7 (backups), P8.1/8.2 (release/deploy), P1.6 (broker para canary).
- **Exit Gate (cadencia):** backup restaurado y verificado mensualmente; runbook ejecutado en incidente real; canary OTA disponible.
- **Métricas:** últimos 3 restores verificados; runbooks probados; `tech-debt.md` sin items stale.

#### Epic EPIC-DR — Recuperación de desastres
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** P1.7.
- **DoD:** restore mensual verificado y documentado.

#### Epic EPIC-RUNBOOKS — Runbooks reales
- **Prioridad:** P1 · **Complejidad:** Media · **Dependencias:** —
- **DoD:** runbooks (MQTT caído, DB pausada, OTA fallida) alineados a la realidad.

#### Epic EPIC-CANARY — Canary OTA
- **Prioridad:** P2 · **Complejidad:** Alta · **Dependencias:** P1.6, P8.1/8.2.
- **DoD:** rollout 5 % → 20 % → 100 % cuando exista broker y pipeline.

#### Initiatives del Programa 11

| Ini | Propósito | Módulos | Riesgo | Duración est. | Prerequisitos |
|---|---|---|---|---|---|
| 11.1 | Backup/recovery mensual | scripts backup, docs | Medio | continua | P1.7 |
| 11.2 | Runbooks | docs/runbooks | Medio | 1 sprint | — |
| 11.3 | Canary OTA | OTA pipeline, broker | Medio | Fase 3 | P1.6, P8.1/8.2 |
| 11.4 | Tech-debt y ADR-032 | `tech-debt.md`, ADR-032 | Bajo | 0.5 sprint | DOC-018 |

---

## 4. Issues (110 — uno por hallazgo)

Flujo de estados: `BACKLOG → (DoR) → READY → (GitHub Issue) → IN_PROGRESS → (DoD) → DONE`.

**Convención de ID:** `ISSUE-XXX` secuencial por área. Los IDs del Ciclo 0 del plan (`engineering-execution-plan.md` §Fase 9) se mantienen: ISSUE-060 (INF-001), ISSUE-061 (INF-002), ISSUE-068 (INF-009), ISSUE-065 (INF-006), ISSUE-070 (INF-011), ISSUE-001…005 (BE-001…005), ISSUE-050/051 (FW-001/002), ISSUE-029/030 (FE-001/002). *Reconciliación:* el plan refería ISSUE-076 = BE-017 e ISSUE-105 = TST-002; en la numeración secuencial definitiva BE-017 = ISSUE-017 y TST-002 = ISSUE-106. Se corrige aquí para preservar consistencia (equivalente a DECISION-009).

**Campo de decisión:** cada ISSUE con decisión asociada lleva `- **Decisión:** <ID> · <STATUS>` (p. ej. `DECISION-002 · ACCEPTED`). Los ISSUE sin decisión asociada se consideran `NONE` (campo omitido). Estado vigente por ISSUE:

| ISSUE | Decision ID | Decision Status |
|---|---|---|
| ISSUE-017 (BE-017) | DECISION-005 | ACCEPTED |
| ISSUE-029 (FE-001) | DECISION-005 | ACCEPTED |
| ISSUE-051 (FW-002) | DECISION-007 | ACCEPTED |
| ISSUE-060 (INF-001) | DECISION-008 | ACCEPTED |
| ISSUE-061 (INF-002) | DECISION-004 | ACCEPTED |
| ISSUE-065 (INF-006) | DECISION-006 | ACCEPTED |
| ISSUE-068 (INF-009) | DECISION-008 | ACCEPTED |
| ISSUE-070 (INF-011) | DECISION-011 | PENDING |
| ISSUE-071 (INF-012) | DECISION-011 | PENDING |
| ISSUE-074 (INF-015) | DECISION-006 | ACCEPTED |
| ISSUE-085 (DOC-001) | DECISION-002 | ACCEPTED |
| ISSUE-086 (DOC-002) | DECISION-003 | ACCEPTED |
| ISSUE-095 (DOC-011) | DECISION-010 | ACCEPTED |

### 4.1 Backend (BE-001…BE-028) → ISSUE-001…028

#### ISSUE-001 — Registro de dispositivo no autenticado (BE-001) — P0
`Programa 1 · EPIC-PROVISIONING · Ini 1.4`
- **Estado:** DONE (PR-E "Provisioning Foundation" mergeado — PR #188, merge commit `039d16e`; versionado backend 1.7.4 / root 1.8.10). Cierre formal del Ciclo 0: ver §9.5.
- **Evidencia de implementación:** suite `backend/src/__tests__/authz/authorization-negative.test.js` (43 tests: sin token → `401 AUTH_REQUIRED`, token inexistente/expirado/revocado/exhausto → `401`, device-mismatch → `403`, token de un solo uso 201 + credenciales, cuota>1, refund) y `backend/src/__tests__/regression/REG-009_provisioning-security.test.ts` (11 aserciones estáticas: middleware, ruta, rate limit, ADR-028, hash SHA-256, SIGHUP sin `docker restart`, debounce, CLI guard, migración, contrato). Verificación end-to-end contra Postgres local (`mush2_test`).
- **Objetivo:** que `/devices/register` exija autenticación o token de aprovisionamiento de un solo uso con rate limit y cuota, y que la recarga de ACL sea idempotente sin `docker restart`.
- **Problema actual:** `routes/api.js:91-153` expone `POST /devices/register` sin `authenticate` (montado en `routes/index.js:34`); devuelve `{mqttUser, mqttPass}`; `mosquittoProvisioningService.js` `reload()` ejecuta `docker restart mush2-mosquitto`.
- **Impacto:** acuñación ilimitada de credenciales MQTT y DoS no autenticado del broker.
- **Archivos afectados:** `backend/src/routes/api.js`, `backend/src/routes/index.js`, `backend/src/services/mosquittoProvisioningService.js`, `backend/src/middlewares/auth.js`.
- **Contratos afectados:** `api-contract.md` (POST /devices/register), `mqtt-contract.md`.
- **ADR/DDD:** ADR-028 (REQUIRED — identidad MQTT por dispositivo; condiciona el flujo de provision) · ADR-023 (INFORMATIVE — infraestructura MQTT segura; contexto) · DDD-001 (INFORMATIVE — modelo de dominio Dispositivo/Credencial). Decisión: NONE (no DECISION-NNN asociada; ADR-028 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` (base `/api/v1`; sin tabla semver formal) — cambio compatible: añade auth/token de aprovisionamiento a `POST /devices/register`; el payload de respuesta (`mqtt.user`, `mqtt.pass`) no cambia. `mqtt-contract` (MQTT 3.1.1; payloads con `protocol`) — sin cambio de provision.
- **Riesgos:** acuñación de credenciales MQTT antes del deploy → mitigación: rate-limit + token de aprovisionamiento de un solo uso; firmware en campo re-registrando → mitigación: NVS con fallback primer arranque (ISSUE-059) y `register` bajo token de aprovisionamiento durante la transición; `docker restart` del broker → mitigación: recarga de ACL idempotente en job.
- **Verificación (verde→rojo→verde):** verde: test actual que registra sin auth pasa (hoy `/devices/register` anónimo en `routes/api.js:91-153`); rojo: test negativo que llama `POST /devices/register` sin sesión ni token debe devolver 401/403 → hoy falla (200); verde: tras corrección el test negativo pasa y el registro legítimo con token/CLI sigue funcionando.
- **Dependencias:** ISSUE-050/051 (firmware registro), ISSUE-065 (broker).
- **DoD:** sin llamador anónimo capaz de registrar/acreditar; recarga en job; test de autorización negativa en el PR.
- **Tasks:** exigir sesión o token de un solo uso (hecho); vincular credenciales a clave de dispositivo (hecho); job de recarga de ACL idempotente (hecho); test negativo (hecho). Pendiente: validación en staging (Ciclo 1).

#### ISSUE-002 — Exposición anónima multi-tenant (BE-002) — P0
`Programa 1 · EPIC-AUTHZ · Ini 1.3`
- **Objetivo:** denegación por defecto (401/403) cuando `req.tenant.userId` es null; eliminar `optionalAuth` en recursos críticos.
- **Problema actual:** `middlewares/tenant.js:6-18` deja `{userId:null, filter:{}}`; `routes/api.js` (GET /devices), `cycles.js`, `recipes.js`, `events.js`, `analytics.js` continúan con filtro vacío.
- **Impacto:** enumeración no autenticada de datos de todos los tenants.
- **Archivos afectados:** `middlewares/tenant.js`, `routes/api.js`, `routes/cycles.js`, `routes/recipes.js`, `routes/events.js`, `routes/analytics.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-007 (REQUIRED — modelo RBAC + tenencia por `UserChamberAccess`; es la autoridad que define que `userId` nulo debe denegar) · EDD-004 (INFORMATIVE — diseño multi-tenant; contexto, estado DRAFT) · DDD-004 (INFORMATIVE — value objects de identidad usados en los filtros de tenencia). Decisión: NONE (no DECISION-NNN asociada; ADR-007 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` (base `/api/v1`; sin tabla semver formal) — cambio de comportamiento restrictivo: los recursos de lectura (`GET /devices`, `/cycles`, `/recipes`, `/events`, `/analytics`) dejan de aceptar llamadas anónimas → 401/403. No cambia payloads; se documenta en la sección de autenticación del contrato.
- **Riesgos:** romper flujos legítimos que hoy operan anónimos (p. ej. telemetría de firmware por HTTP) → mitigación: inventario explícito de endpoints afectados y whitelist de rutas públicas (`/health`); falsos 403 tras endurecer `tenant.js` → mitigación: suite de autorización positiva por rol en el mismo PR (ISSUE-106); enumeración residual vía status code → mitigación: respuestas uniformes 401/403 sin filtrar existencia.
- **Verificación (verde→rojo→verde):** verde: `GET /devices` anónimo devuelve 200 con datos de todos los tenants (hoy `middlewares/tenant.js:6-18` deja `{userId:null, filter:{}}`); rojo: test negativo que llama anónimo a `GET /devices`, `/cycles`, `/recipes`, `/events`, `/analytics` esperando 401/403 → hoy falla (200); verde: tras endurecer `tenant.js` y eliminar `optionalAuth`, el test negativo pasa y los usuarios autenticados mantienen su data filtrada por tenant.
- **Dependencias:** ISSUE-106 (TST-002) en el mismo PR.
- **DoD:** 401/403 por defecto; tests de autorización negativa verdes.
- **Tasks:** endurecer tenant middleware; eliminar `optionalAuth`; escribir suite negativa.

#### ISSUE-003 — Monitoring público (BE-003) — P0
`Programa 1 · EPIC-OBSERVABILITY-SECURITY · Ini 1.5`
- **Estado:** DONE (PR-F "Monitoring Security" mergeado — PR #189, merge commit `ad0f3a3`; versionado backend 1.7.5 / root 1.8.11). Cierre formal del Ciclo 0: ver §9.5.
- **Objetivo:** montar `/monitoring` tras `authenticate` + rol ADMIN; dejar solo `/health` público; quitar `err.message` del cliente.
- **Problema actual:** `routes/index.js:29` monta `/monitoring` sin auth; `app.js:23` excluye logs de `/monitoring`; `routes/monitoring.js` sirve logs/métricas/SSE públicos.
- **Impacto:** divulgación de logs, métricas e internals.
- **Archivos afectados:** `routes/index.js`, `routes/monitoring.js`, `routes/admin.js`, `app.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-006 (INFORMATIVE — estrategia de logs/monitoreo y endpoints `/monitoring/*`; no fija control de acceso; estado Completado) · ADR-007 (REQUIRED — RBAC con rol ADMIN es la autoridad para restringir `/monitoring`). DDD: NOT_APPLICABLE (cambio de middleware/rutas; no altera el modelo de dominio). Decisión: NONE (no DECISION-NNN asociada; ADR-007 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` (base `/api/v1`; sin tabla semver formal) — cambio restrictivo: `/monitoring/*` pasa a requerir autenticación + rol ADMIN; `/health` queda explícitamente público. Sin cambios de payload; se actualiza la sección de monitoreo del contrato.
- **Riesgos:** healthchecks externos (Render/Docker) que no autentican → mitigación: mantener `/health` público como única ruta sin auth; tooling/CLI que consumía `/monitoring` anónimo → mitigación: documentar uso con token de sesión ADMIN; filtrar `err.message` rompe debugging → mitigación: detalle completo en logs de servidor, mensaje genérico al cliente.
- **Verificación (verde→rojo→verde):** verde: `GET /monitoring/logs` anónimo devuelve 200 con logs (hoy `routes/index.js:29` monta sin auth); rojo: test anónimo a `/monitoring/*` esperando 401/403 → hoy falla (200); verde: tras montar `authenticate` + `requireRole('ADMIN')`, anónimo → 401/403, ADMIN → 200, y `/health` sigue público.
- **Dependencias:** RBAC funcional.
- **DoD:** `/monitoring/*` requiere ADMIN; `err.message` no llega al cliente.
- **Tasks:** añadir auth+ADMIN; endpoint `/health` público; errores genéricos.

#### ISSUE-004 — Control de actuadores sin auth (BE-004) — P0
`Programa 1 · EPIC-AUTHZ · Ini 1.3`
- **Objetivo:** exigir autenticación + propiedad (o rol EDITOR) para toda actuación; eliminar `findOrCreate` de la ruta de comandos.
- **Problema actual:** `routes/actuators.js` `PATCH /actuators/:channel` sin auth real (`optionalAuth`); `Device.findOrCreate`; duplicado en `api.js:382-410`.
- **Impacto:** cualquiera conmuta relés físicos.
- **Archivos afectados:** `routes/actuators.js`, `routes/api.js`.
- **Contratos afectados:** `api-contract.md`, `mqtt-contract.md` (comando/ACK, ADR-030).
- **ADR/DDD:** ADR-030 (REQUIRED — Command & Actuation Protocol; define el canal de comando MQTT primario y HTTP polling como fallback, cmdId UUID v4 y ciclo de vida; la ruta `PATCH /actuators/:channel` es el canal fallback que debe quedar autenticado). DDD: NOT_APPLICABLE (el comando/ACK es protocolo ADR-030; no altera el modelo de dominio). Decisión: NONE (no DECISION-NNN asociada; ADR-030 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` — cambio restrictivo: `PATCH /actuators/:channel` pasa a exigir autenticación + propiedad (o rol EDITOR) y elimina el auto-`findOrCreate`; sin cambio de payload. `mqtt-contract` (MQTT 3.1.1; payloads con `protocol`) — sin cambio de versión; el comando/ACK se rige por ADR-030.
- **Riesgos:** firmware legacy que usa HTTP polling sin token → mitigación: credenciales de dispositivo en NVS (ISSUE-059) y transición con token de aprovisionamiento (ISSUE-001); eliminar `findOrCreate` rompe el auto-registro implícito → mitigación: registro explícito previo como requisito; reintentos de comando duplicados → mitigación: deduplicación por `cmdId` (ADR-030).
- **Verificación (verde→rojo→verde):** verde: `PATCH /actuators/:channel` anónimo conmuta el relé (hoy `routes/actuators.js` con `optionalAuth`); rojo: test anónimo esperando 401/403 → hoy falla (200); verde: tras auth + propiedad, anónimo → 401/403, OPERATOR propietario → 200, y el ACK MQTT (ADR-030) no se altera.
- **Dependencias:** ISSUE-002 (tenant), ISSUE-106.
- **DoD:** anónimo no actúa; sin `findOrCreate` en comandos; test negativo.
- **Tasks:** auth + propiedad; eliminar auto-creación; test negativo.

#### ISSUE-005 — IDOR en mutaciones (BE-005) — P0
`Programa 1 · EPIC-AUTHZ · Ini 1.3`
- **Objetivo:** guard de propiedad centralizado (`checkDeviceAccess`/`UserChamberAccess`) en toda mutación con ID.
- **Problema actual:** `routes/cycles.js` (`start/complete/abort`), `routes/alarms.js` (`acknowledge/resolve`), `routes/species.js` (`PUT/DELETE`) no verifican propiedad.
- **Impacto:** mutación/sabotaje de recursos ajenos.
- **Archivos afectados:** `routes/cycles.js`, `routes/alarms.js`, `routes/species.js`, `middlewares/tenant.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-007 (REQUIRED — RBAC + tenencia `UserChamberAccess` es la autoridad del guard de propiedad centralizado `checkDeviceAccess`/`UserChamberAccess`) · DDD-004 (INFORMATIVE — value objects de identidad usados en las mutaciones). Decisión: NONE (no DECISION-NNN asociada; ADR-007 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` — cambio restrictivo: las mutaciones con ID (`cycles start/complete/abort`, `alarms acknowledge/resolve`, `species PUT/DELETE`) pasan a verificar propiedad → 403 si el recurso es ajeno; sin cambio de payloads.
- **Riesgos:** falsos 403 en mutaciones legítimas → mitigación: guard único centralizado + tests positivos por recurso; respuesta inconsistente (404 vs 403) permite enumerar recursos → mitigación: respuestas uniformes sin revelar existencia; guard central con contexto de tenant roto → mitigación: `tenant.js` como única fuente del filtro (mismo PR que ISSUE-002).
- **Verificación (verde→rojo→verde):** verde: `PUT /species/:id` con ID de otro usuario muta el recurso ajeno (hoy `routes/species.js` sin verificación); rojo: test con recurso ajeno esperando 403 → hoy falla (200); verde: tras el guard de propiedad, el test negativo pasa por recurso (cycles/alarms/species) y el propietario mantiene su operación.
- **Dependencias:** ISSUE-002; ISSUE-106.
- **DoD:** sin IDOR demostrable; tests negativos por recurso.
- **Tasks:** guard de propiedad central; tests negativos.

#### ISSUE-006 — DELETE /devices sin cascada ni transacción (BE-006) — P1
`Programa 4 · EPIC-DATA-INTEGRITY · Ini 4.1` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-C)
- **Objetivo:** borrado transaccional con cascada de `Event`/`Alarm`/`Sensor` + test de integración.
- **Problema actual:** `routes/api.js:488-519` borra Device sin transacción; `sync-db.js` sin cascada FK.
- **Impacto:** huérfanos y fallos parciales.
- **Archivos afectados:** `routes/api.js`, modelos, migración.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-005 (REQUIRED — PostgreSQL/Sequelize; la integridad referencial y transaccional es parte del modelo de datos) · DDD-003 (INFORMATIVE — entidades Device/Event/Alarm/Sensor; la cascada preserva el agregado).
- **Contrato/versión:** `api-contract v1` — `DELETE /devices/{id}`; el fix cumple el comportamiento ya documentado (borrado del dispositivo con su historial). Sin cambio de versión.
- **Riesgos:** borrado masivo con Event/Alarm/Sensor → mitigación: transacción + cascada explícita (`onDelete:'CASCADE'` o borrado ordenado); FK huérfanas ya presentes en datos → mitigación: verificación previa a aplicar restricción; regresión en lecturas de eventos tras el borrado → mitigación: test de integración en el mismo PR.
- **Verificación (verde→rojo→verde):** verde: `routes/api.js:488-519` borra Device sin transacción y `sync-db.js` sin cascada FK (hoy pasa); rojo: test de integración que borra un Device con Event/Alarm/Sensor y verifica atomicidad (fallo parcial → rollback total) y ausencia de huérfanos → hoy falla; verde: tras transacción + cascada, el test pasa.
- **Dependencias:** ISSUE-012 (tipos), ISSUE-061 (migraciones P1.2).
- **DoD:** transacción + cascada + test de integración.
- **Tasks:** transacción; `onDelete:'CASCADE'` o borrado explícito; migración; test.

#### ISSUE-007 — Watchdog offline muerto (BE-007) — P1
`Programa 4 · EPIC-DEVICE-HEALTH · Ini 4.2`
- **Objetivo:** cablear `evaluateAllDevices` al scheduler con guard de solapamiento y eventos offline.
- **Problema actual:** `jobs/offlineWatchdog.js` define la función pero nunca se invoca; `deviceHealthService.js` sin cablear.
- **Impacto:** dispositivos offline nunca marcados; política ADR-025 inactiva.
- **Archivos afectados:** `jobs/offlineWatchdog.js`, `server.js`, `services/deviceHealthService.js`, `eventBus.js`.
- **Contratos afectados:** `mqtt-contract.md` (estado), `api-contract.md`.
- **ADR/DDD:** ADR-025 · DDD-008.
- **Dependencias:** ISSUE-028 (timers).
- **DoD:** watchdog cableado; evento offline publicado; test de regresión.
- **Tasks:** scheduler; guard; evento; test.

#### ISSUE-008 — Upgrade de plan sin billing (BE-008) — P1
`Programa 4 · EPIC-ENTITLEMENT · Ini 4.3`
- **Objetivo:** cambios de plan como "solicitados" hasta confirmación; reconciliación de entitlement.
- **Problema actual:** `routes/subscriptions.js` permite subir/bajar plan directamente; `modelSubscription.js` sin verificación.
- **Impacto:** bypass de ingresos.
- **Archivos afectados:** `routes/subscriptions.js`, `services/modelSubscription.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-016 · DDD-001.
- **Dependencias:** ISSUE-009.
- **DoD:** flujo de confirmación; entitlement reconciliado.
- **Tasks:** flujo checkout/billing; estado "solicitado"; tests.

#### ISSUE-009 — Tier BASIC inferior a FREE (BE-009) — P1
`Programa 4 · EPIC-ENTITLEMENT · Ini 4.3`
- **Objetivo:** cuotas monótonas (BASIC > FREE) y reconcilación con contrato.
- **Problema actual:** `models/Subscription.js` BASIC 10.000 vs FREE 50.000.
- **Impacto:** clientes de pago con menos capacidad.
- **Archivos afectados:** `models/Subscription.js`, `api-contract.md`, `capability-catalog.md`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-016.
- **Dependencias:** ninguna.
- **DoD:** cuotas corregidas; test de monotonía.
- **Tasks:** corregir cuotas; test; actualizar contrato/catálogo.

#### ISSUE-010 — Retención global incorrecta (BE-010) — P1
`Programa 4 · EPIC-ENTITLEMENT · Ini 4.3`
- **Objetivo:** purgar por dispositivo según su retención; auditar conteos.
- **Problema actual:** `jobs/dataRetentionJob.js` usa un único cutoff global.
- **Impacto:** historial con retención alta borrado antes de tiempo.
- **Archivos afectados:** `jobs/dataRetentionJob.js`, `services/dataRetentionService.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** — · DDD-001.
- **Dependencias:** ninguna.
- **DoD:** retención por dispositivo; test con valores mezclados.
- **Tasks:** per-dispositivo; audit; test.

#### ISSUE-011 — Token Telegram en claro (BE-011) — P1
`Programa 4 · EPIC-SECRETS · Ini 4.4`
- **Objetivo:** cifrar el token con clave dedicada y enmascarar en la API.
- **Problema actual:** `telegramConfigurationService.js` persiste en claro; `routes/telegram.js` lo expone.
- **Impacto:** lectura de BD revela el token.
- **Archivos afectados:** `services/telegramConfigurationService.js`, `routes/telegram.js`, `services/encryption.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-033.
- **Dependencias:** ISSUE-020 (clave dedicada).
- **DoD:** token cifrado y enmascarado.
- **Tasks:** cifrar; enmascarar; test.

#### ISSUE-012 — Desajuste deviceId string vs INTEGER (BE-012) — P1
`Programa 2 · EPIC-CONTRACTS · Ini 2.2` (prioridad real P1; etiqueta de roadmap corregida, ver Fase 1 §7) · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-C)
- **Objetivo:** alinear tipos en el boundary; tests de conformidad de filtros.
- **Problema actual:** `models/Event.js`/`Alarm.js` INTEGER; rutas pasan strings; SQL crudo castea inconsistente.
- **Impacto:** filtros `deviceId` vacíos/erróneos.
- **Archivos afectados:** `models/Event.js`, `models/Alarm.js`, `routes/api.js`, tests de conformidad.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** DDD-001 (INFORMATIVE — el agregado Device/Event/Alarm; el tipo del identificador en el boundary es una decisión de modelado). ADR: NOT_APPLICABLE — cambio de tipos en el boundary de API, sin nueva decisión de arquitectura.
- **Contrato/versión:** `api-contract v1` — filtros `deviceId` en query string como cadena; el fix alinea el tipo en el boundary. Sin cambio de versión (la representación wire no cambia).
- **Riesgos:** SQL crudo con casteo inconsistente → mitigación: tipar en el boundary (parseo a INTEGER en modelos) + tests de conformidad de filtros; deviceId existente como INTEGER en BD → mitigación: Sequelize cast; filtros vacíos/erróneos en clientes → mitigación: test de filtro por `?deviceId=1`.
- **Verificación (verde→rojo→verde):** verde: `models/Event.js`/`Alarm.js` INTEGER y rutas pasan strings → filtros vacíos/erróneos (hoy pasa); rojo: test de conformidad que filtra `?deviceId=1` y espera los eventos del device 1 → hoy devuelve vacío; verde: tras alinear tipos en el boundary, el filtro devuelve los eventos correctos.
- **Dependencias:** ISSUE-006.
- **DoD:** tipos alineados; filtros correctos; tests de conformidad.
- **Tasks:** alinear tipos; test de filtros.

#### ISSUE-013 — WebSocket /ws sin auth (BE-013) — P1
`Programa 4 · EPIC-REALTIME · Ini 4.5`
- **Objetivo:** autenticar el handshake y vincular socket a tenant + capacidades.
- **Problema actual:** `webSocketServer.js` acepta conexiones sin JWT/identidad; `server.js:66-68`.
- **Impacto:** suplantación de dispositivo; streams ajenos.
- **Archivos afectados:** `services/webSocketServer.js`, `server.js`.
- **Contratos afectados:** `api-contract.md` (SSE/WS), `mqtt-contract.md`.
- **ADR/DDD:** RFC-0006.
- **Dependencias:** ISSUE-094 (P3.4 contratos).
- **DoD:** handshake autenticado; socket → tenant.
- **Tasks:** auth handshake; binding; test.

#### ISSUE-014 — N+1 y límites sin tope (BE-014) — P1
`Programa 4 · EPIC-PERF · Ini 4.6`
- **Objetivo:** acotar `limit` (100), joins por lote, índices.
- **Problema actual:** `api.js`, `analytics.js`, `events.js` N+1 y `limit` sin cota.
- **Impacto:** tenants grandes lentos; amplificación de BE-002.
- **Archivos afectados:** `routes/api.js`, `routes/analytics.js`, `routes/events.js`, `routes/recipes.js`, `routes/cycles.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-061 (P1.2, índices).
- **DoD:** `limit` acotado; sin N+1; índices.
- **Tasks:** acotar limit; joins; índices.

#### ISSUE-015 — MQTT en claro y sin ACL por dispositivo (BE-015) — P1
`Programa 1 · EPIC-BROKER · Ini 1.6` · Estado: **DONE** (PR-A, 2026-08-12 — cierre cross-ciclo; broker TLS 8883 activo + ACL alarm + compose solo 8883; evidencia handshake TLS local)
- **Objetivo:** `mqtts://` por defecto, TLS obligatorio, identidad por dispositivo, fallar ante no-TLS en prod.
- **Problema actual:** `env.js:80` default `mqtt://localhost:1883`; `mqttBridge.js` credencial única `backend_bridge`; ACL no acotadas.
- **Impacto:** streams legibles/inyectables.
- **Archivos afectados:** `config/env.js`, `services/mqttBridge.js`, `docker/mosquitto/*/acl.conf`, `mosquitto.prod.conf`.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-023 (INFORMATIVE — infraestructura MQTT segura; contexto) · ADR-028 (REQUIRED — identidad MQTT por dispositivo; condiciona ACL/credenciales por dispositivo). DDD: NOT_APPLICABLE (cambio de transporte/config de broker; no altera el modelo de dominio). Decisión: NONE (no DECISION-NNN asociada; ADR-028/023 aceptados son las decisiones rectoras).
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1) — **cambio restrictivo de transporte**: default `mqtt://localhost:1883` → `mqtts://` con TLS obligatorio en prod; identidad por dispositivo en lugar de credencial única `backend_bridge`. Se evalúa bump de versión/nota del contrato en el PR-L. Estado: **compatible a nivel de payloads** (temas/topics y JSON sin cambio); el transporte y la autenticación cambian.
- **Riesgos:** tránsito mqtt→mqtts durante migración → mitigación: soporte temporal de ambos + fallo explícito ante no-TLS en prod (test de conectividad sin TLS que debe fallar); broker TLS no desplegado (I074/I075 F1) → mitigación: cierre diferido documentado (hallazgo de fase), no se falsea `DONE`; credencial compartida `backend_bridge` filtrada → mitigación: identidad por dispositivo (ADR-028).
- **Verificación (verde→rojo→verde):** verde: `env.js:80` default `mqtt://localhost:1883` y `mqttBridge.js` usa credencial única (hoy pasa); rojo: test que arranca con `NODE_ENV=production` y `MQTT_URL` no-TLS debe fallar → hoy no falla; verde: tras `mqtts://` + TLS obligatorio + identidad por dispositivo, el arranque en prod falla sin TLS y cada dispositivo autentica con su credencial.
- **Dependencias:** ISSUE-065/074/075 (broker), ISSUE-050 (firmware). **Plan de desbloqueo cross-ciclo:** PR-L entrega código (`mqtts://` + ACL + identidad); cierre diferido a I074/I075 (F1).
- **DoD:** TLS obligatorio; identidad por dispositivo; fallo ante no-TLS en prod.
- **Tasks:** TLS; identidad por dispositivo; config; test.

#### ISSUE-016 — Credenciales seed hardcodeadas (BE-016) — P1
`Programa 1 · EPIC-BOOTSTRAP · Ini 1.1`
- **Objetivo:** seed solo en `NODE_ENV=development`; fallar ante defaults en prod; bcrypt cost 12.
- **Problema actual:** `seed.js:285-288` admin/admin123 + manager/tecno/invitado; sin guard; bcrypt cost 10.
- **Impacto:** compromiso total si corre fuera de local.
- **Archivos afectados:** `backend/src/seed.js`, `Dockerfile`, `config/env.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-029 (REQUIRED — aislamiento de ambientes y `ConfigurationService` fail-fast; el guard de `NODE_ENV` para seed es parte de esta política) · DDD-009 (INFORMATIVE — modelo de configuración/entorno; contexto). Decisión: NONE (no DECISION-NNN asociada; DECISION-008 ACCEPTED del ISSUE-060 es la decisión rectora).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: cambio de arranque/seed (quién y cuándo corre, coste de hash), no de protocolo.
- **Riesgos:** subir bcrypt de 10 a 12 ralentiza el seed → mitigación: solo en `development` vía CLI (I060 ya sacó seed del CMD); admin perdido si seed no corre → mitigación: `create-admin.js` (CLI/secret) documentado; hash más caro en CI/tests → mitigación: coste configurable vía env en tests.
- **Verificación (verde→rojo→verde):** verde: `seed.js:54` bcrypt cost 10 (hoy pasa); rojo: test que verifica que el hash de seed usa `cost >= 12` → hoy falla; verde: tras bcrypt 12 + guard NODE_ENV efectivo, el hash usa cost 12 y el seed rechaza `NODE_ENV=production`.
- **Dependencias:** ISSUE-060 (INF-001), ISSUE-068 (INF-009). **Satisfechas** (ambas `DONE`).
- **DoD:** guard efectivo; bcrypt 12; admin por CLI/secret.
- **Tasks:** guard NODE_ENV; bcrypt 12; forzar cambio password.

#### ISSUE-017 — Refresh tokens en claro sin revocación (BE-017) — P2 (prioridad real P1; requisito del Ciclo 0, ver plan §Fase 9)
`Programa 1 · EPIC-CREDENTIALS · Ini 1.10`
- **Objetivo:** almacenar solo hash; rotar con revocación por `jti`; vida acotada; revocación dura en logout.
- **Problema actual:** `routes/auth.js` persiste refresh en claro; rota sin invalidar el anterior.
- **Impacto:** dump de BD o token filtrado siguen válidos.
- **Archivos afectados:** `routes/auth.js`, `services/tokenService.js`, `models/RefreshToken.js`.
- **Contratos afectados:** `api-contract.md` (auth/refresh, logout).
- **ADR/DDD:** ADR-007 (REQUIRED — define refresh token de vida larga con blacklist/revocación; la implementación actual en `routes/auth.js` no cumple la revocación, el fix alinea con ADR-007). DDD: NOT_APPLICABLE (cambio en el servicio de autenticación/token; no altera el modelo de dominio). Decisión: DECISION-005 · ACCEPTED (storage/rotación: access en memoria + refresh en cookie httpOnly).
- **Contrato/versión:** `api-contract v1` — sin cambio de wire (endpoints `/auth/refresh` y logout intactos); cambio de comportamiento: el refresh almacenado pasa a hash-only y se revoca por `jti`. Se actualiza la sección auth del contrato.
- **Riesgos:** dump de BD con hashes → mitigación: hash con secreto dedicado (no reusar `JWT_SECRET`); token filtrado sigue válido → mitigación: rotación con invalidación del anterior + vida acotada (7 días → configurable); tokens existentes en claro durante la migración → mitigación: invalidación masiva al desplegar o doble validación transitoria.
- **Verificación (verde→rojo→verde):** verde: `routes/auth.js:79` persiste el refresh en claro y `:96-111` rota sin invalidar el anterior (hoy ambos pasan); rojo: test que exige que el refresh previo quede revocado tras rotar y que el logout revoque → hoy falla; verde: tras hash + `jti` + revocación, el antiguo refresh es inválido y el logout revoca durablemente.
- **Dependencias:** DECISION-005.
- **Decisión:** DECISION-005 · ACCEPTED
- **DoD:** hash + revocación por `jti`; logout revoca.
- **Tasks:** hash; revocación; vida acotada; tests.
- **PR-C (2026-08-09):** `tokenService.js` (signAccessToken con `jti`; signRefreshToken; issueRefreshToken persiste hash SHA-256; verifyAndRotate revoca previo y rechaza replay/revocado/expirado con `REFRESH_EXPIRED`; revokeAllForUser; parseRefreshToken body/cookie; setRefreshCookie/clearRefreshCookie Path=`/api/v1/auth` HttpOnly SameSite=Strict Secure en prod); modelo `RefreshToken` (userId, jti, tokenHash, expiresAt, revokedAt, replacedByJti); migración `20260809000001-create-refresh-tokens.cjs`; `routes/auth.js` register/login/refresh/logout alineados; sin storage en claro en `users.refreshToken`; tests unit 10/10 + E2E (gate `mush2_test`); contract test actualizado. Ver ADR-007 anexo DECISION-005.

#### ISSUE-018 — API keys `update()` por petición (BE-018) — P2
`Programa 4 · EPIC-PERF · Ini 4.6`
- **Objetivo:** throttlear last-used o LRU con flush.
- **Problema actual:** `routes/apiKeys.js` actualiza last-used en cada llamada.
- **Impacto:** escrituras de BD por petición.
- **Archivos afectados:** `routes/apiKeys.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** sin escritura por petición.
- **Tasks:** throttling/LRU; test.

#### ISSUE-019 — Skip de rate limiter en rutas sensibles (BE-019) — P2
`Programa 1 · EPIC-AUTHZ · Ini 1.3` (prioridad real P2; dentro de programa P0)
- **Objetivo:** no omitir rutas críticas; límite estricto anónimo + franquicia autenticada.
- **Problema actual:** `app.js:54-57` omite `/devices` y `/actuators`.
- **Impacto:** enumeración/sondas sin throttling.
- **Archivos afectados:** `app.js`, `middlewares/subscriptionRateLimit.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** N/A — sin ADR/DDD afectado. Justificación: cambio de configuración del rate limiter (skip de rutas); no altera contratos, modelo de dominio ni ADRs vigentes. Decisión: NONE.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el rate limit no cambia el wire contract (mismo endpoint, misma respuesta; solo cambia el throttling). Comportamiento restrictivo documentado en la sección de límites del `api-contract.md`.
- **Riesgos:** límites anónimos estrictos rompen el firmware que consulta `GET /devices`/`GET /actuators` sin auth → mitigación: franquicia autenticada y revisión de los clientes firmware (I050/I051); 429 legítimos en operadores → mitigación: franquicia autenticada más amplia; cambio de skip rompe polling de dispositivos en campo → mitigación: confirmar identidad/whitelist antes del cambio.
- **Verificación (verde→rojo→verde):** verde: `app.js:54-57` omite `/devices` y `/actuators` del rate limit (hoy pasa); rojo: test que dispara N peticiones anónimas a `GET /devices` esperando 429 al superar el límite → hoy no se throttlea; verde: tras eliminar el skip y fijar límite estricto anónimo + franquicia autenticada, el test 429 pasa y los clientes autenticados no se bloquean.
- **Dependencias:** ISSUE-002. **Satisfecha** (`DONE`).
- **DoD:** rutas sensibles con límite.
- **Tasks:** revisar skip; límites anónimos; test.

#### ISSUE-020 — AES derivada de JWT_SECRET (BE-020) — P2
`Programa 4 · EPIC-SECRETS · Ini 4.4`
- **Objetivo:** `DATA_ENC_KEY` dedicada con IV/labeling; loguear fallos.
- **Problema actual:** `encryption.js` deriva clave AES de `JWT_SECRET`; fallos tragados.
- **Impacto:** rotar JWT_SECRET rompe settings cifrados silenciosamente.
- **Archivos afectados:** `services/encryption.js`, `config/env.js`, `services/telegramConfigurationService.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna (riesgo de tránsito de claves, ver Fase 1 §8).
- **DoD:** clave dedicada; fallos logueados.
- **Tasks:** `DATA_ENC_KEY`; labeling; test de descifrado legacy.

#### ISSUE-021 — EventEmitter desnudo (BE-021) — P2
`Programa 4 · EPIC-PERF · Ini 4.6` (también P7.5)
- **Objetivo:** handler global de error + envolver listeners + logging.
- **Problema actual:** `eventBus.js` `EventEmitter` desnudo.
- **Impacto:** un listener con `error` tumba el proceso.
- **Archivos afectados:** `services/eventBus.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-017 · DDD-006.
- **Dependencias:** ninguna.
- **DoD:** errores manejados; proceso estable.
- **Tasks:** handler global; envolver listeners; test.

#### ISSUE-022 — Routers ambiguos y alias duplicado (BE-022) — P2
`Programa 3 · EPIC-CONTRACTS-CANON · Ini 3.6`
- **Objetivo:** router propio para `/chambers`; deduplicar montes; alias únicos.
- **Problema actual:** `/chambers` sobre analyticsRouter; montes `/telegram` y `/api-keys` duplicados; alias `UserChamberAccesses` colisiona.
- **Impacto:** drift y resolución ambigua.
- **Archivos afectados:** `routes/index.js`, `models/index.js`, `routes/analytics.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** — · DDD-001.
- **Dependencias:** limpieza de contract drift.
- **DoD:** router propio; montes únicos; alias únicos.
- **Tasks:** router `/chambers`; dedup; alias.

#### ISSUE-023 — ThingSpeak sync re-inserta duplicados (BE-023) — P2
`Programa 4 · EPIC-INPUT-VALIDATION · Ini 4.7` · Estado: **SUPERSEDED** (DECISION-012, 2026-08-12 — ThingSpeak deprecado; `thingSpeakSync.js` se elimina)
- **Objetivo:** omitir escrituras sin cambios; dedup por (device, channel, ventana).
- **Problema actual:** `thingSpeakSync.js` re-inserta sin dedup.
- **Impacto:** historial inflado; cuota desperdiciada.
- **Archivos afectados:** `services/thingSpeakSync.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-004 (**SUPERSEDED** por DECISION-012).
- **Dependencias:** ninguna.
- **DoD:** sin re-inserción sin cambios → **SUPERSEDED:** eliminación de `thingSpeakSync.js` (canal ThingSpeak fuera de arquitectura; sin dedup necesaria).
- **Tasks:** dedup; test.

#### ISSUE-024 — Contraseña MQTT en argv (BE-024) — P2
`Programa 1 · EPIC-PROVISIONING · Ini 1.4`
- **Objetivo:** credenciales vía env/archivos, nunca en argv.
- **Problema actual:** `mosquittoProvisioningService.js` interpola credenciales en el comando.
- **Impacto:** captura desde `ps`/argv.
- **Archivos afectados:** `services/mosquittoProvisioningService.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-028 (REQUIRED — identidad MQTT por dispositivo y manejo de credenciales; el provisioning no debe exponer secretos en argv). DDD: NOT_APPLICABLE (cambio de mecanismo de entrega de credenciales; no altera el modelo de dominio). Decisión: NONE.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es en cómo se pasa la credencial a `mosquitto_passwd` (argv → env/archivo), no en el protocolo.
- **Riesgos:** password en argv expuesta en `ps` durante la migración → mitigación: migración rápida a env/archivo de permisos restringidos en el mismo PR; archivo temporal con credenciales → mitigación: permisos `0600` + borrado tras uso; compatibilidad con `docker exec` → mitigación: leer de archivo dentro del contenedor o env por variable.
- **Verificación (verde→rojo→verde):** verde: `mosquittoProvisioningService.js:51-55` interpola la password en `execFile(mosquitto_passwd, ['-b', file, user, pass])` (hoy pasa, visible en argv/`ps`); rojo: test que ejecuta la provisión y verifica que la password NO aparece en el argv del proceso hijo → hoy falla; verde: tras pasar la credencial por env/archivo, el test pasa y no hay secretos en argv.
- **Dependencias:** ISSUE-001, ISSUE-015. **Satisfecha** (I001 `DONE`; I015 en el mismo ciclo, PR-L).
- **DoD:** sin credenciales en argv.
- **Tasks:** env/archivos; test.

#### ISSUE-025 — Mass assignment en recetas/especies (BE-025) — P2
`Programa 4 · EPIC-INPUT-VALIDATION · Ini 4.7`
- **Objetivo:** whitelist de campos + validación + propiedad.
- **Problema actual:** `routes/recipes.js`, `species.js` pasan body a `create/update`.
- **Impacto:** campos arbitrarios; polución.
- **Archivos afectados:** `routes/recipes.js`, `routes/species.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-005.
- **DoD:** validación y whitelist; propiedad.
- **Tasks:** DTO/validación; whitelist; tests.

#### ISSUE-026 — sensorHistory sin límite (BE-026) — P2
`Programa 4 · EPIC-INPUT-VALIDATION · Ini 4.7` (también P9.5)
- **Objetivo:** buffer con ventana deslizante; evictar; guard de tamaño.
- **Problema actual:** `services/phaseEvaluator.js` acumula en memoria.
- **Impacto:** OOM eventual.
- **Archivos afectados:** `services/phaseEvaluator.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** memoria acotada.
- **Tasks:** ventana deslizante; guard; test.

#### ISSUE-027 — err.message filtrado (BE-027) — P3
`Programa 1 · EPIC-OBSERVABILITY-SECURITY · Ini 1.5`
- **Objetivo:** errores genéricos al cliente; detalle en servidor.
- **Problema actual:** `routes/monitoring.js`, `routes/admin.js` devuelven `err.message`.
- **Impacto:** divulgación de internals.
- **Archivos afectados:** `routes/monitoring.js`, `routes/admin.js`, middleware de error.
- **Contratos afectados:** —.
- **ADR/DDD:** N/A — sin ADR/DDD nuevo; contexto de observabilidad/seguridad cubierto por ADR-006/007 ya aplicados en PR-F (I003). Justificación: el residual re-baselineado (F10-3) es solo el middleware global de error; monitoring/admin ya genéricos. Decisión: NONE.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el `error` y `message` genéricos ya son el shape documentado (PR-F); el middleware solo asegura cobertura uniforme en el resto de rutas. Comportamiento **restrictivo** (errores internos dejan de filtrar `err.message`).
- **Riesgos:** mapear `err.message` a genérico puede ocultar errores de validación útiles → mitigación: mantener mensajes específicos para errores de cliente conocidos (validation) y genérico para 500; regresión en monitoring/admin ya genéricos → mitigación: test de regresión en el mismo PR; doble forma de error si el middleware no reemplaza al de ruta → mitigación: middleware único al final de la pila y eliminar respuestas ad-hoc.
- **Verificación (verde→rojo→verde):** verde: monitoring/admin ya genéricos (PR-F #189) pero **no existe** middleware global `(err, req, res, next)`; otras rutas filtran `err.message` (hoy pasa); rojo: test que fuerza un error interno en una ruta cualquiera y verifica que el body es `{ error: 'SERVER_ERROR', message: 'Error interno del servidor' }` y NO incluye `err.message` → hoy falla en rutas sin mapeo; verde: tras el middleware global, el test pasa para toda ruta y monitoring/admin mantienen regresión genérica.
- **Dependencias:** ISSUE-003. **Satisfecha** (`DONE`, PR-F #189).
- **DoD:** errores genéricos.
- **Tasks:** mapear errores; tests.

#### ISSUE-028 — Timers sin unref/guard (BE-028) — P3
`Programa 4 · EPIC-DEVICE-HEALTH · Ini 4.2` (también P7.5)
- **Objetivo:** `unref()`, flag in-flight, delay fijo.
- **Problema actual:** `offlineWatchdog.js`, `dataRetentionJob.js` `setInterval` sin guard.
- **Impacto:** ejecuciones solapadas; proceso vivo.
- **Archivos afectados:** `jobs/offlineWatchdog.js`, `jobs/dataRetentionJob.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-007, ISSUE-010.
- **DoD:** timers seguros.
- **Tasks:** unref; in-flight guard; test.

### 4.2 Frontend (FE-001…FE-021) → ISSUE-029…049

#### ISSUE-029 — JWT en localStorage (FE-001) — P0
`Programa 1 · EPIC-CREDENTIALS · Ini 1.10`
- **Objetivo:** access en memoria (interceptor), refresh en cookie `httpOnly` + `SameSite=Strict`.
- **Problema actual:** `app/providers/AuthProvider.jsx:13-23`; `shared/api/axiosInstance.js:10,25-26`; el test codifica el patrón inseguro.
- **Impacto:** XSS → robo de sesión.
- **Archivos afectados:** `frontend/src/app/providers/AuthProvider.jsx`, `frontend/src/shared/api/axiosInstance.js`, `AuthProvider.test.jsx`.
- **Contratos afectados:** `api-contract.md` (auth/refresh/logout).
- **ADR/DDD:** ADR-007 (REQUIRED — flujo JWT; la resolución de storage es de DECISION-005 y el fix alinea el transporte con el diseño). DDD: NOT_APPLICABLE (cambio de implementación frontend; no altera el modelo de dominio). Decisión: DECISION-005 · ACCEPTED.
- **Contrato/versión:** `api-contract v1` — el contrato de headers no cambia (Bearer access + cookie refresh); el storage del token pasa de `localStorage` a memoria + cookie `httpOnly` (cambio de implementación documentado en la sección auth).
- **Riesgos:** acceso en memoria se pierde en refresh/reload → mitigación: interceptor que refresca vía cookie httpOnly sin re-login; XSS residual → mitigación: ningún JWT en storage persistente (regla de diseño); tests que codifican el patrón inseguro → mitigación: actualizar junto con ISSUE-108/TST-004.
- **Verificación (verde→rojo→verde):** verde: `AuthProvider.test.jsx` valida que el JWT está en `localStorage` (hoy pasa, codifica el patrón inseguro); rojo: test que exige que NO exista JWT en `localStorage` y que el refresh fluya por cookie → hoy falla; verde: tras la migración (memoria + cookie), el test pasa y el flujo refresh funciona.
- **Dependencias:** ISSUE-017 (BE-017), DECISION-005.
- **Decisión:** DECISION-005 · ACCEPTED
- **DoD:** sin JWT en `localStorage`; refresh por cookie; tests actualizados.
- **Tasks:** access en memoria; interceptor; cookie httpOnly; actualizar tests.
- **PR-C (2026-08-09):** `tokenStore.js` (access en memoria, sin localStorage); `AuthProvider.jsx` (login persiste solo `mush2_user`, logout llama API + limpia); `axiosInstance.js` (Bearer desde memoria, refresh por cookie en 401 con single-flight, fallback limpia y redirige a `/`); `AuthModal.jsx` y `features/auth/api/auth.js` (logout) alineados; tests AuthProvider 5 + axiosInstance 4 PASS.

#### ISSUE-030 — Sin RBAC en UI (FE-002) — P0
`Programa 1 · EPIC-RBAC-UI · Ini 1.11`
- **Objetivo:** `<RequireRole>` + ocultar acciones por rol; backend sigue siendo autoridad.
- **Problema actual:** único uso de `role` es display; `SystemSettings.jsx:92` sin comprobación; sin guards.
- **Impacto:** cualquier usuario accede a acciones admin.
- **Archivos afectados:** `frontend/src/app/routes.jsx`, `App.jsx`, `SystemSettings.jsx`, `shared/constants/status.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-007 (REQUIRED — jerarquía de roles es la autoridad para ocultar/mostrar acciones en la UI; el backend sigue siendo la autoridad final). DDD: NOT_APPLICABLE (cambio de presentación; no altera el modelo de dominio). Decisión: NONE (no DECISION-NNN asociada; ADR-007 aceptado es la decisión rectora).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE (cambio UI-only; no toca endpoints ni payloads). Justificación: `RequireRole` y ocultamiento por rol son comportamiento de presentación.
- **Riesgos:** ocultar sin autorizar da falsa seguridad → mitigación: backend como autoridad (EPIC-AUTHZ, ISSUE-002/004/005) en el mismo ciclo; rol stale en sesión → mitigación: refresco del perfil al renovar tokens; UI muestra acciones no soportadas por el rol → mitigación: matriz de roles derivada de ADR-007.
- **Verificación (verde→rojo→verde):** verde: la UI muestra acciones admin a cualquier rol (hoy `SystemSettings.jsx:92` sin comprobación y sin guards); rojo: test de UI que exige 403/pantalla de acceso denegado y ocultamiento para rol VIEWER → hoy falla; verde: tras `RequireRole` + guards, VIEWER no ve ni alcanza acciones admin.
- **Dependencias:** ISSUE-029 (sesión).
- **DoD:** RequireRole activo; pantalla 403; ítems ocultos por rol.
- **Tasks:** RequireRole; guards; 403; ocultar por rol; tests.
- **PR-C (2026-08-09):** `shared/components/RequireRole.jsx` (+ `ForbiddenPage`); ruta `/forbidden` en `protectedRoutes`; guards en rutas (`/operations/logs` → ADMIN/SUPER_ADMIN, `/system/settings/system` → SUPER_ADMIN); `SettingsNav.jsx` oculta "Sistema" salvo SUPER_ADMIN; gate defensivo en `SystemSettings.jsx`; tests RequireRole 4 PASS + suite frontend completa 9 suites/63 tests + `pnpm build` OK.

#### ISSUE-031 — Registro roto + escalada de rol (FE-003) — P1
`Programa 1 · EPIC-RBAC-UI · Ini 1.11` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-D)
- **Objetivo:** corregir llamada `[username,password]`; role asignado en backend.
- **Problema actual:** `AuthModal.jsx:44-46` invoca `register(username,email,password)` vs firma `register(username,password,role)`.
- **Impacto:** registro roto o escalada SUPER_ADMIN.
- **Archivos afectados:** `frontend/src/features/auth/AuthModal.jsx`, `frontend/src/shared/api/auth.js`, `backend/src/routes/api.js` (registro).
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-007 (INFORMATIVE — RBAC/JWT; el registro no debe aceptar `role` del cliente; el rol lo asigna el servidor). DDD: NOT_APPLICABLE (corrección de firma de llamada; sin cambio de modelo de dominio).
- **Contrato/versión:** `api-contract v1` — `POST /auth/register` con `{username, email, password}`; sin `role` del cliente. El fix alinea el frontend al contrato (firma y orden de argumentos). Sin cambio de versión.
- **Riesgos:** cambiar la firma del front rompe otros call sites de `register` → mitigación: búsqueda de usos + test de flujo de registro; escalada de rol → mitigación: backend ya rechaza `role` (verificado: `/register` no lo acepta) y el fix elimina el argumento del front; solape de 3 capas → mitigación: alinear `AuthModal.jsx` ↔ `api/auth.js` ↔ backend en el mismo PR (F11-2).
- **Verificación (verde→rojo→verde):** verde: `AuthModal.jsx:44-46` invoca `register(username,email,password)` vs firma `register(username,password,role)` → el registro falla o crea sesión inválida (hoy pasa el bug); rojo: test frontend que completa el registro y espera sesión autenticada correcta → hoy falla; verde: tras alinear la firma, el registro funciona y `role` nunca viaja del cliente.
- **Dependencias:** backend rechaza `role` en registro.
- **DoD:** registro correcto; role nunca del cliente.
- **Tasks:** corregir firma; backend rechaza role; tests.

#### ISSUE-032 — SSE sin auth/reconexión (FE-004) — P1
`Programa 5 · EPIC-SSE · Ini 5.1`
- **Objetivo:** singleton de EventSource con backoff/heartbeat/`Last-Event-ID`; token o cookie.
- **Problema actual:** `useSSE.js:3-37` (`onerror` vacío, `catch {}`); 7+ consumidores.
- **Impacto:** pérdida de telemetría; hasta 8 conexiones por pestaña.
- **Archivos afectados:** `frontend/src/shared/api/useSSE.js`, consumidores.
- **Contratos afectados:** `api-contract.md` (SSE `/events`).
- **ADR/DDD:** —.
- **Dependencias:** backend `/events` autenticado (ISSUE-013 BE-013).
- **DoD:** singleton; reconexión; auth; `Last-Event-ID`.
- **Tasks:** singleton; backoff; heartbeat; tests con mock EventSource.

#### ISSUE-033 — Refresh sin single-flight (FE-005) — P1
`Programa 5 · EPIC-AUTH-FLOW · Ini 5.2` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-D)
- **Objetivo:** memorizar promesa de refresh; logout controlado.
- **Problema actual:** `axiosInstance.js:19-34` N llamadas a `/auth/refresh`; redirect hard.
- **Impacto:** logouts aleatorios.
- **Archivos afectados:** `frontend/src/shared/api/axiosInstance.js`, `app/providers/AuthProvider.jsx`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** NOT_APPLICABLE — corrección de cliente HTTP (single-flight de refresh); sin ADR/DDD nuevo. Contexto: ADR-007 (INFORMATIVE — sesión JWT; el refresh forma parte del flujo de auth).
- **Contrato/versión:** `api-contract v1` — `POST /auth/refresh`; comportamiento del cliente (una llamada en vuelo). Sin cambio de versión (el endpoint no cambia).
- **Riesgos:** llamadas concurrentes durante logout → mitigación: cola de fallidos + logout controlado (una promesa compartida); token expirado durante el vuelo → mitigación: invalidar caché y re-redirect; regresión en otros interceptores → mitigación: test del interceptor en el mismo PR.
- **Verificación (verde→rojo→verde):** verde: `axiosInstance.js:19-34` dispara N llamadas a `/auth/refresh` ante 401 concurrentes (hoy pasa); rojo: test que dispara 3 llamadas con 401 y espera exactamente 1 llamada a `/auth/refresh` → hoy hace 3; verde: tras single-flight + logout controlado, solo 1 llamada en vuelo y logout explícito.
- **Dependencias:** ISSUE-029.
- **DoD:** una sola llamada de refresh en vuelo; logout controlado.
- **Tasks:** single-flight; cola fallida; tests.

#### ISSUE-034 — Sin 404 en rutas protegidas (FE-006) — P1
`Programa 5 · EPIC-AUTH-FLOW · Ini 5.3`
- **Objetivo:** `{ path:'*', element:<NotFound/> }`.
- **Problema actual:** `routes.jsx:29-73` sin catch-all.
- **Impacto:** shell en blanco.
- **Archivos afectados:** `frontend/src/app/routes.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** 404 real.
- **Tasks:** catch-all + NotFound.

#### ISSUE-035 — Modales sin a11y (FE-007) — P2
`Programa 5 · EPIC-A11Y · Ini 5.5`
- **Objetivo:** diálogo accesible con focus trap y `aria-*`.
- **Problema actual:** `Modal.jsx:19-33` sin `role="dialog"`/focus trap.
- **Impacto:** inaccesible; cierre accidental.
- **Archivos afectados:** `frontend/src/shared/components/Modal.jsx`, modales inline.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** diálogo accesible.
- **Tasks:** Dialog; focus trap; `onMouseDown`.

#### ISSUE-036 — Capa API inconsistente (FE-008) — P2
`Programa 5 · EPIC-QUALITY · Ini 5.6`
- **Objetivo:** centralizar en feature API modules.
- **Problema actual:** `BioactiveDashboardPage.jsx:29-31,44`, `DeviceHealthPanel.jsx:11,13` usan `client.get/post` raw.
- **Impacto:** drift de contratos.
- **Archivos afectados:** feature API modules, páginas/paneles.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** sin llamadas raw; contratos centralizados.
- **Tasks:** feature API modules; migrar call sites.

#### ISSUE-037 — Código muerto (FE-009) — P2
`Programa 5 · EPIC-A11Y · Ini 5.5` (también P9.4)
- **Objetivo:** eliminar/consolidar ~16 componentes sin uso y CSS huérfano.
- **Problema actual:** sin imports (ArcGauge, Gauge, SegmentedBar, etc.).
- **Impacto:** confusión y duplicación.
- **Archivos afectados:** `frontend/src/**` (componentes muertos).
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** sin componentes muertos; linter CSS.
- **Tasks:** eliminar/consolidar; lint selectores.

#### ISSUE-038 — README frontend obsoleto (FE-010) — P2
`Programa 5 · EPIC-README · Ini 5.8`
- **Objetivo:** reescribir README al estado real.
- **Problema actual:** `frontend/README.md:43-79,128-144,164-166` con comandos inexistentes.
- **Impacto:** onboarding erróneo.
- **Archivos afectados:** `frontend/README.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** comandos y estructura reales.
- **Tasks:** reescribir README.

#### ISSUE-039 — Sin lint/typecheck (FE-011) — P2
`Programa 5 · EPIC-QUALITY · Ini 5.4`
- **Objetivo:** ESLint flat config + script `lint` + gate CI.
- **Problema actual:** sin `lint`, sin eslint config, sin `tsc`.
- **Impacto:** bugs como FE-003 indetectables.
- **Archivos afectados:** `frontend/package.json`, eslint config, `ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** lint/typecheck en CI.
- **Tasks:** eslint; script; gate CI.

#### ISSUE-040 — Tests escasos e inseguros (FE-012) — P2
`Programa 2 · EPIC-FE-TESTS · Ini 2.5` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-F)
- **Objetivo:** tests de auth/refresh/SSE; corregir los que codifican el patrón inseguro.
- **Problema actual:** 7 archivos; `AuthProvider.test.jsx` valida localStorage.
- **Impacto:** refactors sin red.
- **Archivos afectados:** `frontend/src/**/*.test.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — ampliación de tests de frontend; sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: los tests conforman contra `api-contract v1` vigente (auth/refresh/SSE).
- **Riesgos:** tests que codifican el patrón inseguro pasan en verde → mitigación: corregir asserts + mocks (token en memoria, no localStorage); flakiness con EventSource → mitigación: mock determinista de EventSource; solape con TST-004 (I108) → mitigación: misma PR (F11-4).
- **Verificación (verde→rojo→verde):** verde: `AuthProvider.test.jsx` valida localStorage (hoy pasa); rojo: test de flujo auth/SSE que verifica token en memoria y reconexión → hoy falla/ausente; verde: tras cubrir auth/refresh/SSE con patrón seguro, la suite pasa.
- **Dependencias:** ISSUE-029, ISSUE-033.
- **DoD:** tests de flujo auth/SSE; patrones seguros.
- **Tasks:** tests; mock EventSource.

#### ISSUE-041 — Polling duplicado (FE-013) — P2
`Programa 5 · EPIC-SSE · Ini 5.1`
- **Objetivo:** derivar salud/conectividad de SSE.
- **Problema actual:** `DeviceConnectivityPanel.jsx:33` (10s), `DeviceHealthPanel.jsx:17` (30s) sondear; SSE ya emite.
- **Impacto:** carga innecesaria.
- **Archivos afectados:** `frontend/src/features/devices/components/DeviceConnectivityPanel.jsx`, `DeviceHealthPanel.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-032.
- **DoD:** sin polling duplicado.
- **Tasks:** consumir SSE; resync puntual.

#### ISSUE-042 — Utilidades de formato duplicadas (FE-014) — P3
`Programa 5 · EPIC-QUALITY · Ini 5.6`
- **Objetivo:** consolidar en `shared/utils/format.js`.
- **Problema actual:** `formatTimeAgo`, `formatUptime`, `formatBytes` duplicadas.
- **Impacto:** divergencias.
- **Archivos afectados:** `frontend/src/shared/utils/format.js`, paneles/páginas.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** utilidades únicas.
- **Tasks:** consolidar; reemplazar call sites.

#### ISSUE-043 — Errores tragados (FE-015) — P3
`Programa 5 · EPIC-QUALITY · Ini 5.6`
- **Objetivo:** toaster central o al menos `console.error`.
- **Problema actual:** decenas de `catch {}`.
- **Impacto:** fallos silenciosos.
- **Archivos afectados:** `useSSE.js`, providers, paneles, pages.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** feedback visible.
- **Tasks:** toaster; revisar catches.

#### ISSUE-044 — alert() nativo (FE-016) — P3
`Programa 5 · EPIC-QUALITY · Ini 5.6`
- **Objetivo:** sistema de toasts.
- **Problema actual:** `BioactiveDashboardPage.jsx:52`.
- **Impacto:** UX bloqueante.
- **Archivos afectados:** `BioactiveDashboardPage.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-043.
- **DoD:** sin alert().
- **Tasks:** toasts.

#### ISSUE-045 — Datos faltantes como 0 en gráficos (FE-017) — P3
`Programa 5 · Ini 5.7`
- **Objetivo:** `null` en datasets.
- **Problema actual:** `TemporalEngine.js:93-96` `d.temp ?? 0`.
- **Impacto:** series distorsionadas.
- **Archivos afectados:** `frontend/src/.../TemporalEngine.js`, `ChartPanel.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** revisar ChartPanel.
- **DoD:** null correcto.
- **Tasks:** datasets null; test.

#### ISSUE-046 — ToggleSwitch como div (FE-018) — P3
`Programa 5 · EPIC-A11Y · Ini 5.7`
- **Objetivo:** `<button role="switch" aria-checked>`.
- **Problema actual:** `ToggleSwitch.jsx:1-16`.
- **Impacto:** sin semántica.
- **Archivos afectados:** `frontend/src/.../ToggleSwitch.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** control semántico.
- **Tasks:** button; aria; test.

#### ISSUE-047 — Tema hardcodeado y FOUC (FE-019) — P3
`Programa 5 · Ini 5.7`
- **Objetivo:** pre-paint + `prefers-color-scheme`.
- **Problema actual:** `index.html:2` `class="dark"`; `ThemeProvider.jsx:6-21`.
- **Impacto:** parpadeo.
- **Archivos afectados:** `frontend/index.html`, `ThemeProvider.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** sin FOUC.
- **Tasks:** pre-hidratación; prefers-color-scheme.

#### ISSUE-048 — Proxy Vite hardcodeado (FE-020) — P3
`Programa 5 · Ini 5.7`
- **Objetivo:** `process.env.VITE_API_PROXY` con fallback.
- **Problema actual:** `vite.config.js:6-12` `http://localhost:3797`.
- **Impacto:** fricción en entornos compartidos.
- **Archivos afectados:** `frontend/vite.config.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** proxy configurable.
- **Tasks:** env var; fallback.

#### ISSUE-049 — Doble fuente de versión (FE-021) — P3
`Programa 5 · Ini 5.7`
- **Objetivo:** manifest generado en pipeline.
- **Problema actual:** `package.json` 1.15.3 vs `public/version-manifest.json` stale.
- **Impacto:** footer inconsistente.
- **Archivos afectados:** `frontend/package.json`, `frontend/public/version-manifest.json`, pipeline.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** CI.
- **DoD:** manifest automático.
- **Tasks:** generar manifest en pipeline.

### 4.3 Firmware (FW-001…FW-010) → ISSUE-050…059

#### ISSUE-050 — Secretos reales en config.h (FW-001) — P0
`Programa 1 · EPIC-CREDENTIALS · Ini 1.8` · Estado: **IN_PROGRESS** (PR-C · avance parcial, cierre con ISSUE-059/052, ver Fase 9 §9.6)
- **Objetivo:** `config.h` con placeholders; credenciales en NVS vía registro; OTA password por dispositivo.
- **Problema actual:** SSIDs reales, `TS_API_KEY`, `MQTT_USER device_001`, `MQTT_PASS mush2device`, `DEVICE_ID` en disco; `ota_handler.cpp:13` password `"mush2ota"`.
- **Impacto:** compromiso total del dispositivo/broker.
- **Archivos afectados:** `firmware/src/config.h`, `firmware/src/ota_handler.cpp`, `firmware/platformio.ini`.
- **Contratos afectados:** `ble-contract.md`, `mqtt-contract.md`.
- **ADR/DDD:** ADR-028 (REQUIRED — identidad MQTT por dispositivo; las credenciales se entregan en el registro y se almacenan en NVS, no en `config.h`) · ADR-013 (INFORMATIVE — estrategia de secretos firmware; contexto). DDD: NOT_APPLICABLE (configuración de firmware; no altera el modelo de dominio). Decisión: NONE (no DECISION-NNN asociada; ADR-028 aceptado es la decisión rectora).
- **Contrato/versión:** `ble-contract v1.0.0` (provisioning BLE, versionado 2026-07-06) — el flujo de entrega de credenciales por provisioning no cambia; `mqtt-contract` (MQTT 3.1.1; credenciales por dispositivo) — sin cambio de versión. Sin cambios de contrato; cambio de almacenamiento (NVS).
- **Riesgos:** dispositivos en campo con credenciales viejas → mitigación: re-registro con token de aprovisionamiento (ISSUE-001) y fallback solo primer arranque (ISSUE-059); compromiso de un dispositivo → mitigación: revocación individual de credenciales (ADR-028); binario con secretos reales → mitigación: placeholders + scan de secretos en CI (ISSUE-076).
- **Verificación (verde→rojo→verde):** verde: `config.h` contiene SSIDs, `TS_API_KEY`, `MQTT_USER device_001`, `MQTT_PASS mush2device` reales (hoy presente); rojo: scan/CI (gitleaks) que falla si el árbol contiene secretos reales → hoy falla; verde: tras placeholders + NVS, el scan pasa y el dispositivo obtiene credenciales por registro.
- **Dependencias:** ISSUE-059 (FW-010 NVS), ISSUE-052 (FW-003 OTA TLS).
- **DoD:** sin secretos reales en el árbol; placeholders.
- **Tasks:** placeholders; NVS; otaPassword por dispositivo.
- **PR-C (2026-08-09, avance parcial):** `ota_handler.cpp` sin password OTA hardcodeada — lee de NVS (`nvsGetOtaPass`) con fallback a placeholder `OTA_PASSWORD`; `ota_nvs` con `nvsGetOtaPass`/`nvsSetOtaPass`/`nvsClearOtaPass`; `platformio.ini` `--auth` a placeholder; `device_manager` persiste/lee credenciales MQTT provisionadas en NVS (ADR-028); `main.ino` usa NVS → registro → defaults al init de MQTT. Pendiente para cierre: ISSUE-059 (NVS completa), ISSUE-052 (OTA TLS), ISSUE-076 (scan de secretos en CI).
- **Ajuste de alcance (2026-08-12, DECISION-012):** `TS_API_KEY` **no se migra a NVS** — queda obsoleta y se elimina junto con el canal ThingSpeak (SUPERsesión de ADR-004 / deprecación). El resto del ISSUE (Wi-Fi creds, MQTT creds, DEVICE_ID, OTA password por dispositivo → placeholders/NVS) **se mantiene íntegro e incrementa su crítica**: MQTT es ahora el canal canónico de telemetría.

#### ISSUE-051 — API key ThingSpeak en claro por HTTP (FW-002) — P0
`Programa 1 · EPIC-TELEMETRY-CHANNEL · Ini 1.9` · Estado: **SUPERSEDED** (DECISION-012, 2026-08-12 — ThingSpeak deprecado; MQTT canal canónico de telemetría; el objetivo se logra deprecando el canal, no endureciéndolo)
- **Objetivo:** HTTPS (`TS_PORT 443` + `WiFiClientSecure` con CA) o consolidar por MQTT.
- **Problema actual:** `thingspeak_client.cpp:11-12` clave en query string de `http://`.
- **Impacto:** clave expuesta; telemetría falsa.
- **Archivos afectados:** `firmware/src/thingspeak_client.cpp`, `firmware/src/config.h`.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-004 (REQUIRED — define ThingSpeak como canal secundario con `api_key` en GET HTTP; **SUPERSEDED por DECISION-012** · el fix modifica el transporte del mismo diseño; DECISION-012 deroga esa opción y la consolida por MQTT, ADR-004 se supersede explícitamente) · ADR-013 (INFORMATIVE — contexto de seguridad en el transporte firmware). DDD: NOT_APPLICABLE (canal de telemetría; sin impacto en el modelo de dominio). Decisión: DECISION-007 · ACCEPTED → **SUPERSEDED por DECISION-012 · ACCEPTED (deprecar ThingSpeak; MQTT como canal canónico)**.
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1; payloads con `protocol`) — sin cambio de versión (telemetría consolida por topics existentes; canal ThingSpeak se elimina). `api-contract` no afectado.
- **Riesgos:** ~~ThingSpeak exige CA real y hostname verificable → mitigación: CA root embebida + verificación de host en `WiFiClientSecure`; consolidar por MQTT cambia el canal → mitigación: supersesión de ADR-004 y fallback HTTPS durante transición; offline/latencia → mitigación: buffer existente en NVS/SPIFFS.~~ **Sustituido por DECISION-012:** detección de dependencias de ThingSpeak residuales (firmware, `thingSpeakSync.js`, docs, DDD) → mitigación: eliminación del canal y limpieza asociada (ISSUE-023 SUPERSEDED, I105 alcance ajustado). Complejidad de deprecación → mitigación: telemetría ya consolidada por MQTT con broker TLS/ACL (I074/I075); sin fallback.
- **Verificación (verde→rojo→verde):** verde: ~~`thingspeak_client.cpp:11-12` construye `http://api.thingspeak.com/update?api_key=...` en claro (hoy presente)~~; rojo: ~~scan/test que falla si la api_key viaja en query string o el transporte es HTTP → hoy falla~~; verde: tras HTTPS+CA (o canal MQTT), el scan pasa y la telemetría va cifrada. **SUPERSEDED:** el objetivo se alcanza eliminando `TS_API_KEY` y el canal ThingSpeak (DEPrecación); sin clave, no hay exposición. Deprecación formal fuera de PR-G.
- **Dependencias:** DECISION-012; TLS/CA (ISSUE-015/075) — **ya aplicadas** (I15/I075 PR-A mergeada). **No depende de I050** para su supersesión.
- **Decisión:** DECISION-012 · ACCEPTED
- **DoD:** ~~sin clave en claro; tráfico cifrado.~~ **SUPERSEDED:** ausencia total del canal ThingSpeak (firmware + backend) en la arquitectura objetivo.
- **Tasks:** ~~HTTPS+CA; o canal MQTT; test.~~ **DEPRECACIÓN (fuera de PR-G):** eliminar `thingspeak_client.cpp`/`TS_*` del firmware; eliminar `thingSpeakSync.js`; limpieza de `api-contract`/DDD/docs; verificación sin referencias.
- **PR-D (2026-08-09, avance parcial):** HTTPS obligatorio en `thingspeak_client.cpp` (`WiFiClientSecure` + `TS_CA_ROOT` embebida en `thingspeak_ca_root.h`), `TS_PORT` 443, clave en header `X-ApiKey` fuera del query string, ADR-004/013 y firmware.md actualizados. **Este avance queda SIN EFECTO operativo por DECISION-012** (el canal se depreca; la clave se elimina). Se reubica el objetivo en la deprecación total.

#### ISSUE-052 — OTA sin TLS ni hash (FW-003) — P1
`Programa 6 · EPIC-OTA-SECURITY · Ini 6.1`
- **Objetivo:** `WiFiClientSecure` + CA/host pinning; SHA-256 obligatorio.
- **Problema actual:** `ota_executor.cpp:16` sin `WiFiClientSecure`; `setCaCert()` stub; SHA-256 opcional.
- **Impacto:** MITM sirve firmware malicioso.
- **Archivos afectados:** `firmware/src/ota_executor.cpp`, `ota_decisor.cpp`, `config.h`.
- **Contratos afectados:** `mqtt-contract.md` (ota/command).
- **ADR/DDD:** ADR-014.
- **Dependencias:** ISSUE-050.
- **DoD:** TLS + hash obligatorio (cumple ADR-014).
- **Tasks:** secure client; CA; hash obligatorio; tests.

#### ISSUE-053 — Reboot count nunca se resetea (FW-004) — P1
`Programa 6 · Ini 6.5`
- **Objetivo:** resetear rebootCount al llegar a `ST_NORMAL`; no contar boots post-OTA como anormales.
- **Problema actual:** `state_machine.cpp:134-154` solo incrementa; `isSafeMode()` ≥5; 5 OTA = modo seguro permanente.
- **Impacto:** 60s de retraso siempre.
- **Archivos afectados:** `firmware/src/state_machine.cpp`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-025 · DDD-005.
- **Dependencias:** ninguna.
- **DoD:** rebootCount reseteado; test nativo.
- **Tasks:** reset; exclusión post-OTA; test.

#### ISSUE-054 — SSR activo en SAFE/OTA (FW-005) — P1
`Programa 6 · EPIC-SAFETY · Ini 6.2`
- **Objetivo:** gate de SSR por estado; safe shutdown real.
- **Problema actual:** `main.ino:172-180`; `taskSSR` sin gate; `otaShutdown` reactivado.
- **Impacto:** sobrecalentamiento durante OTA.
- **Archivos afectados:** `firmware/src/tasks.cpp`, `firmware/src/main.ino`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-010, ADR-014 · DDD-005.
- **Dependencias:** ninguna.
- **DoD:** SSR off en SAFE/OTA.
- **Tasks:** gate por estado; safe shutdown; test.

#### ISSUE-055 — Watchdog cubre 2 de 9 tasks (FW-006) — P1
`Programa 6 · EPIC-WATCHDOG · Ini 6.3`
- **Objetivo:** TWDT/HealthMonitor cubre tasks críticos; alinear ADR-027.
- **Problema actual:** `esp_task_wdt_add(NULL)` solo en taskSSR/taskButton; SWDT solo taskSSR.
- **Impacto:** cuelgues no detectados.
- **Archivos afectados:** `firmware/src/tasks.cpp`, `firmware/src/main.ino`, `health_monitor.cpp`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-027 · DDD-005, DDD-008.
- **Dependencias:** ISSUE-057 (FW-008).
- **DoD:** watchdog cubre 9 tasks.
- **Tasks:** registrar críticos; o recovery HealthMonitor; alinear ADR-027.

#### ISSUE-056 — Concurrencia sin mutex (FW-007) — P1
`Programa 6 · EPIC-CONCURRENCY · Ini 6.4`
- **Objetivo:** mutex por recurso (MQTT, I2C, SPIFFS).
- **Problema actual:** `mqtt.publish*()` multi-core; I2C `Wire.end()/begin()`; SPIFFS sin lock.
- **Impacto:** corrupción de paquetes/lecturas/filesystem.
- **Archivos afectados:** `firmware/src/tasks.cpp`, `health_monitor.cpp`, `mqtt_client.cpp`, SPIFFS.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-012.
- **Dependencias:** ISSUE-055.
- **DoD:** mutex por recurso.
- **Tasks:** mutex; elevar deuda ADR-012.

#### ISSUE-057 — HealthMonitor inconsistente (FW-008) — P2
`Programa 6 · EPIC-WATCHDOG · Ini 6.3`
- **Objetivo:** 8-9 handles reales; corregir log; incluir poller.
- **Problema actual:** `init()` 7 handles, log "8 tasks"; `HB_POLLER` sin handle; taskMonitor NULL.
- **Impacto:** métricas incompletas; logs engañosos.
- **Archivos afectados:** `firmware/src/health_monitor.cpp`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-027.
- **Dependencias:** ISSUE-055.
- **DoD:** handles correctos; log exacto.
- **Tasks:** pasar handles; corregir log; payload poller.

#### ISSUE-058 — Confirmación OTA depende de WiFi (FW-009) — P2
`Programa 6 · Ini 6.6`
- **Objetivo:** reintentar confirmación con WiFi estable; rollback explícito.
- **Problema actual:** `main.ino:300-321` exige WiFi+ST_NORMAL; `abortRollback()` no-op.
- **Impacto:** buen firmware revertido.
- **Archivos afectados:** `firmware/src/main.ino`, OTA decisor.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-014 · DDD-005.
- **Dependencias:** ISSUE-053.
- **DoD:** confirmación desacoplada; rollback real.
- **Tasks:** reintento; separar self-test; rollback.

#### ISSUE-059 — Credenciales MQTT en RAM (FW-010) — P1
`Programa 1 · EPIC-CREDENTIALS · Ini 1.8`
- **Estado:** DONE (PR-M "Firmware Secrets to NVS" mergeado — PR #204; versionado firmware 0.23.4 / root 1.8.16). Cierre formal del Ciclo 1: ver §9.7.
- **Objetivo:** NVS tras primer registro; fallback solo primer arranque; TLS en registro.
- **Problema actual:** `_mqttUser/_mqttPass` en `http_poller.h:78-79`; re-registro por HTTP claro cada boot.
- **Impacto:** credenciales interceptables; identidad compartida.
- **Archivos afectados:** `firmware/src/http_poller.h`, `firmware/src/*` (NVS), registro.
- **Contratos afectados:** `mqtt-contract.md`, `ble-contract.md`.
- **ADR/DDD:** ADR-028 (REQUIRED — credenciales MQTT por dispositivo entregadas por registro y persistidas en NVS; fallback solo primer arranque). DDD: NOT_APPLICABLE (cambio de persistencia de credenciales en firmware; no altera el modelo de dominio). Decisión: NONE.
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1) + `ble-contract` — sin cambio de payloads; el registro sigue bajo el flujo ADR-028. Comportamiento: la credencial se persiste en NVS tras el primer registro y no se re-registra por HTTP claro cada boot. Se documenta la nota de transición en `mqtt-contract.md`.
- **Riesgos:** credenciales en RAM interceptables → mitigación: NVS con fallback solo primer arranque (PR-C avanzó `device_manager`/NVS); re-registro por HTTP claro durante transición → mitigación: TLS en registro (task, requiere PR-L I15) y token de aprovisionamiento (I001); firmware en campo con credenciales viejas → mitigación: re-registro con token de aprovisionamiento (I001) y fallback primer arranque.
- **Verificación (verde→rojo→verde):** verde: `http_poller.h:78-79` declara `_mqttUser/_mqttPass` en RAM y re-registra por HTTP cada boot (hoy pasa); rojo: test nativo que verifica que las credenciales se leen de NVS y que el fallback solo ocurre en el primer arranque → hoy falla; verde: tras NVS + fallback-first-boot, el test pasa y no hay credenciales MQTT en RAM tras el registro.
- **Dependencias:** ISSUE-050, ISSUE-001. **Plan de desbloqueo:** I050 `IN_PROGRESS` (PR-C avanzó NVS parcial); **I59 NO cierra I50 — I52 (F2) sigue obligatorio** (F10-5). I001 `DONE`.
- **DoD:** credenciales en NVS; fallback solo primer arranque.
- **Tasks:** NVS persist; fallback; TLS en registro.

### 4.4 Infraestructura (INF-001…INF-025) → ISSUE-060…084

#### ISSUE-060 — Seed admin/admin123 en producción (INF-001) — P0
`Programa 1 · EPIC-BOOTSTRAP · Ini 1.1`
- **Objetivo:** no ejecutar `seed.js` en producción; admin por CLI/secret.
- **Problema actual:** `backend/src/seed.js:285`; `Dockerfile:38` CMD `node sync-db.js && node seed.js && node server.js`.
- **Impacto:** credenciales públicas de SUPER_ADMIN.
- **Archivos afectados:** `backend/src/seed.js`, `Dockerfile`, `render.yaml`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-029 (REQUIRED — aislamiento de ambientes y `ConfigurationService` fail-fast; el guard de `NODE_ENV` para seed es parte de esta política) · DDD-009 (INFORMATIVE — modelo de configuración/entorno; contexto). Decisión: DECISION-008 · ACCEPTED (seed solo `development` + fuera del CMD).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de arranque/infraestructura (quién y cuándo corre `seed.js`), no de protocolo.
- **Riesgos:** entorno sin `NODE_ENV` explícito en deploy → mitigación: valor por defecto seguro (rechazar seed) + `validate()` fail-fast (ISSUE-072); admin perdido al no correr seed → mitigación: creación por CLI/secret documentada; seed manual en prod → mitigación: doble guard (`NODE_ENV` + flag explícito).
- **Verificación (verde→rojo→verde):** verde: `Dockerfile:38` CMD ejecuta `node seed.js` en cualquier entorno y crea `admin/admin123` (hoy `seed.js:285`); rojo: test/healthcheck que arranca con `NODE_ENV=production` y verifica que seed NO corre y que no existen credenciales por defecto → hoy falla; verde: tras quitar seed del CMD + guard, prod arranca sin seed y sin credenciales por defecto.
- **Dependencias:** ISSUE-061 (sync).
- **Decisión:** DECISION-008 · ACCEPTED
- **DoD:** CMD sin seed; guard NODE_ENV; admin generado.
- **Tasks:** quitar seed del CMD; guard; admin CLI.

#### ISSUE-061 — sync({alter:true}) en producción (INF-002) — P0
`Programa 1 · EPIC-BOOTSTRAP · Ini 1.2`
- **Objetivo:** migraciones versionadas; sacar sync del CMD.
- **Problema actual:** `sync-db.js:16`; `Dockerfile:38`; boot 5-10 min.
- **Impacto:** corrupción de datos en cada deploy.
- **Archivos afectados:** `backend/src/sync-db.js`, `Dockerfile`, migraciones (nuevas), `database.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-005 (REQUIRED — PostgreSQL + Sequelize; el ADR documenta el uso de `sync-db.js`, el fix a migraciones versionadas requiere nota de supersesión en la sección de sincronización) · ADR-013 (INFORMATIVE — contexto de seguridad del esquema) · DDD-007 (INFORMATIVE — roadmap de migración DDD; contexto). Decisión: DECISION-004 · ACCEPTED.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de gestión de esquema (migraciones versionadas vs `sync({alter:true})`), no de protocolo.
- **Riesgos:** `alter:true` borra columnas en cada deploy → mitigación: migraciones versionadas con snapshot inicial idempotente; boot 5–10 min → mitigación: migraciones incrementales; esquema sin migración inicial → mitigación: baseline snapshot versionado; `sync` manual en prod → mitigación: quitar del CMD (`Dockerfile:38`) en el mismo cambio.
- **Verificación (verde→rojo→verde):** verde: `sync-db.js:16` ejecuta `sequelize.sync({alter:true})` en cada boot y modifica el esquema (hoy pasa); rojo: test que arranca en prod con un esquema previo y verifica que NO se modifica automáticamente el esquema → hoy falla (alter toca la BD); verde: tras migraciones versionadas, el esquema solo cambia vía migración explícita.
- **Dependencias:** DECISION-004; ISSUE-070 (backup pre-deploy — plan de desbloqueo: snapshot manual pre-deploy cubre el check antes de resolver ISSUE-071).
- **Decisión:** DECISION-004 · ACCEPTED
- **DoD:** migraciones versionadas; sin sync en CMD.
- **Tasks:** adoptar CLI migraciones; snapshot inicial; quitar sync.

#### ISSUE-062 — Release sin tag ni merge (INF-003) — P1
`Programa 8 · EPIC-RELEASE-TRAIN · Ini 8.1`
- **Objetivo:** taggear retroactivo; merge a `main`; automatizar.
- **Problema actual:** solo tags `v1.8.0`, `baseline-green-precleanup`; `main` v1.8.2.
- **Impacto:** releases no trazables; rollback imposible.
- **Archivos afectados:** git tags/ramas, `scripts/release.bat`, `ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-067 (deploy), ISSUE-082 (release manual).
- **DoD:** HEAD con tag; `main` == release.
- **Tasks:** tags retroactivos; merge; automatizar.

#### ISSUE-063 — PG18 en CI vs PG16 runtime (INF-004) — P2
`Programa 8 · EPIC-ENV-CONSISTENCY · Ini 8.3` · Estado: **DONE** (PR-B, 2026-08-12 — PG16 única versión en CI/compose/docs; verificado green→red→green)
- **Objetivo:** PG16 en CI, compose y docs.
- **Problema actual:** `ci.yml:71` postgres:18; compose/docs postgres:16.
- **Impacto:** tests verdes que fallan en prod.
- **Archivos afectados:** `.github/workflows/ci.yml`, `docker-compose.yml`, `deployment.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — consistencia de entorno (versión de PostgreSQL); sin ADR/DDD nuevo. Contexto: ADR-029 (INFORMATIVE — aislamiento de ambientes; runtime validado = runtime de prod).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de versión de la base de datos de CI/entorno, no de protocolo.
- **Riesgos:** features de PG18 usadas en migraciones → mitigación: validar suite completa contra PG16 local; drift entre CI y prod → mitigación: una sola versión PG (16) en CI, compose y docs; migraciones no reversibles → mitigación: verificar con la versión objetivo.
- **Verificación (verde→rojo→verde):** verde: `ci.yml:71` `postgres:18` y compose/docs `postgres:16` (hoy pasa, inconsistente); rojo: check de CI/compose que exige una única versión PG → hoy falla; verde: tras fijar 16 en todos los lugares, un solo PG.
- **Dependencias:** ISSUE-064 (Node).
- **DoD:** una sola versión PG.
- **Tasks:** fijar 16; actualizar docs.

#### ISSUE-064 — Node 24 CI / 22 Docker / 20+ docs (INF-005) — P2
`Programa 8 · EPIC-ENV-CONSISTENCY · Ini 8.3` · Estado: **DONE** (PR-B, 2026-08-12 — Node 22 en CI/Docker/docs; verificado green→red→green)
- **Objetivo:** unificar Node 22 LTS.
- **Problema actual:** `ci.yml:12` 24; `Dockerfile:2,19` node:22-alpine; docs 20+.
- **Impacto:** runtime validado ≠ prod.
- **Archivos afectados:** `.github/workflows/ci.yml`, `Dockerfile`, docs.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — consistencia de entorno (versión de Node); sin ADR/DDD nuevo. Contexto: ADR-029 (INFORMATIVE — runtime validado = runtime de prod).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de versión de Node de CI/Docker/docs, no de protocolo.
- **Riesgos:** features de Node 24 usadas en el código → mitigación: validar suite completa con Node 22; CI en 24 vs Docker 22 → mitigación: unificar a 22 LTS en todos los lugares; dependencias con engines 20+ → mitigación: docs actualizadas a 20+ con runtime recomendado 22.
- **Verificación (verde→rojo→verde):** verde: `ci.yml` `NODE_VERSION` 24 vs `Dockerfile` `node:22-alpine` y docs 20+ (hoy pasa, inconsistente); rojo: check de versión única de Node en CI/Docker/docs → hoy falla; verde: tras unificar 22, runtime validado = prod.
- **Dependencias:** ISSUE-072 (lockfile).
- **DoD:** Node 22 en todos lados.
- **Tasks:** unificar 22; docs.

#### ISSUE-065 — Broker MQTT no desplegado (INF-006) — P0
`Programa 1 · EPIC-BROKER · Ini 1.6` · Estado: **IN_PROGRESS** (PR-G ✅ plan de despliegue 2026-08-10 · cierre diferido a ISSUE-075/081, ver Fase 9 §9.6/F9-3)
- **Objetivo:** desplegar Mosquitto; poblar `MQTT_BROKER_URL/PASS`; TLS.
- **Problema actual:** `render.yaml:39-48` envVars comentadas; `env.js:80` default localhost.
- **Impacto:** núcleo del producto inoperativo en prod.
- **Archivos afectados:** `render.yaml`, `config/env.js`, `services/mqttBridge.js`, `docker-compose.yml`.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-023 (REQUIRED — infraestructura MQTT segura con TLS y broker desplegable; autoridad del despliegue) · ADR-028 (REQUIRED — identidad por dispositivo y provisioning; condiciona el poblar de credenciales). DDD: NOT_APPLICABLE (infraestructura de broker; sin impacto en el modelo de dominio). Decisión: DECISION-006 · ACCEPTED (contenedor Mosquitto + TLS 8883).
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1; payloads con `protocol`) — sin cambio de versión: el broker pasa a ser el de producción con TLS 8883, topics y protocolo intactos; se actualiza la sección de endpoints/entorno del contrato.
- **Riesgos:** broker público aún referenciado durante la transición → mitigación: `render.yaml:39-48` poblado con el broker prod desde el deploy y default `env.js:80` sin uso en prod; TLS mal configurado → mitigación: test de conectividad sin TLS que debe fallar en prod (ISSUE-015); credenciales compartidas del bridge → mitigación: identidad por dispositivo (ADR-028) en el mismo ciclo.
- **Verificación (verde→rojo→verde):** verde: `render.yaml:39-48` envVars comentadas y `env.js:80` default `mqtt://localhost:1883` → broker inoperativo en prod (hoy pasa); rojo: test de despliegue que verifica `MQTT_BROKER_URL` poblado y `mqttBridge` conectado → hoy falla; verde: tras desplegar broker + env vars + TLS, el bridge conecta y la telemetría fluye cifrada.
- **Dependencias:** DECISION-006; ISSUE-075 (TLS), ISSUE-081 (provisioning contenedor).
- **Decisión:** DECISION-006 · ACCEPTED
- **DoD:** broker operativo con TLS; bridge conecta.
- **Tasks:** desplegar broker; env vars; TLS; verificar.
- **PR-G (2026-08-10, plan de despliegue):** `docs/operations/broker-deployment.md` (arquitectura, pasos, secretos, rollback, migración, verificación; host condicionado a DECISION-011); `docker/mosquitto/prod/acl.conf` alineado con contrato (`alarm`, `ota/#`, `actuators`); `mosquitto.prod.conf` con bloque TLS 8883 documentado/comentado listo para activar (I75); `mqtt-contract.md` §2.3 Entorno de producción; ADR-023 anexo SUPERSESIÓN (autoridad de despliegue DECISION-006); REG-008 (13 tests) verde; `render.yaml` sin cambios (envVars MQTT se fijan al ejecutar el plan — no inventar valores). Sin deploy en el ciclo; ISSUE-065 permanece `IN_PROGRESS` (F9-3).

#### ISSUE-066 — Sin script test en raíz (INF-007) — P3
`Programa 2 · EPIC-CI-GATES · Ini 2.6` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-E)
- **Objetivo:** script `test` en raíz (backend+frontend).
- **Problema actual:** `package.json:7` echo error.
- **Impacto:** sin puerta monorepo.
- **Archivos afectados:** `package.json` (root).
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — orquestación de tests monorepo (script raíz); sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: script de raíz que orquesta suites existentes; no es protocolo.
- **Riesgos:** suite backend y frontend rotas por separado → mitigación: arreglar deps del ciclo (I79, REG-002) antes de integrar el script; tiempo de CI → mitigación: orquestación con scripts paralelos/por paquete; dependencia de I079 (FE en CI) → mitigación: PR-E en Oleada 2 (F11-6).
- **Verificación (verde→rojo→verde):** verde: `package.json:7` `echo "Error: no test specified"` (hoy pasa el echo); rojo: `pnpm test` en raíz que espera ejecutar las suites backend+frontend → hoy falla; verde: tras el script, `pnpm test` raíz ejecuta y pasa ambas suites.
- **Dependencias:** ISSUE-079 (FE en CI).
- **DoD:** `pnpm test` raíz verde.
- **Tasks:** script; integración suites.

#### ISSUE-067 — Sin deploy automático (INF-008) — P1
`Programa 8 · EPIC-DEPLOY · Ini 8.2`
- **Objetivo:** job de deploy en push a `main`/tag + verificación de salud.
- **Problema actual:** `ci.yml` solo compila/testea.
- **Impacto:** releases manuales no reproducibles.
- **Archivos afectados:** `.github/workflows/ci.yml`, render config.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-062, ISSUE-068 (healthcheck).
- **DoD:** deploy automático verificado.
- **Tasks:** job deploy; healthcheck; trigger.

#### ISSUE-068 — Seed inyecta credenciales ThingSpeak falsas (INF-009) — P0
`Programa 1 · EPIC-BOOTSTRAP · Ini 1.1`
- **Objetivo:** excluir seed del arranque productivo; separar catálogo de fixtures.
- **Problema actual:** `seed.js:456-467` escribe readKey/writeKey falsos.
- **Impacto:** corrompe fuente de verdad de integraciones.
- **Archivos afectados:** `backend/src/seed.js`, `Dockerfile`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-029 (REQUIRED — aislamiento de ambientes; separar catálogo idempotente de fixtures productivas es parte de la política). DDD: NOT_APPLICABLE (separación de datos de arranque; no altera el modelo de dominio). Decisión: DECISION-008 · ACCEPTED (catálogo idempotente separado de fixtures).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de qué se siembra en cada ambiente (fixtures vs catálogo), no de protocolo.
- **Riesgos:** fixtures falsas ya presentes en BD prod → mitigación: limpieza/actualización vía migración o admin documentado; confundir catálogo legítimo con fixtures → mitigación: fuentes separadas e idempotentes; seed vuelve a correr → mitigación: quitar del CMD (`Dockerfile:38`) en el mismo cambio.
- **Verificación (verde→rojo→verde):** verde: `seed.js:456-467` escribe readKey/writeKey falsos en dispositivos en cada arranque (hoy pasa); rojo: test en entorno productivo que verifica que NO se escriben credenciales falsas de integración → hoy falla; verde: tras separar catálogo/fixtures y excluir seed del arranque, no se escriben credenciales falsas en prod.
- **Dependencias:** ISSUE-060.
- **Decisión:** DECISION-008 · ACCEPTED
- **DoD:** sin fixtures en prod.
- **Tasks:** separar catálogo/fixtures; excluir seed.

#### ISSUE-069 — Sin HEALTHCHECK (INF-010) — P2
`Programa 7 · EPIC-HEALTH · Ini 7.1`
- **Objetivo:** HEALTHCHECK sobre `/health` + `depends_on: condition: service_healthy`.
- **Problema actual:** Dockerfile sin HEALTHCHECK; compose sin condición.
- **Impacto:** races de arranque.
- **Archivos afectados:** `Dockerfile`, `docker-compose.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-061, ISSUE-065.
- **DoD:** healthcheck operativo.
- **Tasks:** HEALTHCHECK; compose condition; start_period.

#### ISSUE-070 — Backups no automatizados (INF-011) — P0
`Programa 1 · EPIC-BACKUP · Ini 1.7`
- **Objetivo:** scheduler + rotación + verificación de restore; RPO/RTO real.
- **Problema actual:** `scripts/backup-db.js` sin scheduler; runbook refiere script inexistente.
- **Impacto:** pérdida total sin recuperación.
- **Archivos afectados:** `scripts/backup-db.js`, Render cron, docs de runbook.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — ningún ADR/DDD existente cubre backups/DR (se documenta en este ISSUE y se resuelve con DECISION-011). Justificación: sin ADR/DDD de backup en el inventario actual (ADR-001…033, DDD-001…009). Decisión: DECISION-011 · PENDING (bloquea promoción a READY).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de operación (scheduler + rotación + restore), no de protocolo.
- **Riesgos:** pérdida total de datos por falta de backup → mitigación: scheduler + rotación con verificación de restore; restore nunca probado → mitigación: verificación mensual (P11.1/EPIC-DR); plan free de Render no persistente → mitigación: depende de DECISION-011 (plan pago o VPS/IaC) — ISSUE-071.
- **Verificación (verde→rojo→verde):** verde: `scripts/backup-db.js` existe sin scheduler y el runbook refiere un script inexistente (hoy estado actual); rojo: runbook/test que exige backup programado y restauración verificada → hoy falla; verde: tras scheduler + rotación + restore verificado (con DECISION-011), el backup es programado y restaurable.
- **Dependencias:** ISSUE-071 (plan free).
- **Decisión:** DECISION-011 · PENDING
- **DoD:** backup programado y restaurable.
- **Tasks:** cron; rotación; restore verificado; documentar RPO/RTO.

#### ISSUE-071 — Plan free (INF-012) — P1
`Programa 1 · EPIC-BACKUP · Ini 1.7`
- **Objetivo:** plan pago o VPS/IaC; volumen persistente; backups gestionados.
- **Problema actual:** `render.yaml:5,52` plan free.
- **Impacto:** downtime, pérdida de logs, DB pausada.
- **Archivos afectados:** `render.yaml`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-067, ISSUE-070.
- **Decisión:** DECISION-011 · PENDING
- **DoD:** servicio 24/7 con persistencia.
- **Tasks:** plan/volumen; alertas.

#### ISSUE-072 — JWT_SECRET default conocido (INF-013) — P2
`Programa 1 · EPIC-BOOTSTRAP · Ini 1.2`
- **Objetivo:** `validate(env)` en sync-db/seed; fail-fast.
- **Problema actual:** `env.js:58` fallback; `ConfigurationService.validate()` no llamado antes de sync/seed.
- **Impacto:** forja de JWT; BD modificada antes de fallar.
- **Archivos afectados:** `config/env.js`, `services/ConfigurationService.js`, `sync-db.js`, `seed.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-029 (REQUIRED — `ConfigurationService` fail-fast y aislamiento de ambientes; `validate()` debe correr antes de sync/seed) · ADR-032 (INFORMATIVE — validación de configuración; contexto). Decisión: NONE.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: cambio de bootstrap (fail-fast de configuración), no de protocolo.
- **Riesgos:** fallar antes de sync/seed rompe arranques con config incompleta en dev → mitigación: defaults seguros solo para desarrollo (guard de ambiente) y mensaje claro con la variable faltante; BD modificada antes de fallar → mitigación: `validate()` ejecutado al inicio de `sync-db.js`/`seed.js` antes de tocar el esquema; CI sin `JWT_SECRET` → mitigación: `.env.development`/defaults de desarrollo permitidos por el guard.
- **Verificación (verde→rojo→verde):** verde: `env.js:58` fallback `'dev-secret-change-in-production'` y `validate()` solo se llama en `server.js:18` (hoy pasa); rojo: test que ejecuta `sync-db.js`/`seed.js` con `NODE_ENV=production` y JWT_SECRET default esperando fallo antes de tocar BD → hoy no falla; verde: tras `validate()` al inicio de sync/seed, el proceso aborta con error claro y no modifica la BD.
- **Dependencias:** ISSUE-060, ISSUE-061. **Satisfechas** (ambas `DONE`).
- **DoD:** fail-fast de config.
- **Tasks:** validate al inicio; tests.

#### ISSUE-073 — Lockfile no estricto (INF-014) — P2
`Programa 8 · EPIC-ENV-CONSISTENCY · Ini 8.3` · Estado: **DONE** (PR-B, 2026-08-12 — frozen-lockfile en CI y Docker, sin fallback; verificado green→red→green)
- **Objetivo:** `--frozen-lockfile` en Docker y CI; pnpm con corepack.
- **Problema actual:** `Dockerfile:12,28` fallback; `ci.yml:96,120` install plano.
- **Impacto:** builds no reproducibles.
- **Archivos afectados:** `Dockerfile`, `.github/workflows/ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — reproducibilidad de builds (lockfile); sin ADR/DDD nuevo. Contexto: ADR-029 (INFORMATIVE — entorno reproducible).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de instalación de dependencias (lockfile estricto), no de protocolo.
- **Riesgos:** lockfile desactualizado rompe CI → mitigación: regenerar lockfiles con pnpm + corepack antes de aplicar `--frozen-lockfile`; pnpm no disponible → mitigación: `corepack enable`/`corepack use pnpm@version`; builds no reproducibles → mitigación: `--frozen-lockfile` en Docker y CI.
- **Verificación (verde→rojo→verde):** verde: `Dockerfile:12,28` con fallback y `ci.yml:96,120` install plano (hoy pasa, no estricto); rojo: CI con `--frozen-lockfile` que falla si hay drift de lockfile → hoy no lo aplica; verde: tras frozen-lockfile + corepack, installs reproducibles.
- **Dependencias:** ISSUE-064.
- **DoD:** installs reproducibles.
- **Tasks:** frozen-lockfile; corepack.

#### ISSUE-074 — MQTT TLS deshabilitado y ACL sin alarm (INF-015) — P1
`Programa 1 · EPIC-BROKER · Ini 1.6` · Estado: **DONE** (PR-A, 2026-08-12 — TLS 8883 activo + ACL alarm; verificado green→red→green y handshake local)
- **Objetivo:** activar 8883 con certs reales; añadir `alarm` a ACL prod.
- **Problema actual:** listener 8883 comentado; `acl.conf` prod sin `mush2/+/alarm`.
- **Impacto:** tráfico en claro; alarmas no fluyen.
- **Archivos afectados:** `docker/mosquitto/prod/mosquitto.prod.conf`, `docker/mosquitto/prod/acl.conf`, certs.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-023 (REQUIRED — infraestructura MQTT segura: TLS 8883 obligatorio y ACL por topic) · ADR-028 (INFORMATIVE — identidad por dispositivo; condiciona el modelo de credenciales en ACL). DDD: NOT_APPLICABLE (configuración de broker; no altera el modelo de dominio). Decisión: DECISION-006 · ACCEPTED (contenedor Mosquitto + TLS 8883).
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1) — activación del transporte TLS 8883 definido en §2.3 (entorno de producción) y topic `mush2/+/alarm` ya documentado. Sin cambio de versión: topics y payloads intactos; se actualiza el estado del despliegue, no el contrato.
- **Riesgos:** certs reales en el árbol → mitigación: certs se provisionan vía plan de despliegue/secretos (`broker-deployment.md`), nunca en repo; listener 8883 sin cert válido rompe el arranque de Mosquitto → mitigación: validar certs antes de activar el listener y test local de handshake TLS; tráfico en claro durante la transición → mitigación: activar TLS antes de retirar 1883 (I075); ACL `alarm` faltante → mitigación: alinear con `mqtt-contract` y verificar con mosquitto (REG-008).
- **Verificación (verde→rojo→verde):** verde: `mosquitto.prod.conf` con listener 8883 comentado y `acl.conf` prod sin `mush2/+/alarm` (hoy pasa, falencias presentes); rojo: test local de Mosquitto que espera listener TLS 8883 funcional y ACL que permite `mush2/+/alarm` → hoy falla; verde: tras activar certs + listener + ACL, handshake TLS 8883 OK y `alarm` autorizado.
- **Dependencias:** ISSUE-065.
- **Decisión:** DECISION-006 · ACCEPTED
- **DoD:** TLS 8883 activo; ACL con alarm.
- **Tasks:** certs; listener; ACL.

#### ISSUE-075 — compose expone 1883 al host (INF-016) — P2
`Programa 1 · EPIC-BROKER · Ini 1.6` · Estado: **DONE** (PR-A, 2026-08-12 — compose solo 8883 TLS; verificado green→red→green)
- **Objetivo:** no publicar 1883 al host; solo 8883 TLS.
- **Problema actual:** `docker-compose.yml:20-21` `1883:1883`.
- **Impacto:** broker en claro alcanzable.
- **Archivos afectados:** `docker-compose.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-023 (REQUIRED — infraestructura MQTT segura: no exponer el broker en claro al host). DDD: NOT_APPLICABLE (configuración de compose; no altera el modelo de dominio). Decisión: DECISION-006 · ACCEPTED.
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1) — §2.3 solo 8883 TLS expuesto. Sin cambio de versión (transporte ya definido; se elimina la exposición en claro).
- **Riesgos:** clientes legacy aún en 1883 → mitigación: migrar a `mqtts://` antes de retirar el puerto (I15/I074); puerto 8883 ocupado en el host → mitigación: configuración explícita de bind; tráfico en claro alcanzable → mitigación: quitar `1883:1883` y publicar solo `8883`.
- **Verificación (verde→rojo→verde):** verde: `docker-compose.yml:20-21` expone `1883:1883` al host (hoy pasa, inseguro); rojo: verificación de compose que exige que NO se publique 1883 y sí 8883 → hoy falla; verde: tras quitar 1883 y publicar 8883, solo TLS alcanzable.
- **Dependencias:** ISSUE-074.
- **DoD:** solo 8883 expuesto.
- **Tasks:** quitar 1883; publicar 8883.

#### ISSUE-076 — CI sin lint/scanning/audit (INF-017) — P3
`Programa 2 · EPIC-CI-GATES · Ini 2.6` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-E)
- **Objetivo:** `pnpm audit`/osv-scanner + gitleaks en PR + lint.
- **Problema actual:** sin lint, sin gitleaks, sin Dependabot.
- **Impacto:** secretos/vulnerabilidades no detectados.
- **Archivos afectados:** `.github/workflows/ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — gates de CI (audit/scanning/lint); sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de política de CI (gates), no de protocolo.
- **Riesgos:** gitleaks marca falsos positivos (placeholders/ejemplos) → mitigación: allowlist documentada para valores no secretos; `pnpm audit` con vulnerabilidades sin fix → mitigación: osv-scanner + Dependabot con política de severidad; CI más lento → mitigación: jobs separados y caché; secretos reales aún en `config.h` (I50) → mitigación: el gate de scanning se activa cuando I50 avanza a placeholders (PR-G).
- **Verificación (verde→rojo→verde):** verde: CI sin lint, sin gitleaks, sin audit (hoy pasa, gates ausentes); rojo: gitleaks en PR que detecta secretos reales en el árbol → hoy no se ejecuta; verde: tras los gates, un PR con secreto real queda bloqueado y `pnpm audit`/osv-scanner corren en cada PR.
- **Dependencias:** ISSUE-066.
- **DoD:** gates de audit/scanning.
- **Tasks:** audit; gitleaks; lint compartido.

#### ISSUE-077 — Docs de despliegue desactualizadas (INF-018) — P3
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6`
- **Objetivo:** `deployment.md` al estado real.
- **Problema actual:** `deployment.md:45` seed path, `:16` nodemon, `:38` PG18.
- **Impacto:** procedimientos que fallan.
- **Archivos afectados:** `docs/operations/deployment.md` (o ruta real).
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-063.
- **DoD:** docs correctas.
- **Tasks:** actualizar comandos/versiones.

#### ISSUE-078 — Drift version-manifest (INF-019) — P3
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6`
- **Objetivo:** regenerar manifest o validar en CI.
- **Problema actual:** manifest backend 1.7.0 vs 1.6.1.
- **Impacto:** UI/versión incorrecta.
- **Archivos afectados:** `version-manifest.json`, pipeline.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-062.
- **DoD:** manifest sincronizado.
- **Tasks:** regenerar; validar CI.

#### ISSUE-079 — Imágenes base con tags flotantes (INF-020) — P3
`Programa 8 · EPIC-ENV-CONSISTENCY · Ini 8.3` · Estado: **DONE** (PR-B, 2026-08-12 — imágenes pinneadas a digest en Dockerfile y compose; verificado green→red→green)
- **Objetivo:** pin a digest o renovación programada.
- **Problema actual:** `node:22-alpine`, `postgres:16-alpine`, `eclipse-mosquitto:2`.
- **Impacto:** builds no reproducibles.
- **Archivos afectados:** `Dockerfile`, `docker-compose.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — reproducibilidad de builds (digests de imágenes base); sin ADR/DDD nuevo. Contexto: ADR-029 (INFORMATIVE — entorno reproducible).
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de imágenes base de Docker, no de protocolo.
- **Riesgos:** digest inexistente/retirado rompe build → mitigación: renovación programada (Dependabot) y verificación de que el digest existe; CVE en imagen pinneada → mitigación: schedule de actualización y alerta de seguridad; tags flotantes → mitigación: pin a digest o política de renovación explícita.
- **Verificación (verde→rojo→verde):** verde: `node:22-alpine`, `postgres:16-alpine`, `eclipse-mosquitto:2` con tags flotantes (hoy pasa, no reproducible); rojo: check de digests en `Dockerfile`/`docker-compose.yml` → hoy falla; verde: tras pin a digest (o renovación programada), builds reproducibles.
- **Dependencias:** ISSUE-073.
- **DoD:** imágenes pinneadas.
- **Tasks:** digests; renovación.

#### ISSUE-080 — Frontend en CI solo compila (INF-021) — P2
`Programa 2 · EPIC-CI-GATES · Ini 2.6` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-E; fusionado con ISSUE-109)
- **Objetivo:** `pnpm test` en job frontend.
- **Problema actual:** `ci.yml:122-123` solo build.
- **Impacto:** regresiones UI sin detectar.
- **Archivos afectados:** `.github/workflows/ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — tests de frontend en CI; sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de job de CI (ejecutar `pnpm test` FE), no de protocolo.
- **Riesgos:** tests FE flakies en CI → mitigación: tests deterministas (mock de timers/EventSource); tiempo de CI → mitigación: job separado con caché; suite FE rota → mitigación: PR-F (I040/I108) antes o junto al job; fusión con TST-005 (I109) → mitigación: una sola implementación en PR-E (F11-5).
- **Verificación (verde→rojo→verde):** verde: `ci.yml:122-123` job frontend solo build (hoy pasa, sin tests); rojo: CI frontend que exige `pnpm test` → hoy no se ejecuta; verde: tras añadir el test al job, regresiones UI se detectan en CI.
- **Dependencias:** ISSUE-066.
- **DoD:** tests frontend en CI.
- **Tasks:** añadir test.

#### ISSUE-081 — Provisioning MQTT inoperable en imagen prod (INF-022) — P2
`Programa 8 · EPIC-PROVISIONING-CONTAINER · Ini 8.4`
- **Objetivo:** provisioning por dispositivo funcional en el contenedor.
- **Problema actual:** `env.js:85-89` escribe en `docker/mosquitto/...`; Dockerfile no copia `docker/` ni instala `mosquitto-clients`.
- **Impacto:** dispositivos sin credenciales.
- **Archivos afectados:** `Dockerfile`, `config/env.js`, `services/mosquittoProvisioningService.js`, `.dockerignore`.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-028.
- **Dependencias:** ISSUE-065, ISSUE-074.
- **DoD:** provisioning en contenedor.
- **Tasks:** volumen compartido; mosquitto_passwd; o servicio externo.

#### ISSUE-082 — Release manual (INF-023) — P2
`Programa 8 · EPIC-RELEASE-TRAIN · Ini 8.1`
- **Objetivo:** GitHub Action con changesets.
- **Problema actual:** `scripts/release.bat` manual.
- **Impacto:** releases inconsistentes.
- **Archivos afectados:** `.github/workflows/`, `scripts/release.bat`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-062.
- **DoD:** releases automatizadas.
- **Tasks:** changesets/action.

#### ISSUE-083 — Toolchain firmware no pinneada (INF-024) — P3
`Programa 8 · EPIC-FW-TOOLCHAIN · Ini 8.5` · Estado: **DONE** (PR-B, 2026-08-12 — python 3.11 + platformio==6.1.19 fijos en CI; verificado green→red→green)
- **Objetivo:** fijar PlatformIO/python; cache.
- **Problema actual:** `ci.yml:24,27` python 3.12 + pip platformio latest.
- **Impacto:** builds no reproducibles.
- **Archivos afectados:** `.github/workflows/ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — reproducibilidad del toolchain firmware (PlatformIO/python); sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: el cambio es de versión del toolchain de CI, no de protocolo.
- **Riesgos:** pin de versión que rompe builds → mitigación: fijar versión conocida y verificar build antes de subir; caché obsoleta → mitigación: key de caché con hash del entorno; python 3.12 vs 3.11 → mitigación: `setup-python` con versión fija (3.11).
- **Verificación (verde→rojo→verde):** verde: `ci.yml:24,27` python 3.12 + `pip install platformio` latest (hoy pasa, no reproducible); rojo: check de versiones fijas de toolchain en CI → hoy falla; verde: tras fijar PlatformIO/python + cache, builds reproducibles.
- **Dependencias:** ninguna.
- **DoD:** toolchain pinneada.
- **Tasks:** fijar versiones; cache.

#### ISSUE-084 — Secretos locales en claro (INF-025) — P3
`Programa 1 · EPIC-CREDENTIALS · Ini 1.8` (sub-tarea de FW-001; también INF-017)
- **Estado:** IN_PROGRESS (PR-M "Firmware Secrets to NVS" mergeado — PR #204; NVS migration + `.gitignore` + checklist `docs/security/secrets-checklist.md`). Cierre (scanning automático) diferido a ISSUE-076 (F1, CI gates) — ver §9.7.
- **Objetivo:** migrar firmware a NVS; secret scanning; checklist.
- **Problema actual:** `.env*` y `config.h` con credenciales en el working tree (gitignored).
- **Impacto:** leak accidental.
- **Archivos afectados:** `firmware/src/config.h`, `.gitignore`.
- **Contratos afectados:** —.
- **ADR/DDD:** N/A — sin ADR/DDD nuevo; contexto de manejo de credenciales cubierto por ADR-028. Justificación: el cambio es de gestión de secretos locales (gitignore + NVS + checklist), no de modelo de dominio. Decisión: NONE.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: cambio de almacenamiento de secretos en el working tree, no de protocolo.
- **Riesgos:** credenciales ya committeadas en git history → mitigación: checklist + `.gitignore`; scanning automático no disponible hasta I076 (F1) → mitigación: checklist documentado como evidencia del avance parcial; `.env*` ignorado rompe entorno local dev → mitigación: `.env.example` con placeholders documentado.
- **Verificación (verde→rojo→verde):** verde: `.env*` y `config.h` con credenciales en el working tree (gitignored) (hoy pasa); rojo: test/scan de secretos que verifica que no existen credenciales reales en el árbol → hoy falla; verde: tras `.gitignore` + checklist (y NVS de I59 en PR-M), el scan manual pasa y el avance queda documentado; scanning automático pendiente de I076 (F1).
- **Dependencias:** ISSUE-076. **Plan de desbloqueo cross-ciclo:** avance parcial en PR-M (NVS + `.gitignore` + checklist); scanning automático con I076 (F1).
- **DoD:** sin secretos locales; scanning.
- **Tasks:** NVS; scanning; checklist.

### 4.5 Documentación (DOC-001…DOC-020) → ISSUE-085…104

#### ISSUE-085 — ADR-020 Run vs CultivationCycle (DOC-001) — P1
`Programa 3 · EPIC-ADR-COMPLIANCE · Ini 3.1`
- **Objetivo:** decidir migrar o superar ADR-020.
- **Problema actual:** ADR promete `runs`; persiste `CultivationCycle`.
- **Impacto:** brecha arquitectónica.
- **Archivos afectados:** `docs/ADR/ADR-020-run-replaces-cultivationcycle.md`, `backend/src/models/CultivationCycle.js`, `backend.md`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-020 · DDD-001.
- **Dependencias:** DECISION-002.
- **Decisión:** DECISION-002 · ACCEPTED
- **DoD:** supersesión o migración verificable.
- **Tasks:** nota de supersesión o migración; actualizar docs.

#### ISSUE-086 — ADR-022 HistoryService sin implementar (DOC-002) — P1
`Programa 3 · EPIC-ADR-COMPLIANCE · Ini 3.2`
- **Objetivo:** implementar o marcar superado.
- **Problema actual:** `getRunTimeline/getRunSummary` aceptados sin implementar.
- **Impacto:** promesa incumplida.
- **Archivos afectados:** `docs/ADR/ADR-022-history-as-active-service.md`, backend.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-022.
- **Dependencias:** DECISION-003.
- **Decisión:** DECISION-003 · ACCEPTED
- **DoD:** implementado o superado con nota.
- **Tasks:** decisión + nota/implementación.

#### ISSUE-087 — ADR-021 sub-servicios inexistentes (DOC-003) — P2
`Programa 3 · EPIC-ADR-COMPLIANCE · Ini 3.3`
- **Objetivo:** alinear ADR-021 con la implementación (o implementar sub-servicios).
- **Problema actual:** `ActuatorComputer`/`AlarmService`/`SafetyGuard` no existen.
- **Impacto:** diseño no ejecutado.
- **Archivos afectados:** `docs/ADR/ADR-021-control-engine-as-orchestrator.md`, `services/controlEngine.js`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-021.
- **Dependencias:** ISSUE-089 (TST-003).
- **DoD:** ADR alineado.
- **Tasks:** alinear o implementar.

#### ISSUE-088 — backend.md refiere archivos inexistentes (DOC-004) — P2
`Programa 10 · EPIC-DOCS · Ini 10.4`
- **Objetivo:** regenerar backend.md.
- **Problema actual:** `runs-pilot.js`, `subscriptionExpiration.js`, `mqtt-adapter.ts`, `notificationService.js` inexistentes.
- **Impacto:** doc falsa.
- **Archivos afectados:** `docs/architecture/backend.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-061 (migraciones) para estructura real.
- **DoD:** backend.md refleja el repo.
- **Tasks:** regenerar.

#### ISSUE-089 — Capability Matrix cobertura falsa (DOC-005) — P2
`Programa 3 · EPIC-MATRIX · Ini 3.7`
- **Objetivo:** regenerar resumen de cobertura con tests reales.
- **Problema actual:** "~6 %/0 %" vs 589 tests.
- **Impacto:** decisiones erróneas.
- **Archivos afectados:** `docs/architecture/capability-matrix.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** inventario de tests.
- **DoD:** cobertura real.
- **Tasks:** regenerar resumen.

#### ISSUE-090 — Capability Matrix rutas frontend obsoletas (DOC-006) — P2
`Programa 3 · EPIC-MATRIX · Ini 3.7`
- **Objetivo:** corregir ~12 rutas frontend.
- **Problema actual:** `pages/*` vs `features/*`.
- **Impacto:** matriz stale.
- **Archivos afectados:** `docs/architecture/capability-matrix.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** rutas correctas.
- **Tasks:** actualizar rutas.

#### ISSUE-091 — frontend.md refiere páginas eliminadas (DOC-007) — P2
`Programa 10 · EPIC-DOCS · Ini 10.4`
- **Objetivo:** regenerar frontend.md.
- **Problema actual:** páginas/hooks/sessionStorage eliminados.
- **Impacto:** doc falsa.
- **Archivos afectados:** `docs/architecture/frontend.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** frontend.md real.
- **Tasks:** regenerar.

#### ISSUE-092 — README firmware desactualizado (DOC-008) — P1*
`Programa 10 · EPIC-DOCS · Ini 10.4` (asignado; verificar `tasks.cpp`)
- **Objetivo:** corregir conteo de tasks y constantes contra `tasks.cpp`.
- **Problema actual:** 8 vs 9 tasks; sensores "8s" vs 5-30s; ThingSpeak "20s" vs 5s.
- **Impacto:** docs inexactas.
- **Archivos afectados:** `README.md`, `firmware/src/tasks.cpp`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** verificación de `tasks.cpp`.
- **DoD:** README verificado.
- **Tasks:** verificar y corregir.

#### ISSUE-093 — Footer v1.7.22 vs 1.8.4 (DOC-009) — P2
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6` (asignado; versioning)
- **Objetivo:** corregir versión en README footer.
- **Problema actual:** README footer "v1.7.22".
- **Impacto:** confusión de release.
- **Archivos afectados:** `README.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-078 (manifest).
- **DoD:** versión correcta.
- **Tasks:** corregir footer.

#### ISSUE-094 — "28 ADRs" vs 33 (DOC-010) — P3
`Programa 10 · EPIC-DOCS · Ini 10.4`
- **Objetivo:** corregir conteo.
- **Problema actual:** README dice 28.
- **Impacto:** doc inexacta.
- **Archivos afectados:** `README.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** conteo correcto.
- **Tasks:** corregir.

#### ISSUE-095 — roadmap.md vs milestone.md (DOC-011) — P2
`Programa 3 · Ini 3.8`
- **Objetivo:** fuente única (Roadmap-V2 manda; históricos quedan).
- **Problema actual:** fases 0-9 vs 0-10.
- **Impacto:** doble fuente.
- **Archivos afectados:** `docs/roadmap/roadmap.md`, `docs/roadmap/milestone.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** DECISION-010.
- **Decisión:** DECISION-010 · ACCEPTED
- **DoD:** fuente única declarada.
- **Tasks:** nota de fuente única.

#### ISSUE-096 — deployment.md seed path erróneo (DOC-012) — P3
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6`
- **Objetivo:** corregir path.
- **Problema actual:** `deployment.md:45` `src/scripts/seed.js`.
- **Impacto:** procedimientos fallan.
- **Archivos afectados:** `docs/operations/deployment.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-077.
- **DoD:** path correcto.
- **Tasks:** corregir.

#### ISSUE-097 — PG18 docs vs runtime (DOC-013) — P3
`Programa 8 · EPIC-ENV-CONSISTENCY · Ini 8.3` (fusionado en ISSUE-063)
- **Objetivo:** fusionado con INF-004 (ISSUE-063).
- **Problema actual:** PG18 en CI vs PG16 docs/runtime.
- **Impacto:** doc y CI inconsistentes.
- **Archivos afectados:** `deployment.md`, `ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-063.
- **DoD:** PG16 en todos lados.
- **Tasks:** tratado dentro de ISSUE-063.

#### ISSUE-098 — CHANGELOG frontend adelantado (DOC-014) — P3
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6`
- **Objetivo:** sincronizar versiones.
- **Problema actual:** frontend/docs VERSION adelantados al CHANGELOG.
- **Impacto:** versiones confusas.
- **Archivos afectados:** `frontend/CHANGELOG.md`, `docs/CHANGELOG.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-062.
- **DoD:** CHANGELOG sincronizado.
- **Tasks:** sincronizar.

#### ISSUE-099 — Artefactos VitePress commiteados (DOC-015) — P3
`Programa 8 · EPIC-DOCS-OPS · Ini 8.6`
- **Objetivo:** limpiar `docs/--ignoreDeadLinks/`.
- **Problema actual:** artefactos VitePress en repo.
- **Impacto:** ruido en repo.
- **Archivos afectados:** `docs/--ignoreDeadLinks/`.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ninguna.
- **DoD:** árbol limpio.
- **Tasks:** eliminar/ignorar.

#### ISSUE-100 — Usage endpoint doble (DOC-016) — P2
`Programa 3 · EPIC-CONTRACTS-CANON · Ini 3.4`
- **Objetivo:** canonizar endpoint de uso.
- **Problema actual:** `/subscriptions/usage` vs `/subscriptions/mine/usage`.
- **Impacto:** doble doc.
- **Archivos afectados:** `docs/contracts/api-contract.md`, `docs/architecture/backend.md`, `routes/subscriptions.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-016.
- **Dependencias:** ninguna.
- **DoD:** endpoint único documentado.
- **Tasks:** unificar.

#### ISSUE-101 — SSE URL doble (DOC-017) — P2
`Programa 3 · EPIC-CONTRACTS-CANON · Ini 3.4`
- **Objetivo:** canonizar SSE URL.
- **Problema actual:** `/events` (frontend.md) vs `/api/v1/events` (backend.md).
- **Impacto:** integraciones rotas.
- **Archivos afectados:** `frontend.md`, `backend.md`, `api-contract.md`, `useSSE.js`.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-032 (SSE).
- **DoD:** URL única.
- **Tasks:** unificar.

#### ISSUE-102 — ADR-032 solapa tech-debt (DOC-018) — P2
`Programa 11 · Ini 11.4`
- **Objetivo:** re-vincular ADR-032 con tech-debt; una fuente.
- **Problema actual:** solape entre backlog ADR-032 y tech-debt #001/#002.
- **Impacto:** doble tracking.
- **Archivos afectados:** `docs/ADR/ADR-032-configuration-governance.md`, `docs/governance/tech-debt.md`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-032.
- **Dependencias:** ninguna.
- **DoD:** vinculación única.
- **Tasks:** re-vincular.

#### ISSUE-103 — webSocketServer mal nombrado (DOC-019) — P3
`Programa 3 · Ini 3.6` (asignado; naming)
- **Objetivo:** renombrar/alinear.
- **Problema actual:** `webSocketServer.js` documentado como "SSE Server".
- **Impacto:** confusión.
- **Archivos afectados:** `backend/src/services/webSocketServer.js`, docs.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-013 (WS auth) para no chocar.
- **DoD:** naming correcto.
- **Tasks:** renombrar; actualizar docs.

#### ISSUE-104 — Broker prod ausente / credenciales compartidas (DOC-020) — P2
`Programa 1 · EPIC-BROKER · Ini 1.6` (fusionado en ISSUE-065) · Estado: **DONE** (PR-A, 2026-08-12 — §10 re-baseline + docs de broker al estado real)
- **Objetivo:** tratado dentro de ISSUE-065.
- **Problema actual:** ADR-023/028 no desplegados; credenciales compartidas.
- **Impacto:** mismo defecto que INF-006.
- **Archivos afectados:** `mosquitto.prod.conf`, `acl.conf`.
- **Contratos afectados:** `mqtt-contract.md`.
- **ADR/DDD:** ADR-023 (REQUIRED — infraestructura MQTT segura: broker de producción con TLS e identidad por dispositivo) · ADR-028 (REQUIRED — identidad por dispositivo; condiciona el poblar de credenciales y ACL). DDD: NOT_APPLICABLE (configuración de broker y docs; sin impacto en el modelo de dominio).
- **Contrato/versión:** `mqtt-contract` (MQTT 3.1.1) — §2.3 Entorno de producción; sin cambio de versión. Este ISSUE documental acompaña a ISSUE-065 (fusionado) y a I074/I075.
- **Riesgos:** doc contradictoria con el plan de despliegue → mitigación: alinear con `broker-deployment.md` y PR-A; fusión con I065 → mitigación: tratado dentro de PR-A; drift tras el despliegue → mitigación: re-baseline de §10 (dashboard) en el mismo PR.
- **Verificación (verde→rojo→verde):** verde: ADR-023/028 sin broker desplegado y docs de broker desactualizadas (hoy pasa, defecto presente); rojo: documentación que verifica broker prod TLS e identidad por dispositivo → hoy falla; verde: tras PR-A, `mosquitto.prod.conf`/`acl.conf` reflejan el estado real y el dashboard re-baselineado.
- **Dependencias:** ISSUE-065.
- **DoD:** broker con identidad por dispositivo.
- **Tasks:** dentro de ISSUE-065.

### 4.6 Testing (TST-001…TST-006) → ISSUE-105…110

#### ISSUE-105 — Firmware con 1 solo test file (TST-001) — P1
`Programa 2 · EPIC-FW-NATIVE · Ini 2.4` (también P6.7) · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promotor **PR-H** "Firmware Native Test Suite ≥60 %", dep. PR-G+PR-E) · **ajuste DECISION-012 (2026-08-12):** la suite se limita a módulos vigentes (excluye ThingSpeak, deprecado; se enfoca en MQTT/NVS/control/parsers — canales canónicos)
- **Objetivo:** tests nativos ≥60 % en módulos críticos.
- **Problema actual:** 1 archivo para ~30 de producción.
- **Impacto:** regresiones FW no detectadas.
- **Archivos afectados:** `firmware/test/**`, `firmware/src/**`.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-012 (INFORMATIVE — testing nativo del firmware; contexto de la estrategia de pruebas) · DDD-005 (INFORMATIVE — módulos de dominio de firmware; los críticos a cubrir). 
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: ampliación de tests nativos; no es protocolo.
- **Riesgos:** suite Unity en native no cubre HW (sensores/actuadores) → mitigación: cobertura de módulos puros (control engine, NVS, parsers) ≥60 % en críticos; CI sin `pio test` → mitigación: integrar el runner en CI (PR-E/I109-I110, F11-8); tests lentos → mitigación: entorno native solo, sin dependencia de HW. **DECISION-012:** `thingspeak_client` deja de ser módulo a cubrir (deprecado); sin impacto en el resto del alcance.
- **Verificación (verde→rojo→verde):** verde: 1 solo archivo de test para ~30 módulos de producción (hoy pasa, cobertura baja); rojo: runner que falla si la cobertura en módulos críticos es <60 % → hoy falla; verde: tras ampliar la suite Unity, cobertura ≥60 % en críticos y CI ejecuta `pio test`.
- **Dependencias:** ISSUE-109 (TST-006 gate), P6.7.
- **DoD:** cobertura ≥60 % en críticos.
- **Tasks:** suite Unity; CI.

#### ISSUE-106 — Conformidad valida forma, no authz (TST-002) — P1
`Programa 2 · EPIC-AUTHZ-NEGATIVE · Ini 2.1`
- **Objetivo:** suite de autorización negativa.
- **Problema actual:** tests validan payload, no propiedad.
- **Impacto:** BE-002/004/005/012 pasan el CI.
- **Archivos afectados:** tests de conformidad, rutas.
- **Contratos afectados:** `api-contract.md`.
- **ADR/DDD:** ADR-007 (REQUIRED — la matriz de roles de la suite de autorización negativa se deriva de ADR-007) · DDD-004 (INFORMATIVE — value objects de identidad en los endpoints bajo conformidad). Decisión: NONE (no DECISION-NNN asociada; ADR-007 aceptado es la decisión rectora).
- **Contrato/versión:** `api-contract v1` — la suite conforma contra el contrato vigente; sin cambio de versión (la conformidad amplía cobertura, no altera el contrato).
- **Riesgos:** suite que valida solo payload y no authz → mitigación: matriz de roles (anónimo/VIEWER/OPERATOR/ADMIN) por endpoint; endpoints inestables durante los fixes → mitigación: misma PR que ISSUE-002/004/005; falsos verdes → mitigación: assert de status code y estado, no solo forma del payload.
- **Verificación (verde→rojo→verde):** verde: los tests de conformidad validan payload y pasan aunque un anónimo lea datos (hoy validan forma, no autorización); rojo: nuevo test negativo (anónimo → 401/403, recurso ajeno → 403) → hoy falla; verde: tras ISSUE-002/004/005, la matriz de roles completa queda en verde.
- **Dependencias:** ISSUE-002/004/005 (mismo PR).
- **DoD:** matriz de roles en verde.
- **Tasks:** suite negativa; integrar CI.

#### ISSUE-107 — DDD no cableado al runtime (TST-003) — P2
`Programa 2 · EPIC-RUNTIME-COVERAGE · Ini 2.3`
- **Objetivo:** cubrir la ruta runtime real.
- **Problema actual:** tests TS cubren capa no usada.
- **Impacto:** cobertura falsa de la ruta real.
- **Archivos afectados:** `services/controlEngine.js`, `mqttBridge.js`, `encryption.js`, `eventBus.js`, provisioning, jobs.
- **Contratos afectados:** —.
- **ADR/DDD:** ADR-019, ADR-021.
- **Dependencias:** ISSUE-087 (P3.3).
- **DoD:** cobertura runtime objetivo.
- **Tasks:** tests de ruta real.

#### ISSUE-108 — FE tests codifican patrón inseguro (TST-004) — P2
`Programa 2 · EPIC-FE-TESTS · Ini 2.5` · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-F)
- **Objetivo:** corregir tests; cubrir useSSE/axiosInstance.
- **Problema actual:** `AuthProvider.test.jsx` valida localStorage.
- **Impacto:** red insegura.
- **Archivos afectados:** `frontend/src/**/*.test.jsx`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — corrección de tests de frontend; sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: los tests conforman contra `api-contract v1` vigente; se corrige el patrón de almacenamiento, no el contrato.
- **Riesgos:** asserts que validan el patrón inseguro → mitigación: patrón seguro (token en memoria, no localStorage) y asserts de estado, no de storage; solape con FE-012 (I040) → mitigación: misma PR (F11-4); flakiness de EventSource → mitigación: mock determinista.
- **Verificación (verde→rojo→verde):** verde: `AuthProvider.test.jsx` valida localStorage (hoy pasa, patrón inseguro); rojo: test que verifica que el token NO se persiste en localStorage y que los flujos auth/SSE usan la ruta segura → hoy falla; verde: tras corregir, tests seguros y ampliados a useSSE/axiosInstance.
- **Dependencias:** ISSUE-029.
- **DoD:** tests seguros y ampliados.
- **Tasks:** actualizar tests; cubrir flujos.

#### ISSUE-109 — FE no corre tests en CI (TST-005) — P2
`Programa 2 · EPIC-CI-GATES · Ini 2.6` (fusionado con ISSUE-080)
- **Objetivo:** frontend vitest en CI + test raíz.
- **Problema actual:** CI solo build; sin `test` raíz.
- **Impacto:** gate inexistente.
- **Archivos afectados:** `.github/workflows/ci.yml`, `package.json` root.
- **Contratos afectados:** —.
- **ADR/DDD:** —.
- **Dependencias:** ISSUE-066, ISSUE-080.
- **DoD:** tests FE en CI.
- **Tasks:** dentro de ISSUE-080.

#### ISSUE-110 — Sketches HW no corren en CI (TST-006) — P3
`Programa 2 · EPIC-CI-GATES · Ini 2.6` (asignado; gates) · Estado: **READY** (Ciclo 2, 2026-08-12 — DoR 9/9; promovido para PR-E)
- **Objetivo:** 9 sketches `S3_test-*` en CI o declarados fuera de gate.
- **Problema actual:** no corren en CI.
- **Impacto:** sin regresión HW.
- **Archivos afectados:** `firmware/S3_test-*`, `ci.yml`.
- **Contratos afectados:** —.
- **ADR/DDD:** NOT_APPLICABLE — compilación/ejecución de sketches HW en CI; sin ADR/DDD nuevo.
- **Contrato/versión:** N/A — sin cambio de contrato API/MQTT/BLE. Justificación: política de CI para sketches; no es protocolo.
- **Riesgos:** sketches requieren HW real (no ejecutables en runner) → mitigación: compilarlos en CI (build) y ejecutar solo los puros, o declararlos fuera de gate con política explícita; tiempo de CI → mitigación: job separado/opcional; fusionado con gates → mitigación: dep ISSUE-066 (PR-E).
- **Verificación (verde→rojo→verde):** verde: 9 sketches `S3_test-*` sin correr en CI (hoy pasa, sin regresión HW); rojo: check CI que exige sketches compilados/ejecutados o política explícita → hoy falla; verde: tras añadirlos a CI (o excluirlos con nota documentada), la política es explícita.
- **Dependencias:** ISSUE-066.
- **DoD:** sketches en CI o política explícita.
- **Tasks:** añadir a CI o excluir con nota.

---

## 5. Grafo de dependencias

```
P1.1 (seed) ──► P1.2 (migraciones) ──► P4.1, P9.1
P1.3 (authz) ◄──► P2.1 (autorización negativa)   [mismo PR]
P1.4 (aprovisionamiento) ──► P1.6 (broker)
P1.6 (broker) ──► P4.5 (realtime), P7.4, P8.4, P11.3
P1.8 (secretos FW) ──► P6.1 (OTA TLS)
P1.10 (tokens) ──► P5.1/5.2 (SSE/auth flow FE)
P3.4 (contratos canon) ──► P2.2 (conformidad), P4.5, P5.1
P1.2 (migraciones) ──► P4.1 (cascada), P9.1 (índices)
P6.7 (tests nativos) ──► P6.1…6.6 (firmware)
P1.7 (backups) ──► P11.1 (recovery mensual)
P8.1/8.2 (release/deploy) ──► P11.3 (canary)
```

- **Bloqueadores de ruta crítica:** P1.1/P1.2, P1.3 (+P2.1), P1.6, P1.2→P4.1/P9.1, P6.7→P6.*.
- **Rutas críticas:** `P1.1→P1.2→P4.1/P9.1`; `P1.3+P2.1→P1.6→P4.5→P5.1`.
- **Paralelizable:** P1.5 (observabilidad) · P1.7 (backups) · P1.9 (ThingSpeak) · P7.1 (health) · P8.* (release/infra) · P10 (DX) — independientes entre sí.
- **Dependencias circulares:** ninguna en el Ciclo 0 tras D9/D10. *Nota (2026-08-07): (a) el par `P1.3 ◄──► P2.1` (ISSUE-002/004/005 ⇄ ISSUE-106) es coordinación deliberada de mismo PR, no ciclo de orden; (b) el grafo completo conserva ciclos pre-existentes de coordinación intra-Epic (bootstrap/release/infra, broker, firmware, datos, estado de dispositivo), equivalentes a los nodos colapsados del plan §5 y registrados como deuda documental D11 en `dor-readiness-review.md`; pendientes de una auditoría de dependencias dedicada.*
- **Programas independientes:** P10 (DX) y P8 (infra/release) no bloquean a P1–P6.

## 6. Priorización (criterios objetivos)

Prioridad por `Impacto operacional × Riesgo × Probabilidad × Costo de retraso × Número de dependencias` — nunca por preferencia. Resultado:

1. **P1 (Seguridad)** — mayor impacto y riesgo; 14 P0; desbloquea el resto.
2. **P2 (Testing)** — red de seguridad; P2.1 acompaña a P1.3.
3. **P6.7 (tests nativos FW)** — desbloquea P6.1–6.6.
4. **P3 (Arquitectura/Contratos)** — desbloquea P4.5, P5.1, P9.
5. **P4 (Backend)** — integridad y resiliencia; depende de P1.2.
6. **P8 (Infra/Release)** — trazabilidad y despliegue.
7. **P5 (Frontend)**, **P9 (Perf)**, **P7 (Obs)** — dependientes de P1/P3/P4.
8. **P10 (DX)** — independiente, mejora sostenibilidad.
9. **P11 (Reliability)** — continua; cadencia.

## 7. Dashboard de madurez

Estado calculado desde el backlog (baseline: Fase 0). Actualizar en cada ciclo ejecutado.

| Programa | Estado | Riesgo | Issues abiertos | Cobertura | Gate |
|---|---|---|---|---|---|
| P1 Seguridad | BACKLOG | 🔴 Alto | 21 | — | Pentest sin hallazgos |
| P2 Testing | BACKLOG | 🟠 Medio | 9 | 589 tests / 55 archivos | `pnpm test` raíz verde |
| P3 Arquitectura | BACKLOG | 🟡 Bajo-medio | 10 | — | ADR sin pendientes |
| P4 Backend | BACKLOG | 🟠 Medio | 16 | — | Integridad verificada |
| P5 Frontend | BACKLOG | 🟠 Medio | 19 | 54 tests | SSE singleton + RBAC |
| P6 Firmware | BACKLOG | 🟠 Medio | 9 | 2 tests nativos | Tests ≥60 % críticos |
| P7 Observabilidad | BACKLOG | 🟡 Bajo-medio | 2 | — | Healthchecks + métricas |
| P8 Infra/Release | BACKLOG | 🟡 Medio | 10 | — | Tags + deploy automático |
| P9 Performance | BACKLOG | 🟡 Bajo | 5 | — | Límites + índices |
| P10 DX | BACKLOG | 🟡 Bajo | 3 | — | Architecture tests |
| P11 Reliability | CONTINUA | 🟢 Bajo | 1 | — | Restore mensual verificado |

**Totales:** 110 ISSUEs trazados (BE 28 · FE 21 · FW 10 · INF 25 · DOC 20 · TST 6) · 11 Programas · ~50 Epics · 56 Initiatives.

## 8. Roadmap de ejecución sugerido

```
Fase 0 (1-2 sprints)   P1.1 → P1.2 · P1.3 + P2.1 · P1.5 · P1.8 → P1.9
Fase 1 (semanas 3-6)   P1.6, P1.7 · P1.10, P1.11 · P2.2 → P2.5
Fase 2 (semanas 7-12)  P3 · P4 · P6 (previa P6.7) · P8
Fase 3 (trimestre 2+)  P5 · P7 · P9 · P10 · P11
```

**Justificación:** (1) los P0 de seguridad/productivo bloquean cualquier despliegue seguro → Fase 0; (2) el testing (P2) es la red que impide que los fixes P0 se regresionen → acompaña; (3) la arquitectura/contratos (P3) desbloquea realtime y rendimiento → Fase 2; (4) las fases 2-3 siguen la secuencia crítica del Roadmap-V2 §7.

**Regla de dependencia dura:** ningún trabajo de features entra hasta cerrar el Programa 1; los PRs de Programas 1-2 exigen su test de regresión en el mismo cambio.

---

## 9. Log de transición de estado (Fase 6 §10.3)

Formato: `ISSUE-NNN | <fecha> | <de> → <a> | Evidencia: <checklist DoR/DoD, PR #, tag, DECISION>`.

### 9.1 Ciclo 0 — promoción inicial autorizada (2026-08-08)

Autorización formal del usuario (condición 1, `phase-9-cycle-0-plan.md` §8) + gate del ciclo aprobado + DoR 9/9 (`dor-readiness-review.md` §9).

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-001 (BE-001) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-002 (BE-002) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-003 (BE-003) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-004 (BE-004) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-005 (BE-005) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-017 (BE-017) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-005 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-029 (FE-001) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-005 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-030 (FE-002) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-050 (FW-001) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |
| ISSUE-051 (FW-002) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-007 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-060 (INF-001) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-008 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-061 (INF-002) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-004 ACCEPTED · plan desbloqueo snapshot · gate Ciclo 0 aprobado |
| ISSUE-065 (INF-006) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-006 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-068 (INF-009) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · DECISION-008 ACCEPTED · gate Ciclo 0 aprobado |
| ISSUE-106 (TST-002) | 2026-08-08 | BACKLOG → READY | DoR 9/9 · gate Ciclo 0 aprobado |

**Sin transición:** ISSUE-070 (INF-011) permanece `BLOCKED` (DECISION-011 PENDING) — no se promueve; ISSUE-071 `BACKLOG` (bloqueo transitivo DECISION-011); resto del backlog (94) `BACKLOG`.

### 9.2 Ciclo 0 — toma de ISSUEs (READY → IN_PROGRESS, 2026-08-08)

GitHub Issue creado (Fase 6 §5.1) + ejecutor toma (orquestador Ciclo 0). Los 15 ISSUEs quedan `IN_PROGRESS`; se registra por oleada en el PR correspondiente.

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-001 (BE-001) | 2026-08-08 | READY → IN_PROGRESS | GitHub #168 · toma Ciclo 0 (PR-E) |
| ISSUE-001 (BE-001) | 2026-08-09 | IN_PROGRESS → PR READY (PR-E) | Implementación + 43 tests negativos/DB + REG-009 (11) verdes · pendiente merge y validación staging |
| ISSUE-001 (BE-001) | 2026-08-11 | IN_PROGRESS → DONE | PR #188 mergeado (`039d16e`); suite negativa + REG-009 verdes; versionado backend 1.7.4 / root 1.8.10 · pendiente validación staging (Ciclo 1) |
| ISSUE-002 (BE-002) | 2026-08-08 | READY → IN_PROGRESS | GitHub #169 · toma Ciclo 0 (PR-A) |
| ISSUE-003 (BE-003) | 2026-08-08 | READY → IN_PROGRESS | GitHub #170 · toma Ciclo 0 (PR-F) |
| ISSUE-003 (BE-003) | 2026-08-11 | IN_PROGRESS → DONE | PR #189 mergeado (`ad0f3a3`); auth+ADMIN en `/monitoring/*`, `/health` público, errores genéricos; REG-010 (5) + monitoring-error-paths (8) + bloque ISSUE-003 en suite negativa; jest 232/232 · vitest 405/405; versionado backend 1.7.5 / root 1.8.11 |
| ISSUE-004 (BE-004) | 2026-08-08 | READY → IN_PROGRESS | GitHub #171 · toma Ciclo 0 (PR-A) |
| ISSUE-005 (BE-005) | 2026-08-08 | READY → IN_PROGRESS | GitHub #172 · toma Ciclo 0 (PR-A) |
| ISSUE-017 (BE-017) | 2026-08-09 | IN_PROGRESS → DONE | PR-C; tokenService + RefreshToken + migración + auth.js; 10 unit + E2E gate; contract test OK |
| ISSUE-029 (FE-001) | 2026-08-09 | IN_PROGRESS → DONE | PR-C; access en memoria + refresh cookie httpOnly + interceptor; tests 5+4 PASS |
| ISSUE-030 (FE-002) | 2026-08-09 | IN_PROGRESS → DONE | PR-C; RequireRole + 403 + ocultar por rol; tests 4 PASS + build OK |
| ISSUE-050 (FW-001) | 2026-08-08 | READY → IN_PROGRESS | GitHub #176 · toma Ciclo 0 (PR-C) |
| ISSUE-051 (FW-002) | 2026-08-08 | READY → IN_PROGRESS | GitHub #177 · toma Ciclo 0 (PR-D) |
| ISSUE-060 (INF-001) | 2026-08-08 | READY → IN_PROGRESS | GitHub #178 · toma Ciclo 0 (PR-B) |
| ISSUE-061 (INF-002) | 2026-08-08 | READY → IN_PROGRESS | GitHub #179 · toma Ciclo 0 (PR-B) |
| ISSUE-065 (INF-006) | 2026-08-08 | READY → IN_PROGRESS | GitHub #180 · toma Ciclo 0 (PR-G) |
| ISSUE-068 (INF-009) | 2026-08-08 | READY → IN_PROGRESS | GitHub #181 · toma Ciclo 0 (PR-B) |
| ISSUE-106 (TST-002) | 2026-08-08 | READY → IN_PROGRESS | GitHub #182 · toma Ciclo 0 (PR-A) |

### 9.3 Ciclo 0 — PR-A "Authorization Foundation" (I002/I004/I005/I106) implementado, mergeado y versionado (2026-08-08)

Verde→rojo→verde (DoD: test de regresión en el mismo PR para P0/P1): suite roja escrita primero (`authorization-negative.test.js`, 10 casos anónimos fallando contra el baseline) → implementación → suite verde. PR-A mergeado a `develop` (merge commit `b8cd5b3`) y release `v1.8.5` taggeado.

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-002 (BE-002) | 2026-08-08 | IN_PROGRESS → DONE | PR #183 mergeado (`b8cd5b3`); deny-by-default `tenantScope` (whitelist firmware `POST /devices/register`, `GET /actuators`); `/recipes`/`/species`/`/cycles` → `authenticate`; events/analytics scoped por propietario; api-contract §1/§22 actualizado |
| ISSUE-004 (BE-004) | 2026-08-08 | IN_PROGRESS → DONE | PR #183 mergeado (`b8cd5b3`); `Device.findOrCreate`/`Actuator.findOrCreate` eliminados en PATCH actuators.js y api.js (`/devices/:id/actuators/:channel`) — 404 si el dispositivo no existe; contract tests actualizados |
| ISSUE-005 (BE-005) | 2026-08-08 | IN_PROGRESS → DONE | PR #183 mergeado (`b8cd5b3`); `assertCycleAccess` en todas las rutas de cycles.js; alarms ack/resolve con acceso al dispositivo; especies POST/PUT/DELETE `requireMinRole('ADMIN')` |
| ISSUE-106 (TST-002) | 2026-08-08 | IN_PROGRESS → DONE | PR #183 mergeado (`b8cd5b3`); suite negativa 35/35 con `DATABASE_URL=mush2_test` (16 anónimos/whitelist + 19 propiedad/roles); jest completo 174 + vitest 358 en verde |

**Verificación local post-merge (`b8cd5b3`):** `jest` 12/12 suites / 174 tests · `vitest run` 34 archivos / 358 tests · probe firmware: `POST /devices/register` → 201 y `GET /actuators?deviceId=` → 200.

**CI (run #31259923147):** frontend build ✅. Backend test y firmware build ❌ por fallos **preexistentes** a PR-A (idénticos en el run previo #167): `REG-002` (falta `.env.development`, gitignored, en CI) y `ble_provisioning.cpp:105` (`HW_REVISION`). No hay regresión de PR-A.

**Release SemVer:** tag `v1.8.5` · backend v1.7.0 · commit `chore(release): mush2 v1.8.5` (`b85b30d`).

### 9.4 Ciclo 0 — PR-B "Production Bootstrap Hardening" (I060/I061/I068) implementado y mergeado (2026-08-08)

Verde→rojo→verde (DoD: test de regresión en el mismo PR para P0/P1): suite REG-007 roja primero (Dockerfile CMD con seed/sync y ausencia de migraciones fallaban) → implementación (guards, migraciones, scripts) → suite verde. PR-B mergeado a `develop` (merge commit `82d4828`).

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-060 (INF-001) | 2026-08-08 | IN_PROGRESS → DONE | PR #184 mergeado (`82d4828`); `seed.js` con guard `isSeedAllowed()` (rechaza `NODE_ENV=production` con exit 1); sin credenciales `admin/admin123` por defecto en prod; CMD sin seed; bootstrap de admin por CLI `pnpm admin:create` (`create-admin.js`) |
| ISSUE-061 (INF-002) | 2026-08-08 | IN_PROGRESS → DONE | PR #184 mergeado (`82d4828`); migraciones versionadas (Sequelize CLI) — snapshot inicial `backend/src/db/migrations/20260808000001-create-initial-snapshot.cjs` (26 tablas + 27 índices + 27 FKs + 30 enums, 1:1 con modelos) generado desde modelos y verificado con migrate/undo idempotente; `sync-db.js` con guard (prohibido en prod); `backend/config/config.cjs` reutiliza `env.js`; scripts `db:migrate`/`db:migrate:undo`; Dockerfile CMD `cd backend && pnpm db:migrate && node src/server.js` |
| ISSUE-068 (INF-009) | 2026-08-08 | IN_PROGRESS → DONE | PR #184 mergeado (`82d4828`); `seed.js` delega catálogo a `catalog-seed.js`/`seed-catalog.js` (`db:seed:catalog`, idempotente) y no inyecta credenciales ThingSpeak falsas; fixtures solo desarrollo |

**Verificación local post-merge (`82d4828`):** `jest` 12/12 suites / 174 tests · `vitest run` 35 archivos / 366 tests (incluye REG-007 8/8) · migración verificada end-to-end contra Postgres local (migrate crea esquema completo, undo deja solo `SequelizeMeta` y limpia los 30 enums).

**Docs:** nota de supersesión ADR-005 (sync → migraciones versionadas), regla ADR-029-R08 (seed solo desarrollo), `database.md` (Sincronización + Datos de arranque), changeset `.changeset/production-bootstrap-hardening.md`, CHANGELOG v1.7.1.

### 9.5 Ciclo 0 — Cierre formal (2026-08-11)

**PRs del Ciclo 0 mergeados a `develop` (7/7):**

| PR | ISSUEs | Merge commit | Release | Estado ISSUEs |
|---|---|---|---|---|
| PR-A #183 "Authorization Foundation" | I002/I004/I005/I106 | `b8cd5b3` | v1.8.5 | DONE |
| PR-B #184 "Production Bootstrap Hardening" | I060/I061/I068 | `82d4828` | v1.7.1 | DONE |
| PR-C #186 "Credentials & Session / RBAC UI" | I017/I029/I030 | `6bd4894` | — | DONE |
| PR-D #185 "ThingSpeak HTTPS" | — (prepara I051) | `9fd2ccd` | — | — |
| PR-G #187 "Device Status & Production Policies" | I065 (parcial) | `2fd2ac9` | v1.8.9 | IN_PROGRESS |
| PR-E #188 "Provisioning Foundation" | I001 | `039d16e` | backend 1.7.4 / root 1.8.10 | DONE |
| PR-F #189 "Monitoring Security" | I003 | `ad0f3a3` | backend 1.7.5 / root 1.8.11 | DONE |

**Estado final de los 15 ISSUEs del ciclo (110 total):** 12 `DONE` · 3 `IN_PROGRESS` (I050, I051, I065 — cierre diferido cross-ciclo, ver F9-3) · 1 `BLOCKED` (I070, DECISION-011) · 94 `BACKLOG`.

#### Runbook de gate check (Fase 5 §6) aplicado al Ciclo 0

1. **Estado de ISSUEs:** P1 no tiene todos sus primarios en `DONE` (4 P0 abiertos: I050/I051/I065 `IN_PROGRESS` + I070 `BLOCKED`) → **Exit Gate P1 ⛔ `PENDING`** (no `FAIL`; bloqueo de decisión DECISION-011 vigente, F5-2).
2. **Métricas de gate:** no aplica completar las métricas de §2 — ningún programa alcanza la condición de todos-DONE; ninguna métrica se marca como comprobada para gate.
3. **Transversales (Fase 5 §5):** 4/5 verificadas sobre los cambios del ciclo — cobertura Security 100 % (tests en el mismo PR, DoD §2), secretos sin nuevas fugas, contratos sincronizados y versionados (api-contract §1/§19/§22, MQTT v2), ADR con notas de supersesión (ADR-005 → migraciones; ADR-029-R08). **CI verde: ❌** (fallo preexistente en `develop`: `REG-002` falta `.env.development` en CI + `ble_provisioning.cpp:105` `HW_REVISION`; idéntico antes de PR-A, sin regresión del ciclo).
4. **Ruta crítica:** dependencia `INF-011`/`INF-012` (DECISION-011) sin cerrar bloquea el Exit Gate P1; I065 (broker) avanza con plan de despliegue (PR-G) pero requiere decisión de infra para su despliegue.
5. **Registro:** snapshot comparado contra Fase 0 y contra el t=0 del dashboard en `phase-8-executive-dashboard.md` (sección §8 post-Ciclo 0).
6. **Regla:** ningún programa se declara finalizado (0/11 gates); P1 queda `PENDING` por decisión, no por métricas.

#### Re-computo del dashboard (Fase 8 §5, t=0 vs post-Ciclo 0)

| Indicador | t=0 (Fase 8) | Post-Ciclo 0 |
|---|---|---|
| Avance P1 Seguridad | 0/28 (0 %) | 11/28 ≈ **39 %** → Madurez **Media** |
| Avance P2 Testing | 0/11 (0 %) | 1/11 ≈ 9 % → **Baja** (computable; cualitativo Media por F8-2) |
| Avance global | 0/110 (0 %) | 12/110 ≈ 11 % |
| P0 en P1 | 14 abiertos | **10 DONE** · 4 abiertos (I050/I051/I065 + I070) |
| Riesgo Seguridad | 🔴 Alto | 🟠 **Medio** (ISSUE-070 P0 sigue abierto + DECISION-011) |
| Bloqueador Seguridad | 14 P0 + DECISION-011 | `DECISION-011 (I070/I071)` · I050/I051/I065 cross-ciclo |
| Gates | 0/11 | 0/11 (P1 ⛔ PENDING, idéntico) |

#### Snapshot comparado vs Fase 0

- Seguridad pasó de madurez **Baja → Media** (10 de 14 P0 cerrados; avance computable 39 %); el riesgo baja de 🔴 a 🟠 (bloqueo residual: DECISION-011).
- Testing avanza 1 ISSUE (I106, suite negativa en CI de PRs); el resto de áreas sin cambios (0 DONE computable, cualitativo intacto — F8-2).
- La **desviación frente a la proyección §7.1** del plan Fase 9 (13 DONE en P1) se explica por F9-3: I050/I051 permanecen `IN_PROGRESS` (avance parcial de PR-C/PR-D, cierre diferido con I059/I052), en línea con las entradas de ISSUE-050/051 del backlog.

**Siguiente ciclo:** el Exit Gate P1 se re-evalúa tras (a) resolución de DECISION-011 (I070/I071) y (b) cierre de I050/I051/I065 (F9-3, cross-ciclo). El dashboard queda actualizado (§8 de Fase 8) como línea base para Ciclo 1.

### 9.6 Ciclo 1 — promoción inicial autorizada (2026-08-11)

Autorización formal del usuario (condición 1, `phase-10-cycle-1-plan.md` §11) + gate del ciclo aprobado + DoR 9/9 (`dor-readiness-review-cycle-1.md` — campos checks 2–6 completados en el backlog, patrón Ciclo 0 Revisión 2).

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-015 (BE-015) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · plan desbloqueo cross-ciclo (cierre diferido I074/I075, F1) · gate Ciclo 1 aprobado |
| ISSUE-016 (BE-016) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · gate Ciclo 1 aprobado |
| ISSUE-019 (BE-019) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · gate Ciclo 1 aprobado |
| ISSUE-024 (BE-024) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · gate Ciclo 1 aprobado |
| ISSUE-027 (BE-027) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · residual re-baselineado (F10-3) · gate Ciclo 1 aprobado |
| ISSUE-059 (FW-010) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · plan desbloqueo I050 (I59 no cierra I50; I52 F2, F10-5) · gate Ciclo 1 aprobado |
| ISSUE-072 (INF-013) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · gate Ciclo 1 aprobado |
| ISSUE-084 (INF-025) | 2026-08-11 | BACKLOG → READY | DoR 9/9 · plan desbloqueo cross-ciclo (scanning I076, F1) · gate Ciclo 1 aprobado |

**Sin transición:** ISSUE-070 (INF-011) permanece `BLOCKED` (DECISION-011 PENDING — no es prerequisito del Ciclo 1, F10-2); el resto del backlog (86) `BACKLOG`.

### 9.7 Ciclo 1 — resultados de ejecución (2026-08-11)

Cierre de banda F0 vía PR-I…PR-M (`phase-10-cycle-1-plan.md` §3/§6/§7). PR-M (Oleada 2) cierra I59; I84 avanza parcial (scanning diferido a I076 F1); I50 avanza su loop NVS pero permanece `IN_PROGRESS` (DoD exige I52, F2 — F10-5).

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-016 (BE-016) | 2026-08-11 | READY → DONE | PR-I "Bootstrap Hardening II" (PR #193, merge commit v1.7.6) |
| ISSUE-072 (INF-013) | 2026-08-11 | READY → DONE | PR-I (PR #193) — fail-fast `validate(env)` en sync/seed |
| ISSUE-019 (BE-019) | 2026-08-11 | READY → DONE | PR-J "Rate Limit Coverage" (PR #196, v1.7.7) |
| ISSUE-027 (BE-027) | 2026-08-11 | READY → DONE | PR-K "Generic Error Responses" (PR #198, v1.7.8) |
| ISSUE-015 (BE-015) | 2026-08-11 | READY → IN_PROGRESS | PR-L "MQTT Security" (PR #201, v1.7.9): código `mqtts://` + identidad por dispositivo; cierre broker TLS diferido a I074/I075 (F1) |
| ISSUE-024 (BE-024) | 2026-08-11 | READY → DONE | PR-L (PR #201) — hash `$7$` nativo sin argv |
| ISSUE-059 (FW-010) | 2026-08-11 | READY → DONE | PR-M "Firmware Secrets to NVS" (PR #204, firmware 0.23.4): credenciales en NVS, fallback solo primer arranque, fuera de RAM (scan + tests nativos) |
| ISSUE-084 (INF-025) | 2026-08-11 | READY → IN_PROGRESS | PR-M (PR #204): NVS + `.gitignore` + checklist `docs/security/secrets-checklist.md`; scanning automático diferido a I076 (F1) |
| ISSUE-050 (FW-001) | 2026-08-11 | IN_PROGRESS (avance NVS) | Loop NVS completado vía I59; **DoD exige I52 (F2) + I076** → permanece IN_PROGRESS (F10-5, §7) |

**Cierre diferido (sin cierre falso, regla §6):** I15 → I074/I075 (F1); I84 → I076 (F1); I50 → I52 (F2).

**Runbook de gates al cierre (Fase 5 §6 / plan §9):**
- **Exit Gates:** 0/11 — P1 ⛔ PENDING (DECISION-011 PENDING, I70). Los 8 del ciclo son P1–P3; ningún P0 se cierra en el Ciclo 1 (re-computo en `phase-8-executive-dashboard.md` §10).
- **Cobertura transversal:** 4/5 — cobertura del cambio Security 100 % en PRs del ciclo (tests negativos en PR-L/PR-M); secretos eliminados (BE-016, INF-013, FW-010/I59); contrato `mqtt-contract` sincronizado (I15/PR-L, I59/PR-M); ADR vía supersesión. **CI verde en `develop` ❌ (fallo preexistente, sin regresión del ciclo).**
- **Versiones del ciclo:** backend 1.7.6→1.7.9, firmware 0.23.3→0.23.4, root 1.8.12→1.8.16.

---

### 9.8 Ciclo 2 — resultados de PR-A y PR-B (2026-08-12)

Ejecución de la Oleada 1: **PR-A "Broker MQTT TLS & ACL"** y **PR-B "Env Consistency"** (`phase-11-cycle-2-plan.md` §3). Requisito previo atendido: por PR, **TDD rojo→verde** (REG-016 / REG-017) + regresión completa + documentación + versionado SemVer. PR-A mergeado por el usuario (PR #206).

| ISSUE | Fecha | Transición | Evidencia |
|---|---|---|---|
| ISSUE-074 (INF-015) | 2026-08-12 | READY → DONE | PR-A: `mosquitto.prod.conf` listener TLS 8883 **activo** (descomentado, certs en `/mosquitto/certs`) + ACL `mush2/+/alarm` verificada; REG-016 9/9 (4 fallos iniciales → verde) |
| ISSUE-075 (INF-016) | 2026-08-12 | READY → DONE | PR-A: `docker-compose.yml` publica solo `8883:8883`; 1883 solo red interna Docker (REG-016) |
| ISSUE-104 (DOC-020) | 2026-08-12 | READY → DONE | PR-A: `phase-8-executive-dashboard.md` §10.1 re-baseline + `broker-deployment.md` §4.3/§7 al estado real |
| ISSUE-015 (BE-015) | 2026-08-12 | IN_PROGRESS → DONE | PR-A (cierre cross-ciclo): handshake TLS 8883 local OK + conexión en claro al 8883 rechazada (`protocol error`); evidencia en §4.1 y CHANGELOG v1.7.10 |
| ISSUE-065 (INF-006) | 2026-08-12 | IN_PROGRESS (avance) | PR-A: config TLS activa + verificación broker local (verde→rojo→verde); **cierre exige I081 (F2) + DECISION-011 → C3**, permanece IN_PROGRESS |
| ISSUE-064 (INF-005) | 2026-08-12 | READY → DONE | PR-B: Node 22 en CI/Docker/docs; REG-017 11/11 (11 fallos iniciales → verde) |
| ISSUE-063 (INF-004) | 2026-08-12 | READY → DONE | PR-B: PG16 única versión (CI job `postgres:16-alpine@digest`, compose, `deployment.md`); REG-017 |
| ISSUE-073 (INF-014) | 2026-08-12 | READY → DONE | PR-B: `--frozen-lockfile` en CI + Docker sin fallback `\|\| pnpm install`; `pnpm install --frozen-lockfile` exit 0 verificado |
| ISSUE-079 (INF-020) | 2026-08-12 | READY → DONE | PR-B: digests `node:22-alpine`/`postgres:16-alpine`/`eclipse-mosquitto:2` en Dockerfile y compose (prod+dev); `docker compose config` exit 0 |
| ISSUE-083 (INF-024) | 2026-08-12 | READY → DONE | PR-B: CI python 3.11 + `platformio==6.1.19`; build local esp32-s3-devkitc-1 + OTA SUCCESS |
| REG-002 (F11-1a, transversal CI) | 2026-08-12 | fix absorbido | PR-B: check de `.env.development` (gitignored) exitoso solo si el archivo existe; en CI se salta sin romper el pipeline |

**Cierre diferido (sin cierre falso, regla §6):** I65 → I081 + DECISION-011 (C3); I50 → I52 (F2); I84 → I076 (PR-E); I51 → PR-G (clave NVS + CA TLS). Transversal CI causa (b) — `HW_REVISION` en `ble_provisioning.cpp:105` — a resolver en PR-E/PR-G.

**Runbook de gates:**
- **Exit Gates:** 0/11 — P1 ⛔ PENDING (DECISION-011 PENDING, I70). PR-A/PR-B cierran ISSUEs P1–P3; ningún P0 (I15 es P1).
- **Cobertura transversal:** Broker cubierto por REG-016; env-consistency por REG-017; contrato `mqtt-contract` sin cambio (PR-A) y N/A (PR-B). **CI verde en `develop` aún ❌ (causa b HW_REVISION pendiente de PR-E/PR-G); causa (a) REG-002 resuelta en PR-B.**
- **Versiones:** backend 1.7.10→1.7.11, root 1.8.17→1.8.18.

### 9.9 Ciclo 2 — preparación técnica de los pendientes derivados de DECISION-012 (2026-08-12)

Auditoría sin cambios de código ni merge (STOP a la espera de aprobación del plan de ejecución). Ver `phase-11-cycle-2-plan.md` §12 F11-10.

**Vehículos mínimos definidos:**

| PR | Contenido planificado | ISSUEs | Estado |
|---|---|---|---|
| **PR-G "ThingSpeak Deprecation (DECISION-012)"** | Eliminación transversal: firmware (`thingspeak_client.cpp/h`, `thingspeak_ca_root.h`, `config.example.h` bloque TS/`TS_INTERVAL`, `generate_config.py`, `main.ino`/`tasks.cpp/h`) + backend (`thingSpeakSync.js`, `migrate-thingspeak-keys.js`, rutas `thingSpeak/validate`+`integrations/thingspeak`, `env.TS`, `systemSettingsDefaults`, campos `Device`, migración + tests) + docs (api-contract, DDD-001/002, architecture, firmware, manual, dev-environment, deployment) | I051 → SUPERSEDED efectivo · I023 → SUPERSEDED efectivo · I050 avance (elimina `TS_API_KEY`) | **NO implementado** · requiere aprobación |
| **PR-H "Firmware Native Test Suite ≥60%"** | Ampliar `firmware/test/` a módulos vigentes (hysteresis_controller, ota_decisor, actuator_nvs/ota_nvs con stub, telemetry_buffer) hasta ≥60 %; runner nativo ya en CI (PR-E) | I105 → DONE | **NO implementado** · depende de PR-G + PR-E |

**Auditoría de dependencias (sin bloqueo):**
- **I050:** NVS Wi-Fi/MQTT/DEVICE_ID/OTA **ya operativo** (PR-C/I059); resta solo eliminar `TS_API_KEY` del firmware/CI. Deps: I059 DONE, I076 (PR-E) ✅, I052 (F2). DoR 9/9.
- **I105:** runner `pio test` nativo en CI (PR-E/I109-I110) ✅; suite actual 6/6 → **ampliar ≥60 %** en módulos vigentes, excluyendo ThingSpeak. DoR READY* (gate I109).
- **Deprecación transversal:** 18 fragmentos inventariados; **frontend sin referencias** → sin riesgo de transición; verificación por grep sin coincidencias + regresión completa. DoR: DECISION-012 ACCEPTED (check 9 ✅).

---

*Reconciliación final:* 110/110 hallazgos trazados al backlog (uno por Issue). Decisión pendiente: DECISION-011 (infraestructura) es el único prerequisito abierto de decisión; las DECISION-002…010 quedaron ACCEPTED (ver `architecture-decisions-pending.md`).
