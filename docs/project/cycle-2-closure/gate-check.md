# Cierre del Ciclo 2 — Gate Check de CI (run 31663995397)

**Run:** `31663995397` (push/merge final del ciclo, `1466f7e` → `develop`)
**Ciclo 1 preexistente (baseline):** run `31559720086` (post-C1, PR #205)

## 1. Resultado general

| Job | Estado | Detalle |
|---|---|---|
| Frontend build & test | ✅ success | vitest 460/460 |
| Backend test | ❌ **failure** | 3 suites rojas · 38 fallos / 188 verdes (226 totales) |
| Firmware build | ❌ **failure** | defines BLE/BUTTON ausentes en `config.h` (preexistente) |
| Security gates | ❌ **failure** | osv-scanner exit 1 · **22 vulns npm** · gitleaks ✅ "no leaks found" |

**Transversal 5/5: NO cumplido (4/5).** Clasificación de cada fallo:

## 2. Backend test — 3 suites rojas (38 fallos)

| Suite | Fallo | Clasificación | Causa raíz |
|---|---|---|---|
| `authorization-negative.test.js` | 20 fallos | **Preexistente** (ya fallaba en run post-C1 `31559720086`; no es regresión del ciclo) | — |
| `refresh-token-e2e.test.js` | fallos | **Regresión del ciclo (PR-D)** | `sequelize.sync({force:true})` en `beforeAll` (línea 20) → recrea/esquematiza la BD y **pisa la base del job gateado**, `relation "provisioning_tokens" does not exist` |
| `device-delete-cascade.test.js` | fallos | **Regresión del ciclo (PR-C)** | (a) `require()` en módulo ESM → `ReferenceError: require is not defined` (líneas 48/62); (b) `sequelize.sync({force:true})` en `beforeAll` (línea 20) → interferencia con BD gateada, `relation "devices" does not exist` |

**Nota de método:** ambos E2E regresivos comparten el patrón de `sync({force:true})` en `beforeAll`, lo que apunta a una **interferencia de BD compartida** dentro del job de tests (los E2E esquematizan la misma BD que otros suites). Corrección propuesta para C3: cada suite E2E con BD aislada (p. ej. esquema/DB por test o `sync` sin `force` sobre una BD de test dedicada) + import ESM correcto en `device-delete-cascade`.

## 3. Security gates — 22 vulnerabilidades npm (osv-scanner exit 1)

`pnpm audit` reporta **22 vulnerabilidades**; gitleaks correcto (sin secretos). Paquetes afectados (top-level / transitivos):

- `brace-expansion` 1.1.15 · `esbuild` 0.21.5 · `ip-address` 10.2.0 · `js-yaml` 3.15.0 / 4.3.0 · `nanoid` 3.3.15 / 3.3.16 · `postcss` 8.5.16 / 8.5.22 · `react-router` 6.30.4 · `react-router-dom` 6.30.4 · `uuid` 8.3.2 · `vite` (y más).

**Clasificación:** deuda de dependencias, **no regresión funcional del ciclo** (el security job es nuevo en PR-E). Requiere bump de dependencias/digests y re-auditoría en C3.

## 4. Firmware build — defines ausentes (preexistente)

`ble_provisioning.cpp:144` referencia `BLE_PROV_TIMEOUT_MS` y `BUTTON_CLICK_MAX_MS`/`BUTTON_HOLD_3S_MS`, ausentes en el `config.h` **generado por `ci.yml`** (el `config.example.h` los define; la generación de CI no los incluye). **Preexistente** (ya fallaba en run post-C1). La corrección es de tooling de CI (defines en `generate_config.py`), no de firmware de producción.

## 5. Veredicto y deuda a Ciclo 3

| Item | Tipo | Prioridad C3 |
|---|---|---|
| `refresh-token-e2e.test.js` — `sync({force:true})` interfiere BD del job | Regresión PR-D | Alta |
| `device-delete-cascade.test.js` — `require` ESM + `sync({force:true})` | Regresión PR-C | Alta |
| `authorization-negative.test.js` — 20 fallos | Preexistente (no regresión) | Media |
| 22 vulns npm (osv-scanner) | Deuda de dependencias (security job nuevo en PR-E) | Media |
| Firmware build — defines BLE/BUTTON en config de CI | Preexistente (tooling) | Media |

**Conclusión:** el objetivo transversal CI verde **no se cumple en el Ciclo 2**; se registra como deuda explícita sin cierre falso (regla §6 del backlog). El ciclo **no introduce regresión de contrato, secretos ni cobertura**; las 2 suites regresivas son de infraestructura de tests E2E (aislamiento de BD + ESM), no de lógica de producto.
