# Cierre del Ciclo 2 — Trazabilidad

**Ciclo:** 2 · **Desde:** post-C1 (2026-08-12) · **Hasta:** cierre (2026-08-13)

## 1. Trazabilidad PR → ISSUE → evidencia

| PR | Merge | ISSUEs | Evidencia clave |
|---|---|---|---|
| #206 (PR-A) | `661abb7` | I74, I75, I104, I15 (cierre), I65 (avance) | `REG-016_broker-tls-acl.test.ts` 9/9; handshake TLS local |
| #207 (PR-B) | `1101cb1` | I63, I64, I73, I79, I83 (+REG-002) | `REG-017_env-consistency.test.ts` 11/11 |
| #208 (PR-C) | `ab00d09` | I6, I12 | `device-delete-cascade` suite; contratos actualizados |
| #209 (PR-D) | `481965d` | I31, I33 | `auth.test.js` + `axiosInstance.test.js` |
| #211 (PR-E) | `819aa4e` | I66, I76, I80, I109, I110, I84 (cierre) | `REG-019_ci-gates-scanning.test.ts`; security job |
| #212 (PR-F) | `3e1d470` | I40, I108 | `useSSE.test.jsx` (mock determinista EventSource) |
| #213 (PR-G) | `93de74b` | I51/I23 SUPERSEDED, I50 (avance) | `thingspeak-source-of-truth.test.ts`; DECISION-012 ACCEPTED |
| #214 (PR-H) | `1466f7e` | I105 | suites host `firmware/test/`; gate cobertura ≥60 % |

PR #210 (`feat/ci-gates-scanning`) **cerrado sin merge** (base `main`); entregado vía #211.

## 2. Trazabilidad de versiones

| Componente | Pre-ciclo | Post-ciclo | Bump | Motivo |
|---|---|---|---|---|
| Backend | 1.7.11 | **1.8.0** | MINOR | Cambio de comportamiento: DELETE /devices transaccional + auth registro/refresh |
| Frontend | 1.15.4 | **1.15.5** | PATCH | Fixes de auth y tests (PR-D, PR-F) |
| Firmware | 0.23.4 | **0.23.5** | PATCH | Deprecación ThingSpeak + suite nativa + fix HW_REVISION |
| Docs | 0.2.3 | **0.2.4** | PATCH | Cierre del ciclo |
| Root | 1.8.18 | **1.8.19** | PATCH | Release consolidado |

## 3. Trazabilidad de estados (delta del ciclo)

| Estado | Pre-ciclo | Post-ciclo | Δ |
|---|---|---|---|
| DONE | 18 | 40 | +22 |
| IN_PROGRESS | 5 | 2 | −3 (I15/I51/I84 cerrados) |
| SUPERSEDED | 0 | 2 | +2 (I51, I23) |
| BLOCKED | 1 | 1 | I70 (I71 transitivo) |
| BACKLOG | 86 | 65 | −21 |

## 4. Trazabilidad de decisiones

| Decisión | Estado | Impacto |
|---|---|---|
| DECISION-012 (ThingSpeak deprecado; MQTT canónico) | **ACCEPTED** (PR-G, 2026-08-13) | I51/I23 → SUPERSEDED; I50 avance (elimina TS_API_KEY); ADR-004 SUPERSEDED; I105 alcance ajustado |
| DECISION-011 (infraestructura free→pago/VPS) | PENDING | I70 BLOCKED · I71 transitivo · Exit Gate P1 ⛔ |

## 5. Fuentes verificadas (2026-08-13)

- `git log --merges develop` — merge commits de los 8 PRs (#206–#214).
- `git diff <merge>^1 <merge>` — desglose por componente por PR.
- `gh pr view 210` — PR #210 CLOSED sin merge (base `main`).
- `gh run view 31663995397 --log` — jobs y fallos post-ciclo.
- `gh run view 31559720086` — baseline pre-ciclo (authorization-negative + firmware ya rojos).
- Lectura directa de `refresh-token-e2e.test.js`/`device-delete-cascade.test.js` (causas raíz) y `firmware/src/ble_provisioning.cpp`.
- `package.json` × 5 + `VERSION` × 5 + `platformio.ini` + `version-manifest.json` + `release.bat` — consistencia de versionado verificada.
