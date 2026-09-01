# DoR Readiness Review — Ciclo 5 (Banda F3 + CI remediation + deuda residual)

**Auditoría de Definition of Ready (DoR) de los ISSUEs del sexto ciclo de ejecución.**

- **Fecha:** 2026-08-17
- **Estado:** auditoría emitida; **gaps 2/5/6 en los 20 ISSUEs de implementación del Ciclo 5** (patrón transversal C0–C4: campos `Contrato/versión`, `Riesgos` y `Verificación verde→rojo→verde` a completar en el backlog). Verdict previsto post-gap: **19 ISSUEs promovidos a READY** (+ 1 ya READY = 20 listos). Ningún ISSUE promovido a `READY` en esta auditoría.
- **Criterio:** los 9 checks del DoR del backlog (`docs/project/engineering-backlog.md` §1).
- **Alcance:** Ciclo 5 "Banda F3 (P5 frontend) + CI remediation + deuda residual" (`phase-14-cycle-5-plan.md` §2) = **20 ISSUEs de implementación** + 1 PR transversal sin ISSUE (PR-A, deuda CI de C4 — fuera del DoR por no tener ISSUE) + 1 CHANGELOG (sin ISSUE) + 1 firmware validation (sin ISSUE).
- **Resultado general:** **20/20 requieren completar checks 2/5/6** (gaps transversales); **0/20 cumplen 9/9 documentalmente hoy** (ninguno pasó por auditorías previas); **0 bloqueados por decisión pendiente** (check 9 ✅ en todos — DECISION-011 no afecta a ningún ISSUE del ciclo, verificado campo a campo).
- **Gaps transversales:** mismos que C0–C4 (faltan `Contrato/versión`, `Riesgos` y `Verificación verde→rojo→verde` per-issue) — ver §3.
- **Verdict previsto (post-gap):** 19 `READY*` → `READY` (tras completar gaps) + I033 permanece `READY` (ya promovido) = 20 ISSUEs listos. Registro de transición en el backlog (19 promociones).
- **Nota de estado:** no se promovió ningún ISSUE a `READY`; este documento solo audita y registra lo que falta.
- **Condición especial:** la ejecución de la banda F3 (P5) requiere autorización explícita del usuario bajo regla dura Fase 4 §6.2 (P1 no cerrado). Ver `phase-14-cycle-5-plan.md` §10 F14-1.

---

## 1. Los 9 checks del DoR

1. Alcance definido (elimina exactamente un problema; sin mezclar dominios).
2. Contrato(s) afectado(s) identificado(s) **y versión correcta**.
3. ADR(s) afectado(s) evaluado(s) (nuevo ADR o supersesión si aplica).
4. DDD(s) afectado(s) evaluado(s) (nuevo DDD o `NOT_APPLICABLE` justificado).
5. Riesgos identificados con mitigación.
6. Verificación (verde→rojo→verde): test que falla hoy, condición de problema, test que pasa tras fix.
7. Archivos afectados declarados.
8. Dependencias satisfechas o plan de desbloqueo documentado.
9. Sin DECISION-NNN PENDING que bloquee el ISSUE.

---

## 2. Matriz de auditoría

| ISSUE | Código | Título | P | PR | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ISSUE-008 | BE-008 (upgrade sin billing) | P1 | PR-D | ✅ | ⚠️ | ✅ | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-032 | FE-004 (SSE sin auth/reconexión) | P1 | PR-B | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-033 | FE-005 (refresh sin single-flight) | P1 | PR-B | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY (ya) |
| ISSUE-034 | FE-006 (sin 404 en rutas protegidas) | P1 | PR-B | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-035 | FE-007 (modales sin a11y) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-036 | FE-008 (capa API inconsistente) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-037 | FE-009 (código muerto) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-038 | FE-010 (README frontend obsoleto) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-039 | FE-011 (sin lint/typecheck) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-041 | FE-013 (polling duplicado) | P2 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | READY* (dep I032) |
| ISSUE-042 | FE-014 (format utils duplicadas) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-043 | FE-015 (errores tragados) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-044 | FE-016 (alert() nativo) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | READY* (dep I043) |
| ISSUE-045 | FE-017 (datos faltantes como 0) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-046 | FE-018 (ToggleSwitch como div) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-047 | FE-019 (tema hardcodeado FOUC) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-048 | FE-020 (proxy Vite hardcodeado) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-049 | FE-021 (doble fuente de versión) | P3 | PR-C | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-099 | DOC-015 (artefactos VitePress) | P3 | PR-E | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-101 | DOC-017 (SSE URL doble) | P2 | PR-B | ✅ | ⚠️ | N/A | N/A | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | READY* (dep I032) |

**Conteo:** 20 ISSUEs auditados · **0** cumplen 9/9 documentalmente hoy · **20** con gaps 2/5/6 a completar · **0** bloqueados por decisión pendiente (check 9 ✅ en todos) · **0** promovidos a `READY`.

---

## 3. Gaps transversales — a completar (mismo patrón que Ciclo 1/2/3/4)

| Check | Gap | Resolución requerida por ISSUE |
|---|---|---|
| 2 · Contrato/versión | Los 20 del ciclo no declaran contrato afectado **ni versión**. | I008 → `api-contract` v1 (payloads/estados de plan/upgrade, sin cambio wire) o N/A con justificación; I032/I033/I034/I041/I101 → `api-contract` v1 (SSE `/events`, auth, routing — sin bump wire salvo nota) o N/A con justificación (frontend interno); I035…I049 → N/A (frontend interno, sin wire) con justificación; I099 → N/A (docs) con justificación. |
| 3 · ADR evaluado | ✅ ADRs ya etiquetados o N/A: I008 → ADR-016 (entitlement); I032…I049 → N/A (frontend, sin ADR nuevo requerido); I099 → N/A (docs). Etiquetar `REQUIRED`/`INFORMATIVE`/`NOT_APPLICABLE` al completar. |
| 4 · DDD evaluado | ✅ DDD listados o `NOT_APPLICABLE`: I008 → N/A (backend interno); I032…I049 → N/A (frontend, sin cambio de dominio); I099 → N/A (docs). Etiquetar al completar. |
| 5 · Riesgos | No existe campo `Riesgos` per-issue en los 20. | Añadir riesgos concretos + mitigación, incl. riesgo de tránsito: I008 → upgrade sin confirmación permite saltarse billing; I032 → SSE singleton que no reconecta o pierde eventos; I033 → refresh que entra en loop infinito; I034 → 404 que muestra página en blanco; I035 → modal que no es accesible por teclado; I036 → capa API que oculta errores del backend; I037/I038/I039 → cambios cosméticos que rompen funcionalidad existente; I041 → polling eliminado sin compensación de SSE; I042–I049 → refactor de componentes que introduce regresiones visuales; I099 → artefactos VitePress versionados en repo; I101 → URL de SSE que cambia y rompe consumidores. |
| 6 · Verificación (verde→rojo→verde) | Ninguno de los 20 explicita el test que falla primero. | Añadir campo `Verificación`: verde = estado actual verificado (plan §2.1), rojo = test que falla hoy, verde = tras el fix. Ejemplos verificados: I008 (test de upgrade que exige confirmación de entitlement falla hoy), I032 (test de SSE sin auth que acepta conexión anónima), I033 (test de refresh con N llamadas concurrentes), I034 (test de ruta protegida que no devuelve 404), I039 (sin lint/typecheck configurado), I041 (test de panel con polling redundante), I043 (test de error boundary ausente), I101 (test de URL SSE doble), I099 (grep de artefactos VitePress en el árbol). |

**Estado de código verificado (2026-08-17) para los "verde" de cada ISSUE:** ver `phase-14-cycle-5-plan.md` §2.1 (referencias exactas: `routes/subscriptions.js` (I008), `frontend/src/shared/api/useSSE.js` (I032), `frontend/src/shared/api/axiosInstance.js` (I033), `frontend/src/app/router.jsx` (I034), `frontend/src/features/devices/components/DeviceConnectivityPanel.jsx` / `DeviceHealthPanel.jsx` (I041), `frontend/src/shared/utils/format.js` (I042), `.eslintrc` / `tsconfig.json` (I039), `docs/--ignoreDeadLinks/` (I099)).

---

## 4. Condiciones especiales

### 4.1 Banda F3 y regla dura §6.2

La regla "features no entran hasta que P1 esté cerrado" (Fase 4 §6.2) técnicamente impide la ejecución de los 17 ISSUEs de P5 en C5. Sin embargo:

- El cierre de C4 habilita F3 como candidata (§9.12.6 condición 4).
- Los ISSUEs de P5 no dependen de I065/I070/I071 ni de DECISION-011.
- 17/20 del ciclo son P5; sin F3, C5 solo tiene I008 + I099 + PR-A = 3 ISSUEs.

**Se requiere autorización explícita del usuario como excepción autorizada a §6.2** (sin modificar la regla ni DECISION-011). Ver `phase-14-cycle-5-plan.md` §10 F14-1.

### 4.2 Dependencias internas del ciclo

| ISSUE dependiente | Depende de | Resolución |
|---|---|---|
| I041 (polling) | I032 (SSE singleton) | Cross-PR: I032 en PR-B, I041 en PR-C. Depende de PR-B mergeado primero. |
| I044 (alert nativo) | I043 (errores tragados) | Misma PR-C (I043 primero) |
| I101 (SSE URL) | I032 (SSE singleton) | Misma PR-B (I032 primero) |

### 4.3 I033 — ya READY

I033 fue promovido a `READY` en C2 (2026-08-12) pero nunca ejecutado. No requiere nueva promoción; se incluye directamente en PR-B.

---

## 5. Veredicto

**20/20 ISSUEs del Ciclo 5 requieren completar gaps 2/5/6** (mismo patrón transversal que C0–C4). **0 bloqueados por decisión pendiente** (DECISION-011 no afecta a ningún ISSUE del ciclo). Tras completar gaps: **19 ISSUEs promovidos a READY** (16 P5 BACKLOG + I008 + I099 + I101) + **1 ya READY** (I033) = **20 ISSUEs listos para ejecución**.

**Estado:** Ejecución del Ciclo 5 iniciada (2026-08-17). Gate CI 5/5 ✅ CUMPLIDO. Oleada 2 en curso (PR-B, PR-C, PR-D).

**Corrección PR-C:** I039 (lint/typecheck) movido de PR-B a PR-C (approved set: I035-I039 + I041-I049 = 14 ISSUEs). I041 (polling) confirmado en PR-C con dependencia cross-PR a I032 en PR-B.
