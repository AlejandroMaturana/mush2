# Fase 8 — Dashboard ejecutivo — Mush2

**Fecha:** 2026-08-08
**Línea base:** `develop` @ `dcbc8fa` (v1.8.4) · `main` @ `f0deed4` (v1.8.2)
**Orquestador:** `docs/project/engineering-execution-plan.md` — Fase 8 (dashboard ejecutivo)
**Fuentes trazadas:**
- **Baseline (Fase 0)** → `baseline-snapshot-001.md` (madurez inicial por área)
- **Plan** → Fase 8 (tabla Madurez · Riesgo · Bloqueador; regla de actualización)
- **Backlog** → `engineering-backlog.md` (110 ISSUEs: programa, prioridad, decisión, dependencias)
- **Fase 2** → `phase-2-hierarchy.md` (asignación primaria por programa)
- **Fase 4** → `phase-4-execution-order.md` y datos de grafo/bandas (F0–F3)
- **Fase 5** → `phase-5-maturity-gates.md` (estado de Exit Gates 0/11)

**Método:** construcción del dashboard ejecutivo con (a) la tabla inicial por área del plan (autoritativa, de la Fase 0), (b) una **capa computable por programa** derivada mecánicamente del backlog (conteos de ISSUEs por prioridad, bandas de roadmap, estado y gate), (c) indicadores con **fórmulas objetivas** y la regla de re-computo tras cada ciclo. Solo documental, sin código.
**Restricciones cumplidas:** sin implementación; sin promociones a `READY` fuera de los gates establecidos; DECISION-011 `PENDING`, D11 y deuda intactas.

---

## 1. Resumen ejecutivo (KPIs a t=0)

| KPI | Valor |
|---|---|
| ISSUEs totales | **110** (P0=14 · P1=30 · P2=42 · P3=24) |
| Estado de ISSUEs | BACKLOG **110** · READY **0** · IN_PROGRESS **0** · DONE **0** |
| Exit Gates cumplidos | **0/11** (1 en `PENDING` por DECISION-011) |
| Bloques roadmap | F0=18 · F1=21 · F2=48 · F3=23 |
| Ciclo 0 | 15 elegibles a `READY` + 1 `BLOCKED` (ISSUE-070) |
| Decisiones de arquitectura | 10 resueltas · **1 pendiente** (DECISION-011) |
| Cobertura de tests (nativos FW) | 0 módulos ≥60 % (TST-001) |
| Secretos en repo (conocidos) | 14 P0 abiertos incl. FW-001/002, FE-001, INF-001/002/006/009/011 |

**Lectura:** a t=0 el proyecto está en madurez inicial Baja/Media (Fase 0) con **0 ISSUEs ejecutados**: todo el avance de madurez está por construirse. Los 14 P0 y el bloqueador de decisión (DECISION-011) son los condicionantes del primer ciclo.

---

## 2. Metodología y fuentes

- **Área** (7): Seguridad, Infraestructura, Testing, Backend, Firmware, Frontend, Arquitectura (plan Fase 8).
- **Programa** (11): P1…P11 del Roadmap-V2; cada ISSUE tiene un programa primario (Fase 2).
- **Indicadores:** madurez, riesgo y bloqueador por área (valores iniciales del plan) + capa computable por programa con conteos reales del backlog.
- **Regla general (plan):** el estado se calcula desde la evidencia del backlog y del repo, **no por estimaciones**; cada ciclo ejecutado re-computa madurez/riesgo desde el estado real de los ISSUEs.

---

## 3. Dashboard inicial por área (plan Fase 8, autoritativo)

| Área | Madurez inicial | Riesgo | Bloqueador |
|---|---|---|---|
| **Seguridad** | Baja | 🔴 Alto | 14 P0 abiertos (INF-001/002, BE-001…005, FW-001/002, FE-001/002, INF-006/009/011) |
| **Infraestructura** | Baja | 🔴 Alto | Broker MQTT no desplegado (INF-006); `alter:true` (INF-002); backups inexistentes (INF-011); plan free (INF-012) |
| **Testing** | Media | 🟠 Medio | TST-002 (tests validan forma, no authz); TST-001 (firmware sin tests); frontend sin tests en CI (INF-021) |
| **Backend** | Media | 🟠 Medio | BE-002/004/005 (authz/IDOR) → mitigados en P1.3; N+1 y límites (BE-014) |
| **Firmware** | Media | 🟠 Medio | FW-001/002 (secretos); FW-004/005/006/007 (reliability); TST-001 |
| **Frontend** | Media-baja | 🟠 Medio | FE-001 (tokens localStorage); FE-002 (sin RBAC); FE-004 (SSE sin auth) |
| **Arquitectura** | Media | 🟡 Bajo-medio | DOC-001/002/003 (ADR sin implementar); DOC-005 (matriz falsa); drift contratos (§4) |

---

## 4. Capa computable por programa (t=0, desde el backlog)

Conteos extraídos mecánicamente de los 110 ISSUEs (programa primario, prioridad del header, banda roadmap de Fase 4). Estado del gate: Fase 5 (0/11).

| Prog | ISSUEs | P0 | P1 | P2 | P3 | Banda F0–F3 | Estado ISSUEs | Exit Gate |
|---|---|---|---|---|---|---|---|---|
| P1 Seguridad | 28 | 14 | 6 | 6 | 2 | F0=17 · F1=11 | BACKLOG | ⛔ (PENDING: DECISION-011) |
| P2 Testing | 11 | 0 | 3 | 5 | 3 | F0=1 · F1=10 | BACKLOG | ⛔ |
| P3 Arquitectura | 10 | 0 | 2 | 7 | 1 | F2=10 | BACKLOG | ⛔ |
| P4 Backend | 15 | 0 | 8 | 6 | 1 | F2=15 | BACKLOG | ⛔ |
| P5 Frontend | 17 | 0 | 3 | 6 | 8 | F3=17 | BACKLOG | ⛔ |
| P6 Firmware | 7 | 0 | 5 | 2 | 0 | F2=7 | BACKLOG | ⛔ |
| P7 Observabilidad | 1 | 0 | 0 | 1 | 0 | F3=1 | BACKLOG | ⛔ |
| P8 Infra/Release | 16 | 0 | 2 | 6 | 8 | F2=16 | BACKLOG | ⛔ |
| P9 Performance | 0 | 0 | 0 | 0 | 0 | — (secundarios) | — | ⛔ |
| P10 DX | 4 | 0 | 1 | 2 | 1 | F3=4 | BACKLOG | ⛔ |
| P11 Reliability | 1 | 0 | 0 | 1 | 0 | F3=1 | BACKLOG | ⛔ |
| **TOTAL** | **110** | **14** | **30** | **42** | **24** | **18/21/48/23** | **110 BACKLOG** | **0/11** |

**Lecturas clave:**
- **P1 concentra los 14 P0** y 17 de los 18 ISSUEs de la banda F0: es el cuello de botella de madurez y el primer frente de ejecución (Ciclo 0).
- **P9 (Performance) no tiene ISSUEs primarios** (deuda conocida F2-3/F5-1): su gate se cubre con ISSUEs secundarios (I18, I14, I26, I37) — se refleja como `⛔` sin conteo.
- **P3/P4/P6/P8** concentran la banda F2 (48 ISSUEs, "Fase 1–2"); **P5/P7/P10/P11** la banda F3 (23, "Fase 3").

---

## 5. Indicadores y fórmulas (reglas de re-computo)

Objetivas y replicables tras cada ciclo (plan Fase 8: "re-computa desde el estado real de los ISSUEs, no estimaciones").

| Indicador | Fórmula | Niveles |
|---|---|---|
| **Avance (por programa)** | `Avance(Pn) = DONE(Pn) / ISSUEs(Pn)` | % 0–100 |
| **Madurez (por área/programa)** | `Madurez = Avance`, donde gate cumplido ⇒ 100 % (Fase 5 §6) | <25 % Baja · 25–75 % Media · >75 % Alta |
| **Riesgo (por área)** | 🔴 Alto si ∃ ISSUE **P0** abierto en el área · 🟠 Medio si ∃ ISSUE P1 abierto, DECISION `PENDING` o dependencia sin desbloquear · 🟡 Bajo si no | Alto / Medio / Bajo |
| **Bloqueador (por área)** | Enumeración de ISSUEs P0/P1 abiertos + DECISION-NNN `PENDING` + SCC/D11 en el área | lista |
| **Presión de deuda** | `P0 abiertos` + `ISSUEs en BLOCKED` + `SCC tamaño>1 (D11)` | contadores |
| **Cobertura transversal** | % de las 5 métricas transversales (Fase 5 §5) verificadas | 0/5 … 5/5 |

**Ejemplo de re-computo (tras Ciclo 0):** si se cierran 13 de los 14 P0 (queda ISSUE-070 `BLOCKED`), entonces Avance(P1) = 13/28 ≈ 46 % → Madurez **Media**; Riesgo Seguridad pasa a 🟠 Medio (ISSUE-070 P0 sigue abierto); Bloqueador = `DECISION-011 (ISSUE-070/071)`.

---

## 6. KPIs transversales (t=0)

| KPI | Valor | Fuente |
|---|---|---|
| Estados | BACKLOG 110 · READY 0 · IN_PROGRESS 0 · DONE 0 | backlog |
| Decisiones de arquitectura | 10 ACCEPTED · 1 **PENDING** (DECISION-011 → ISSUE-070/071) | `architecture-decisions-pending.md` |
| ISSUEs con `Decisión: DECISION-NNN` en cuerpo | 8 (I17, I29, I51, I60, I61, I65, I68, I70) | backlog |
| SCC cíclicos (D11) | 7 (tamaño>1; incluye cluster infra I60/61/62/67/68/70/71/82) | Fase 4 |
| ISSUEs sin Epic (F2-1) | 9 (I45, I47, I48, I49, I53, I58, I95, I102, I103) | Fase 2 |
| Epic sin ISSUE primario | 11 | Fase 2 |
| Métricas transversales verificadas | **0/5** | Fase 5 §5 |

---

## 7. Bloqueadores por área (detalle)

| Área | Bloqueador operativo | ISSUEs ligados | Estado |
|---|---|---|---|
| Seguridad | DECISION-011 (backups/DR) | I70 (INF-011) · I71 (INF-012) | `PENDING` |
| Seguridad | 14 P0 (seed/sync, authz/IDOR, secretos FW/FE, broker) | I1–I5, I29, I30, I50, I51, I60, I61, I65, I68, I70 | BACKLOG |
| Infraestructura | Broker no desplegado; `alter:true`; sin DR; plan free | I60, I61, I65, I68, I70, I71 | BACKLOG (I70/I71 bloqueados) |
| Testing | Sin suite de autorización negativa (acompaña P1 en el mismo PR) | I106 (TST-002) · I66 (INF-007) · I109 (TST-005) | BACKLOG |
| Backend | authz/IDOR (mitigación P1.3); N+1 y límites | I2, I4, I5, I14, I18, I26 | BACKLOG |
| Firmware | Secretos en `config.h`; sin tests nativos | I50, I51, I105 (TST-001) | BACKLOG |
| Frontend | Tokens en localStorage; sin RBAC UI; SSE sin auth | I29, I30, I33 | BACKLOG |
| Arquitectura | ADR sin implementar; matriz falsa; drift contratos | I22 (DOC-001/002/003), I100/I101/I103 | BACKLOG |

---

## 8. Regla de actualización del dashboard

1. **Disparador:** fin de cada ciclo de ejecución (p. ej. cierre del Ciclo 0) o resolución de una DECISION-NNN.
2. **Re-computo mecánico:** actualizar estados de ISSUEs (DONE/READY/IN_PROGRESS/BLOCKED) → recalcular Avance, Madurez, Riesgo y Bloqueador con las fórmulas de §5.
3. **Actualizar gates:** verificar Exit Gates con el runbook de Fase 5 §6 (todo ISSUE del programa `DONE` + métricas verificadas).
4. **Verificar transversales:** 5 métricas de Fase 5 §5 sobre el estado real (cobertura, secretos, contratos, CI, ADR).
5. **Registrar:** el snapshot comparado contra Fase 0 (plan §Criterio de salida del Ciclo 0) y contra el t=0 de este documento.
6. **Fuente:** backlog (estados) + repo (CI, secretos, contratos). Sin estimaciones.

---

## 9. Re-computo post-Ciclo 0 (2026-08-11)

Aplicación de §5/§8 sobre el estado real del backlog tras el cierre del Ciclo 0 (7 PRs mergeados; ver backlog §9.5).

| Indicador | t=0 | Post-Ciclo 0 | Δ |
|---|---|---|---|
| Avance P1 Seguridad | 0/28 (0 %) | 11/28 ≈ 39 % | +39 p.p. |
| Avance P2 Testing | 0/11 (0 %) | 1/11 ≈ 9 % | +9 p.p. |
| Avance global | 0/110 (0 %) | 12/110 ≈ 11 % | +11 p.p. |
| P0 en P1 | 14 abiertos | **10 DONE** · 4 abiertos (I050/I051/I065 `IN_PROGRESS`, I070 `BLOCKED`) | −10 |
| Estados ISSUEs | 110 BACKLOG | 12 DONE · 3 IN_PROGRESS · 1 BLOCKED · 94 BACKLOG | 16 en ejecución |
| Madurez Seguridad | Baja | **Media** (25–75 %) | ⬆ |
| Riesgo Seguridad | 🔴 Alto | 🟠 Medio (I070 P0 + DECISION-011) | ⬇ |
| Bloqueador Seguridad | 14 P0 + DECISION-011 | `DECISION-011 (I070/I071)` · I050/I051/I065 cross-ciclo | — |
| Exit Gates | 0/11 | 0/11 (P1 ⛔ PENDING) | — |
| Cobertura transversal | 0/5 | 4/5 (CI verde ❌ preexistente) | ⬆ |

**Lectura ejecutiva:** el Ciclo 0 cerró 12 ISSUEs (10 de los 14 P0), subió Seguridad a madurez Media con riesgo 🟠, y no pudo completar el Exit Gate P1 por el bloqueo de decisión DECISION-011 (I070/I071) y el cierre diferido de I050/I051/I065 (F9-3). La única transversal no verificada es CI verde en `develop` (fallo preexistente, sin regresión del ciclo).

---

## 11. Hallazgos de fase (sin corrección)

### F8-1 — P9 sin ISSUEs primarios distorsiona la capa computable
Performance (P9) aparece con 0 ISSUEs y sin banda; su madurez/riesgo no es computable desde el backlog primario. Deuda conocida (F2-3/F5-1); se difiere a fases de ejecución (los ISSUEs secundarios I18/I14/I26/I37 aportan la evidencia). Sin corrección.

### F8-2 — Madurez "Media" inicial vs 0 DONE
La tabla inicial del plan (Fase 0) asigna madurez Media a Testing/Backend/Firmware/Frontend/Arquitectura por la **auditoría cualitativa** (código existente), mientras que la capa computable (0 DONE) daría Baja en todas las áreas. Ambas son coherentes bajo la regla del plan: la inicial es del baseline; la computable rige para la re-actualización tras cada ciclo. Sin corrección; se documenta la convivencia de ambas lecturas.

### F8-3 — Estado `BLOCKED` de ISSUE-070/071 sin reflejo en conteo de estados
El vocabulario de estados del flujo (Fase 6 §3) incluye `BLOCKED`, pero el backlog conserva 110/110 en `BACKLOG` (sin promociones por restricción de etapa). El dashboard registra el bloqueo vía DECISION-011 en KPIs y bloqueadores, no en el estado del ISSUE. Sin modificación del backlog.

---

## 12. Cierre formal de Fase 8

**Fecha de cierre:** 2026-08-08.

La Fase 8 del Engineering Execution Plan **queda cerrada con éxito**:

1. **Dashboard definido:** tabla inicial por área (plan Fase 8, autoritativa, §3) + capa computable por programa desde el backlog (§4) + KPIs transversales (§6).
2. **Indicadores objetivos:** fórmulas de Avance/Madurez/Riesgo/Bloqueador/Cobertura con niveles verificables (§5), sin estimaciones.
3. **Línea base t=0 registrada:** 110/110 `BACKLOG`, 0 DONE, 0/11 gates, 14 P0, DECISION-011 pendiente, D11 intacta.
4. **Regla de actualización definida:** re-computo mecánico tras cada ciclo con disparadores, pasos y fuentes (§8).
5. **Hallazgos sin corrección:** F8-1…F8-3 registrados; sin tocar backlog, decisiones ni deuda.

**Próxima fase sugerida (no iniciada):** Fase 9 — Primer ciclo de ejecución (Ciclo 0 "Foundations"), que tomará este dashboard como línea base de partida y, al cerrar el ciclo, re-computará la madurez contra el t=0.
