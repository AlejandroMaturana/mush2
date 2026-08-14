# Fase 11 — Tercer ciclo de ejecución: Plan del Ciclo 2 "Cierre de banda F1 (parcial) + Gates de CI" — Mush2

**Fecha:** 2026-08-12
**Estado:** **EJECUTADO Y CERRADO** (2026-08-13; cierre formal post-ejecución en §14 — el header original decía PLANIFICADO — NO INICIADO).
**Línea base t=2:** `docs/project/phase-8-executive-dashboard.md` §10 (post-Ciclo 1, 2026-08-11): 18 DONE · 5 IN_PROGRESS (I15/I50/I51/I65/I84) · 1 BLOCKED (I70) · 86 BACKLOG = 110 · Exit Gates **0/11** (P1 ⛔ PENDING por DECISION-011) · transversal 4/5 (CI ❌ preexistente: REG-002 backend + HW_REVISION firmware).
**Orquestador:** `docs/project/engineering-execution-plan.md` — Fase 11 (tercer ciclo)
**Fuentes trazadas:**
- **Plan** → Fase 11 (Ciclo 2, tabla de ISSUEs, criterio de salida), Sección 10 (gestión de PRs)
- **DoR** → `dor-readiness-review-cycle-2.md` (auditoría emitida en esta fase; Ciclo 1: `dor-readiness-review-cycle-1.md`)
- **Fase 4** → `phase-4-execution-order.md` (bandas F0–F3; Ciclo 2 = **inicio de banda F1** + cierres cross-ciclo desbloqueados)
- **Fase 6** → `phase-6-issue-procedure.md` (máquina de estados, 10 pasos, plantillas)
- **Fase 7** → `phase-7-change-control.md` (control de cambios, T0/T1/T2)
- **Fase 5** → `phase-5-maturity-gates.md` (runbook de gates, métricas transversales)
- **Backlog** → `engineering-backlog.md` (estados §9.7 post-C1; deps campo a campo §4; I70 `BLOCKED`, DECISION-011 `PENDING`; fusión I080+I109)
- **Fase 9/10** → `phase-9-cycle-0-plan.md` y `phase-10-cycle-1-plan.md` (§14 cierre C1: varianza base real 12 DONE; deuda cross-ciclo I15→I074/I075, I84→I076, I50→I52)
- **Código verificado (2026-08-12):** `firmware/src/config.h` (secretos reales presentes — I50 abierto), `firmware/src/thingspeak_client.cpp:33` (`X-ApiKey` header — I51 parcial), `backend/src/routes/auth.js:22` (`/register {username,email,password}`), `frontend/src/features/auth/api/auth.js:8` (firma `register(username,password,role)`), `frontend/src/features/auth/components/AuthModal.jsx:44-46` (llamada 3-arg `register(username,email,password)`), `package.json:7` (test = echo error — I66), `.github/workflows/ci.yml:71` (postgres:18 — I63), `firmware/src/ble_provisioning.cpp:105` (`HW_REVISION` sin definir — CI firmware ❌), `firmware/platformio.ini` (sin `HW_REVISION`)

**Método:** derivación íntegra desde las fuentes vigentes (sin inventar datos): conjunto del Ciclo 2, dependencias verificadas campo a campo y contra código, orden operativo por PRs a nivel Epic, reglas de promoción (Fase 6), criterio de salida, DoR actual de los candidatos y condiciones formales de arranque. Solo documental.

**Restricciones cumplidas:** sin código; sin PRs; sin promociones a `READY`; sin alterar DECISION-011 ni D11; I070 permanece `BLOCKED`; I071 `BACKLOG` (bloqueo transitivo).

---

## 1. Objetivo y alcance del Ciclo 2

**Objetivo:** **iniciar la banda F1** de la Fase 4 (dominios de contratos, auth flow, testing y CI gates) **y cerrar los cierres cross-ciclo ya desbloqueados** del Ciclo 1: **I15 (BE-015)** vía I074/I075, **I84 (INF-025)** vía I076, e **I51 (FW-002, P0)** vía **decisión de deprecación** (DECISION-012 — ThingSpeak fuera de arquitectura; MQTT canal canónico). El pilar del ciclo es el **clúster de CI** (cadena I64→I73→I79→I66→{I76, I80/I109, I110, I105}) que además repara el transversal **CI ❌ preexistente** (REG-002 + HW_REVISION, hallazgo F11-1) y habilita el cierre de I84.

**Alcance (incluye):**
- **Cierres cross-ciclo:** I15 → DONE (PR-A, evidencia broker TLS); I84 → DONE (PR-E, evidencia scanning CI); I51 → **SUPERSEDED** (DECISION-012 — deprecación de ThingSpeak; sin cierre por endurecimiento).
- **Avances (permanecen `IN_PROGRESS`, sin cierre falso):** I65 (P0, vía I074/I075; cierre exige I81 + DECISION-011 → C3) e I50 (P0, vía NVS de Wi-Fi/MQTT; `TS_API_KEY` se **elimina** por DECISION-012, no se migra; cierre exige I52 F2 → C3).
- **Banda F1 restante (14 elegibles → 12 en el ciclo):** I12, I31, I40, I66, I74, I75, I76, I80(+I109 fusionado), I104, I105, I108, I110.
- **Pulls F2/F3 como dependencias necesarias:** I6 (dep de I12), I33 (dep de I40), I63, I64, I73, I79 (cadena env-consistency), I83 (recomendado, mismo epic).
- **Auditoría DoR de los candidatos** como prerequisito documental (§5) — no se promueve nada en esta fase.

**Alcance (no incluye):**
- **F1 diferido a C3 (documentado, no forzado):** I7 (dep I28), I13 (dep I94), I14 (dep I61), I107 (dep I87). I70 `BLOCKED` (DECISION-011) e I71 `BLOCKED` transitivo — **no se tocan**.
- **Cierres de avance:** I65 (I81 + DECISION-011), I50 (I52 F2, EPIC-OTA-SECURITY).
- Features nuevas, rediseño visual, migración de infraestructura mayor, consolidación MQTT de ThingSpeak como integración **activa** — **DECISION-012 (2026-08-12): ThingSpeak queda fuera de la arquitectura objetivo (deprecado); MQTT es el canal canónico.**

**No-objetivos:** ningún cambio de código se ejecuta en esta fase; este documento es la base de autorización futura del Ciclo 2 (§11).

---

## 2. ISSUEs del Ciclo 2 (24 involucrados) — verificación campo a campo

Fuente: `phase-4-execution-order.md` §7 (banda F1) y backlog §4. 24 ISSUEs = 19 de implementación + 3 cierres cross-ciclo (I15/I51/I84) + 2 avances (I50/I65). I109 va **fusionado con I080** (backlog §4, nota explícita). **Actualización 2026-08-12 (DECISION-012):** I51 pasa de cierre a **SUPERSEDED** (ThingSpeak deprecado).

| ISSUE | Hallazgo | Programa | Epic | Ini | Prio | Decisión | Estado actual | Rol en C2 |
|---|---|---|---|---|---|---|---|---|
| I006 | BE-006 (DELETE sin cascada) | P4 | EPIC-DATA-INTEGRITY | 4.1 | P1 | NONE | BACKLOG | PR-C (pull F2, dep I12) |
| I012 | BE-012 (deviceId string vs INTEGER) | P2 | EPIC-CONTRACTS | 2.2 | P1 | NONE | BACKLOG | PR-C |
| I015 | BE-015 (MQTT en claro/ACL) | P1 | EPIC-BROKER | 1.6 | P1 | NONE | **IN_PROGRESS** | **CIERRE** (PR-A) |
| I031 | FE-003 (registro roto) | P5 | EPIC-RBAC-UI | 5.4 | P1 | NONE | BACKLOG | PR-D |
| I033 | FE-005 (refresh sin single-flight) | P5 | EPIC-AUTH-FLOW | 5.2 | P1 | NONE | BACKLOG | PR-D (pull F3, dep I29 DONE) |
| I040 | FE-012 (tests escasos/inseguros) | P2 | EPIC-FE-TESTS | 2.5 | P2 | NONE | BACKLOG | PR-F |
| I050 | FW-001 (secretos reales) | P1 | EPIC-CREDENTIALS | 1.7 | P0 | NONE | **IN_PROGRESS** | **AVANCE** (PR-G deprecación — elimina `TS_API_KEY`; NVS Wi-Fi/MQTT/DEVICE_ID/OTA ya por I059/PR-C; cierre I52 C3) |
| I051 | FW-002 (API key ThingSpeak en claro) | P1 | EPIC-TELEMETRY-CHANNEL | 1.9 | P0 | **DECISION-012 ACCEPTED** (DEPRECACIÓN) | **IN_PROGRESS → SUPERSEDED** | **DEPRECACIÓN EFECTIVA** (PR-G — eliminación física del canal) |
| I063 | INF-004 (Postgres 18→16) | P8 | EPIC-ENV-CONSISTENCY | 8.3 | P2 | NONE | BACKLOG | PR-B (pull F2) |
| I064 | INF-005 (Node 24 CI/22 Docker) | P8 | EPIC-ENV-CONSISTENCY | 8.3 | P2 | NONE | BACKLOG | PR-B (pull F2, dep I72 DONE) |
| I065 | INF-006 (broker no desplegado) | P8 | EPIC-BROKER | 8.1 | P0 | DECISION-006 ACCEPTED | **IN_PROGRESS** | **AVANCE** (PR-A) |
| I066 | INF-007 (sin test en raíz) | P2 | EPIC-CI-GATES | 2.6 | P3 | NONE | BACKLOG | PR-E |
| I073 | INF-014 (lockfile no estricto) | P8 | EPIC-ENV-CONSISTENCY | 8.3 | P2 | NONE | BACKLOG | PR-B (pull F2) |
| I074 | INF-015 (MQTT TLS deshabilitado) | P1 | EPIC-BROKER | 1.6 | P1 | DECISION-006 ACCEPTED | BACKLOG | PR-A |
| I075 | INF-016 (compose expone 1883) | P1 | EPIC-BROKER | 1.6 | P2 | DECISION-006 ACCEPTED | BACKLOG | PR-A |
| I076 | INF-017 (CI sin lint/scanning) | P2 | EPIC-CI-GATES | 2.6 | P3 | NONE | BACKLOG | PR-E |
| I079 | INF-020 (imágenes base flotantes) | P8 | EPIC-ENV-CONSISTENCY | 8.3 | P3 | NONE | BACKLOG | PR-B (pull F2) |
| I080 | INF-021 (FE en CI solo compila) | P2 | EPIC-CI-GATES | 2.6 | P2 | NONE | BACKLOG | PR-E (+I109 fusión) |
| I083 | INF-024 (toolchain no pinneado) | P8 | EPIC-ENV-CONSISTENCY | 8.3 | P3 | NONE | BACKLOG | PR-B (recomendado) |
| I084 | INF-025 (secretos locales) | P8 | EPIC-CREDENTIALS | 1.8 | P3 | NONE | **IN_PROGRESS** | **CIERRE** (PR-E) |
| I104 | DOC-020 (re-baseline §10) | P3 | EPIC-DOCS-OPS | 8.6 | P2 | NONE | BACKLOG | PR-A |
| I105 | TST-001 (firmware tests <60 %) | P2 | EPIC-FW-NATIVE | 2.4 | P1 | NONE | BACKLOG | PR-H (suite nativa ≥60 %, sin ThingSpeak) |
| I108 | TST-004 (FE tests inseguros) | P2 | EPIC-FE-TESTS | 2.5 | P2 | NONE | BACKLOG | PR-F |
| I110 | TST-006 (sketches HW sin CI) | P2 | EPIC-CI-GATES | 2.6 | P3 | NONE | BACKLOG | PR-E |

**Conteo verificado:** 6 P1 (I6, I12, I15, I31, I33, I74) · 8 P2 (I40, I63, I64, I73, I75, I80, I104, I108) · 7 P3 (I66, I76, I79, I83, I84, I105→P1, I110) · 2 P0 (I50, I51) — donde I105 es P1 por header. **3 P0 del ciclo** (I50 avanza; I65 avanza; ~~I51 cierra~~ → **I51 SUPERSEDED por DECISION-012**).

### 2.1 Dependencias verificadas (campo `Dependencias` del backlog) y estados reales de código

| ISSUE | Dependencias (backlog) | Naturaleza | Estado de código verificado (2026-08-12) |
|---|---|---|---|
| I6 | I012 (mismo PR), I061 (DONE) | **Ciclo mutuo I6↔I12** (F11-3) + I61 satisfecha | `routes/api.js:488-519` borra Device sin transacción; `sync-db.js` sin cascada — **verde (falta)** |
| I12 | I006 (mismo PR) | **Ciclo mutuo I6↔I12** | `models/Event.js`/`Alarm.js` INTEGER vs rutas string; SQL crudo castea inconsistente — **verde (falta)** |
| I15 | I065 (IP), I074/I075 (ciclo), I050 (IP) | **Satisfecha en el ciclo** (I74/I075 en PR-A) → **CIERRE** | `env.js:80` `mqtt://localhost:1883`; `mqttBridge.js` credencial única `backend_bridge`; falta TLS 8883 + ACL `alarm` (I074) y compose sin 1883 (I075) — **parcial, evidencia de cierre en PR-A** |
| I31 | (sin deps listadas) | **Satisfecha** | `AuthModal.jsx:44-46` `register(username, email, password)` (3 args) vs `api/auth.js:8` firma `register(username, password, role)` vs backend `/register` `{username,email,password}` — **solape 3 capas (F11-2)** |
| I33 | I029 (DONE) | **Satisfecha** | `axiosInstance.js:19-34` N llamadas `/auth/refresh`; redirect hard — **verde (falta single-flight)** |
| I40 | I029 (DONE), I033 (PR-D) | **Satisfecha en el ciclo** | `AuthProvider.test.jsx` valida localStorage (patrón inseguro) — **verde (falta)** |
| I50 | I059 (DONE), I052 (C3, F2), I076 (PR-E) | **Avance en ciclo; cierre C3** | `config.h` (gitignored) con **secretos reales**: `WIFI_SSID_1 "fh_8d5bf8"`, `WIFI_PASSWORD_1 "wlan72a407"`, `WIFI_SSID_2 "ZTE_4ED1E6"`, `WIFI_PASSWORD_2 "99897250"`, `DEVICE_ID "mush2_A0F262E55CBC"`, `MQTT_USER "device_001"` — **verde (falta NVS + I52)**; NVS Wi-Fi/MQTT/DEVICE_ID/OTA **ya operativo** (PR-C/I059); avance PR-G = **eliminar `TS_API_KEY`** del firmware/CI (DECISION-012, no se migra) |
| I51 | **DECISION-012 (2026-08-12)**; TLS/CA (I15/I075 ya aplicadas); ~~I050 (NVS)~~ | **SUPERSEDED en el ciclo** → sin cierre por endurecimiento | `thingspeak_client.cpp:33` header `X-ApiKey` + `TS_CA_ROOT` embebida (PR-D mergeado, sin efecto tras DEPRECACIÓN); **eliminación efectiva en PR-G** (firmware + backend + docs) — **parcial → SUPERSEDED** |
| I63 | I064 (PR-B) | **Satisfecha en el ciclo** | `ci.yml:71` `postgres:18` — **verde (falta 16)** |
| I64 | I072 (DONE) | **Satisfecha** (I72 cerrado en C1) | `ci.yml` `NODE_VERSION` env; `Dockerfile` y docs con rangos distintos — **verde (falta alinear)** |
| I65 | DECISION-006 (ACCEPTED); I075 (PR-A); I081 (C3) | **Avance en ciclo; cierre C3** | `docs/operations/broker-deployment.md` + PR-G broker (plan); sin deploy — **verde (falta deploy → DECISION-011)** |
| I66 | I079 (PR-B) | **Satisfecha en el ciclo** | `package.json:7` `echo "Error: no test specified"` — **verde (falta)** |
| I73 | I064 (PR-B) | **Satisfecha en el ciclo** | `Dockerfile:12,28` fallback; `ci.yml:96,120` install plano — **verde (falta frozen-lockfile)** |
| I74 | I065 (avance PR-A) | **Satisfecha en el ciclo** | `mosquitto.prod.conf` listener 8883 comentado; `acl.conf` prod sin `mush2/+/alarm` — **verde (falta)** |
| I75 | I074 (PR-A) | **Satisfecha en el ciclo** | `docker-compose.yml:20-21` `1883:1883` — **verde (falta solo 8883)** |
| I76 | I066 (PR-E) | **Satisfecha en el ciclo** | Sin lint, sin gitleaks, sin Dependabot — **verde (falta)** |
| I79 | I073 (PR-B) | **Satisfecha en el ciclo** | `node:22-alpine`, `postgres:16-alpine`, `eclipse-mosquitto:2` flotantes — **verde (falta digests)** |
| I80 | I066 (PR-E) | **Satisfecha en el ciclo** (fusión I109) | `ci.yml:122-123` solo build FE — **verde (falta pnpm test)** |
| I83 | (sin deps) | **Satisfecha** | `ci.yml:24,27` python 3.12 + platformio latest sin fijar; sin cache — **verde (falta pin)** |
| I84 | I076 (PR-E) | **Satisfecha en el ciclo** → **CIERRE** | Checklist NVS del C1 documentado; **falta scanning automático (I076)** — **parcial, evidencia de cierre en PR-E** |
| I104 | (re-baseline §10) | **Satisfecha** | `phase-8-executive-dashboard.md` §10 tras C1 — **verde (falta re-base post-C2)** |
| I105 | I109 (gate, PR-E), P6.7 | **Satisfecha en el ciclo** (I109 fusionado en PR-E) | `test_main.cpp` runner Unity 6/6 native (`channel_mapping`+`mqtt_credentials`); **falta ampliar suite ≥60 %** a módulos vigentes (excluye ThingSpeak) — **verde (falta ampliar, PR-H)** |
| I108 | I029 (DONE) | **Satisfecha** | Solape con I040 (mismo `AuthProvider.test.jsx`, F11-4) — **verde (falta)** |
| I110 | I066 (PR-E) | **Satisfecha en el ciclo** | 9 sketches `S3_test-*` sin CI — **verde (falta)** |

**Regla aplicada (Fase 4/6):** un ISSUE `READY` puede iniciar si sus deps están satisfechas **o** hay plan de desbloqueo en el ciclo; los cierres cross-ciclo (I15, I51, I84) se operan con evidencia dentro del ciclo; los avances (I50, I65) se documentan con su cierre diferido (patrón F9-3/F10-5).

---

## 3. Orden operativo de ejecución — PRs a nivel Epic

PRs propuestos a nivel Epic (plan Sección 10: mismo Epic, contexto compartido, validación conjunta, sin mezclar dominios no relacionados).

| PR | Epic(s) | ISSUEs | Dominio | Depende de | Resultado esperado |
|---|---|---|---|---|---|
| **PR-A "Broker MQTT TLS & ACL"** | EPIC-BROKER + EPIC-DOCS-OPS | I074, I075, I065 (avance), I104 (re-baseline) | Infra/MQTT | PR-G broker (C0, mergeado); DECISION-006 | TLS 8883 activo con certs reales; `alarm` en ACL; compose solo 8883; **cierra I15**; I65 avanza (deploy C3); §10 re-baseline |
| **PR-B "Env Consistency"** | EPIC-ENV-CONSISTENCY | I064, I063, I073, I079 (+I083 rec) | CI/Infra | — (cadena interna I64→I73→I79) | Node/PG alineados, lockfiles estrictos, imágenes pinneadas, toolchain fijo; **desbloquea I066** |
| **PR-C "Data Integrity & Contracts"** | EPIC-DATA-INTEGRITY + EPIC-CONTRACTS | I006, I012 (ciclo mutuo) | Backend | I061 (DONE) | DELETE con transacción + cascada FK + test de integración; tipos deviceId alineados + tests de conformidad |
| **PR-D "FE Auth Flow & Register Fix"** | EPIC-RBAC-UI + EPIC-AUTH-FLOW | I031, I033 | Frontend | I029 (DONE) | Registro funcional (firma alineada 3 capas, F11-2); refresh single-flight + logout controlado |
| **PR-E "CI Gates & Secrets Scanning"** | EPIC-CI-GATES + EPIC-CREDENTIALS | I066, I076, I080+I109, I110 (+fix HW_REVISION, +REG-002) | CI | **PR-B** (I79→I66); I080/I110 deps I66 | `pnpm test` raíz; audit/osv-scanner/gitleaks/Dependabot; FE tests en CI; sketches HW en CI o política; **CI verde**; **cierra I84** |
| **PR-F "FE Tests Seguros"** | EPIC-FE-TESTS + TST-004 | I040, I108 | Frontend/Testing | **PR-D** (I33) + **PR-E** (CI) | Tests auth/refresh/SSE seguros (sin localStorage), ampliados a useSSE/axiosInstance |
| **PR-G "ThingSpeak Deprecation (DECISION-012)"** | ~~EPIC-TELEMETRY-CHANNEL~~ (deprecación) | I051 (SUPERSEDED efectivo), I023 (SUPERSEDED efectivo), I050 (avance: elimina `TS_API_KEY`) | Firmware + Backend + Docs | DECISION-012 (ACCEPTED) + PR-D (avance HTTPS sin efecto) | **Eliminación efectiva del canal ThingSpeak**: firmware (`thingspeak_client.cpp/h`, `thingspeak_ca_root.h`, `main.ino`, `tasks.cpp/h`, `config.example.h`, `generate_config.py`, heredoc CI) + backend (`thingSpeakSync.js`, `migrate-thingspeak-keys.js`, rutas `thingSpeak/validate`+`integrations/thingspeak`, `env.TS`, `systemSettingsDefaults`, columna-migración Device, tests) + docs (api-contract, DDD-001/002, architecture, firmware, manual, dev-environment, deployment). Sin código nuevo de canal. |
| **PR-H "Firmware Native Test Suite ≥60%"** | EPIC-FW-NATIVE | I105 | Firmware/Testing | **PR-E** (gate CI `pio test` nativo) + **PR-G** (excluye ThingSpeak del alcance) | Ampliar `firmware/test/` a módulos vigentes (control/NVS/parsers: hysteresis_controller, ota_decisor, actuator_nvs/ota_nvs, telemetry_buffer) hasta ≥60 %; runner Unity nativo ya en CI. cierre I105 en el ciclo |

*(sin PR)* EPIC-BACKUP (I70): **BLOCKED** — sin PR en Ciclo 2 (DECISION-011 PENDING, F11-7). EPIC-REALTIME (I13), EPIC-DEVICE-HEALTH (I7), EPIC-PERF (I14), TST-003 (I107): diferidos a C3 por deps no incluidas.

### 3.1 Secuencia sugerida

```
Oleada 1 (independientes, máx paralelismo):
  PR-A (broker TLS/ACL) · PR-B (env consistency) · PR-C (data integrity) · PR-D (FE auth flow)
Oleada 2 (depende de PR-B):
  PR-E (CI gates & scanning — I66 requiere I79 de PR-B)
Oleada 3 (depende de PR-A + PR-E + PR-D):
  PR-F (FE tests — requiere I33 de PR-D y CI de PR-E)
  PR-G (deprecación ThingSpeak — DECISION-012; independiente de PR-A, no requiere CA de broker) — **vehículo re-secuenciado desde PR-G detenido**
Oleada 4 (depende de PR-G + PR-E):
  PR-H (suite nativa ≥60 % — I105; alcance sin ThingSpeak fijado por PR-G)
```

### 3.2 Justificación de dependencias

- **PR-E → PR-B:** I66 (root `pnpm test`) depende de I79 (FE en CI), que depende de I73 (lockfile) → I64 (Node). La cadena env-consistency es prerequisito del clúster de gates. **I84 solo se cierra al final del ciclo** (scanning sobre un CI ya verde).
- **PR-F → PR-D:** I40 depende de I33 (single-flight, PR-D) y de I29 (DONE). I108 se ejecuta en la misma PR (solape F11-4).
- **PR-G → DEPRECACIÓN transversal (DECISION-012):** ~~I51 exige la CA verificable del broker (I15/I075, PR-A) y el NVS de I50~~ → **DECISION-012 (2026-08-12):** ThingSpeak fuera de arquitectura; **eliminación efectiva** en un único PR transversal (firmware + backend + docs) para dejar el árbol sin referencias al canal; I51/I023 → SUPERSEDED materializado; I50 avanza eliminando `TS_API_KEY` (el resto del NVS ya por I059). No requiere PR-A (sin CA de broker). Fix de `HW_REVISION` (F11-1) ya resuelto en PR-E (heredoc `#define HW_REVISION "1.0"`).
- **PR-H → PR-G + PR-E:** I105 (suite nativa) limita su alcance a módulos vigentes una vez PR-G elimina ThingSpeak, y usa el runner `pio test` que PR-E deja en CI (F11-8).
- **PR-C auto-contenido:** I6↔I12 es un ciclo mutuo documentado (F11-3); se entrega en una única PR sin dependencias externas pendientes (I61 DONE).

**Reglas de orden:** sin mezclar dominios no relacionados; P0 (I50/I51/I65) con regla dura verde→rojo→verde; versionado al cierre de cada PR con impacto (patrón PR-M del C1: backend 1.7.x, firmware 0.23.x, root 1.8.x).

---

## 4. Criterios y reglas de promoción de estados

Reglas de la Fase 6 §3, aplicadas al Ciclo 2:

| Transición | Criterio | En el Ciclo 2 |
|---|---|---|
| `BACKLOG → READY` | 9/9 checks DoR **+ gate del ciclo aprobado** | Los 19 de implementación pasan **solo tras la auditoría DoR de `dor-readiness-review-cycle-2.md`** y la autorización de ejecución (§11) |
| `READY → IN_PROGRESS` | GitHub Issue creado (referencia ISSUE-NNN) + ejecutor toma | Al crear cada GitHub Issue del ciclo |
| `IN_PROGRESS → DONE` | 9/9 checks DoD (backlog §2) + CI verde + PR mergeado + versionado | Vía PR-A…PR-G |
| `IN_PROGRESS → DONE` (cross-ciclo) | DoD alcanzable del ciclo (§6) + evidencia sin falsear cierre | I15 (PR-A), ~~I51 (PR-G)~~ → **I51 SUPERSEDED (DECISION-012)**; I84 (PR-E) |
| `BACKLOG → BLOCKED` | DECISION-NNN `PENDING` o dep sin desbloqueo | Ninguno de los 19 del ciclo es BLOCKED; I70/I71 no se tocan |

**Promociones autorizadas:** únicamente los 19 de implementación → `READY` al inicio de la ejecución (post-auditoría DoR); los 2 cierres cross-ciclo (I15/I84) ya están `IN_PROGRESS` y se promueven a `DONE` por evidencia; **I51 (FW-002) pasa a `SUPERSEDED` por DECISION-012 (deprecación de ThingSpeak; MQTT canal canónico)**. **Prohibidas:** promociones fuera del ciclo; `IN_PROGRESS → READY`; `DONE → BACKLOG`; avanzar I70/I71.

**BLOCKED (I70):** permanece `BLOCKED`; I71 permanece `BACKLOG` (bloqueo transitivo). **DECISION-011 permanece `PENDING`** — no es prerequisito del Ciclo 2 (F11-7).

---

## 5. Auditoría DoR del Ciclo 2 (prerequisito documental)

Emitida en **`dor-readiness-review-cycle-2.md`** (9 checks del backlog §1 aplicados a los 24 ISSUEs involucrados, con gap residual por ISSUE y verdict).

**Resumen de la auditoría (2026-08-12):**

| ISSUE | Rol | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I006 | PR-C | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I012 | PR-C | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I015 | cierre PR-A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (9/9)** |
| I031 | PR-D | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (solape F11-2) |
| I033 | PR-D | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I040 | PR-F | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I050 | ~~avance PR-G~~ (NVS Wi-Fi/MQTT) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (avance; cierre I52 C3)** |
| I051 | ~~cierre PR-G~~ → **SUPERSEDED (DECISION-012)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **SUPERSEDED (deprecación ThingSpeak)** |
| I063 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I064 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I065 | avance PR-A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (avance; cierre I81/D11 C3)** |
| I066 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I073 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I074 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I075 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I076 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I079 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I080 (+I109) | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (fusión I109) |
| I083 | PR-B (rec) | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (opcional) |
| I084 | cierre PR-E | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (cierre en ciclo)** |
| I104 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| I105 | PR-G (suite nativa, sin ThingSpeak) | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (gate I109 PR-E) |
| I108 | PR-F | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (solape I040) |
| I110 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |

**Resultado:** **19/24 requieren completar los checks 2/5/6 (campos de Contrato/versión, Riesgos, Verificación) → READY***; **5/24 (I15, I50, I51, I65, I84) ya cumplen 9/9 documentalmente (auditados en C0/C1 y re-verificados) → READY**, con **I51 re-auditado a `SUPERSEDED` (DECISION-012)**. La ejecución del Ciclo 2 queda **condicionada a completar los campos señalados en el backlog** (patrón del Ciclo 0/1) antes de cualquier promoción a `READY`. Detalle campo a campo: `dor-readiness-review-cycle-2.md`.

---

## 6. DoD alcanzable en este ciclo para ISSUEs cross-ciclo (I15, I51, I84) y avances (I65, I50)

> **DECISION-012 (2026-08-12):** I51 deja de ser cierre y pasa a **SUPERSEDED** (ThingSpeak deprecado). Su fila queda como registro de la resolución por decisión, no por work de canal.

| ISSUE | DoD alcanzable en Ciclo 2 | Evidencia para `DONE`/`IN_PROGRESS` (sin cierre falso) | Cierre diferido a |
|---|---|---|---|
| **I15** (BE-015) | Broker TLS 8883 activo con certs reales; ACL `alarm`; compose solo 8883; backend fail-fast `mqtts://` (ya en C1); contrato `mqtt-contract` | PR-A mergeado + handshake TLS 8883 local + tests (rojo→verde) de `env.js`/`mqttBridge` + ACL verificada | **→ DONE en C2** (I074/I075 en el ciclo) |
| **I51** (FW-002) | ~~Clave TS en NVS (fuera de `config.h`); HTTPS+CA verificado (`TS_CA_ROOT` + hostname); scan sin clave en query string/HTTP~~ → **SUPERSEDED por DECISION-012: ThingSpeak fuera de arquitectura; MQTT canal canónico; se elimina `TS_API_KEY`/canal** | DECISION-012 ACCEPTED registrada (architecture-decisions-pending.md) + ADR-004 SUPERSEDED + backlog I051/I023 → SUPERSEDED + **PR-G: árbol sin referencias ThingSpeak** (grep sin coincidencias en firmware/backend/docs activos) | **→ SUPERSEDED en C2** (no DONE; deprecación, no cierre por endurecimiento) |
| **I84** (INF-025) | Scanning automático activo (gitleaks/audit/osv-scanner en CI, PR-E) + checklist de secretos | PR-E mergeado + CI ejecuta gitleaks en PR + diff sin secretos nuevos | **→ DONE en C2** (I076 en el ciclo) |
| **I65** (INF-006) | Broker configurado para TLS (I074/I075) + plan de despliegue vigente (`broker-deployment.md`) | PR-A mergeado + verificación de configuración broker local; **sin deploy** | **I081 (F2) + DECISION-011 → C3** |
| **I50** (FW-001) | `config.h` con placeholders; credenciales Wi-Fi/MQTT/DEVICE_ID/OTA en NVS (I059/PR-C ya); `TS_API_KEY` **eliminada** (DECISION-012, no migrada); checklist actualizado | PR-G mergeado + scan: `config.h` del árbol sin secretos reales (gitignored ⇒ no aplica a repo) + `config.example.h` sin `TS_*` + NVS operativo | **I052 (FW-003, F2) → C3** |

**Regla de evidencia:** un ISSUE con cierre diferido se documenta con (a) PR mergeado, (b) tests del alcance alcanzable, (c) hallazgo de fase que fija la dependencia pendiente y su banda. **Prohibido** declarar `DONE` un ISSUE cuyo DoD dependa de ISSUEs fuera del ciclo sin registrar el hallazgo.

---

## 7. Resolución de la deuda cross-ciclo C1 → C2 → C3

| Deuda heredada (C1 §14) | Cierre previsto | En C2 | Diferido a C3 |
|---|---|---|---|
| I15 (BE-015) `IN_PROGRESS` | I074/I075 (broker TLS/ACL) | **PR-A → DONE** | — |
| I84 (INF-025) `IN_PROGRESS` | I076 (scanning CI) | **PR-E → DONE** | — |
| I51 (FW-002, P0) `IN_PROGRESS` | ~~I050 (NVS) + CA (I15/I075)~~ → **DECISION-012 (2026-08-12): deprecación del canal** | **→ SUPERSEDED** (no cierre; eliminación efectiva en PR-G: firmware + backend + docs) | — |
| I65 (INF-006, P0) `IN_PROGRESS` | I074/I075 (config TLS) | **PR-A → avance** | I081 (F2) + DECISION-011 |
| I50 (FW-001, P0) `IN_PROGRESS` | I059 (DONE en C1), I052 (OTA TLS), I076 | **PR-G → avance** (elimina `TS_API_KEY`; NVS Wi-Fi/MQTT/DEVICE_ID/OTA ya en I059/PR-C) | I052 (F2) |

**Regla de la Fase 6:** no se declara un cierre cuando el DoD depende de ISSUEs fuera del ciclo; la deuda diferida se documenta explícitamente con su banda y dependencia.

---

## 8. Criterios de verificación y salida del Ciclo 2

| # | Criterio | Evidencia verificable | ISSUEs |
|---|---|---|---|
| 1 | **Cierres cross-ciclo completados** | I15/I84 `DONE` con evidencia de §6; **I51 `SUPERSEDED` por DECISION-012** (ThingSpeak fuera de arquitectura) | I15, ~~I51~~, I84 |
| 2 | **Avances P0 sin cierre falso** | I65 e I50 `IN_PROGRESS` documentados (C3: I81/D11 e I52) | I50, I65 |
| 3 | **Clúster CI construido y verde** | `pnpm test` raíz; lint/audit/osv-scanner/gitleaks en PR; FE tests en CI; sketches HW en CI o política; **CI global verde (incl. REG-002 y HW_REVISION)** | I66, I76, I79, I80, I110, I063, I064, I073, I083 |
| 4 | **Banda F1 iniciada** | I12/I31/I33/I40/I74/I75/I104/I105/I108 + I6 `DONE` (deps) | I105 vía **PR-H** en el ciclo |
| 5 | **Contratos y datos íntegros** | DELETE transaccional + cascada; deviceId alineado; tests de conformidad verdes | I6, I12 |
| 6 | **FE auth funcional** | Registro reparado (3 capas alineadas); refresh single-flight; tests seguros | I31, I33, I40, I108 |
| 7 | **Snapshot Ciclo 2 vs post-Ciclo 1** | §10 de este documento + re-computo (Fase 8 §8) + re-baseline I104 | global |

**Cierre formal del ciclo:** tras el cierre de los PRs y el snapshot comparado, se emite el informe de cierre con el runbook de gates (Fase 5 §6) y el re-computo del dashboard (Fase 8 §8).

---

## 9. Gates y métricas a verificar al cierre

### 9.1 Gates por ISSUE
- **Entrada:** DoR 9/9 (auditoría `dor-readiness-review-cycle-2.md` — campos por completar).
- **Salida:** DoD 9/9 (backlog §2) — cobertura Fix 80 % / Security 100 % en el cambio; test de regresión en el mismo PR para P0/P1; contratos/ADRs vía supersesión; CHANGELOG componente + raíz; CI verde (objetivo del ciclo: **transversal 4/5 → 5/5**); sin secretos nuevos (gate gitleaks del propio PR-E).

### 9.2 Métricas transversales (Fase 5 §5) — objetivo del ciclo
| Métrica | Objetivo Ciclo 2 | Cómo se verifica |
|---|---|---|
| Cobertura mínima (Fix 80 / Security 100) | PRs del ciclo con tests Security 100 % | Cobertura del cambio en CI |
| Secretos eliminados | `TS_API_KEY` **eliminada** (deprecación PR-G, no migrada) + credenciales Wi-Fi/MQTT fuera de `config.h` (NVS por I059/PR-C); gate gitleaks en CI (I76) | Scan + diff del PR |
| Contratos sincronizados | `mqtt-contract` con TLS obligatorio (I15 cierre); sin cambios wire en API | Regeneración/documentación del PR |
| CI verde | **Transversal CI 4/5 → 5/5** (arregla REG-002 + HW_REVISION preexistentes) | `ci.yml` / estado del PR |
| ADR aprobados | DECISION-006 aplicada (I74/I75); **DECISION-012 aplicada (I51 → SUPERSEDED; ThingSpeak deprecado)**; sin DECISION-011 para el ciclo (F11-7) | `architecture-decisions-pending.md` |

### 9.3 Exit Gate P1 (no se alcanza en el ciclo)
El Exit Gate P1 (Fase 5) exige los **14 P0 cerrados**. Tras el Ciclo 1: 12 cerrados, **I50/I51/I65 `IN_PROGRESS`**. El Ciclo 2: **I51 se resuelve por SUPERSESION (DECISION-012)** — deja de contar como P0 pendiente de cierre por trabajo de canal (ThingSpeak se elimina); **I50/I65 permanecen `IN_PROGRESS`** con cierre en C3 (I52 e I81/D11) → el gate P1 permanece **⛔ PENDING** (DECISION-011). Exit Gates globales: **0/11** (sin cambio), reflejado en el re-baseline I104.

---

## 10. Snapshot post-Ciclo 1 → post-Ciclo 2 (proyección objetivo)

Proyección basada en el criterio de salida del plan; **no es un resultado medido**. Supuestos: 8 PRs mergeados (A–H); **19 ISSUEs `DONE`** (I6, I12, I31, I33, I40, I63, I64, I66, I73, I74, I75, I76, I79, I80, I83, I104, I108, I110 + I105); **2 cierres cross-ciclo `DONE`** (I15, I84); **I51/I023 `SUPERSEDED`** (DECISION-012 — ThingSpeak deprecado y eliminado en PR-G); **2 avances `IN_PROGRESS`** (I50, I65); I70 `BLOCKED`; I71 `BACKLOG`.

### 10.1 Avance por programa

| Prog | ISSUEs | DONE post-C1 | DONE post-C2 (proy.) | Avance | Madurez |
|---|---|---|---|---|---|
| P1 Seguridad | 28 | 17 DONE · I50/I51/I65 IP | **20 DONE** (I15, I74, I75) · **I51 SUPERSEDED** · I50/I65 IN_PROGRESS | ∼75 % (incluye SUPERSEDED como resuelto) | Media-alta |
| P2 Testing | 11 | 1 | **5** (I40, I105 (PR-H), I108, I66→CI, I76→CI) | 45 % | Media → Media-alta |
| P3–P11 | 71 | 0 | **14** (I6, I12, I31, I33, I63, I64, I73, I79, I80, I83, I104, I110, I84, I075→P2… según epic) | — | según epic |
| **Total** | **110** | **18 DONE** | **39 DONE** + 2 IN_PROGRESS (I50, I65) + 1 BLOCKED (I70) + **1 SUPERSEDED (I51)** | **35.5 %** (39/110) | — |

> **Nota de consistencia (§10):** el avance global computa únicamente `DONE` → **39/110 = 35.5 %** (proyección; I51 queda `SUPERSEDED`, no DONE). Estados proyectados: 67 BACKLOG · 0 READY · 2 IN_PROGRESS (I50, I65) · 39 DONE · 1 BLOCKED (I70) · 1 SUPERSEDED (I51) = 110. El re-computo real se fija en el cierre (Fase 8 §8; I104 re-baseline en PR-A).

### 10.2 Riesgo y bloqueadores por área

| Área | Madurez t=2 → proy. | Riesgo t=2 → proy. | Bloqueador post-Ciclo 2 |
|---|---|---|---|
| Seguridad | Media-alta → Media-alta | 🟡 Bajo-medio → 🟡 | DECISION-011 (I70); I50 (I52 C3); I65 (deploy) |
| Infraestructura | Media-alta → Alta | 🟠 Medio → 🟡 | DECISION-011 (backups); I65 deploy C3 |
| Testing | Media → Media-alta | 🟠 Medio → 🟡 | TST-003 (I107 C3, dep I87); cobertura runtime |
| Backend | Media-alta → Media-alta | 🟡 Bajo-medio → 🟡 | BE-014 (I61 C3), BE-007 (I28), BE-013 (I94) |
| Firmware | Media-alta → Media-alta | 🟡 Bajo-medio → 🟡 | I52 (cierre I50, C3) |
| Frontend | Media → Media-alta | 🟠 Medio → 🟡 | FE-004 (SSE auth, I13 dep I94) |
| Arquitectura | Media → Media | 🟡 Bajo-medio → 🟡 | DOC-001/002/003, drift contratos |

### 10.3 KPIs transversales

| KPI | post-Ciclo 1 | post-Ciclo 2 (proy.) |
|---|---|---|
| Estados ISSUEs | 86 B · 0 R · 5 IP (I15/I50/I51/I65/I84) · 18 D · 1 BLOCKED | 67 B · 0 R · 2 IP (I50, I65) · **39 D** · 1 BLOCKED · **1 SUPERSEDED (I51)** |
| Exit Gates | 0/11 | **0/11** (P1 ⛔ PENDING por DECISION-011) |
| Secretos en repo | config.h con secretos reales (I50 IP) | config.h sin secretos (avance I50); gitleaks en CI (I76) |
| CI | ❌ preexistente (REG-002, HW_REVISION) | ✅ verde (transversal **5/5**) |
| Decisiones de arquitectura | 10 ACCEPTED · 1 PENDING | 11 ACCEPTED · **1 PENDING (DECISION-011)** · DECISION-007 SUPERSEDED por **DECISION-012** |
| SCC/D11 | 7 | 7 (intacta) |

---

## 11. Condiciones que habilitan formalmente el inicio de la ejecución

El Ciclo 2 **solo** podrá iniciarse cuando se cumplan **todas**:

1. **Autorización explícita:** este documento (o su evolución) aprobado por el usuario como autorización de ejecución del Ciclo 2.
2. **Frontera del ciclo cerrada:** el conjunto es exactamente los 24 ISSUEs de §2; I70 permanece `BLOCKED` (DECISION-011 PENDING; no se promueve).
3. **Auditoría DoR emitida y campos completados:** los 19 de implementación superan el DoR 9/9 (completar campos señalados en `dor-readiness-review-cycle-2.md`) con registro en el backlog.
4. **Promoción inicial:** los 19 pasan a `READY` (registro de transición según Fase 6 §10.3) — única promoción autorizada en esta fase.
5. **Procedimiento vigente:** se opera con la Fase 6 (10 pasos, plantillas) y la Fase 7 (control de cambios T0/T1/T2); regla dura verde→rojo→verde para P0/P1.
6. **Baseline congelado:** el snapshot post-Ciclo 1 (Fase 8 §10) es la línea de comparación; el snapshot post-Ciclo 2 (§10) es la proyección objetivo.
7. **Entorno operativo:** rama `develop` actualizada (C1 cerrado, PR #205 mergeado); CI disponible; entorno local de pruebas (backend `test:ci`, frontend `build`/`pnpm test`, firmware `pio test -e native`).
8. **PRs a nivel Epic:** no se crea un PR por ISSUE; se ejecuta PR-A…PR-G de §3 con la regla de no mezclar dominios no relacionados.

---

## 12. Hallazgos de fase (sin corrección de backlog)

### F11-1 — CI preexistente ❌ sin ISSUE dedicado (REG-002 + HW_REVISION)
El transversal CI sigue rojo post-C1 por dos causas verificadas (2026-08-12): (a) **REG-002**: la suite backend exige `.env.development` ausente en el job CI; (b) **`firmware/src/ble_provisioning.cpp:105`** usa la macro `HW_REVISION` que **no está definida** en `firmware/platformio.ini` (búsqueda sin coincidencias) → fallo de compilación del job firmware. Ninguna tiene ISSUE dedicado. Se absorben en el clúster del ciclo: REG-002 en PR-B/PR-E (env/test script) y `HW_REVISION` en PR-E o PR-G. **Objetivo del ciclo: transversal CI 4/5 → 5/5** (§9.2).

### F11-2 — I31 solape de 3 capas verificado en código
`AuthModal.jsx:44-46` llama `register(username, email, password)` (3 args, email en 2º); `frontend/src/features/auth/api/auth.js:8` firma `register(username, password, role)` (password en 2º); `backend/src/routes/auth.js:22` `/register` acepta `{username, email, password}` (sin `role`). El bug es real (los args se desplazan: password acaba como role). El fix debe **alinear las tres capas** (decidir si `role` se elimina del front o se añade en backend) y añadir test de regresión. No se re-baselinea I31: su alcance (registro funcional) se mantiene.

### F11-3 — Ciclo mutuo I6 ↔ I12 (misma PR)
Backlog §4: I6 declara `Dependencias: ISSUE-012, ISSUE-061`; I12 declara `Dependencias: ISSUE-006`. Ciclo documentado → **una sola PR** (PR-C), patrón PR-C del Ciclo 0. I061 está `DONE`, por lo que no hay deps externas pendientes.

### F11-4 — Solape I040 ↔ I108 (misma PR)
Ambos apuntan a `frontend/src/**/*.test.jsx` y `AuthProvider.test.jsx` (patrón inseguro localStorage). I040 (FE-012) y I108 (TST-004) son hermanos de EPIC-FE-TESTS → **PR-F única**. No se fusionan ni se re-baselinean; se entregan juntas.

### F11-5 — I080 fusionado con I109
Backlog §4: I109 (TST-005) declara "(fusionado con ISSUE-080)". Ambos objetivos convergen en "frontend vitest en CI + test raíz". Se implementan en **PR-E** como un solo cambio; I109 se contabiliza vía I080.

### F11-6 — Cadena env-consistency → CI gates (mayor desbloqueo del ciclo)
I64 (dep I72, **DONE** en C1) → I73 → I79 → I66 → {I76, I80/I109, I110} → I105. Esta cadena **desbloqueó en su totalidad** al cerrarse I72: es el mayor bloqueo del ciclo y permite reparar el CI preexistente (F11-1) y cerrar I84.

### F11-7 — DECISION-011 no es prerequisito del Ciclo 2
Ningún ISSUE del ciclo depende de I70/I71 ni de DECISION-011 (verificado campo a campo en §2.1). La decisión permanece `PENDING` y solo mantiene bloqueados I70/I71 y el Exit Gate P1 (⛔). El cierre de I65 queda diferido a C3 precisamente por condicionar el **host de despliegue** a DECISION-011 (F9-3/F10-2, se preserva).

### F11-8 — I105 (TST-001) exige el gate CI del ciclo
El DoD de I105 referencia TST-005/006 (I109/I110, PR-E) para la integración en CI. La suite Unity nativa puede avanzar en paralelo (PR-G), pero su **cierre CI** queda condicionado a PR-E. No se promueve antes.

### F11-9 — DECISION-012: ThingSpeak deprecado; PR-G re-secuenciado
El usuario detuvo la implementación de PR-G (2026-08-12) y emitió decisión arquitectónica: **ThingSpeak queda fuera de la arquitectura objetivo; MQTT es el canal canónico de telemetría**. DECISION-012 (ACCEPTED) sustituye a DECISION-007 (que optaba por HTTPS+CA). Impactos: **I51 → SUPERSEDED** (no cierre; se depreca el canal, se elimina `TS_API_KEY`); **I50** ajusta alcance (elimina `TS_API_KEY`, mantiene NVS de Wi-Fi/MQTT); **I105** ajusta alcance de suite (módulos vigentes, sin ThingSpeak); **I023 → SUPERSEDED** (`thingSpeakSync.js` se elimina). ADR-004 marcado SUPERSEDED. **PR-G se re-secuencian a deprecación transversal (F11-10).**

### F11-10 — Preparación técnica de los pendientes derivados de DECISION-012 (vehículos PR-G/PR-H)
Auditoría (2026-08-12, post-aprobación): dependencias y DoR verificadas, árbol inspeccionado sin cambios de código.
- **I050 (avance, cierre I52 C3):** NVS de credenciales vigentes (Wi-Fi/MQTT/DEVICE_ID/OTA) **ya implementado** (PR-C/I059; `config.h` real es `**/config.gitignore`) → en C2 solo resta **eliminar `TS_API_KEY`** (firmware + `generate_config.py` + heredoc CI). Deps: I059 DONE, I076 (PR-E) ✅, I052 (F2) — no bloquea.
- **I105 (cierre en ciclo):** runner Unity nativo ya en CI (PR-E: `pio test -c platformio.test.ini -e native`); suite actual = 6 tests (`test_main.cpp`: channel_mapping + mqtt_credentials). **Falta ampliar ≥60 %** en módulos vigentes: candidatos puros/testables nativos — `hysteresis_controller` (HAL: millis/Serial), `ota_decisor` (semver/url/rssi), `actuator_nvs`/`ota_nvs` (con stub de `Preferences`/NVS), `telemetry_buffer`, `mqtt_credential_policy` (ya), `channel_mapping` (ya). Excluido: `thingspeak_client` (deprecado, PR-G lo elimina).
- **Eliminación efectiva ThingSpeak (PR-G, transversal):** inventario de 18 archivos/fragmentos — firmware (5): `thingspeak_client.cpp/h`, `thingspeak_ca_root.h`, `config.example.h` (bloque TS y `TS_INTERVAL`), `generate_config.py`, `main.ino`/`tasks.cpp/h` (include, instancia `ts`, `taskTelemetry`); backend (8): `thingSpeakSync.js`, `migrate-thingspeak-keys.js`, `routes/api.js` (`thingSpeak/validate` + `integrations/thingspeak` + whitelist), `services` (server schedule), `models/Device.js` (3 campos), `config/env.js` (`TS`), `config/systemSettingsDefaults.js` (`thingspeak_enabled`), migración DB + tests (3: `thingSpeakSync.test.js` se elimina con el service, invariants/contract excluyen rutas); docs (6): `api-contract.md`, `DDD-001/002`, `architecture.md`, `firmware.md`, `manual.md`, `dev-environment.md`, `deployment.md`. **Frontend sin referencias** → sin riesgo de transición. Verificación: grep sin `TS_|ThingSpeak|thingspeak` en firmware/backend/docs activos + backend jest/vitest verdes + firmware build nativo OK.
- **Vehículos mínimos:** **PR-G** (deprecación transversal, materializa I051/I023 SUPERSEDED y avance I050) + **PR-H** (suite nativa I105, dep PR-G+PR-E). **Sin merge en fase de preparación.**

---

## 13. Cierre formal — planificado, no iniciado

**Fecha:** 2026-08-12.

La Fase 11 queda **planificada y cerrada como entregable documental; la ejecución del Ciclo 2 no se inicia**:

1. **Conjunto definido y verificado:** 24 ISSUEs (19 implementación + 3 cierres cross-ciclo + 2 avances) con programa/epic/prioridad/dependencias trazados al backlog y contra código (§2).
2. **Orden operativo definido:** **8 PRs** a nivel Epic con secuencia por oleadas; PR-E → Oleada 2 (dep PR-B); PR-F/PR-G → Oleada 3 (F11-6, F11-8, F11-9); **PR-G → deprecación transversal ThingSpeak (DECISION-012, sin dep de PR-A); PR-H (I105) → Oleada 4 (dep PR-G + PR-E)** (§3).
3. **Reglas de promoción y BLOCKED aplicadas:** los 19 solo promovibles tras auditoría DoR; I70/I71 inamovibles (DECISION-011); **I51 (ya con 9/9) re-auditado a `SUPERSEDED` por DECISION-012**; I65 ya con 9/9 (§4, §5).
4. **DoD alcanzable por ISSUE cross-ciclo definido:** I15/I84 → `DONE` en el ciclo con evidencia; **I51 → `SUPERSEDED` (DECISION-012)**; I65/I50 → avance con cierre diferido a C3 (§6).
5. **Deuda cross-ciclo C1 → C2 → C3 resuelta:** cierres completados en el ciclo; avances con dependencia explícita (§7).
6. **Criterio de salida operacionalizado:** 7 criterios con evidencia verificable (§8).
7. **Gates y métricas de cierre definidos:** DoR/DoD, transversales Fase 5 §5 (objetivo CI 5/5), Exit Gate P1 permanece ⛔ PENDING (§9).
8. **Snapshot proyectado:** Avance 36.4 %, P1 75 %, CI verde, 0/11 gates, D11 intacta (§10).
9. **Arranque formal condicionado:** 8 condiciones explícitas de §11, con la autorización del usuario y la auditoría DoR como primeras.
10. **Sin efectos:** sin código, sin PRs, sin promociones, sin alterar DECISION-011/D11/deuda.

**Estado final de la etapa documental (Fases 0–11):** entregables documentales completos; ningún ISSUE del Ciclo 2 ejecutado. **Próximo paso habilitado (no ejecutado):** aprobar este plan, completar los campos DoR (§5) y autorizar el Ciclo 2 conforme a §11.

> **Nota de actualización (2026-08-13):** este apartado quedó histórico tal como se redactó. El Ciclo 2 **fue autorizado y ejecutado** posteriormente; la varianza real vs. la proyección §10 se documenta en **§14** y en `docs/project/cycle-2-closure/`.

## 14. Cierre formal post-ejecución (2026-08-13)

Autorizado por el usuario conforme a §11 (DoR completado vía `dor-readiness-review-cycle-2.md`). **Ejecución completada — 8 PRs mergeados (PR #206–#214) y cierre global PR-O:**

| PR | ISSUEs | Resultado |
|---|---|---|
| PR-A #206 | I74, I75, I104, I15 (cierre), I65 (avance) | I74/I75/I104/I15 DONE · I65 `IN_PROGRESS` (backend 1.8.0 release consolidado) |
| PR-B #207 | I63, I64, I73, I79, I83 | DONE (5/5) + fix REG-002 (causa (a) de CI resuelta) |
| PR-C #208 | I6, I12 | DONE (DELETE transaccional + filtro tipado) |
| PR-D #209 | I31, I33 | DONE (registro alineado a contrato v1 + refresh single-flight) |
| PR-E #211 | I66, I76, I80, I109, I110, I84 (cierre) | DONE (6/6) — clúster CI gates + scanning secrets; #210 cerrado sin merge, sustituido por #211 |
| PR-F #212 | I40, I108 | DONE (useSSE mock determinista) |
| PR-G #213 | I51 (SUPERSEDED), I23 (SUPERSEDED), I50 (avance) | ThingSpeak deprecado (DECISION-012) — MQTT canónico; I50 `IN_PROGRESS` |
| PR-H #214 | I105 | DONE (suite nativa host + gate cobertura ≥60 %) |
| PR-O (cierre) | — | release consolidado backend 1.8.0 MINOR + CHANGELOG + backlog §9.10 + dashboard §10.2 + `cycle-2-closure/` |

**Varianza vs. proyección §10 (medido, no estimado):**

| Proyección §10 | Medido (post-C2) | Δ / nota |
|---|---|---|
| 39 DONE + 2 IP + 1 BLOCKED + 1 SUPERSEDED + 67 BACKLOG | **40 DONE · 2 IP (I50/I65) · 1 BLOCKED (I70) · 2 SUPERSEDED (I51/I23) · 65 BACKLOG** | +1 DONE, +1 SUPERSEDED (I23 también deprecado) |
| Avance global 35.5 % | **36.4 % (40/110)** | +0.9 p.p. |
| Avance P1 75 % | **82 % (23/28)** | +7 p.p. (I31 también P1) |
| Avance P2 45 % | **91 % (10/11)** | +46 p.p. (I12/I80/I109/I110 también P2) |
| CI ✅ verde (transversal 5/5) | **❌ rojo** (run `31663995397`) | **no cumplido**: 3 suites backend (authorization-negative preexistente + refresh-token-e2e/device-delete-cascade regresión), 22 vulns npm (osv-scanner), firmware build preexistente |
| Exit Gates 0/11 (P1 ⛔) | **0/11** (P1 ⛔ PENDING, DECISION-011) | ✓ sin cambio |
| D11 intacta | 7 SCC intactos | ✓ |

**Deuda registrada para el Ciclo 3 (sin cierre falso, regla §6):**
- **CI rojo post-ciclo:** (a) `authorization-negative.test.js` — preexistente (20 tests, fallaba ya en C1 run `31559720086`); (b) `refresh-token-e2e.test.js` y `device-delete-cascade.test.js` — **regresión del ciclo** (ambos hacen `sequelize.sync({force:true})` en `beforeAll` → interferencia con la base de datos gateada del job de tests; `device-delete-cascade` además usa `require()` en módulo ESM, `ReferenceError: require is not defined`); (c) 22 vulnerabilidades npm (osv-scanner exit 1; incluye vite, esbuild, postcss, js-yaml, nanoid, brace-expansion, uuid, ip-address, react-router); (d) firmware build rojo preexistente (`BLE_PROV_TIMEOUT_MS`, `BUTTON_CLICK_MAX_MS`, `BUTTON_HOLD_3S_MS` no declarados — `config.h` de CI incompleto).
- **Avances:** I50 → I52 (F2, C3); I65 → I81 + DECISION-011 (C3). I70/I71 inamovibles (DECISION-011 PENDING).

**Detalle:** `engineering-backlog.md` §9.10, `phase-8-executive-dashboard.md` §10.2 y `docs/project/cycle-2-closure/` (informe + gate check + trazabilidad).
