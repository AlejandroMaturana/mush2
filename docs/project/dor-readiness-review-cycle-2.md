# DoR Readiness Review — Ciclo 2 (Cierre de banda F1 parcial + Gates de CI)

**Auditoría de Definition of Ready (DoR) de los ISSUEs del tercer ciclo de ejecución.**

- **Fecha:** 2026-08-12
- **Estado:** auditoría emitida; **gaps 2/5/6 de los 19 ISSUEs completados en el backlog el 2026-08-12** (autorización de ejecución del Ciclo 2). Verdict post-gap: **24/24 READY** (5 ya lo eran; 19 completados). **Actualización 2026-08-12 (DECISION-012):** I51 re-auditado a **`SUPERSEDED`** (ThingSpeak deprecado; MQTT canal canónico) — deja de ser cierre cross-ciclo.
- **Criterio:** los 9 checks del DoR del backlog (`docs/project/engineering-backlog.md` §1).
- **Alcance:** Ciclo 2 "Cierre de banda F1 (parcial) + Gates de CI" (`phase-11-cycle-2-plan.md` §2) = 24 ISSUEs: 19 de implementación + 3 cierres cross-ciclo (I15, I51, I84) + 2 avances (I50, I65).
- **Resultado general:** **19/24 requieren completar checks 2/5/6** (gaps transversales); **5/24 ya cumplen 9/9 documentalmente** (I15, I50, I51, I65, I84 — auditados en C0/C1 y re-verificados). Ningún ISSUE promovido a `READY`.
- **Gaps transversales:** mismos que C0/C1 (faltan `Contrato/versión`, `Riesgos` y `Verificación verde→rojo→verde` per-issue para los 19 ISSUEs del ciclo no auditados previamente) — ver §3.
- **Verdict previsto (post-gap):** 19 `READY*` → `READY` (tras completar gaps) + 4 `READY` ya verificados (I15, I50, I65, I84). Los 4 cross-ciclo/avance (I15/I50/I65/I84) están `IN_PROGRESS` y se operan por evidencia de DoD (§6 del plan); **I51 pasa a `SUPERSEDED` por DECISION-012**.
- **Nota de estado:** no se promovió ningún ISSUE a `READY`; este documento solo audita y registra lo que falta.

---

## 1. Los 9 checks del DoR

1. Alcance definido (elimina exactamente un problema; sin mezclar dominios).
2. Contrato(s) afectado(s) identificado(s) **y versión correcta**.
3. ADR(s) afectado(s) evaluado(s) (nuevo ADR o supersesión si aplica).
4. DDD(s) afectado(s) evaluado(s).
5. Riesgos conocidos y documentados (incl. riesgo de tránsito).
6. Estrategia de pruebas definida (tests que fallan primero, verde→rojo→verde).
7. Archivos afectados listados.
8. Dependencias satisfechas o plan de desbloqueo.
9. No requiere decisión pendiente sin resolver (DECISION-NNN abierta).

---

## 2. Resumen por ISSUE (Ciclo 2)

Leyenda: ✅ cumple · ⚠️ parcial (hay dato, insuficiente) · ❌ no cumple/bloqueado. Estado actual (2026-08-12) **antes de completar los gaps**: checks 1, 3, 4, 7, 8 y 9 cumplidos en todos (ADR/DDD ya etiquetados en backlog; deps verificadas en el ciclo); checks 2, 5 y 6 parciales en la mayoría (campos no completados para ISSUEs del ciclo que no pasaron por la auditoría del C1); I51 e I65 con 9/9.

| ISSUE | Hallazgo | Prio | Rol | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ISSUE-006 | BE-006 (DELETE cascada) | P1 | PR-C | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-012 | BE-012 (deviceId tipos) | P1 | PR-C | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-015 | BE-015 (MQTT claro/ACL) | P1 | cierre PR-A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (9/9)** |
| ISSUE-031 | FE-003 (registro roto) | P1 | PR-D | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (solape F11-2) |
| ISSUE-033 | FE-005 (single-flight) | P1 | PR-D | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-040 | FE-012 (tests escasos) | P2 | PR-F | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-050 | FW-001 (secretos reales) | P0 | avance PR-G (elimina `TS_API_KEY`; NVS ya por I059) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (9/9)** |
| ISSUE-051 | FW-002 (ThingSpeak claro) | P0 | cierre PR-G | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (9/9)** |
| ISSUE-063 | INF-004 (PG18→16) | P2 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-064 | INF-005 (Node) | P2 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-065 | INF-006 (broker deploy) | P0 | avance PR-A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (avance; cierre I81/D11 C3)** |
| ISSUE-066 | INF-007 (test raíz) | P3 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-073 | INF-014 (lockfile) | P2 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-074 | INF-015 (TLS broker) | P1 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-075 | INF-016 (compose 1883) | P2 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-076 | INF-017 (CI scanning) | P3 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-079 | INF-020 (imágenes pin) | P3 | PR-B | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-080 | INF-021 (FE en CI) | P2 | PR-E (+I109) | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (fusión I109) |
| ISSUE-083 | INF-024 (toolchain pin) | P3 | PR-B (rec) | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (opcional) |
| ISSUE-084 | INF-025 (secretos locales) | P3 | cierre PR-E | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **READY (9/9)** |
| ISSUE-104 | DOC-020 (re-baseline) | P2 | PR-A | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |
| ISSUE-105 | TST-001 (FW tests) | P1 | PR-H (suite ≥60 %, sin ThingSpeak) | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (gate I109 PR-E; dep PR-G) |
| ISSUE-108 | TST-004 (FE tests inseguros) | P2 | PR-F | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* (solape I040) |
| ISSUE-110 | TST-006 (sketches CI) | P3 | PR-E | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | READY* |

**Conteo:** 24 ISSUEs auditados · **5** cumplen 9/9 documentalmente hoy (I15, I50, I51, I65, I84) · **19** con gaps 2/5/6 a completar · **0** cumplen 9/9 con riesgo de bloqueo por decisión pendiente (check 9 ✅ en todos) · **0** promovidos a `READY`.

---

## 3. Gaps transversales — a completar (mismo patrón que Ciclo 1, Revisión 2)

| Check | Gap | Resolución requerida por ISSUE |
|---|---|---|
| 2 · Contrato/versión | Varios del ciclo no declaran contrato afectado **ni versión**. | I15/I74/I75/I65 → `mqtt-contract` (MQTT 3.1.1; cambio de transporte a `mqtts://` — evaluar versión/nota; ya trabajado en C1); I12/I6 → `api-contract` v1 (sin cambio de versión); I31/I33/I40/I108 → `api-contract` (auth) v1; resto → N/A con justificación. I51/I65 ya lo tienen. |
| 3 · ADR evaluado | ✅ ya etiquetados en backlog para los ISSUEs del ciclo con ADR: I6→ADR-005, I12→DDD-001, I15/I74/I75→ADR-023, I31/I33→N/A justificado, I51→ADR-004/013, I65→ADR-023, I105→ADR-025 (reliability), I63/I64/I73/I79/I83/I66/I76/I80/I110→N/A justificado (infra/CI, sin cambio de dominio). | Verificar etiqueta `REQUIRED`/`INFORMATIVE` al completar los campos (patrón C1). |
| 4 · DDD evaluado | ✅ DDD listados o `NOT_APPLICABLE` justificable para infra/CI. | Etiquetar al completar (patrón C1). |
| 5 · Riesgos | No existe campo `Riesgos` per-issue para los ISSUEs del ciclo (I51/I65 ya lo tienen). | Añadir riesgos concretos + mitigación, incl. riesgo de tránsito: I15/I74/I75 → tránsito mqtt→mqtts (broker desplegado tras el cambio de listener); I31 → desajuste de firma en 3 capas (F11-2); I50/I51 → clave TS en NVS con buffer/fallback y rotación; I66/I76 → CI rojo durante la transición (REG-002/HW_REVISION, F11-1). |
| 6 · Verificación (verde→rojo→verde) | Ninguno de los ISSUEs del ciclo explicita el test que falla primero (I51/I65 ya lo tienen). | Añadir campo `Verificación`: verde = estado actual verificado (ver plan §2.1), rojo = test que falla hoy, verde = tras el fix. Ejemplos verificados: I31 (llamada 3-arg vs firma), I50 (scan `config.h` con secretos reales), I66 (`package.json:7` echo error), I63 (`ci.yml:71` postgres:18), I74 (`mosquitto.prod.conf` listener comentado), I76 (sin gitleaks en CI). |

**Estado de código verificado (2026-08-12) para los "verde" de cada ISSUE:** ver `phase-11-cycle-2-plan.md` §2.1 (referencias exactas: `config.h` secretos, `thingspeak_client.cpp:33`, `auth.js:22`, `api/auth.js:8`, `AuthModal.jsx:44-46`, `package.json:7`, `ci.yml:71/122-123`, `mosquitto.prod.conf`, `docker-compose.yml:20-21`, `ble_provisioning.cpp:105`, `platformio.ini`).

---

## 4. Hallazgos de dependencias (Ciclo 2 y adyacentes)

| # | Hallazgo | Detalle | Resolución |
|---|---|---|---|
| C1 | Cadena env-consistency → CI gates (F11-6) | `I64 (dep I72 DONE) → I73 → I79 → I66 → {I76, I80/I109, I110} → I105` — **toda la cadena desbloqueada** al cerrarse I72 en C1 | Plan de desbloqueo: PR-B (I64/I63/I73/I79/I83) en Oleada 1; PR-E (I66/I76/I80+I109/I110) en Oleada 2. |
| C2 | Ciclo mutuo I6 ↔ I12 (F11-3) | `I006 → I012 + I061 (DONE)`; `I012 → I006` | Misma PR (PR-C), patrón PR-C del Ciclo 0. |
| C3 | I15 cierre cross-ciclo | `ISSUE-015 → I065 (IP), I074/I075 (ciclo), I050 (IP)` | I074/I075 en PR-A (Oleada 1) → **I15 DONE** por evidencia TLS/ACL (plan §6). |
| C4 | I84 cierre cross-ciclo | `ISSUE-084 → I076 (PR-E)` | I076 en PR-E (Oleada 2) → **I84 DONE** por scanning CI activo. |
| C5 | I51 cierre cross-ciclo | ~~`ISSUE-051 → DECISION-007, TLS/CA (I015/I075), I050 (NVS)`~~ → **DECISION-012 (2026-08-12): ThingSpeak deprecado; MQTT canal canónico** | **→ I51 SUPERSEDED** (deprecación; no cierre por endurecimiento). |
| C6 | Avances con cierre diferido a C3 | `I065 → I081 (F2) + DECISION-011`; `I050 → I052 (F2) + I076 (ciclo)` | Avance en PR-A/PR-G (PR-G deprecación: elimina `TS_API_KEY`) con evidencia; cierre documentado en plan §6/§7 (patrón F9-3/F10-5). |
| C7 | I105 gate CI | `ISSUE-105 → I109 (TST-005, fusionado I080, PR-E), P6.7` | Suite nativa en **PR-H** (dep PR-G + PR-E); **cierre CI condicionado a PR-E** (F11-8) y a que PR-G fije el alcance sin ThingSpeak (F11-10). |

**Regla de desbloqueo aplicada (Fase 4/6):** un ISSUE con dep cross-ciclo avanza con PR + evidencia del alcance alcanzable; su cierre queda condicionado y documentado (patrón F9-3).

---

## 5. Decisiones que afectan al Ciclo 2

| Decisión | Estado | ISSUEs afectados (Ciclo 2) | Efecto |
|---|---|---|---|
| DECISION-006 (broker TLS) | ACCEPTED | I15, I65, I74, I75 | Habilitada; aplicación vía PR-A. |
| DECISION-007 (HTTPS ThingSpeak) | SUPERSEDED | I51, I50 | **SUSTITUIDA por DECISION-012 (2026-08-12): ThingSpeak deprecado**; I51 → SUPERSEDED; I50 elimina `TS_API_KEY`. |
| **DECISION-012** (MQTT canal canónico) | **ACCEPTED** | I51, I50, I023, I105 (indirecto) | **ThingSpeak fuera de arquitectura objetivo**; deprecación del canal. |
| DECISION-005 (storage de sesión) | ACCEPTED | I31, I33 | Contexto del flujo de auth (refresh/registro). |
| DECISION-008 (seed solo dev) | ACCEPTED | — | Sin efecto directo en el ciclo. |
| **DECISION-011** (plan de infraestructura) | **PENDING** | I70/I71 (fuera del ciclo); I65 (cierre) | **No bloquea el Ciclo 2**; mantiene el Exit Gate P1 ⛔ y difiere el cierre de I65 a C3 (F11-7). |

---

## 6. Siguientes pasos

1. Completar los gaps transversales (check 2/5/6) en los 19 ISSUEs `READY*` del backlog, siguiendo el patrón de la Revisión 2 del C1.
2. Re-auditar los 19 con los campos completos (esperado: **24/24 READY**; I15/I50/I65/I84 ya lo son; **I51 re-auditado a `SUPERSEDED` por DECISION-012**).
3. Promover a `READY` únicamente al autorizarse la ejecución del Ciclo 2 (§11 de `phase-11-cycle-2-plan.md`).
4. No promover, no codificar, no abrir PRs en esta fase.

---

## 7. Cierre formal

**Fecha:** 2026-08-12.

1. **Auditoría emitida:** 24/24 ISSUEs del Ciclo 2 auditados contra los 9 checks del backlog §1.
2. **Resultado:** 5/24 con 9/9 hoy (I15, I50, I51, I65, I84); 19/24 con gaps 2/5/6 a completar; 0 bloqueados por decisión pendiente.
3. **Ninguna promoción realizada** (0 ISSUEs promovidos a `READY`).
4. **Sin efectos:** sin código, sin PRs, sin alterar DECISION-011 ni D11.
5. **Condición:** la ejecución del Ciclo 2 requiere completar los campos señalados y la autorización del usuario (`phase-11-cycle-2-plan.md` §11).
