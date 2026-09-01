# Cierre del Ciclo 3 — Informe de ejecución

**Fecha:** 2026-08-15
**Ciclo:** 3 (cuarto ciclo de ejecución — "Cierres P0 (I050) + remediación CI (deuda C2) + inicio de banda F2 (P3/P4/P6)")
**Plan:** `docs/project/phase-12-cycle-3-plan.md` (§13 cierre formal post-ejecución; §14 varianza real)
**Backlog:** `docs/project/engineering-backlog.md` §9.11
**Dashboard:** `docs/project/phase-8-executive-dashboard.md` §10.3
**Línea base t=3 (entrada):** post-Ciclo 2 — 40 DONE · 2 IN_PROGRESS (I050/I065) · 1 BLOCKED (I070) · 2 SUPERSEDED (I051/I023) · 65 BACKLOG = 110 · avance global 36.4 % · Exit Gates 0/11 (P1 ⛔ PENDING por DECISION-011) · transversal 4/5 (CI ❌ run `31663995397`).

## 1. Resumen

El Ciclo 3 ejecutó **10 PRs** (PR #216–#225; PR-A..G mergeados en `develop`, PR-H/I/J en rama y pendientes de merge) en 3 oleadas, cerrando **22 ISSUEs DONE** + **1 cierre cross-ciclo P0** (I050 → DONE vía I052) + **1 avance P0 sin cierre falso** (I065 → IN_PROGRESS vía I081) + **PR-C transversal sin ISSUE** (remediación de la deuda CI de C2). Avance global **57.3 %** (63/110). Seguridad **86 %** (24/28), Testing **100 %** (11/11). Exit Gates **0/11** (P1 ⛔ PENDING — I65 `IN_PROGRESS` + DECISION-011 `PENDING`).

**Veredicto transversal:** el objetivo **CI verde (5/5) NO se cumple** — el run post-ciclo `31904228419` (merge PR-G #222) queda **rojo en 2 de 4 jobs**: backend test (1 fallo en `authorization-negative.test.js`, no reproducible localmente) y security gates (fallo de permisos de CodeQL SARIF, sin vulnerabilidades: `pnpm audit` limpio y gitleaks OK). Firmware build y Frontend **verdes**. Clasificado en `gate-check.md` y registrado como deuda de Ciclo 4 (sin cierre falso, regla §6).

**Deuda C2 resuelta por PR-C (#218) + cierre:** (b) E2E `refresh-token-e2e` y `device-delete-cascade` **verdes** (29/30 suites pasan); (c) **22 vulns npm → `pnpm audit` "No known vulnerabilities found"**; (d) **firmware build ✅** (defines BLE/BUTTON resueltos); (a) `authorization-negative` reducido de **20 fallos → 1** (residual, no reproducible localmente).

## 2. PRs ejecutados

| PR | Rama | Merge | Alcance | ISSUEs |
|---|---|---|---|---|
| #216 (PR-A) | `feat/ota-https-hash-validation` | `b0f6627` | OTA HTTPS + CA/host pinning + SHA-256 obligatorio (ADR-014); release v1.8.20 | I052 (cierra I050) |
| #217 (PR-B) | `feat/mqtt-provisioning-container` | `2900089` | Provisioning MQTT por dispositivo en imagen prod (Dockerfile + volumen compartido); docs broker; release v1.8.21 | I081 (avanza I065) |
| #218 (PR-C) | `fix/ci-stability-and-deps` | `207865f` | Remediación CI transversal: fix E2E (ESM + aislamiento BD), bump deps (22 vulns → 0), sketch `S3_test-button` | — (transversal, deuda C2) |
| #219 (PR-D) | `feat/device-health-retention-jobs` | `869d3ff` | Retención per-dispositivo; timers con `unref`/guard; watchdog cableado al scheduler + evento offline | I007, I010, I028 |
| #220 (PR-E) | `feat/websocket-jwt-auth` | `23e61ec` | Handshake WS autenticado (JWT) + socket → tenant; conteo ADR corregido (28→33); naming `webSocketServer` alineado | I013, I094, I103 |
| #221 (PR-F) | `feat/pagination-throttle-indexes` | `f8ef8e3` | `limit` acotado + joins/índices; API keys con throttle; sensorHistory con ventana deslizante | I014, I018, I026 |
| #222 (PR-G) | `feat/encryption-at-rest-whitelists` | `93fdd10` | `DATA_ENC_KEY` dedicada (AES + IV); token Telegram cifrado/enmascarado; whitelist de campos en recetas/especies | I020, I011, I025 |
| #223 (PR-H) | `feat/fw-safety-stability` | *pendiente merge* | `rebootCount` reset en ST_NORMAL; SSR off en SAFE/OTA; confirmación OTA desacoplada de WiFi (rollback/wait/confirm) | I053, I054, I058 |
| #224 (PR-I) | `docs/adr-compliance` | *pendiente merge* | ADR-020/022 SUPERSEDED (DECISION-002/003); fuente única roadmap (DECISION-010) | I085, I086, I095 |
| #225 (PR-J) | `docs/adr021-runtime-coverage` | *pendiente merge* | ADR-021 alineado a `controlEngine.js` real; cobertura runtime (controlEngine/mqttBridge/eventBus) | I087, I107 |

## 3. Resultado por ISSUE (medido)

| ISSUE | Estado | PR | Evidencia |
|---|---|---|---|
| I007 (BE-007) | DONE | #219 | Watchdog cableado al scheduler + evento offline; suites `offlineWatchdog`/`deviceHealthWatchdog` |
| I010 (BE-010) | DONE | #219 | Retención per-dispositivo en `dataRetentionService.js`; suites `dataRetentionJob`/`dataRetentionService`/`persistence/dataRetention` |
| I011 (BE-011) | DONE | #222 | Token Telegram cifrado en `telegramConfigurationService.js` + enmascarado; `telegramConfigurationService.test.js` |
| I013 (BE-013) | DONE | #220 | WS /ws autenticado (JWT) + socket→tenant; `webSocketServer.test.js` |
| I014 (BE-014) | DONE | #221 | `limit` acotado + índices (migración `20260815000001-add-performance-indexes`); `pagination.test.js` |
| I018 (BE-018) | DONE | #221 | API keys con throttle/LRU; `apiKeysThrottle.test.js` |
| I020 (BE-020) | DONE | #222 | `DATA_ENC_KEY` dedicada con IV en `encryption.js`; fallos logueados; `encryption.test.js` |
| I025 (BE-025) | DONE | #222 | Whitelist de campos + propiedad en recetas/especies; `recipesSpeciesWhitelist.test.js` |
| I026 (BE-026) | DONE | #221 | sensorHistory con ventana deslizante + guard de tamaño; `phaseEvaluator.test.js` |
| I028 (BE-028) | DONE | #219 | Timers con `unref()`/guard in-flight; `dataRetentionJob.js`/`offlineWatchdog.js` |
| I050 (FW-001, P0) | **DONE** (cross-ciclo) | #216 | Cierre cross-ciclo: OTA TLS + hash obligatorio (I052) sobre groundwork NVS (I059) + `TS_API_KEY` eliminada (PR-G/C2) |
| I052 (FW-003) | DONE | #216 | OTA HTTPS + CA/host pinning + SHA-256 obligatorio; suites `test_ota_executor`/`test_ota_decisor` |
| I053 (FW-004) | DONE | #223 | `rebootCount` reset al llegar a ST_NORMAL; `test_state_machine.cpp` (state_machine 100 %) |
| I054 (FW-005) | DONE | #223 | SSR off en SAFE/OTA (gate por estado); `test_I54_blocks_actuation_in_safe(_and_ota)` |
| I058 (FW-009) | DONE | #223 | Confirmación OTA desacoplada de WiFi: rollback/wait_retry/confirm (`ota_postboot_policy.h`, 100 %) |
| I081 (INF-022) | DONE | #217 | Provisioning por dispositivo en el contenedor; `containerProvisioning.test.js` + `broker-deployment.md` |
| I085 (DOC-001) | DONE | #224 | ADR-020 SUPERSEDED (DECISION-002): CultivationCycle vigente |
| I086 (DOC-002) | DONE | #224 | ADR-022 SUPERSEDED (DECISION-003): HistoryService "reservado" |
| I087 (DOC-003) | DONE | #225 | ADR-021 alineado a `controlEngine.js` real (par mutuo I87↔I107) |
| I094 (DOC-010) | DONE | #220 | Conteo ADR corregido: README "28 ADRs" → 33; `REG-020_adr-count-and-naming.test.ts` |
| I095 (DOC-011) | DONE | #224 | Fuente única roadmap (Roadmap-V2, DECISION-010) en `roadmap.md`/`milestone.md` |
| I103 (DOC-019) | DONE | #220 | Naming `webSocketServer` alineado a su función real (WS server) |
| I107 (TST-003) | DONE | #225 | Cobertura runtime real: `controlEngine.test.js` (10), `mqttBridge.test.js` (14), `eventBus.test.js` (8) — 32/32 |
| I065 (INF-006, P0) | IN_PROGRESS (avance) | #217 | Provisioning funcional en contenedor (I081); **cierre exige DECISION-011** (host de despliegue) |

## 4. Métricas transversales (Fase 5 §5)

| # | Métrica | Estado |
|---|---|---|
| 1 | Contrato REST/MQTT/BLE estable | ✅ (sin cambio de versión de contrato en el ciclo) |
| 2 | CI verde en `develop` | ❌ **rojo** (run `31904228419`: backend 1 fallo authz; security CodeQL permisos; firmware y frontend ✅) |
| 3 | Sin secretos reales en repo | ✅ (gitleaks "no leaks found"; I050 DONE: sin secretos en `config.h`; token Telegram cifrado) |
| 4 | Cobertura de tests por cambio | ✅ (TDD rojo→verde por PR; cobertura runtime 77–100 %; gate cobertura FW ≥60 %) |
| 5 | Documentación y versionado SemVer | ✅ (release consolidado backend 1.10.0 MINOR + derivados sincronizados; CHANGELOG corregido) |

**Cobertura transversal: 4/5** — la única pendiente es CI verde (2 causas residuales → deuda a C4).

## 5. Release consolidado

- **Backend:** 1.9.0 → **1.10.0 (MINOR)** — absorbe PR-B (1.9.0, bump previo con CHANGELOG defectuoso `ghghghg` corregido) + PRs C–G: WS auth, paginación/throttle/índices, cifrado en reposo (`DATA_ENC_KEY`), token Telegram cifrado, whitelist de campos, device health/retention y provisioning en contenedor.
- **Firmware:** 0.24.0 → **0.24.1 (PATCH)** — PR-H (safety & stability). PR-A (0.24.0, OTA TLS v3) ya liberado en v1.8.20.
- **Frontend:** **1.15.5** (sin cambios en el ciclo).
- **Docs:** 0.2.4 → **0.2.5 (PATCH)** — cierre del ciclo.
- **Root:** 1.8.21 → **1.8.22 (PATCH)** — release consolidado.
- Derivados sincronizados: `VERSION` files, `frontend/public/version-manifest.json`, `scripts/release.bat`, `firmware/platformio.ini`. CHANGELOG raíz con entrada consolidada 2026-08-15 (reemplaza la entrada defectuosa `v1.9.0 - ghghghg` de `9df861d`).

## 6. Varianza vs proyección (§10 del plan)

| Indicador | Proyección C3 (§10) | Real (medido) | Δ |
|---|---|---|---|
| ISSUEs DONE | 63 | **63** | = |
| Estados | 43 B · 0 R · 1 IP (I65) · 63 D · 1 BLOCKED · 2 SUPERSEDED | **idéntico** | = |
| Avance global | 57.3 % (63/110) | **57.3 % (63/110)** | = |
| P1 Seguridad | 86 % (24/28) | **86 % (24/28)** | = |
| P2 Testing | 100 % (11/11) | **100 % (11/11)** | = |
| Exit Gates | 0/11 | **0/11** | = |
| CI | ✅ verde (5/5) | ❌ **rojo (2/4 jobs)** | ⬇️ — objetivo NO cumplido |
| Decisiones | 11 ACCEPTED · 1 PENDING | 11 ACCEPTED · 1 PENDING (DECISION-011) | = |

**Única varianza negativa: CI verde.** La remediación PR-C resolvió 3 de 4 causas de C2 (E2E, vulns npm, firmware build) y redujo la cuarta (authz 20→1 fallos), pero quedan 2 jobs rojos (backend 1 fallo + CodeQL permisos) → transversal 4/5, deuda a C4.

## 7. Deuda registrada para el Ciclo 4

Ver `gate-check.md` para el detalle y clasificación. Resumen:
1. **CI rojo (2 jobs):** (a) `authorization-negative.test.js` — 1 fallo residual ("anónimo con token inexistente → 500"), **no reproducible localmente** (52/52 con BD `mush2_test`) → aislamiento/orden de BD en CI; (b) **security gates** — CodeQL `upload-sarif` "Resource not accessible by integration" → falta `security-events: write` en `ci.yml` (sin vulnerabilidades).
2. **Cierre de I65** (P0): exige **DECISION-011** (host de despliegue) → permanece `IN_PROGRESS`; I70 `BLOCKED`, I71 `BACKLOG`.
3. **Exit Gate P1** ⛔: I65 `IN_PROGRESS` + DECISION-011 `PENDING` → gates globales 0/11.
4. **Release train D11 (P8):** I62/I67/I82/I69/I78/I77/I96/I98/I93 → diferido a C4 (F12-6).
5. **Banda F3** (P5/P9/P11) + I101 (SSE URL): condicionadas al cierre P1 (regla dura Fase 4 §6.2).
6. **Elegibles de control de alcance:** I19/I22/I100/I89/I90/I88/I91/I92/I99/I102 → C4.

## 8. Referencias

- `gate-check.md` — gate check con clasificación de cada fallo de CI.
- `trazabilidad.md` — trazabilidad PR→ISSUE→evidencia.
- `docs/project/phase-12-cycle-3-plan.md` §14 — varianza real vs proyección.
- `docs/project/engineering-backlog.md` §9.11 — log de transiciones del ciclo.
- `docs/project/phase-8-executive-dashboard.md` §10.3 — re-computo definitivo.
