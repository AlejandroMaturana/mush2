# Cierre del Ciclo 2 — Informe de ejecución

**Fecha:** 2026-08-13
**Ciclo:** 2 (tercer ciclo de ejecución — "Cierre de banda F1 (parcial) + Gates de CI")
**Plan:** `docs/project/phase-11-cycle-2-plan.md` (§14 cierre formal post-ejecución)
**Backlog:** `docs/project/engineering-backlog.md` §9.10
**Dashboard:** `docs/project/phase-8-executive-dashboard.md` §10.2
**Línea base t=2 (entrada):** post-Ciclo 1 — 18 DONE · 5 IN_PROGRESS · 1 BLOCKED · 86 BACKLOG · Exit Gates 0/11 · transversal 4/5 (CI ❌).

## 1. Resumen

El Ciclo 2 ejecutó **8 PRs** (PR #206–#214; PR #210 cerrado sin merge, sustituido por #211) en 4 oleadas, cerrando **22 ISSUEs DONE + 2 SUPERSEDED** (I051/I023 por DECISION-012). Avance global **36.4 %** (40/110). Seguridad **82 %** (23/28), Testing **91 %** (10/11). Exit Gates **0/11** (P1 ⛔ PENDING por DECISION-011).

**Veredicto transversal:** el objetivo **CI verde (5/5) NO se cumple** — el run post-ciclo `31663995397` queda **rojo** (3 suites backend, 22 vulns npm, firmware build preexistente). Clasificado en `gate-check.md` y registrado como deuda de Ciclo 3 (sin cierre falso, regla §6).

## 2. PRs ejecutados

| PR | Rama | Merge | Alcance | ISSUEs |
|---|---|---|---|---|
| #206 (PR-A) | `feat/mqtt-broker-tls-acl` | `661abb7` | Broker TLS 8883 activo, compose solo 8883, ACL alarm, dashboard re-baseline | I74, I75, I104, I15 (cierre), I65 (avance) |
| #207 (PR-B) | `feat/env-consistency` | `1101cb1` | Node 22, PG16, frozen-lockfile, digests, toolchain pinneada, REG-002 fix | I63, I64, I73, I79, I83 |
| #208 (PR-C) | `feat/data-integrity-contracts` | `ab00d09` | DELETE /devices transaccional con cascada, filtro deviceId tipado | I6, I12 |
| #209 (PR-D) | `feat/auth-register-refresh` | `481965d` | Registro alineado a contrato v1, refresh single-flight, logout controlado | I31, I33 |
| #211 (PR-E) | `feat/ci-gates-scanning` | `819aa4e` | Clúster CI gates (tests orquestados + security job + firmware sketches), fix HW_REVISION, cierre I84 | I66, I76, I80, I109, I110, I84 |
| #212 (PR-F) | `feat/fe-secure-tests` | `3e1d470` | Suite useSSE con mock determinista de EventSource | I40, I108 |
| #213 (PR-G) | `feat/thingspeak-deprecation` | `93de74b` | ThingSpeak deprecado (DECISION-012); MQTT canónico; sync server-side y cliente FW eliminados | I51, I23 (SUPERSEDED), I50 (avance) |
| #214 (PR-H) | `feat/firmware-native-tests` | `1466f7e` | Suite nativa host sin ThingSpeak + gate cobertura ≥60 % | I105 |

**PR #210** (`feat/ci-gates-scanning`, base `main`) fue **cerrado sin merge**; su contenido se entregó vía **#211** (base `develop`). Sin pérdida de alcance.

## 3. Resultado por ISSUE (medido)

| ISSUE | Estado | PR | Evidencia |
|---|---|---|---|
| I006 (BE-006) | DONE | #208 | DELETE /devices transaccional con cascada; 204 tras commit, 409 en violación de integridad |
| I012 (BE-012) | DONE | #208 | Filtro deviceId tipado; 400 en entradas malformadas |
| I015 (BE-015) | DONE | #206 | Broker TLS 8883 activo + ACL alarm + compose solo 8883 (cierre cross-ciclo) |
| I023 (BE-023) | SUPERSEDED | #213 | ThingSpeak deprecado (DECISION-012); `thingSpeakSync.js` eliminado |
| I031 (FE-003) | DONE | #209 | Registro alineado a contrato REST v1 |
| I033 (FE-005) | DONE | #209 | Refresh single-flight + logout controlado |
| I040 (FE-012) | DONE | #212 | useSSE con mock determinista de EventSource |
| I050 (FW-001) | IN_PROGRESS | #213 | Avance: `TS_API_KEY` eliminado; cierre exige I52 (F2, C3) |
| I051 (FW-002) | SUPERSEDED | #213 | DECISION-012: deprecación de ThingSpeak (el objetivo se logra deprecando el canal) |
| I063 (INF-004) | DONE | #207 | PG16 única versión (CI/compose/docs) |
| I064 (INF-005) | DONE | #207 | Node 22 en CI/Docker/docs |
| I065 (INF-006) | IN_PROGRESS | #206 | Avance: config TLS activa; cierre exige I81 + DECISION-011 (C3) |
| I066 (INF-007) | DONE | #211 | Script `test` raíz operativo |
| I073 (INF-014) | DONE | #207 | `--frozen-lockfile` en CI y Docker |
| I074 (INF-015) | DONE | #206 | Listener TLS 8883 activo |
| I075 (INF-016) | DONE | #206 | compose sin 1883 público (solo 8883 TLS) |
| I076 (INF-017) | DONE | #211 | Security job: osv-scanner + gitleaks + pnpm audit |
| I079 (INF-020) | DONE | #207 | Imágenes base pinneadas a digest |
| I080 (INF-021) | DONE | #211 | Frontend en CI: tests vitest + build (fusionado con I109) |
| I083 (INF-024) | DONE | #207 | Toolchain firmware pinneada (python 3.11 + platformio==6.1.19) |
| I084 (INF-025) | DONE | #211 | Checklist de secrets completado + fix HW_REVISION (cierre cross-ciclo) |
| I104 (DOC-020) | DONE | #206 | Dashboard §10.1 re-baseline + docs de broker al estado real |
| I105 (TST-001) | DONE | #214 | Suite nativa host ≥60 % en módulos críticos (sin ThingSpeak) |
| I108 (TST-004) | DONE | #212 | Tests FE seguros y ampliados (useSSE/axiosInstance) |
| I109 (TST-005) | DONE | #211 | Frontend vitest en CI + test raíz |
| I110 (TST-006) | DONE | #211 | Sketches HW declarados en la política de CI |

## 4. Métricas transversales (Fase 5 §5)

| # | Métrica | Estado |
|---|---|---|
| 1 | Contrato REST/MQTT/BLE estable | ✅ (sin cambio de versión de contrato en el ciclo) |
| 2 | CI verde en `develop` | ❌ **rojo** (run `31663995397`) |
| 3 | Sin secretos reales en repo | ✅ (gitleaks "no leaks found"; checklist I84 cerrado) |
| 4 | Cobertura de tests por cambio | ✅ (TDD rojo→verde por PR; gates de cobertura FW ≥60 %) |
| 5 | Documentación y versionado SemVer | ✅ (release consolidado backend 1.8.0 MINOR + derivados sincronizados) |

**Cobertura transversal: 4/5** — la única pendiente es CI verde (deuda a C3).

## 5. Release consolidado

- **Backend:** 1.7.11 → **1.8.0 (MINOR)** — cambio de comportamiento en `DELETE /devices` (transaccional) y auth (registro/refresh).
- **Frontend:** 1.15.4 → **1.15.5 (PATCH)** · **Firmware:** 0.23.4 → **0.23.5 (PATCH)** · **Docs:** 0.2.3 → **0.2.4 (PATCH)** · **Root:** 1.8.18 → **1.8.19 (PATCH)**.
- Derivados sincronizados por primera vez desde 1.8.16/1.7.9: `VERSION`, `backend/VERSION`, `frontend/public/version-manifest.json`, `scripts/release.bat`, `firmware/platformio.ini`.
- CHANGELOG raíz con entrada consolidada 2026-08-13.

## 6. Deuda registrada para el Ciclo 3

Ver `gate-check.md` para el detalle y clasificación del CI. Resumen:
1. **CI rojo** (4 causas: preexistente authz + 2 regresiones del ciclo + 22 vulns npm + firmware build preexistente).
2. **Avances:** I50 → I52 (F2); I65 → I81 + DECISION-011.
3. **Bloqueo estructural:** DECISION-011 PENDING (I70/I71) — Exit Gate P1 ⛔.
4. **Provisión de broker** (I65): exige I81 (provisioning) + plan free→pago/VPS.

## 7. Referencias

- `gate-check.md` — gate check con clasificación de cada fallo de CI.
- `trazabilidad.md` — trazabilidad PR→ISSUE→evidencia.
- `docs/project/phase-11-cycle-2-plan.md` §14 — cierre formal post-ejecución.
- `docs/project/engineering-backlog.md` §9.10 — log de transiciones del ciclo.
- `docs/project/phase-8-executive-dashboard.md` §10.2 — re-computo definitivo.
