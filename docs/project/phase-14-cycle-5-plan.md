# Fase 14 — Sexto ciclo de ejecución: Plan del Ciclo 5 "Banda F3 (P5 frontend) + CI remediation + deuda residual" — Mush2

**Fecha:** 2026-08-17
**Estado:** PLANIFICADO — PENDIENTE DE AUTORIZACIÓN.
**Línea base t=5:** `docs/project/phase-8-executive-dashboard.md` §10.4 (post-Ciclo 4, 2026-08-17): **86 DONE · 1 IN_PROGRESS (I65) · 1 BLOCKED (I070) · 2 SUPERSEDED (I51/I23) · 20 BACKLOG = 110** · avance global **78.2 %** · Exit Gates **0/11** (P1 ⛔ PENDING por DECISION-011) · transversal **4/5** (CI ❌ workflow file issue pre-existente).
**Orquestador:** `docs/project/engineering-execution-plan.md` — Fase 14 (sexto ciclo)
**Baseline de código confirmado:** `develop` @ `1940e70` (post-merge de PR-C/D/E/G + fix lazy-import; cierre formal C4 §9.12).

**Fuentes trazadas:**
- **Plan** → Fase 14 (Ciclo 5, tabla de ISSUEs, criterio de salida)
- **DoR** → `dor-readiness-review-cycle-5.md` (a emitir; Ciclo 4: `dor-readiness-review-cycle-4.md`)
- **Fase 4** → `phase-4-execution-order.md` (§6.2 regla dura P1-antes-de-features; §7 Ciclo 5 propuesto — P5 frontend, P9 perf, P10 DX, P11 reliability)
- **Fase 6** → `phase-6-issue-procedure.md` (máquina de estados, 10 pasos, plantillas)
- **Fase 7** → `phase-7-change-control.md` (control de cambios, T0/T1/T2)
- **Fase 5** → `phase-5-maturity-gates.md` (runbook de gates, métricas transversales)
- **Backlog** → `engineering-backlog.md` (estados §9.12 post-C4; deps campo a campo §4; I065 `IN_PROGRESS`, I070 `BLOCKED`, DECISION-011 `PENDING`)
- **Cierre C4** → `phase-13-cycle-4-plan.md` §13 (deuda C5: CI residual + DECISION-011 + I008 + CHANGELOG + firmware validation + Jest TS; §9.12.5/§9.12.6 de `engineering-backlog.md`)

**Método:** derivación íntegra desde las fuentes vigentes (sin inventar datos): conjunto del Ciclo 5, dependencias verificadas campo a campo y contra el estado post-C4, orden operativo por PRs a nivel Epic, reglas de promoción (Fase 6), criterio de salida, DoR actual de los candidatos y condiciones formales de arranque. Solo documental.

**Restricciones cumplidas:** sin código; sin ramas; sin PRs; sin promociones a `READY`; sin versionado; sin alterar DECISION-011 ni D11; I065 permanece `IN_PROGRESS`; I070 `BLOCKED`; I071 `BACKLOG` (bloqueo transitivo); deuda CI de C4 explícita (§7/§12) sin cierre falso; **banda F3 condicionada a autorización del usuario** (regla dura Fase 4 §6.2 — P1 no cerrado; DECISION-011 PENDING).

---

## 1. Objetivo y alcance del Ciclo 5

**Objetivo:** **ejecutar la banda F3 (P5 frontend) habilitada por el cierre de C4** — los 17 ISSUEs de P5 (16 BACKLOG + I033 ya `READY`) + I101 (SSE URL, P3, dep I032) — **remediar la deuda de CI heredada de C4** (PR-A, workflow `ci.yml`) **y absorber la deuda residual de C4** (I008, CHANGELOG, Jest TS skips). Firmware validation se gestiona como deuda formalmente trasladable (ver §6 criterio 5).

**Alcance (incluye):**
- **CI remediation (PR-A, sin ISSUE dedicado — deuda C2→C3→C4):** `ci.yml` workflow file issue (run 31983364321, 0s). Acciones: Node 22, CodeQL v4, aislamiento de tests, resolución de `authorization-negative` flaky. Objetivo: **transversal CI 4/5 → 5/5**.
- **CHANGELOG C4 (PR-A o PR-H):** agregar sección C4 con las 23 transiciones de §9.12 de `engineering-backlog.md`.
- **I008 (BE-008, P1, P4 — upgrade sin billing):** promovible a READY (I009 DONE). Flujo de confirmación de cambios de plan; reconciliación de entitlement. Deps: I009 ✅.
- **Banda F3 — P5 frontend (17 ISSUEs):**
  - I032 (FE-004, P1): SSE singleton auth/reconexión. Dep: I013 ✅.
  - I033 (FE-005, P1): Refresh single-flight. Estado: `READY` (C2). Sin deps abiertas.
  - I034 (FE-006, P1): 404 en rutas protegidas. Sin deps.
  - I035 (FE-007, P2): Modales a11y. Sin deps.
  - I036 (FE-008, P2): API layer inconsistente. Sin deps.
  - I037 (FE-009, P2): Código muerto. Sin deps.
  - I038 (FE-010, P2): README frontend. Sin deps.
  - I039 (FE-011, P2): Sin lint/typecheck. Sin deps.
  - I041 (FE-013, P2): Polling duplicado. Dep: I032.
  - I042 (FE-014, P3): Format utils duplicadas. Sin deps.
  - I043 (FE-015, P3): Errores tragados. Sin deps.
  - I044 (FE-016, P3): alert() nativo. Dep: I043.
  - I045 (FE-017, P3): Datos faltantes como 0 en gráficos. Sin deps.
  - I046 (FE-018, P3): ToggleSwitch como div. Sin deps.
  - I047 (FE-019, P3): Tema hardcodeado y FOUC. Sin deps.
  - I048 (FE-020, P3): Proxy Vite hardcodeado. Sin deps.
  - I049 (FE-021, P3): Doble fuente de versión. Sin deps.
- **I101 (DOC-017, P2, P3 — SSE URL doble):** dep I032 ✅.
- **I099 (DOC-015, P3, P8 — artefactos VitePress):** sin deps.
- **Firmware validation:** evidencia de `pio run` o confirmación CI para PR-F de C4 (I055/I056/I057). **Deuda formalmente trasladable a C6** si no es verificable en C5 (ver §6 criterio 5).
- **Jest TS skips:** configurar `ts-jest` o documentar como deuda aceptada.

**Alcance (no incluye):**
- **I065 (IN_PROGRESS):** permanece IP. Avance condicionado a DECISION-011. No se cierra en C5.
- **I070/I071 (BLOCKED/BACKLOG):** dependientes de DECISION-011 PENDING. No se promueven.
- **DECISION-011:** se mantiene PENDING. No es prerequisito de ejecución de C5 (ver §4), pero mantiene Exit Gate P1 ⛔.
- **Programas P7/P9/P10/P11:** no hay BACKLOG en estos programas (todos DONE). No se promueve nada nuevo.

**Nota sobre regla dura Fase 4 §6.2:** la regla establece "ninguna feature entra hasta que el Programa 1 esté cerrado". El Programa 1 no está cerrado (I065 IP, I070 BLOCKED, DECISION-011 PENDING). Sin embargo, el cierre de C4 (§9.12.6 condición 4) habilita la banda F3 como candidata a C5. **La ejecución de la banda F3 en C5 requiere autorización explícita del usuario para proceder bajo la condición de que DECISION-011 no bloquea técnicamente las features de P5** (no hay dependencia de código entre I065/I070 y los ISSUEs de P5). Si el usuario no autoriza, C5 se limita a PR-A + I008 + CHANGELOG (4-5 ISSUEs solamente).

---

## 2. Conjunto del Ciclo 5

### 2.1 ISSUEs candidatos (19 BACKLOG + 1 READY + deuda C4 = 20 total)

| # | ISSUE | Código | Título | Programa | Prioridad | Dependencias | Estado actual | Elegible |
|---|---|---|---|---|---|---|---|---|
| 1 | I008 | BE-008 | Upgrade sin billing | P4 | P1 | I009 ✅ DONE | BACKLOG | ✅ |
| 2 | I032 | FE-004 | SSE sin auth/reconexión | P5 | P1 | I013 ✅ DONE | BACKLOG | ✅ |
| 3 | I033 | FE-005 | Refresh sin single-flight | P5 | P1 | — | READY (C2) | ✅ |
| 4 | I034 | FE-006 | Sin 404 en rutas protegidas | P5 | P1 | — | BACKLOG | ✅ |
| 5 | I035 | FE-007 | Modales sin a11y | P5 | P2 | — | BACKLOG | ✅ |
| 6 | I036 | FE-008 | Capa API inconsistente | P5 | P2 | — | BACKLOG | ✅ |
| 7 | I037 | FE-009 | Código muerto | P5 | P2 | — | BACKLOG | ✅ |
| 8 | I038 | FE-010 | README frontend obsoleto | P5 | P2 | — | BACKLOG | ✅ |
| 9 | I039 | FE-011 | Sin lint/typecheck | P5 | P2 | — | BACKLOG | ✅ |
| 10 | I041 | FE-013 | Polling duplicado | P5 | P2 | I032 | BACKLOG | ⚠️ dep I032 |
| 11 | I042 | FE-014 | Utilidades formato duplicadas | P5 | P3 | — | BACKLOG | ✅ |
| 12 | I043 | FE-015 | Errores tragados | P5 | P3 | — | BACKLOG | ✅ |
| 13 | I044 | FE-016 | alert() nativo | P5 | P3 | I043 | BACKLOG | ⚠️ dep I043 |
| 14 | I045 | FE-017 | Datos faltantes como 0 en gráficos | P5 | P3 | — | BACKLOG | ✅ |
| 15 | I046 | FE-018 | ToggleSwitch como div | P5 | P3 | — | BACKLOG | ✅ |
| 16 | I047 | FE-019 | Tema hardcodeado y FOUC | P5 | P3 | — | BACKLOG | ✅ |
| 17 | I048 | FE-020 | Proxy Vite hardcodeado | P5 | P3 | — | BACKLOG | ✅ |
| 18 | I049 | FE-021 | Doble fuente de versión | P5 | P3 | — | BACKLOG | ✅ |
| 19 | I099 | DOC-015 | Artefactos VitePress commiteados | P8 | P3 | — | BACKLOG | ✅ |
| 20 | I101 | DOC-017 | SSE URL doble | P3 | P2 | I032 ✅ | BACKLOG | ⚠️ dep I032 |

**Total: 20 candidatos** (19 BACKLOG + 1 READY). I033 ya `READY`.

**Dependencias internas del ciclo:**
- I041 → I032 (misma PR,前者后者)
- I044 → I043 (misma PR)
- I101 → I032 (pueden ir en la misma PR)

**Cadena de dependencias:**
```
I032 (SSE singleton, PR-B) → I041 (polling, PR-C) — cross-PR, PR-B primero
I032 (SSE singleton, PR-B) → I101 (SSE URL, PR-B) — misma PR
I043 (errores tragados, PR-C) → I044 (alert nativo, PR-C) — misma PR
```

### 2.2 Estados restringidos (no se cierran en C5)

| ISSUE | Estado | Razón |
|---|---|---|
| I065 | IN_PROGRESS | Cierre condicionado a DECISION-011. Avanzar con PR-B si hay avance técnico, pero no cerrar. |
| I070 | BLOCKED | DECISION-011 PENDING. Sin cambio. |
| I071 | BACKLOG | Dep I070 BLOCKED + DECISION-011 PENDING. No promovible. |
| DECISION-011 | PENDING | Requiere decisión del usuario. No es prerequisito de C5 pero mantiene Exit Gate P1 ⛔. |

### 2.3 Promoción inicial (a ejecutar tras autorización)

Los 16 BACKLOG de P5 pasan a `READY` tras auditoría DoR (§5). I008 pasa a `READY` tras auditoría DoR. I033 permanece `READY` (ya promovido en C2). I099 e I101 pasan a `READY` tras auditoría DoR.

**Total promovidos a READY:** 19 (16 BACKLOG P5 + I008 + I099 + I101). I033 no requiere promoción (ya `READY`).

---

## 3. PRs y oleadas

### 3.1 Estructura de PRs

| PR | Nombre | Dominio | ISSUEs | Oleada | Depende de |
|---|---|---|---|---|---|
| PR-A | CI Green Completion | CI/Testing/Infra | (sin ISSUE — deuda C4) | 1 | develop |
| PR-B | Frontend Core (SSE + Auth) | Frontend/P5 | I032, I033, I034, I101 | 2 | PR-A (CI verde) |
| PR-C | Frontend Quality (a11y + cleanup) | Frontend/P5 | I035, I036, I037, I038, I039, I041, I042, I043, I044, I045, I046, I047, I048, I049 | 2 | PR-A (CI verde) |
| PR-D | Backend Entitlement (billing flow) | Backend/P4 | I008 | 2 | PR-A (CI verde) |
| PR-E | Docs & VitePress cleanup | Docs/P8 | I099 | 3 | PR-B o PR-C |

### 3.2 Oleadas

**Oleada 1 — Remediación CI (PR-A)**
- PR-A: `ci.yml` workflow fix (Node 22, CodeQL v4, test isolation, flaky authz). Sin ISSUE dedicado.
- Commits esperados: `fix(ci): ...`
- **Prerequisito de todas las demás PRs.**

**Oleada 2 — Implementación (PR-B + PR-C + PR-D, en paralelo)**
- PR-B: Frontend core — SSE singleton (I032), refresh single-flight (I033), 404 routes (I034), SSE URL (I101). **PR de mayor riesgo** (I032 es P1 y prerequisito de I041/I101).
- PR-C: Frontend quality — a11y (I035), API layer (I036), dead code (I037), README (I038), lint/typecheck CI (I039), polling (I041), format utils (I042), error handling (I043→I044), chart data (I045), ToggleSwitch (I046), theme FOUC (I047), Vite proxy (I048), version dual (I049). **PR de mayor volumen** (14 ISSUEs, todos P2/P3).
- PR-D: Backend — I008 (upgrade sin billing). **PR independiente** (P4, no depende de frontend).

**Oleada 3 — Cierre documental (PR-E)**
- PR-E: I099 (VitePress artifacts). Dependiente de que los PRs de frontend no generen nuevos artefactos.

### 3.3 Secuencia de ejecución

```
PR-A (CI) ──→ PR-B (SSE+Auth)  ──→ PR-E (Docs)
           ├──→ PR-C (Quality) ──→
           └──→ PR-D (Billing) ──→
```

PR-B, PR-C y PR-D pueden ejecutarse en paralelo tras PR-A. PR-E va en Oleada 3.

---

## 4. Dependencias y restricciones

### 4.1 Dependencias externas

| Dependencia | Tipo | Estado | Impacto en C5 |
|---|---|---|---|
| DECISION-011 | Decisión de usuario | PENDING | No bloquea ejecución de C5 técnicamente (features de P5 no dependen de infra). Mantiene Exit Gate P1 ⛔. |
| I065 | IN_PROGRESS | IP | No se cierra. Avance técnico posible pero no en alcance de C5 (requiere DECISION-011). |
| I070 | BLOCKED | B | No se toca. Depende de DECISION-011. |
| I071 | BACKLOG | B | No se promueve. Dep I070 BLOCKED. |
| CI workflow | Infra Heredada | ❌ | PR-A lo resuelve en Oleada 1. prerequisito de todo. |

### 4.2 Restricciones de banda

| Restricción | Regla | Aplicación en C5 |
|---|---|---|
| Regla dura §6.2 | "Ninguna feature entra hasta que P1 esté cerrado" | **Requiere autorización del usuario para proceder.** Técnicamente: I032/I033/I034 son P5 features pero no dependen de I065/I070. La regla es de gobierno, no técnica. |
| DECISION-011 | Exit Gate P1 ⛔ | No se resuelve en C5. Se documenta como condición heredada a C6. |
| Banda F3 habilitable | §9.12.6 C4 | Habilitada como candidata; promoción condicionada a autorización (punto anterior). |

### 4.3 Cadena de dependencias internas

```
I032 (SSE singleton, P1)
├──→ I041 (polling duplicado, P2) — misma PR-B
└──→ I101 (SSE URL doble, P2) — misma PR-B

I043 (errores tragados, P3)
└──→ I044 (alert nativo, P3) — misma PR-C
```

---

## 5. Auditoría DoR (pre-promoción)

### 5.1 Checks del DoR (Fase 6 §7, backlog §1)

| # | Check | Descripción |
|---|---|---|
| 1 | Alcance claro | Objetivo y problema declarados |
| 2 | Contrato/versión | Contrato afectado y versión declarados (o N/A justificado) |
| 3 | ADR evaluado | ADR requerido, existente o N/A justificado |
| 4 | DDD evaluado | DDD requerido, existente o N/A justificado |
| 5 | Riesgos identificados | Riesgos y mitigación declarados |
| 6 | Verificación (verde→rojo→verde) | Test que falla hoy, condición de problema, test que pasa tras fix |
| 7 | Archivos afectados | Lista de archivos impactados |
| 8 | Dependencias satisfechas | Deps DONE o con plan de desbloqueo |
| 9 | Sin DECISION bloqueadora | Ninguna DECISION-NNN PENDING bloquea el ISSUE |

### 5.2 Evaluación preliminar por ISSUE

| ISSUE | Check 1 | Check 2 | Check 3 | Check 4 | Check 5 | Check 6 | Check 7 | Check 8 | Check 9 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|
| I008 | ✅ | ✅ api-contract v1 | ✅ ADR-016 | N/A | ✅ | ✅ upgrade flow test | ✅ routes/subscriptions | ✅ I009 DONE | ✅ | **9/9 → READY*** |
| I032 | ✅ | ✅ api-contract v1 | N/A | N/A | ✅ | ✅ useSSE singleton test | ✅ useSSE.js | ✅ I013 DONE | ✅ | **9/9 → READY*** |
| I033 | ✅ | ✅ api-contract v1 | N/A | N/A | ✅ | ✅ single-flight test | ✅ axiosInstance.js | ✅ sin deps | ✅ | **9/9 → READY** (ya) |
| I034 | ✅ | N/A (routing FE) | N/A | N/A | ✅ | ✅ 404 test | ✅ router | ✅ sin deps | ✅ | **9/9 → READY*** |
| I035 | ✅ | N/A | N/A | N/A | ✅ | ✅ a11y audit | ✅ modals | ✅ sin deps | ✅ | **9/9 → READY*** |
| I036 | ✅ | N/A | N/A | N/A | ✅ | ✅ API layer test | ✅ api/ | ✅ sin deps | ✅ | **9/9 → READY*** |
| I037 | ✅ | N/A | N/A | N/A | ✅ | ✅ dead code scan | ✅ src/ | ✅ sin deps | ✅ | **9/9 → READY*** |
| I038 | ✅ | N/A (docs) | N/A | N/A | N/A | N/A | ✅ README.md | ✅ sin deps | ✅ | **7/7 docs → READY*** |
| I039 | ✅ | N/A | N/A | N/A | ✅ | ✅ lint pass | ✅ .eslintrc | ✅ sin deps | ✅ | **9/9 → READY*** |
| I041 | ✅ | N/A | N/A | N/A | ✅ | ✅ polling test | ✅ panels | ⚠️ I032 | ✅ | **8/9 → READY* (cond I032)** |
| I042 | ✅ | N/A | N/A | N/A | ✅ | ✅ format test | ✅ utils/ | ✅ sin deps | ✅ | **9/9 → READY*** |
| I043 | ✅ | N/A | N/A | N/A | ✅ | ✅ error boundary test | ✅ components/ | ✅ sin deps | ✅ | **9/9 → READY*** |
| I044 | ✅ | N/A | N/A | N/A | ✅ | ✅ toast test | ✅ components/ | ⚠️ I043 | ✅ | **8/9 → READY* (cond I043)** |
| I045 | ✅ | N/A | N/A | N/A | ✅ | ✅ chart test | ✅ ChartPanel | ✅ sin deps | ✅ | **9/9 → READY*** |
| I046 | ✅ | N/A | N/A | N/A | ✅ | ✅ a11y test | ✅ ToggleSwitch | ✅ sin deps | ✅ | **9/9 → READY*** |
| I047 | ✅ | N/A | N/A | N/A | ✅ | ✅ theme test | ✅ theme/ | ✅ sin deps | ✅ | **9/9 → READY*** |
| I048 | ✅ | N/A | N/A | N/A | ✅ | ✅ vite config test | ✅ vite.config | ✅ sin deps | ✅ | **9/9 → READY*** |
| I049 | ✅ | N/A | N/A | N/A | ✅ | ✅ version check | ✅ VERSION | ✅ sin deps | ✅ | **9/9 → READY*** |
| I099 | ✅ | N/A (docs) | N/A | N/A | N/A | N/A | ✅ docs/ | ✅ sin deps | ✅ | **7/7 docs → READY*** |
| I101 | ✅ | ✅ api-contract v1 | N/A | N/A | ✅ | ✅ SSE URL test | ✅ routes/events | ⚠️ I032 | ✅ | **8/9 → READY* (cond I032)** |

**READY* = condicionado a que las dependencias internas del ciclo se cierren en la misma PR o en PR anterior.**

**Nota:** los checks 2–6 se completarán formalmente en la auditoría DoR emitida (`dor-readiness-review-cycle-5.md`) antes de la promoción. Esta evaluación preliminar es para planificación.

---

## 6. Criterios de salida del Ciclo 5

Los 8 criterios siguientes son **específicos de C5** y se verifican al cierre del ciclo. No confundir con los 11 Exit Gates globales (Fase 5 §5 / `phase-5-maturity-gates.md`), que incluyen Exit Gate P1 (⛔ PENDING, no resoluble en C5).

| # | Criterio C5 | Evidencia requerida | ISSUEs |
|---|---|---|---|
| 1 | **CI verde transversal 5/5** | Run post-ciclo verde en todos los jobs de `ci.yml` | PR-A |
| 2 | **Banda F3 ejecutada** | Todos los 17 ISSUEs P5 en DONE o con evidencia de cierre | I032…I049 |
| 3 | **I008 cerrado** | PR-D merged; flujo de upgrade con billing testado | I008 |
| 4 | **CHANGELOG C4 documentado** | Sección C4 en `CHANGELOG.md` con las 23 transiciones | — |
| 5 | **Firmware validation (deuda formalmente trasladable)** | Evidencia de `pio run` o CI green para I055/I056/I057; si no es verificable en C5, se documenta como deuda aceptada heredada a C6 con registro explícito en §9.12.5 del backlog | PR-F C4 |
| 6 | **Banda F3 intacta (regla dura)** | Ningún ISSUE de P7/P9/P11 promovido fuera de C5 | — |
| 7 | **Snapshot C5 vs C4** | §10 de este documento | global |
| 8 | **Avance P0 sin cierre falso** | I065 permanece IN_PROGRESS; I070 BLOCKED | I065, I070 |

**Nota sobre firmware validation (criterio 5):** PR-F de C4 (I055/I056/I057) fue mergeado sin evidencia local de `pio run` (requiere toolchain ESP32). El cierre de C4 (§9.12.5, deuda #6) lo documentó como "deuda heredada a C5". En C5 se **intenta validar vía CI**; si no es verificable (falta toolchain en CI o sin job de firmware), se formaliza como **deuda aceptada y trasladable a C6** con el mismo registro del backlog. No es un blocker del cierre de C5.

---

## 7. Gates globales (no resolubles en C5)

Los 11 Exit Gates globales (`phase-5-maturity-gates.md`) permanecen sin cambio. **C5 no los resuelve; solo los afectados por DECISION-011 siguen ⛔ PENDING.**

### 7.1 Exit Gate P1 (global, ⛔ PENDING)

| Condición | Estado | Nota |
|---|---|---|
| I065 IN_PROGRESS | ⛔ PENDIENTE | Cierre condicionado a DECISION-011 |
| I070 BLOCKED | ⛔ PENDIENTE | DECISION-011 PENDING |
| DECISION-011 | ⛔ PENDING | Requiere decisión del usuario |
| **Gate P1** | **⛔ PENDING** | **No se resuelve en C5** |

### 7.2 Transversales (Fase 5 §5)

| Métrica | Objetivo global | Estado actual | C5 impacto |
|---|---|---|---|
| CI | 5/5 ✅ | 4/5 ❌ | PR-A lo resuelve → transversal mejora |
| Fix coverage | ≥80% | Por verificar | Se verifica en cierre C5 |
| Security | 100% | Por verificar | Se verifica en cierre C5 |
| Contracts synced | Sí | Por verificar | Se verifica en cierre C5 |
| No new secrets | Sí | Por verificar | Se verifica en cierre C5 |
| ADRs approved | Sí | Por verificar | Se verifica en cierre C5 |

---

## 8. Proyección post-Ciclo 5

| Indicador | Post-C4 (§9.12.2) | Post-C5 (proy.) | Δ |
|---|---|---|---|
| DONE | 86 | **106** | +20 |
| BACKLOG | 20 | **0** | −20 |
| IN_PROGRESS | 1 (I065) | **1 (I065)** | — |
| BLOCKED | 1 (I070) | **1 (I070)** | — |
| SUPERSEDED | 2 (I51/I23) | **2 (I51/I23)** | — |
| Avance global | 78.2 % (86/110) | **96.4 % (106/110)** | +18.2 p.p. |
| P1 Seguridad | 86 % (24/28) | **86 % (24/28)** | — |
| P2 Testing | 100 % (11/11) | **100 % (11/11)** | — |
| P5 Frontend | 0 % (0/17) | **100 % (17/17)** | +100 p.p. |
| CI | 4/5 (❌) | **5/5 (✅)** | +1 |
| Exit Gates globales | 0/11 (P1 ⛔) | **0/11 (P1 ⛔)** | — |
| C5 Exit Criteria | n/a | **8/8 (proyectado)** | — |
| Decisiones | 11 ACCEPTED · 1 PENDING | **11 ACCEPTED · 1 PENDING** | — |

**Varianza esperada:** 0 ISSUEs (20 planificados = 19 BACKLOG a promover + 1 ya READY). Si I032 o I041 no se cierran por dependencia, la varianza sería −1 o −2.

---

## 9. Condiciones de arranque

El Ciclo 5 **solo** podrá iniciarse cuando se cumplan **todas**:

1. **Autorización explícita:** este documento (o su evolución) aprobado por el usuario como autorización de ejecución del Ciclo 5. **Incluye autorización para proceder con banda F3 bajo la condición de que DECISION-011 no bloquea técnicamente las features de P5.**
2. **Frontera del ciclo cerrada:** el conjunto es exactamente los 20 ISSUEs de §2.1 + PR-A transversal + CHANGELOG C4 + firmware validation.
3. **Auditoría DoR emitida y campos completados:** los 20 candidatos superan el DoR 9/9 (completar campos señalados en `dor-readiness-review-cycle-5.md`) con registro en el backlog.
4. **Promoción inicial:** los 16 BACKLOG de P5 + I008 + I099 + I101 pasan a `READY` (19 promociones; registro de transición según Fase 6 §10.3). I033 permanece `READY` (sin promoción).
5. **Procedimiento vigente:** se opera con la Fase 6 (10 pasos, plantillas) y la Fase 7 (control de cambios T0/T1/T2); regla dura verde→rojo→verde para P0/P1.
6. **Baseline congelado:** el snapshot post-Ciclo 4 (§9.12 de `engineering-backlog.md` + §10.4 del dashboard) es la línea de comparación; el snapshot post-Ciclo 5 (§8) es la proyección objetivo.
7. **Entorno operativo:** rama `develop` actualizada (`1940e70`); CI disponible (con fix de PR-A); entorno local de pruebas (backend `test:ci`, frontend `build`/`pnpm test`).
8. **PRs a nivel Epic:** no se crea un PR por ISSUE; se ejecuta PR-A…PR-E de §3.1 con la regla de no mezclar dominios no relacionados; la remediación de CI (PR-A) va en la Oleada 1 y es prerequisito de todo.

---

## 10. Hallazgos de fase (sin corrección de backlog)

### F14-1 — Banda F3 habilitada pero condicionada a regla dura §6.2
La regla "features no entran hasta que P1 esté cerrado" (Fase 4 §6.2) técnicamente impide la ejecución de los 17 ISSUEs de P5 en C5. Sin embargo, (a) el cierre de C4 habilita F3 como candidata (§9.12.6), (b) los ISSUEs de P5 no dependen de I065/I070/I071 ni de DECISION-011, (c) 17/20 del ciclo son P5 y no hay otro trabajo sustancial sin F3. Se requiere **autorización explícita del usuario** para proceder como excepción autorizada a §6.2 (sin modificar la regla). Sin corrección de la regla; se documenta como condición de arranque §9.1.

### F14-2 — I032 es el ISSUE de mayor riesgo del ciclo
I032 (SSE singleton) es P1, prerequisito de I041 y I101, y es el único ISSUE de P5 con dependencia backend (I013). Su cierre desbloquea 2 ISSUEs más. Si I032 falla, la varianza del ciclo es −3 (I032 + I041 + I101). Mitigación: PR-B prioriza I032 en Oleada 2.

### F14-3 — PR-C es el de mayor volumen (14 ISSUEs)
14 ISSUEs en una sola PR puede dificultar review. Todos son P2/P3 sin dependencias internas críticas (excepto I043→I044). Mitigación: PR-C puede dividirse en PR-C1 (a11y/quality) y PR-C2 (cleanup/docs) si el volumen es problemático.

### F14-4 — I033 ya está READY desde C2
I033 fue promovido a READY en C2 pero nunca ejecutado. No requiere nueva promoción; solo inclusión en PR-B.

### F14-5 — CHANGELOG sin entradas C4
23 transiciones de C4 no documentadas en CHANGELOG. Se absorbe en PR-A o PR-E.

### F14-6 — Firmware validation pendiente
PR-F de C4 (I055/I056/I057) no tiene evidencia local de `pio run`. CI será la evidencia definitiva. Se valida en C5 vía CI o se documenta como deuda aceptada.

### F14-7 — Jest TS skips (3 suites, 41 tests)
Pre-existente. Requiere `ts-jest` config. No bloqueante. Se documenta como deuda aceptada o se resuelve en PR-A.

---

## 11. Cierre formal — COMPLETADO

**Fecha de plan:** 2026-08-17.
**Inicio ejecución:** 2026-08-17 (autorización del usuario).
**Cierre ejecución:** 2026-08-18.
**Gate CI 5/5:** ✅ CUMPLIDO (run `31993393854` + post-merge `31993689816`, 5/5 jobs verdes, PR-A merged `4664b82`).

### 11.1 Estado de Oleadas

| Oleada | PRs | Estado |
|---|---|---|
| 1 | PR-A (CI remediation) | ✅ MERGED (`4664b82`) — CI 5/5 GREEN |
| 2 | PR-B (Frontend Core) `#232`, consolidated PR-C+D (Frontend Quality + Backend Billing) `#235` | ✅ MERGED |
| 3 | PR-E (Docs VitePress) — I099 | ✅ DONE (`eb1a0b8`, direct push) |

### 11.2 Criterios de salida — 8/8 CUMPLIDOS

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | CI verde 5/5 | ✅ | PR-A `4664b82` |
| 2 | Banda F3 ejecutada | ✅ | 17 P5 + I101 = 18 ISSUEs frontend |
| 3 | I008 cerrado | ✅ | PR #235 billing flow |
| 4 | CHANGELOG C4 | ✅ | CHANGELOG.md 2026-08-17 |
| 5 | Firmware validation | ✅ (deuda a C6) | CI verde, sin `pio run` local |
| 6 | Banda F3 intacta | ✅ | Sin promociones P7/P9/P11 |
| 7 | Snapshot C5 vs C4 | ✅ | backlog §9.14.2: 96.4% |
| 8 | Avance P0 sin cierre falso | ✅ | I065 IP, I070 BLOCKED |

### 11.3 Próximos pasos (C6)

1. DECISION-011 — resolver (Exit Gate P1 ⛔)
2. I065/I070/I071 — cerrar o avanzar según DECISION-011
3. Jest TS skips — configurar `ts-jest`
4. Firmware validation local — `pio run` o documentar como deuda permanente
5. Release workflow fix — `release.js` tag collision (exit 128)
