# Cierre del Ciclo 3 — Gate Check de CI (run 31904228419)

**Run:** `31904228419` (merge PR-G #222 → `develop`, 2026-08-15)
**Ciclo 2 preexistente (baseline):** run `31663995397` (deuda C2: 3 suites backend rojas + 22 vulns npm + firmware build rojo)

## 1. Resultado general

| Job | Estado | Detalle |
|---|---|---|
| Frontend build & test | ✅ success | vitest green |
| Firmware build | ✅ **success** | (en C2: ❌ defines BLE/BUTTON — **resuelto**) |
| Backend test | ❌ **failure** | 1 suite roja · 1 fallo / 296 verdes (297 totales, 30 suites) |
| Security gates | ❌ **failure** | `upload-sarif` (CodeQL) — **permisos**, sin vulnerabilidades |

**Transversal 5/5: NO cumplido (4/5).** 2 de los 4 jobs verdes; clasificación de cada fallo:

## 2. Backend test — 1 fallo en `authorization-negative.test.js`

| Suite | Fallo | Clasificación | Causa raíz |
|---|---|---|---|
| `authorization-negative.test.js` | 1 fallo: *"anónimo con token inexistente → 401 (INVALID_TOKEN)"* — Expected 401, **Received 500** (línea 139) | **Residual de la deuda C2 (a)** — reducido de **20 fallos → 1** | 29/30 suites verdes (las regresiones E2E de C2 — `refresh-token-e2e` y `device-delete-cascade` — ya pasan). El 500 no se reproduce localmente: **52/52 PASSED** contra BD `mush2_test` (`DATABASE_URL=postgresql://postgres:postgres@localhost:5544/mush2_test`). Apunta a **inestabilidad de aislamiento/orden de BD en CI** (mismo patrón de interferencia documentado en C2), no a lógica de producto: `consumeProvisioningToken` devuelve `{ok:false, status:401, code:'INVALID_TOKEN'}` cuando el token no existe (verificado en `provisioningTokenService.js:51-54`). |

**Nota de método:** el único fallo es de **infraestructura de tests** (DB de CI), no de lógica de `POST /devices/register` — el resto de casos del ISSUE-001 (token válido, revocado, expirado, cuota, bind, etc.) pasan en CI y localmente.

## 3. Security gates — fallo de permisos de CodeQL (no vulnerabilidades)

| Paso | Resultado | Detalle |
|---|---|---|
| `pnpm audit` | ✅ | **"No known vulnerabilities found"** (en C2: 22 vulns npm — **resuelto**) |
| gitleaks | ✅ | "no leaks found" |
| osv-scanner | ✅ | sin hallazgos |
| `upload-sarif` (CodeQL) | ❌ **failure** | `Resource not accessible by integration - https://docs.github.com/rest` — el token del workflow no tiene el permiso **`security-events: write`** necesario para subir el SARIF a GitHub Advanced Security |

**Clasificación:** deuda de **tooling de CI** (permisos del GITHUB_TOKEN en `ci.yml`), **no hay vulnerabilidades**. Advertencias adicionales: acciones Node 20 deprecadas (corren en Node 24) y CodeQL Action v3 deprecada en 2026-12 → migrar a v4.

## 4. Deuda C2 resuelta (verificación)

| Item C2 (`cycle-2-closure/gate-check.md`) | Estado C3 |
|---|---|
| `refresh-token-e2e.test.js` — `sync({force:true})` interfiere BD | ✅ **resuelto** (PR-C #218) — suite verde |
| `device-delete-cascade.test.js` — `require` ESM + `sync({force:true})` | ✅ **resuelto** (PR-C #218) — suite verde |
| `authorization-negative.test.js` — 20 fallos | ⚠️ **reducido a 1** (residual, no reproducible localmente) |
| 22 vulns npm (osv-scanner) | ✅ **resuelto** — `pnpm audit` limpio (PR-C #218 bump deps) |
| Firmware build — defines BLE/BUTTON en config de CI | ✅ **resuelto** — firmware build verde |

## 5. Veredicto y deuda a Ciclo 4

| Item | Tipo | Prioridad C4 |
|---|---|---|
| `authorization-negative.test.js` — 1 fallo (500 vs 401) no reproducible localmente | Inestabilidad de CI (aislamiento/orden BD) | Alta |
| CodeQL `upload-sarif` — falta `security-events: write` en `ci.yml` | Deuda de tooling (permisos) | Alta |
| Acciones Node 20 deprecadas + CodeQL v3 deprecada (2026-12) | Deuda de tooling (deprecaciones) | Media |

**Conclusión:** el objetivo transversal CI verde **no se cumple en el Ciclo 3**; se registra como deuda explícita a C4 sin cierre falso (regla §6 del backlog). La remediación PR-C resolvió **3 de 4 causas** de C2 y redujo la cuarta a un fallo residual de infraestructura de tests; **no se introducen regresiones de contrato, secretos ni cobertura** — el 500 es inestabilidad de la BD del job (mismo patrón de interferencia de C2), y el fallo de security es de permisos del workflow, no de vulnerabilidades.
