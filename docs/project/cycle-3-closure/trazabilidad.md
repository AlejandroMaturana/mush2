# Cierre del Ciclo 3 — Trazabilidad

**Ciclo:** 3 · **Desde:** post-C2 (2026-08-13) · **Hasta:** cierre (2026-08-15)

## 1. Trazabilidad PR → ISSUE → evidencia

| PR | Merge | ISSUEs | Evidencia clave |
|---|---|---|---|
| #216 (PR-A) | `b0f6627` | I052 (cierre cross-ciclo I050) | `test_ota_executor.cpp`/`test_ota_decisor.cpp`; ADR-014; release v1.8.20 / firmware 0.24.0 |
| #217 (PR-B) | `2900089` | I081 (avance I065) | `containerProvisioning.test.js`; Dockerfile; `broker-deployment.md`; release v1.8.21 |
| #218 (PR-C) | `207865f` | — (transversal, deuda C2) | fix E2E (ESM + aislamiento BD); bump deps (22 vulns → 0); sketch `S3_test-button` |
| #219 (PR-D) | `869d3ff` | I007, I010, I028 | `offlineWatchdog.test.js`, `deviceHealthWatchdog.test.js`, `dataRetention*.test.js` |
| #220 (PR-E) | `23e61ec` | I013, I094, I103 | `webSocketServer.test.js`; `REG-020_adr-count-and-naming.test.ts` (28→33) |
| #221 (PR-F) | `f8ef8e3` | I014, I018, I026 | `pagination.test.js`, `apiKeysThrottle.test.js`, `phaseEvaluator.test.js`; migración de índices |
| #222 (PR-G) | `93fdd10` | I020, I011, I025 | `encryption.test.js`, `telegramConfigurationService.test.js`, `recipesSpeciesWhitelist.test.js` |
| #223 (PR-H) | *rama `feat/fw-safety-stability`* | I053, I054, I058 | `pio test -c platformio.test.ini -e native` → **99/99 PASSED**; state_machine 100 %, ota_postboot_policy.h 100 % |
| #224 (PR-I) | *rama `docs/adr-compliance`* | I085, I086, I095 | Notas de supersesión ADR-020/022 (DECISION-002/003); nota fuente única roadmap (DECISION-010) |
| #225 (PR-J) | *rama `docs/adr021-runtime-coverage`* | I087, I107 | Nota ADR-021 vs `controlEngine.js` real; `controlEngine.test.js` (10), `mqttBridge.test.js` (14), `eventBus.test.js` (8) — **32/32 PASSED** |

PR-H (#223), PR-I (#224) y PR-J (#225) están **creadas y pendientes de merge** en el momento del cierre; la trazabilidad es completa y su merge es prerequisito del cierre global.

## 2. Trazabilidad de versiones

| Componente | Pre-ciclo | Post-ciclo | Bump | Motivo |
|---|---|---|---|---|
| Backend | 1.9.0 (bump previo con CHANGELOG defectuoso) | **1.10.0** | MINOR | Release consolidado C3: WS auth, paginación/throttle/índices, cifrado en reposo, token Telegram cifrado, whitelist, device health/retention, provisioning |
| Frontend | 1.15.5 | **1.15.5** | — | Sin cambios en el ciclo |
| Firmware | 0.24.0 | **0.24.1** | PATCH | PR-H: safety & stability (PR-A 0.24.0 = OTA TLS v3, ya liberado) |
| Docs | 0.2.4 | **0.2.5** | PATCH | Cierre del ciclo |
| Root | 1.8.21 | **1.8.22** | PATCH | Release consolidado |

**Nota de corrección:** la entrada `## 2026-08-14 ### Backend — v1.9.0 - ghghghg` (commit `9df861d`, release v1.8.21) era **basura de changelog**; se reemplaza por la entrada consolidada 2026-08-15 y el bump del ciclo pasa a backend **1.10.0**.

## 3. Trazabilidad de estados (delta del ciclo)

| Estado | Pre-ciclo | Post-ciclo | Δ |
|---|---|---|---|
| DONE | 40 | **63** | +23 (22 ISSUEs del ciclo + I050 cross-ciclo) |
| IN_PROGRESS | 2 (I050, I065) | **1** (I065 — avance vía I081, cierre DECISION-011) | −1 |
| SUPERSEDED | 2 (I051, I023) | 2 | — |
| BLOCKED | 1 (I070) | 1 | I70 (I71 transitivo) |
| BACKLOG | 65 | **43** | −22 |

**Avance global: 63/110 = 57.3 %.** P1 **86 %** (24/28), P2 **100 %** (11/11).

## 4. Trazabilidad de decisiones

| Decisión | Estado | Impacto en C3 |
|---|---|---|
| DECISION-002 (ADR-020 Run vs CultivationCycle) | ACCEPTED (2026-08-07) → **aplicada en C3 (I085)** | ADR-020 SUPERSEDED; CultivationCycle vigente (PR-I) |
| DECISION-003 (ADR-022 HistoryService) | ACCEPTED (2026-08-07) → **aplicada en C3 (I086)** | ADR-022 SUPERSEDED; HistoryService "reservado" (PR-I) |
| DECISION-010 (Fuente única roadmap) | ACCEPTED (2026-08-07) → **aplicada en C3 (I095)** | Nota Roadmap-V2 en roadmap/milestone (PR-I) |
| DECISION-011 (infraestructura free→pago/VPS) | PENDING | I70 BLOCKED · I71 transitivo · I65 IN_PROGRESS · Exit Gate P1 ⛔ |
| DECISION-012 (MQTT canónico; ThingSpeak fuera) | ACCEPTED (PR-G/C2) | I51/I23 SUPERSEDED (sin cambio); I050 DONE completo (TS eliminado) |

## 5. Corrección formal del mislabel I087 → I107 (F12-2)

El campo `Dependencias` de I087 citaba `ISSUE-089 (TST-003)`. **I089 es DOC-005** (Capability Matrix); **TST-003 es ISSUE-107**. El vínculo real es el **ciclo mutuo I87↔I107** (I107 declara `Dependencias: ISSUE-087`), consistente con `phase-2-hierarchy.md`. Corrección aplicada en el backlog (`engineering-backlog.md` §4.5, ISSUE-087) y registrada en la trazabilidad de PR-J (#225).

## 6. Fuentes verificadas (2026-08-15)

- `git log --merges develop` — merges PR-A..G (#216–#222); ramas PR-H/I/J (`feat/fw-safety-stability`, `docs/adr-compliance`, `docs/adr021-runtime-coverage`).
- `git diff <merge>^1 <merge> --stat` — desglose por componente por PR.
- `gh run view 31904228419` — jobs y pasos fallidos post-PR-G (backend 1 fallo; security upload-sarif; firmware y frontend verdes).
- `gh api .../check-runs/{id}/annotations` — causa raíz del fallo de security ("Resource not accessible by integration" — permisos CodeQL).
- Ejecución local: `authorization-negative.test.js` **52/52 PASSED** contra BD `mush2_test` (Docker `mush2-test-pg:5544`) → el fallo de CI no es reproducible localmente.
- `pnpm audit` local → "No known vulnerabilities found".
- `pio test -c platformio.test.ini -e native` → **99/99 PASSED** (PR-H).
- `jest src/__tests__/runtime` → **32/32 PASSED** (PR-J); regresión jest 288 passed + 41 skipped / 0 fail; vitest 482/482.
- `package.json` × 5 + `VERSION` × 5 + `platformio.ini` + `version-manifest.json` + `release.bat` — consistencia de versionado verificada.
