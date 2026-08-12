# Fase 10 — Segundo ciclo de ejecución: Plan del Ciclo 1 "Cierre de banda F0" — Mush2

**Fecha:** 2026-08-10
**Estado:** **EJECUTADO — CICLO 1 CERRADO (2026-08-11)** (autorización del usuario 2026-08-11; antes: PLANIFICADO — NO INICIADO). Cierre formal y re-computo: §14.
**Línea base t=1:** `docs/project/phase-8-executive-dashboard.md` (post-Ciclo 0: 94 BACKLOG · 0 READY · 1 IN_PROGRESS (I65) · 14 DONE · 1 BLOCKED (I70) · 0/11 gates)
**Orquestador:** `docs/project/engineering-execution-plan.md` — Fase 10 (segundo ciclo)
**Fuentes trazadas:**
- **Plan** → Fase 10 (Ciclo 1, tabla de ISSUEs, criterio de salida), Sección 10 (gestión de PRs)
- **DoR** → `dor-readiness-review-cycle-1.md` (auditoría emitida en esta fase; Ciclo 0: `dor-readiness-review.md` §9)
- **Fase 4** → `phase-4-execution-order.md` (bandas F0–F3; Ciclo 1 = cierre de banda F0: I16/I19/I24/I27/I59/I72/I84 + I15)
- **Fase 6** → `phase-6-issue-procedure.md` (máquina de estados, 10 pasos, plantillas)
- **Fase 7** → `phase-7-change-control.md` (control de cambios, T0/T1/T2)
- **Fase 5** → `phase-5-maturity-gates.md` (runbook de gates, métricas transversales)
- **Backlog** → `engineering-backlog.md` (estados verificados: I001/I002/I003/I060/I061/I068 `DONE`; I050/I051/I065 `IN_PROGRESS`; I070 `BLOCKED`; DECISION-011 `PENDING`)
- **Fase 9** → `phase-9-cycle-0-plan.md` (§2.1 deps cross-ciclo, §6.3 gate P1, §9 hallazgos F9-2/F9-3)
- **Código verificado (2026-08-10):** `backend/src/seed.js`, `backend/src/config/env.js`, `backend/src/config/ConfigurationService.js`, `backend/src/app.js`, `backend/src/routes/*.js`, `backend/src/services/mosquittoProvisioningService.js`, `firmware/src/http_poller.h` (estado parcial de I16/I72/I19/I27/I24/I59)

**Método:** derivación íntegra desde las fuentes vigentes (sin inventar datos): conjunto del Ciclo 1, dependencias verificadas campo a campo, orden operativo por PRs a nivel Epic, reglas de promoción (Fase 6), criterio de salida, DoR actual de los 8 y condiciones formales de arranque. Solo documental.

**Restricciones cumplidas:** sin código; sin PRs; sin promociones a `READY`; sin alterar DECISION-011 ni D11; la Fase 10 queda **planificada pero no iniciada**.

---

## 1. Objetivo y alcance del Ciclo 1

**Objetivo:** **cerrar la banda F0** de la Fase 4 (seguridad/entradas del sistema) avanzando el trabajo pendiente que quedó diferido en el Ciclo 0, más adelantar I15 (BE-015) desde F1 como único vínculo P0→P0 (Fase 4 §5) que bloquea la cadena de MQTT/provisioning.

**Alcance (incluye):**
- 7 ISSUEs restantes de la banda F0: **I16, I19, I24, I27, I59, I72, I84**.
- **I15 (BE-015)** adelantado desde F1 por dep P0→P0 con I50/I51/I65 y I24 (Fase 4 §6.1).
- Avance/cierre de la cadena iniciada en el Ciclo 0: I50 (vía I59), I65 (broker), I51 (vía I15).
- **Auditoría DoR de los 8** como prerequisito documental (§5) — no se promueve nada en esta fase.

**Alcance (no incluye):**
- ISSUE-070 (INF-011 backups): **BLOCKED** por DECISION-011 (excluido de la ejecución; **DECISION-011 permanece PENDING** — no es prerequisito del Ciclo 1, hallazgo F10-2).
- Fases 1–3 (bandas F1–F3 restantes): I074/I075/I081/I076/I082/I066/I071 y resto de ISSUEs F1+.
- ISSUE-052 (FW-003 OTA TLS): **permanece en su banda (F2)** — resuelto en la relación I50→I59→I52 (F10-5).
- Features nuevas, rediseño visual, migración de infraestructura, tests ampliados (Programa 2).

**No-objetivos:** ningún cambio de código se ejecuta en esta fase; este documento es la base de autorización futura del Ciclo 1 (§8).

---

## 2. ISSUEs del Ciclo 1 (8) — verificación campo a campo

Fuente: `phase-4-execution-order.md` §7 (Ciclo 1 = cierre de banda F0) y backlog §4. El plan Fase 9 fija el conjunto: **I16/I19/I24/I27/I59/I72/I84 + I15**.

| ISSUE | Hallazgo | Programa | Epic | Ini | Prio header | Decisión | Estado actual |
|---|---|---|---|---|---|---|---|
| I15 | BE-015 (MQTT claro/ACL) | P1 | EPIC-BROKER | 1.6 | P1 | NONE | BACKLOG (adelantado desde F1) |
| I16 | BE-016 (seed admin/admin123) | P1 | EPIC-BOOTSTRAP | 1.1 | P1 | NONE | BACKLOG |
| I19 | BE-019 (rate limit skip) | P2 | EPIC-AUTHZ | 1.3 | P2 | NONE | BACKLOG |
| I24 | BE-024 (MQTT pass en argv) | P2 | EPIC-PROVISIONING | 1.4 | P2 | NONE | BACKLOG |
| I27 | BE-027 (err.message filtrado) | P3 | EPIC-OBSERVABILITY-SECURITY | 1.5 | P3 | NONE | BACKLOG |
| I59 | FW-010 (creds MQTT en RAM) | P1 | EPIC-CREDENTIALS | 1.8 | P1 | NONE | BACKLOG |
| I72 | INF-013 (JWT_SECRET default) | P2 | EPIC-BOOTSTRAP | 1.2 | P2 | NONE | BACKLOG |
| I84 | INF-025 (secretos locales) | P3 | EPIC-CREDENTIALS | 1.8 | P3 | NONE | BACKLOG |

**Conteo verificado:** 4 P1 (I15, I16, I19, I59) + 4 P2/P3 (I24, I27, I72, I84) = 8. Ningún P0 restante en la banda F0 (los 14 P0 del Ciclo 0 quedaron DONE/IN_PROGRESS o BLOCKED).

### 2.1 Dependencias verificadas (campo `Dependencias` del backlog) y estados reales de código

| ISSUE | Dependencias (backlog) | Naturaleza | Estado de código verificado |
|---|---|---|---|
| I15 | I065 (broker, IN_PROGRESS), I074/I075 (F1), I050 (firmware, IN_PROGRESS) | **Cross-ciclo** (broker en despliegue; I74/I75 en F1) → cierre diferido a F1 | `env.js:80` `mqtt://localhost:1883`; `mqttBridge.js` credencial única `backend_bridge` — **verde (falta)** |
| I16 | I060 (DONE), I068 (DONE) | **Satisfechas** | `seed.js:19` admin/admin123; bcrypt cost 10; guard `isSeedAllowed` (dev-only) — **verde (falta bcrypt 12 / admin CLI)** |
| I19 | I002 (DONE) | **Satisfecha** | `app.js:54-57` skip GET `/devices` `/actuators` — **verde (falta)** |
| I24 | I001 (DONE), I015 (mismo ciclo) | **Satisfecha** (I15 en el ciclo) | `mosquittoProvisioningService.js:51-55` `execFile(mosquitto_passwd, ['-b', file, user, pass])` — pass en argv — **verde (falta)** |
| I27 | I003 (DONE) | **Satisfecha** — ⚠ **residual re-baselineado (F10-3)** | `monitoring.js`/`admin.js` ya genéricos (PR-F #189); **sin middleware global de error**; resto de rutas filtran `err.message` — **parcial** |
| I59 | I050 (IN_PROGRESS cross-ciclo), I001 (DONE) | **Satisfecha con plan de desbloqueo**: cierra el loop de I50 | `http_poller.h:78-79` `_mqttUser/_mqttPass` en RAM — **verde (falta NVS)** |
| I72 | I060 (DONE), I061 (DONE) | **Satisfechas** | `env.js:58` fallback `'dev-secret-change-in-production'`; `ConfigurationService.validate()` se llama solo en `server.js`, no en sync/seed — **verde (falta)** |
| I84 | I076 (INF-017, BACKLOG F1) | **Cross-ciclo** (I76 F1) → avance parcial, cierre con I76 | `config.h`/`.env*` con credenciales (gitignored) — **verde (falta)** |

**Regla aplicada (Fase 4/6):** un ISSUE `READY` puede iniciar si sus deps están satisfechas **o** hay plan de desbloqueo; el cierre de ISSUEs con deps cross-ciclo (I15, I59→I50, I84) queda condicionado a bandas/ciclos posteriores (patrón F9-3).

---

## 3. Orden operativo de ejecución — PRs a nivel Epic

PRs propuestos a nivel Epic (plan Sección 10: mismo Epic, contexto compartido, validación conjunta, sin mezclar dominios no relacionados).

| PR | Epic(s) | ISSUEs | Dominio | Depende de | Resultado esperado |
|---|---|---|---|---|---|
| **PR-I "Bootstrap Hardening II"** | EPIC-BOOTSTRAP | I16, I72 | Backend/Infra | — | Seed solo dev + bcrypt 12 + admin CLI; `validate()` fail-fast en sync/seed (sin JWT_SECRET default en prod) |
| **PR-J "Rate Limit Coverage"** | EPIC-AUTHZ | I19 | Backend | PR-A (authz, ya en develop) | Sin skip en `/devices` `/actuators`; límites anónimos estrictos + franquicia autenticada |
| **PR-K "Generic Error Responses"** | EPIC-OBSERVABILITY-SECURITY | I27 | Backend | PR-F (I3, ya en develop) | **Middleware global de error** genérico (residual tras PR-F); monitoring/admin se mantienen genéricos (regresión) |
| **PR-L "MQTT Security & Provisioning"** | EPIC-BROKER + EPIC-PROVISIONING | I15, I24 | Backend/MQTT | PR-I/PR-J (mismo ciclo); PR-G (broker, IN_PROGRESS) | `mqtts://` por defecto + identidad por dispositivo + fallo ante no-TLS en prod; credenciales fuera de argv (env/archivo) |
| **PR-M "Firmware Secrets to NVS"** | EPIC-CREDENTIALS | I59 (+I84 parcial) | Firmware | **PR-L (I15 — TLS en registro; obligatorio)** | Credenciales MQTT en NVS (fuera de RAM); fallback solo primer arranque; **cierra I59 y avanza I50**; I84 avanza parcial (NVS/checklist; scanning con I76) |

*(sin PR)* EPIC-BACKUP (I70): **BLOCKED** — sin PR en Ciclo 1 (DECISION-011 PENDING, F10-2).

### 3.1 Secuencia sugerida (corregida)

```
Oleada 1 (independientes, máx paralelismo):
  PR-I (bootstrap II) · PR-J (rate limit) · PR-K (errores genéricos) · PR-L (MQTT security & provisioning)
Oleada 2 (depende de PR-L — F10-4):
  PR-M (firmware secrets a NVS: I59; cierra I59, avanza I50)
```

### 3.2 Justificación de la dependencia PR-M → PR-L (F10-4)

- I59 (FW-010) tiene la task **"TLS en registro"**: el registro MQTT debe fluir por `mqtts://` con credenciales por dispositivo. Eso lo habilita **I15 (BE-015)** (`mqtts://` por defecto + identidad por dispositivo) — PR-L.
- Por tanto **PR-M no puede ir en la Oleada 1**: su valor completo (credenciales entregadas por registro TLS) depende de que PR-L haya entregado el transporte MQTT seguro.
- Si se eliminara esa dependencia (registro vía HTTP de provisioning sin TLS), se falsearía el diseño de ADR-028 (credenciales entregadas en el registro sobre canal seguro). No se elimina.

**Reglas de orden:**
- PR-L requiere el plan de despliegue del broker (PR-G, I65 `IN_PROGRESS` en Ciclo 0) y el cierre de credenciales (I59).
- PR-K (I27) re-baselineado: monitoring/admin ya genéricos (PR-F); solo añade el middleware de error global y no toca lo ya resuelto (F10-3).
- I24 (PR-L) depende de I15 dentro del mismo PR; ambos comparten contexto de provisioning MQTT (misma regla que PR-C en el Ciclo 0).

---

## 4. Criterios y reglas de promoción de estados

Reglas de la Fase 6 §3, aplicadas al Ciclo 1:

| Transición | Criterio | En el Ciclo 1 |
|---|---|---|
| `BACKLOG → READY` | 9/9 checks DoR **+ gate del ciclo aprobado** | Los 8 pasan **solo tras la auditoría DoR de `dor-readiness-review-cycle-1.md`** y la autorización de ejecución (§8) |
| `READY → IN_PROGRESS` | GitHub Issue creado (referencia ISSUE-NNN) + ejecutor toma | Al crear cada GitHub Issue del ciclo |
| `IN_PROGRESS → DONE` | 9/9 checks DoD (backlog §2) + CI verde + PR mergeado + versionado | Vía PR-I…PR-M |
| `BACKLOG → BLOCKED` | DECISION-NNN `PENDING` o dep sin desbloqueo | Ninguno de los 8 es BLOCKED (deps satisfechas o con plan de desbloqueo; F10-2) |

**Promociones autorizadas:** únicamente los 8 → `READY` al inicio de la ejecución (post-auditoría DoR). **Prohibidas:** promociones fuera del ciclo; `IN_PROGRESS → READY`; `DONE → BACKLOG`; avanzar I70.

**BLOCKED (I70):** permanece en `BACKLOG` con bloqueo DECISION-011; su desbloqueo exige resolución explícita de la decisión. **DECISION-011 no es prerequisito del Ciclo 1** y queda `PENDING` (F10-2).

---

## 5. Auditoría DoR del Ciclo 1 (prerequisito documental)

Emitida en **`dor-readiness-review-cycle-1.md`** (9 checks del backlog §1 aplicados a los 8 ISSUEs, con gap residual por ISSUE y verdict `READY*` / `READY* con plan de desbloqueo`).

**Resumen de la auditoría (2026-08-10):**

| ISSUE | 1 Alcance | 2 Contrato/versión | 3 ADR | 4 DDD | 5 Riesgos | 6 VRV | 7 Archivos | 8 Deps | 9 Decisión | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| I15 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ⚠ cross-ciclo | ✅ | READY* (plan desbloqueo F1) |
| I16 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ✅ | ✅ | READY* |
| I19 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ✅ | ✅ | READY* |
| I24 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ✅ | ✅ | READY* |
| I27 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ✅ | ✅ | READY* (residual middleware global) |
| I59 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ⚠ cross-ciclo | ✅ | READY* (plan desbloqueo I50) |
| I72 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ✅ | ✅ | READY* |
| I84 | ✅ | ⚠ falta | ⚠ | ⚠ | ⚠ falta | ⚠ falta | ✅ | ⚠ cross-ciclo | ✅ | READY* (plan desbloqueo I76) |

**Resultado:** **ninguno cumple 9/9 hoy** (checks 2, 3, 4, 5, 6 incompletos en los 8). La ejecución del Ciclo 1 queda **condicionada a completar esos campos en el backlog** (patrón del Ciclo 0, Revisión 2) antes de cualquier promoción a `READY`. La auditoría documenta exactamente qué añadir por ISSUE.

---

## 6. DoD alcanzable en este ciclo para ISSUEs cross-ciclo (I15, I59, I84)

Definición explícita de qué puede cerrarse en el Ciclo 1 y qué evidencia deja el ISSUE en `IN_PROGRESS` **sin falsear el cierre**:

| ISSUE | DoD alcanzable en Ciclo 1 | Evidencia para `IN_PROGRESS` (sin cierre falso) | Cierre diferido a |
|---|---|---|---|
| **I15** (BE-015) | Código: `mqtts://` por defecto; identidad por dispositivo; fallo ante no-TLS en prod; ACLs; contrato `mqtt-contract` actualizado | PR-L mergeado + tests (rojo→verde) de `env.js` fail-fast y `mqttBridge` con identidad por dispositivo; **broker TLS no desplegado** (I074/I075 F1) → `IN_PROGRESS` documentado | **I074/I075 (F1)** |
| **I59** (FW-010) | NVS tras primer registro; fallback solo primer arranque; credenciales fuera de RAM | PR-M mergeado + scan: `http_poller.h` sin `_mqttUser/_mqttPass` en RAM; tests nativos (NVS lee, fallback una vez); **I50 cierra su loop NVS pero su DoD exige I52** → `IN_PROGRESS` de I50, I59 `DONE` | **I59 → DONE**; **I50 → cierre con I52 (F2)** (F10-5) |
| **I84** (INF-025) | NVS migration + `.gitignore` + checklist de secretos locales | PR-M mergeado + checklist documentado; **scanning automático exige I076 (CI gates, F1)** → `IN_PROGRESS` con evidencia de checklist, sin inventar scanning | **I076 (F1)** |

**Regla de evidencia:** un ISSUE con cierre diferido se documenta con (a) PR mergeado, (b) tests del alcance alcanzable, (c) hallazgo de fase que fija la dependencia pendiente y su banda. **Prohibido** declarar `DONE` un ISSUE cuyo DoD dependa de ISSUEs fuera del ciclo sin registrar el hallazgo.

---

## 7. Resolución I50 → I59 → I52 (según DoD vigente del backlog) — F10-5

- **I50 (FW-001) DoD vigente:** *"sin secretos reales en el árbol; placeholders."* — **Dependencias:** ISSUE-059 (NVS) y **ISSUE-052 (FW-003 OTA TLS)**.
- **I59 (FW-010) DoD vigente:** *"credenciales en NVS; fallback solo primer arranque."* — su cierre **no** exige I52.
- **Conclusión:** **I59 NO permite cerrar I50 por sí solo.** Según el DoD/deps vigentes del backlog (I050 línea 1246: `Dependencias: ISSUE-059, ISSUE-052`; nota PR-C línea 1249: *"Pendiente para cierre: ISSUE-059…, ISSUE-052…, ISSUE-076…"*), **I52 (FW-003 OTA TLS) sigue siendo requisito obligatorio para el cierre de I50**.
- **Efecto operativo:** en el Ciclo 1, I59 llega a `DONE` (su DoD es autónomo) y **I50 avanza su loop NVS pero permanece `IN_PROGRESS`**, con cierre diferido a **I52 (F2, EPIC-OTA-SECURITY)** + I076 (scan). Se mantiene intacto el registro del backlog; no se re-baselinea I50 a la baja.
- **No se altera** DECISION-011 ni D11 (ciclos de coordinación `1→50→59→1`, `50→59→52→50` se preservan; se operan por orden y planes de desbloqueo, no editando dependencias).

---

## 8. Criterios de verificación y salida del Ciclo 1

| # | Criterio | Evidencia verificable | ISSUEs |
|---|---|---|---|
| 1 | **Banda F0 cerrada** (7 ISSUEs restantes) | I16, I19, I24, I27, I59, I72 `DONE` + I84 avance parcial (I76 F1) | I16, I19, I24, I27, I59, I72, I84 |
| 2 | **Cadena MQTT/broker avanzada** | I15 (BE-015) con código `mqtts://` + ACL + identidad por dispositivo; cierre diferido a I74/I75 (F1) | I15, I24 |
| 3 | **I59 `DONE`; I50 avanzado (NVS)** | Scan de firmware: credenciales MQTT en NVS, no en RAM; fallback solo primer arranque; **I50 permanece `IN_PROGRESS` (DoD exige I52, F2)** | I50, I59 |
| 4 | **Secretos de bootstrap sin defaults** | `seed.js` sin admin123 salvo dev + bcrypt 12 + admin CLI; `validate()` fail-fast en sync/seed (JWT_SECRET) | I16, I72 |
| 5 | **Errores genéricos en toda la API** | Middleware global de error (sin `err.message` al cliente); monitoring/admin siguen genéricos (regresión) | I27 |
| 6 | **Snapshot Ciclo 1 vs post-Ciclo 0** | §9 de este documento + re-computo (Fase 8 §8) | global |

**Cierre formal del ciclo:** tras el cierre de los PRs y el snapshot comparado, se emite el informe de cierre con el runbook de gates (Fase 5 §6) y el re-computo del dashboard (Fase 8 §8).

---

## 9. Gates y métricas a verificar al cierre

### 9.1 Gates por ISSUE
- **Entrada:** DoR 9/9 (auditoría `dor-readiness-review-cycle-1.md` — campos por completar, F10-1).
- **Salida:** DoD 9/9 (backlog §2) — cobertura Fix 80 % / Security 100 % en el cambio; test de regresión en el mismo PR para P0/P1; contratos/ADRs vía supersesión; CHANGELOG componente + raíz; CI verde; sin secretos nuevos.

### 9.2 Métricas transversales (Fase 5 §5) — objetivo del ciclo
| Métrica | Objetivo Ciclo 1 | Cómo se verifica |
|---|---|---|
| Cobertura mínima (Fix 80 / Security 100) | PRs del ciclo con tests Security 100 % | Cobertura del cambio en CI |
| Secretos eliminados | FW-010 sin creds en RAM; BE-016 sin admin por defecto (dev only); INF-013 sin JWT_SECRET default | Scan + revisión de diff |
| Contratos sincronizados | `mqtt-contract` actualizado (I15); sin cambios wire en API | Regeneración/documentación del PR |
| CI verde | Suite autorización negativa (I106) + backend `test:ci` | `ci.yml` / estado del PR |
| ADR aprobados | DECISION-006 aplicada (I15); sin DECISION-011 para el ciclo (F10-2) | `architecture-decisions-pending.md` |

### 9.3 Exit Gate P1 (no se alcanza en el ciclo)
El Exit Gate P1 (Fase 5) exige los **14 P0 cerrados**. Tras el Ciclo 0: 12 cerrados, **I65 `IN_PROGRESS`** (cierre con I75/I81) y **I70 `BLOCKED`** (DECISION-011). El Ciclo 1 no añade P0 (los 8 son P1–P3), por lo que el gate P1 permanece **⛔ PENDING** (reflejado en el dashboard §9).

---

## 10. Snapshot post-Ciclo 0 → post-Ciclo 1 (proyección objetivo)

Proyección basada en el criterio de salida del plan; **no es un resultado medido**. Supuestos: 5 PRs mergeados; **6 ISSUEs `DONE`** (I16, I19, I24, I27, I59, I72); **I15 e I84 en `IN_PROGRESS`** (cierre diferido a F1: I074/I075 e I076); I50 permanece `IN_PROGRESS` (I52 F2); I65 sigue `IN_PROGRESS`; I70 `BLOCKED`.

### 10.1 Avance por programa

| Prog | ISSUEs | DONE post-C0 | DONE post-C1 (proy.) | Avance | Madurez |
|---|---|---|---|---|---|
| P1 Seguridad | 28 | 13 DONE · I65 IN_PROGRESS | **19 DONE** (suma I16, I19, I24, I27, I59, I72) · I65/I15/I50 IN_PROGRESS | 68 % (19/28) | Media → **Media-alta** |
| P2 Testing | 11 | 1 | **1** | 9 % | Media (sin cambio) |
| P3–P11 | 71 | 0 | 0 | 0 % | sin cambio |
| **Total** | **110** | **14 DONE** | **20 DONE** + 3 IN_PROGRESS (I15, I50, I65) + 1 BLOCKED (I70) | **18.2 %** | — |

> **Nota de consistencia (§10):** el avance global computa únicamente `DONE` → **20/110 = 18.2 %**. I84 queda en `IN_PROGRESS` (o `BACKLOG` con plan según la ejecución); su estado final se fija en el re-computo real (Fase 8 §8). Estados proyectados: 86 BACKLOG · 0 READY · 3 IN_PROGRESS (I15, I50, I65) · 20 DONE · 1 BLOCKED (I70) = 110.

### 10.2 Riesgo y bloqueadores por área

| Área | Madurez t=1 → proy. | Riesgo t=1 → proy. | Bloqueador post-Ciclo 1 |
|---|---|---|---|
| Seguridad | Media → Media-alta | 🟠 Medio → 🟡 Bajo-medio | DECISION-011 (I70); BE-014 (N+1/límites) |
| Infraestructura | Media → Media-alta | 🟠 Medio → 🟠 Medio | DECISION-011 (backups); INF-012 (I71); broker en despliegue (I65→I75/I81) |
| Testing | Media → Media | 🟠 Medio → 🟠 Medio | TST-001 (I105); FE sin tests en CI (I109/INF-021); root `pnpm test` (I66) |
| Backend | Media → Media-alta | 🟡 Bajo-medio → 🟡 | BE-014, BE-026/028 (P2/P3 fuera del ciclo) |
| Firmware | Media → Media-alta | 🟡 Bajo-medio → 🟡 | FW-004…007 (reliability, P6); **I52 (cierre I50, F2)** |
| Frontend | Media-baja → Media | 🟠 Medio → 🟡 Bajo-medio | FE-004 (SSE sin auth, P5) |
| Arquitectura | Media → Media | 🟡 Bajo-medio → 🟡 | DOC-001/002/003, DOC-005, drift contratos (sin ISSUE en el ciclo) |

### 10.3 KPIs transversales

| KPI | post-Ciclo 0 | post-Ciclo 1 (proy.) |
|---|---|---|
| Estados ISSUEs | 94 B · 0 R · 1 IP (I65) · 14 D · 1 BLOCKED | 86 B · 0 R · 3 IP (I15, I50, I65) · **20 D** · 1 BLOCKED |
| Exit Gates | 0/11 | **0/11** (P1 ⛔ PENDING por DECISION-011) |
| Secretos en repo | FW-001/002, INF-001, FE-001 resueltos; I70 pendiente | + BE-016 (dev only), INF-013 (sin default), FW-010 (NVS) |
| Suite autorización negativa | En CI (I106 DONE) | En CI (sin cambio) |
| Decisiones de arquitectura | 10 ACCEPTED · 1 PENDING | 10 ACCEPTED · **1 PENDING (DECISION-011)** |
| SCC/D11 | 7 | 7 (intacta) |

---

## 11. Condiciones que habilitan formalmente el inicio de la ejecución

El Ciclo 1 **solo** podrá iniciarse cuando se cumplan **todas**:

1. **Autorización explícita:** este documento (o su evolución) aprobado por el usuario como autorización de ejecución del Ciclo 1.
2. **Frontera del ciclo cerrada:** el conjunto de ISSUEs es exactamente los 8 de §2; I70 permanece `BLOCKED` (DECISION-011 PENDING; no se promueve).
3. **Auditoría DoR emitida y campos completados:** los 8 ISSUEs superan el DoR 9/9 (completar campos señalados en `dor-readiness-review-cycle-1.md`) con registro en el backlog.
4. **Promoción inicial:** los 8 pasan a `READY` (registro de transición según Fase 6 §10.3) — única promoción autorizada en esta fase.
5. **Procedimiento vigente:** se opera con la Fase 6 (10 pasos, plantillas) y la Fase 7 (control de cambios T0/T1/T2); regla dura verde→rojo→verde para P0/P1.
6. **Baseline congelado:** el snapshot post-Ciclo 0 (Fase 8 §9) es la línea de comparación; el snapshot post-Ciclo 1 (§10) es la proyección objetivo.
7. **Entorno operativo:** rama `develop` actualizada (incluye merge de PR-H #190 pendiente); CI disponible; entorno local de pruebas (backend `test:ci`, frontend `build`, firmware `pio test -e native`).
8. **PRs a nivel Epic:** no se crea un PR por ISSUE; se ejecuta PR-I…PR-M de §3 con la regla de no mezclar dominios no relacionados.

---

## 12. Hallazgos de fase (sin corrección de backlog)

### F10-1 — DoR de los 8 ISSUEs del Ciclo 1 no emitida
Ninguno de los 8 candidatos tiene los campos DoR añadidos en el Ciclo 0 (`Contrato/versión`, `Riesgos`, `Verificación verde→rojo→verde`, labels ADR/DDD). La ejecución queda **condicionada a la auditoría §5** — no se promueve nada hasta completarla. Ver `dor-readiness-review-cycle-1.md`.

### F10-2 — DECISION-011 no es prerequisito del Ciclo 1
Ninguno de los 8 ISSUEs depende de I70/I71 ni de DECISION-011. La decisión permanece `PENDING` y solo mantiene bloqueados I70/I71 y el Exit Gate P1 (⛔). El único vínculo indirecto: el host de despliegue del broker (I65, PR-G) condiciona el **cierre** de I15/I24, no su inicio.

### F10-3 — I27 auditado contra PR-F #189: residual re-baselineado
PR-F (#189, I003) ya hizo genéricos `monitoring.js` y `admin.js` (`{ error: 'SERVER_ERROR', message: 'Error interno del servidor' }` + child logger, líneas 20/33/61/83/120 de `admin.js`; tests `monitoring-error-paths.test.ts`). **Residual real de I27:** (a) middleware global de error `(err, req, res, next)` — **no existe hoy** (búsqueda sin coincidencias); (b) regresión de monitoring/admin. **No duplica** el trabajo de PR-F. Nota: otras rutas (`apiKeys`, `alarms`, `actuators`, `cycles`, `api`, `telegram`, `subscriptions`, `species`, `settings`, etc.) siguen filtrando `err.message`; quedan fuera del alcance declarado de I27 (monitoring/admin/middleware) y se registran como observación para un ISSUE futuro — no se amplía I27.

### F10-4 — PR-M depende de PR-L (corrección de secuencia)
PR-M (I59/I84) no puede ir en Oleada 1: I59 requiere el transporte `mqtts://` de I15 (PR-L) para la task "TLS en registro" (ADR-028). Secuencia corregida: Oleada 1 = PR-I/PR-J/PR-K/PR-L; Oleada 2 = PR-M.

### F10-5 — I50 no se cierra con I59 (I52 sigue obligatorio)
Según el DoD/deps vigentes del backlog, I50 exige I52 (FW-003 OTA TLS, F2) además de I59. I59 llega a `DONE` en el Ciclo 1; **I50 permanece `IN_PROGRESS`** con cierre diferido a I52/I076. No se re-baselinea I50.

### F10-6 — PR-H #190 pendiente de merge
El cierre documental del Ciclo 0 (PR-H) está **aprobado pero `OPEN`** (verificado 2026-08-10: estado OPEN, sin `mergedAt`). El Ciclo 1 asume `develop` con PR-H mergeado (condición §11.7).

---

## 13. Cierre formal — planificado, no iniciado

**Fecha:** 2026-08-10.

La Fase 10 queda **planificada y cerrada como entregable documental; la ejecución del Ciclo 1 no se inicia**:

1. **Conjunto definido y verificado:** 8 ISSUEs (4 P1 + 4 P2/P3) con programa/epic/prioridad/dependencias trazados al backlog (§2).
2. **Orden operativo definido y corregido:** 5 PRs a nivel Epic con secuencia por oleadas; PR-M → Oleada 2 por dep PR-L (F10-4) (§3).
3. **Reglas de promoción y BLOCKED aplicadas:** los 8 solo promovibles tras auditoría DoR; I70 inamovible (DECISION-011) (§4, §5).
4. **DoD alcanzable por ISSUE cross-ciclo definido:** I15/I59/I84 con evidencia de `IN_PROGRESS` sin falsear cierre (§6).
5. **Cadena I50→I59→I52 resuelta:** I59 `DONE`, I50 `IN_PROGRESS` hasta I52 (F2) (§7).
6. **Criterio de salida operacionalizado:** 6 criterios con evidencia verificable (§8).
7. **Gates y métricas de cierre definidos:** DoR/DoD, transversales Fase 5 §5, Exit Gate P1 permanece ⛔ PENDING (§9).
8. **Snapshot proyectado:** Avance 18.2 %, P1 68 % → Media-alta, riesgos a la baja, 0/11 gates, D11 intacta (§10).
9. **Arranque formal condicionado:** 8 condiciones explícitas de §11, con la autorización del usuario y la auditoría DoR como primeras.
10. **Sin efectos:** sin código, sin PRs, sin promociones, sin alterar DECISION-011/D11/deuda.

**Estado final de la etapa documental (Fases 0–10):** entregables documentales completos; ningún ISSUE del Ciclo 1 ejecutado. **Próximo paso habilitado (no ejecutado):** aprobar este plan, completar los campos DoR (§5) y autorizar el Ciclo 1 conforme a §11.

---

## 14. Cierre formal post-ejecución (2026-08-11)

Autorizado por el usuario (2026-08-11) conforme a §11 (DoR completado vía PR #194; `develop` con PR-H #190 mergeado; entorno operativo disponible). **Ejecución completada** — 6 PRs mergeados, banda F0 cerrada:

| PR | ISSUEs | Resultado |
|---|---|---|
| PR-I #193 | I16, I72 | DONE (backend 1.7.6) |
| PR-J #196 | I19 | DONE (backend 1.7.7) |
| PR-K #198 | I27 | DONE (backend 1.7.8) |
| PR-L #201 | I15, I24 | I15 `IN_PROGRESS` (código `mqtts://` + ACL; cierre F1: I074/I075) · I24 DONE (backend 1.7.9) |
| PR-M #204 | I59, I84 | I59 DONE (firmware 0.23.4) · I84 `IN_PROGRESS` (checklist; cierre F1: I076) |
| PR-N (cierre) | — | snapshot + runbook gates + re-computo (`phase-8-executive-dashboard.md` §10; backlog §9.7) |

**Varianza vs. proyección §10 (medido, no estimado):** base post-Ciclo 0 real = **12 DONE** (el plan §10.1 asumía 14); resultado post-Ciclo 1 real = **18 DONE · 5 IN_PROGRESS (I15/I50/I51/I65/I84) · 1 BLOCKED · 86 BACKLOG** (avance global 16.4 %, P1 61 % → Media-alta). La proyección §10.3 (20 DONE · 3 IP) no se alcanzó porque (a) la base era 12 y no 14, y (b) I84 quedó `IN_PROGRESS` (no BACKLOG) y se añadió a los IP contabilizados. I50 sigue `IN_PROGRESS` (I52 F2, F10-5). Exit Gates 0/11 (P1 ⛔ PENDING, DECISION-011). Detalle: `engineering-backlog.md` §9.7 y `phase-8-executive-dashboard.md` §10.
