# Decisiones de Arquitectura Pendientes (DECISION-NNN) — Mush2

**Fecha:** 2026-08-07
**Propósito:** Registro central de la serie **DECISION-NNN** surgida de la Fase 1 (validación cruzada AUD-004 ↔ Roadmap-V2). Centraliza las decisiones abiertas, su estado y su resolución. Cada decisión bloquea uno o más ISSUEs del `engineering-backlog.md`; cuando se resuelve se marca **ACCEPTED** (con opción elegida y racional) y el ISSUE asociado queda desbloqueado.

**Origen:** `docs/project/phase-1-validation-matrix.md` §9 · **Fuente de trazabilidad:** `docs/project/engineering-backlog.md` (campo `Decisión` por ISSUE).

**Restricción vigente:** no promocionar ISSUEs a READY ni implementar correcciones durante esta etapa. Esta registro documenta decisiones; la ejecución (nota de supersesión de ADR, migraciones, cambios de contrato) es tarea de los ISSUEs correspondientes.

---

## 1. Vocabulario de estados

| Estado | Significado |
|---|---|
| **NONE** | No existe decisión asociada (ISSUE sin dependencia de DECISION-NNN). |
| **PENDING** | Decisión abierta: bloquea la promoción del ISSUE a READY hasta resolverse. |
| **ACCEPTED** | Decisión resuelta: opción elegida y racional registrados; el ISSUE queda desbloqueado. |
| **REJECTED** | Decisión evaluada y descartada (la opción no se adopta). |
| **SUPERSEDED** | Decisión reemplazada por una decisión posterior. |

---

## 2. Estado de la serie

| ID | Tema | Estado | Bloquea | Resolución |
|---|---|---|---|---|
| DECISION-001 | Separación engineering-plan vs backlog | ACCEPTED | — | Plan orquestador; backlog fuente operacional (resuelta en Fase 1). |
| DECISION-002 | ADR-020 — Run vs CultivationCycle | **ACCEPTED** | ISSUE-085 | (b) Superar ADR-020; CultivationCycle es el modelo vigente. |
| DECISION-003 | ADR-022 — HistoryService | **ACCEPTED** | ISSUE-086 | (b) Superar ADR-022; declarado "reservado". |
| DECISION-004 | Marco de migraciones de BD | **ACCEPTED** | ISSUE-061 | (a) Sequelize migration CLI + snapshot inicial. |
| DECISION-005 | Estrategia de tokens de sesión | **ACCEPTED** | ISSUE-017, ISSUE-029 | (b) access en memoria + refresh cookie httpOnly. |
| DECISION-006 | Despliegue del broker MQTT | **ACCEPTED** | ISSUE-065, ISSUE-074 | (b) contenedor Mosquitto + volumen + TLS. |
| DECISION-007 | ThingSpeak — mantener o deprecar | **SUPERSEDED** | ISSUE-051 | (a) HTTPS + CA por ahora; deprecar tras broker estable → **sustituida por DECISION-012 (2026-08-12): depreciation total.** |
| DECISION-008 | Política de seed en producción | **ACCEPTED** | ISSUE-060, ISSUE-068 | (a)+(b)+(c) seed solo dev + catálogo separado. |
| DECISION-009 | Reconteo de hallazgos (104 vs 110) | ACCEPTED | — | AUD-004 contiene 110; se trazan los 110 (resuelta en Fase 1). |
| DECISION-010 | Fuente única de roadmap | **ACCEPTED** | ISSUE-095 | (b) Roadmap-V2 es la fuente única. |
| DECISION-011 | Plan de infraestructura (Render free → pago/VPS/IaC) | PENDING | ISSUE-070, ISSUE-071 | — |
| DECISION-012 | Consolidación de telemetría por MQTT; ThingSpeak fuera de arquitectura | **ACCEPTED** | ISSUE-051, ISSUE-050 (parcial), ISSUE-023, ISSUE-105 (indirecto) | (b) Deprecar ThingSpeak; MQTT como canal canónico de telemetría (2026-08-12). |

**Resumen:** 12 decisiones totales · **9 resueltas en esta etapa** (002, 003, 004, 005, 006, 007→012, 008, 010) · 2 resueltas en Fase 1 (001, 009) · **1 pendiente** (011).

---

## 3. Decisiones resueltas

### DECISION-002 — ADR-020: `Run` vs `CultivationCycle`

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** ADR-020 (aceptado 2026-07-20) declara **Run** como entidad central; la implementación persiste **CultivationCycle**.
- **Evidencia (verificada):**
  - No existe `backend/src/models/Run.js`; persiste `backend/src/models/CultivationCycle.js`.
  - Rutas activas: `backend/src/routes/cycles.js`; `actuators.js:40`, `analytics.js:74` consultan `CultivationCycle`.
  - Contratos: `api-contract.md` documenta `/cycles*` (no `/runs`); `capability-catalog.md` usa `automation.cycles.concurrent`.
  - ADR-020: "Database migration or rename needed to carry this forward. In practice, since we are rebuilding, there is no migration" — la refundación prevista no se completó.
- **Opciones:**
  - (a) Completar la migración a `runs` (modelo + tabla + rutas + contratos + frontend + matriz de capacidades).
  - (b) Superar formalmente el ADR-020 (registro de supersesión explícito).
- **Resolución: (b) Superar ADR-020.**
- **Racional:** el costo de migración es alto (superficie: modelos, rutas, contratos, frontend, analytics, capability matrix) y no aporta valor funcional inmediato; es un renombrado terminológico. La implementación prevalece sobre la documentación (principio del proyecto). Mantener `CultivationCycle` como modelo vigente.
- **Impacto:**
  - ISSUE-085 aplicará la nota de supersesión en ADR-020 (sin edición directa del ADR; supersesión explícita).
  - `api-contract.md`, `capability-matrix.md` y `backend.md` deben reflejar `CultivationCycle`/`cycles` como vigentes (tarea de ISSUE-085 y de los ISSUE de docs correspondientes).
  - No hay cambio de contrato de comunicación: `/cycles*` se mantiene.
- **Bloquea:** ISSUE-085 (P3.1).

### DECISION-003 — ADR-022: `HistoryService`

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** ADR-022 (aceptado 2026-07-20) introduce un `HistoryService` activo (`getRunTimeline`/`getRunSummary`) que reconstruye el timeline de un Run desde RunState/PhaseTransition/Alarm.
- **Evidencia (verificada):**
  - No existe implementación de `HistoryService`; no hay consumidores de `getRunTimeline`/`getRunSummary`.
  - El historial hoy se sirve vía `backend/src/routes/analytics.js` (con `CultivationCycle` + `CycleState`).
  - ADR-022 asume la entidad `Run` que no existe (ver DECISION-002).
- **Opciones:**
  - (a) Implementar el `HistoryService` completo.
  - (b) Marcar el ADR-022 como superado y declarar el servicio "reservado".
- **Resolución: (b) Superar ADR-022; declarado "reservado".**
- **Racional:** sin consumidores reales, implementar añade un servicio que mantener sin retorno inmediato. El acceso a historial está parcialmente cubierto por `analytics.js`. La funcionalidad queda "reservada" para una evolución futura (p. ej. si se adopta `Run`). No hay contrato de comunicación afectado porque el servicio nunca se expuso.
- **Impacto:**
  - ISSUE-086 aplicará la nota de supersesión en ADR-022 con la etiqueta "reservado".
  - No hay cambios en API/MQTT/BLE.
- **Bloquea:** ISSUE-086 (P3.2).

### DECISION-004 — Marco de migraciones de BD

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** reemplazar `sync({ alter: true })` por migraciones versionadas y seguras para producción.
- **Evidencia (verificada):**
  - `backend/src/sync-db.js:16` ejecuta `sequelize.sync({ alter: true })`; `Dockerfile:38` lo ejecuta en el CMD de arranque.
  - No existe infraestructura de migraciones en el repo (sin directorio de migraciones).
  - ADR-013 Fase 3 promete "Separar sync de migrate" con "Umzug o Sequelize CLI"; ADR-005 adopta Sequelize ORM.
  - Hay datos productivos (baseline 001); `alter:true` es destructivo (INF-002, riesgo §8 de la matriz).
- **Opciones:**
  - (a) Adoptar **Sequelize migration CLI** (`@sequelize/cli` / `sequelize-cli`) con snapshot inicial de la BD actual.
  - (b) Script propio de migraciones versionadas.
  - (c) Mantener `alter:true` en desarrollo y congelar esquema en producción.
- **Resolución: (a) Sequelize migration CLI + snapshot inicial.**
- **Racional:** estándar, versionado con up/down, integrado con el ORM ya adoptado (ADR-005) y cumple lo prometido en ADR-013. El snapshot inicial se genera desde los modelos actuales (la implementación prevalece). (b) duplica infraestructura sin beneficio; (c) no aporta trazabilidad ni es escalable.
- **Impacto:**
  - ISSUE-061 adopta `@sequelize/cli`, genera snapshot inicial, y restringe `alter:true` a `NODE_ENV !== 'production'` (o lo elimina del CMD).
  - Prerrequisito: backup pre-deploy (ISSUE-070) antes de cualquier cambio de esquema.
  - Desbloquea además ISSUE-088 (backend.md con estructura real), P4.1 (cascadas delete) y P9.1 (índices/pooling).
- **Bloquea:** ISSUE-061 (P1.2), P4.1, P9.1.

### DECISION-010 — Fuente única de roadmap

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** DOble fuente de roadmap: `docs/roadmap/roadmap.md` (fases 0–9, actualizado 2026-07-23) vs `docs/roadmap/milestone.md` (fases 0–10, al 2026-07-25).
- **Evidencia:** ambos documentos divergen en número de fases y contenido; ninguno refleja el proceso de madurez actual (Programas 1–11, DECISION-NNN, backlog).
- **Opciones:**
  - (a) Adoptar `milestone.md` como fuente.
  - (b) Declarar **Roadmap-V2** (`ultimate-roadmap2.md`) como fuente única; `roadmap.md`/`milestone.md` quedan históricos.
- **Resolución: (b) Roadmap-V2 es la fuente única.**
- **Racional:** Roadmap-V2 es el roadmap vivo que guía este proceso de madurez (Programas 1–11) y del que se derivó el backlog (Fase 1 validada). `roadmap.md`/`milestone.md` pertenecen al ciclo anterior y quedan como registro histórico.
- **Impacto:**
  - ISSUE-095 añadirá la nota de fuente única en `roadmap.md` y `milestone.md` apuntando a Roadmap-V2 y al backlog.
  - Ningún programa/Epic/Initiative del backlog cambia (ya se construyó sobre Roadmap-V2).
- **Bloquea:** ISSUE-095 (P3.8).

### DECISION-008 — Política de seed en producción

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** INF-001/INF-009 — el seed crea admin/admin123 y datos de test en producción; `Dockerfile:38` lo ejecuta en el arranque.
- **Evidencia (verificada):**
  - `Dockerfile:38`: `CMD ["sh", "-c", "node backend/src/sync-db.js && node backend/src/seed.js && node backend/src/server.js"]` — seed corre en la imagen productiva (`render.yaml:10` fija `NODE_ENV=production`).
  - `seed.js:285-288`: `TEST_USERS` con `admin/admin123`, `manager/manager123`, `tecno/tecno123`, `invitado/invitado123`.
  - `seed.js:456-467`: sobre `Device.findAll` de producción escribe `thingSpeakEnabled: true`, `channelId '123456'` y credenciales ThingSpeak falsas (`readKey 'ABCDEFGHIJKLMNOP'` / `writeKey 'ZYXWVUTSRQPONMLK'`).
  - `seed.js` no tiene guard de `NODE_ENV`; se ejecuta incondicionalmente desde el CMD.
- **Opciones:**
  - (a) guard `NODE_ENV !== 'production'` + admin por CLI/secret.
  - (b) mover seed fuera del CMD del Dockerfile.
  - (c) separar catálogo referencial idempotente (especies, templates) de fixtures de test.
- **Resolución: (a)+(b)+(c) combinadas.**
- **Racional:** producción jamás debe ejecutar fixtures de test ni crear credenciales por defecto. El catálogo referencial (especies, templates de cámara) es dato de dominio legítimo y se puebla de forma idempotente y controlada (no vía seed de test). El admin inicial se crea por CLI/secret de un solo uso (bootstrap). El guard es la defensa en profundidad; quitar del CMD es la corrección de raíz; separar catálogo de fixtures evita reintroducir el problema.
- **Impacto:**
  - ISSUE-060 (INF-001): guard en `seed.js`, quitar seed del CMD, admin por CLI/secret.
  - ISSUE-068 (INF-009): separar catálogo idempotente de fixtures; no tocar dispositivos de producción con datos de test.
  - ISSUE-016 (BE-016): bcrypt cost 12 + guard NODE_ENV.
- **Bloquea:** ISSUE-060 (P1.1), ISSUE-068 (P1.1) (+ ISSUE-016, ISSUE-067 transitivos).

### DECISION-006 — Despliegue del broker MQTT de producción

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** INF-006 — broker MQTT no desplegado; núcleo del producto inoperativo; TLS/ACL (INF-015) y provisioning (INF-022) pendientes.
- **Evidencia (verificada):**
  - `render.yaml:39-48`: variables `MQTT_BROKER_URL`/`MQTT_BROKER_PASS` comentadas — `PENDING DEPENDENCY: No MQTT broker deployed yet for Render`.
  - `backend/src/config/env.js:80`: default `mqtt://localhost:1883` → el bridge apunta a localhost en producción.
  - `docker-compose.yml:15-28`: contenedor `eclipse-mosquitto:2` de referencia (puertos 1883/8883, volúmenes config/certs/data/log) — la configuración ya existe en el repo.
  - INF-015: listener 8883 (TLS) comentado en `mosquitto.prod.conf`; ACL prod sin `alarm`. INF-022: provisioning escribe en `docker/mosquitto/...` inexistente en la imagen prod.
- **Opciones:**
  - (a) Mosquitto gestionado externo (SaaS).
  - (b) Contenedor Mosquitto en Render/Railway/Fly con volumen persistente + TLS.
  - (c) Broker propio autogestionado (VPS).
- **Resolución: (b) contenedor Mosquitto con volumen + TLS (8883), ACL por dispositivo.**
- **Racional:** (b) reutiliza la configuración ya versionada (`docker/mosquitto`, compose) y conserva control de ACL/provisioning; es desplegable en cualquier PaaS de contenedores. (a) externaliza el broker y pierde la integración de provisioning/acl ya diseñada; (c) añade carga operativa sin beneficio. El hosting concreto se decide en operación (se enlaza a DECISION-011 si implica costo).
- **Impacto:**
  - ISSUE-065 (INF-006): desplegar contenedor, poblar `MQTT_BROKER_URL/PASS`, verificar conexión del bridge.
  - ISSUE-074 (INF-015): activar 8883 con certificados reales; ACL con `alarm`.
  - ISSUE-081 (INF-022): provisioning funcional dentro del contenedor.
  - Desbloquea P4.5 (realtime), P7.4, P8.4, P11.3; desbloquea a ISSUE-015 (TLS backend).
- **Bloquea:** ISSUE-065 (P1.6), ISSUE-074 (P1.6) (+ ISSUE-081, ISSUE-015).

### DECISION-005 — Estrategia de tokens de sesión

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-07
- **Tema:** FE-001 (JWT en `localStorage`) + BE-017 (refresh en claro, sin revocación).
- **Evidencia (verificada):**
  - `frontend/src/app/providers/AuthProvider.jsx:13-15`: `accessToken` y `refreshToken` en `localStorage` (exposición a XSS).
  - `backend/src/routes/auth.js:44,76`: refresh = JWT firmado con `JWT_SECRET + '_refresh'`, expiración 7 días.
  - `backend/src/routes/auth.js:79`: refresh almacenado en claro en la fila `User` (`user.update({ refreshToken, ... })`).
  - `backend/src/routes/auth.js:96-111`: `/auth/refresh` compara el token con el almacenado (no hay `jti`); sin rotación/revocación por `jti`; el logout no revoca en firme.
- **Opciones:**
  - (a) cookie httpOnly + endpoint de refresh.
  - (b) access en memoria + refresh en cookie httpOnly (interceptor).
  - (c) tokens firmados de corta vida sin refresh.
- **Resolución: (b) access en memoria + refresh en cookie httpOnly (`SameSite=Strict`), con (a) como soporte (endpoint `/auth/refresh` seguro).**
- **Racional:** estándar OWASP para SPA: elimina el vector XSS del `localStorage` (FE-001) y permite rotación/revocación del refresh sin exponerlo al JS (BE-017). (c) degrada UX y no resuelve la revocación ante dump de BD.
- **Impacto:**
  - ISSUE-029 (FE-001): access en memoria, interceptor, refresh por cookie httpOnly, tests actualizados.
  - ISSUE-017 (BE-017): hash del refresh, rotación con revocación por `jti`, vida acotada, logout con revocación dura.
  - ISSUE-033 (FE-005): single-flight del refresh.
- **Bloquea:** ISSUE-017 (P1.10), ISSUE-029 (P1.10) (+ ISSUE-030, ISSUE-033 transitivos).

### DECISION-007 — ThingSpeak: mantener o deprecar

- **Estado:** **SUPERSEDED** (por DECISION-012, 2026-08-12) · **Resuelta originalmente:** 2026-08-07
- **Tema:** FW-002 — clave de ThingSpeak en claro por HTTP; canal secundario de telemetría.
- **Evidencia (verificada):**
  - `firmware/src/thingspeak_client.cpp:11-12`: URL `http://` + `TS_HOST` con `api_key` en el query string.
  - `firmware/src/thingspeak_client.cpp:22-24`: `WiFiClient` sin TLS (`http.begin(wc, url)`).
  - `config.h` contiene `TS_API_KEY` en claro (FW-001). Canal secundario: la telemetría primaria es MQTT; ThingSpeak es auxiliar.
- **Opciones:**
  - (a) HTTPS en firmware (`TS_PORT 443` + `WiFiClientSecure` con CA).
  - (b) Deprecar ThingSpeak y consolidar toda la telemetría por MQTT.
- **Resolución: (a) HTTPS + CA por ahora.**
- **Racional:** (a) elimina la exposición en claro con cambio mínimo (cliente TLS + puerto) sin romper el canal existente ni depender del broker. La deprecación (b) requiere un broker estable (DECISION-006 ya aceptada pero por ejecutar) y una migración coordinada de firmware; se revisita después de cerrar P1.6. La clave se mueve a NVS como parte de ISSUE-050/084.
- **Impacto:**
  - ISSUE-051 (FW-002): `WiFiClientSecure` + CA; clave fuera del query string.
  - ISSUE-050 (FW-001) / ISSUE-084 (INF-025): clave en NVS; `config.h` con placeholders.
  - Deprecación futura registrada como mejora post-P1.6.
- **Bloquea:** ISSUE-051 (P1.9).

### DECISION-012 — Consolidación de telemetría por MQTT; ThingSpeak fuera de la arquitectura objetivo

- **Estado:** ACCEPTED · **Resuelta:** 2026-08-12
- **Tema:** sustituye DECISION-007 (opción HTTPS+CA) por la deprecación total de ThingSpeak; MQTT pasa a ser el **canal canónico de telemetría**.
- **Evidencia (contexto verificado):**
  - `firmware/src/thingspeak_client.cpp` (canal secundario HTTP/HTTPS ThingSpeak) y `backend/src/services/thingSpeakSync.js` (sincronización desde ThingSpeak).
  - `docs/DDD/DDD-001-domain-model.md` (ThingSpeakConfig, ThingSpeakSync) y `api-contract.md` (config ThingSpeak).
  - Broker MQTT estable con TLS/ACL (I074/I075, PR-A) y contrato `mqtt-contract` (MQTT 3.1.1, topics con `protocol`).
- **Opciones:**
  - (a) HTTPS + CA (DECISION-007) — **sustituida**.
  - (b) **Deprecar ThingSpeak** y consolidar toda la telemetría por MQTT — **elegida**.
- **Resolución: (b) ThingSpeak queda fuera de la arquitectura objetivo; MQTT es el canal canónico de telemetría.**
- **Racional:** con el broker estable (DECISION-006 aplicada, I074/I075) el canal auxiliar pierde su justificación de respaldo; elimina un punto externo sin SLA y una superficie de secretos (API key) de forma más limpia que endurecerlo (opción previa minimizaba el cambio sin broker estable).
- **Impacto:**
  - ISSUE-051 (FW-002): SUPERSEDED — el objetivo se logra deprecando el canal, no endureciéndolo.
  - ISSUE-050 (FW-001): la migración de `TS_API_KEY` a NVS queda obsoleta; se elimina la clave junto con el canal (alcance ajustado).
  - ISSUE-023 (BE-023): SUPERSEDED — `thingSpeakSync.js` se elimina; la dedup es innecesaria.
  - ISSUE-105 (TST-001): alcance ajustado en CI (eliminar ThingSpeak reduce módulos a cubrir en firmware; la suite nativa se mantiene para el resto de módulos).
  - ADR-004 (ThingSpeak canal secundario): **SUPERSEDED**.
  - `api-contract.md` (config ThingSpeak), `DDD-001`, `firmware.md`/`architecture.md`: sufrirán limpieza documental asociada a la deprecación (fuera del Ciclo 2 salvo ajuste mínimo).
- **Bloquea:** ningún ISSUE adicional; se **desbloquea** la resolución de I051 (SUPERSEDED) y de I023 (SUPERSEDED).

---

## 4. Decisiones pendientes

### DECISION-011 — Plan de infraestructura (Render free → pago/VPS/IaC)

- **Estado:** PENDING · **Origen:** DoR Readiness Review (hallazgo D7) — 2026-08-07
- **Tema:** el servicio corre en plan **free** de Render (`render.yaml:5` web, `render.yaml:52` DB). El plan free implica DB pausada por inactividad, pérdida de logs, sin persistencia garantizada ni backups gestionados, y limita el deployment del broker MQTT (DECISION-006) y de los backups automatizados (INF-011).
- **Evidencia (verificada):**
  - `render.yaml:5` → `plan: free` para el servicio web.
  - `render.yaml:52` → `plan: free` para `mush2-db`.
  - INF-011: `scripts/backup-db.js` sin scheduler; runbook refiere script inexistente.
  - INF-012: hallazgo original de AUD-004 (plan free).
  - DECISION-006 (broker en contenedor) y el restore verificado de backups (ISSUE-070) dependen de un entorno estable 24/7.
- **Opciones:**
  - (a) Pasar a plan de pago de Render (web + DB) con volumen persistente.
  - (b) Migrar a VPS/IaC autogestionado (costo e infra a cargo del equipo).
  - (c) Mantener free + mitigaciones parciales (sin DB pausada no es viable para backups/broker).
- **Recomendación del backlog:** (a) plan de pago de Render con volumen persistente y backups gestionados, mientras el broker MQTT (DECISION-006) decida su destino (contenedor en Render/Railway/Fly).
- **Bloquea:** ISSUE-070 (INF-011 backups), ISSUE-071 (INF-012 plan free).

---

## 5. Transición a la ejecución

Cuando una decisión pasa a ACCEPTED:

1. El campo `Decisión` del ISSUE asociado en `engineering-backlog.md` se actualiza a `ACCEPTED`.
2. El ISSUE deja de requerir la DECISION-NNN como prerequisito en DoR (check "No requiere decisión pendiente").
3. La ejecución (nota de supersesión de ADR, migraciones, contratos) ocurre cuando el ISSUE se promueve a READY/IN_PROGRESS según el flujo del backlog.

**Pendientes para cerrar la serie:** DECISION-011 (infraestructura). Mientras permanezca PENDING, los ISSUEs 070/071 no pueden pasar a READY.

---

## Referencias

- `docs/project/phase-1-validation-matrix.md` — Fase 1: contexto, opciones y recomendaciones originales (§9).
- `docs/project/engineering-backlog.md` — ISSUEs bloqueados y trazabilidad `Decisión` por ISSUE.
- `docs/ADR/ADR-020-run-replaces-cultivationcycle.md`, `docs/ADR/ADR-022-history-as-active-service.md` — ADR objeto de supersesión.
- `docs/ADR/ADR-013-Seguridad-Estrategia.md` — promesa de migraciones (Fase 3) y estrategia de secretos.
- `ultimate-roadmap2.md` — Roadmap-V2, fuente única de fases (DECISION-010).
