# EDD-004 — Estrategia Multi-Tenant y Escalabilidad

## Metadata

| Campo             | Valor                             |
| ----------------- | --------------------------------- |
| Autor             | AlejandroMaturana                |
| Estado            | DRAFT                             |
| Fecha             | 2026-07-05                        |
| Versión           | 0.2.0                             |
| ADRs relacionados | ADR-005, ADR-007, ADR-013         |
| RFC relacionados  | RFC-0003 (multi-device dashboard) |

---

## 1. Problema / Contexto

Mush2 nació como un sistema monousuario para un solo cultivador y una sola cámara. La arquitectura actual soporta múltiples usuarios y múltiples dispositivos por diseño (modelos `User`, `Chamber`, `Device`, `UserChamberAccess`), pero no ha sido probada ni optimizada más allá de un escenario de 1–3 dispositivos simultáneos.

El crecimiento natural del proyecto implica:

1. **Multi-cámara** (Fase 8): un mismo cultivador con N cámaras físicas
2. **Multi-tenant** (potencial): múltiples cultivadores en la misma plataforma, con aislamiento de datos
3. **Marketplace** (Fase 16): recetas públicas compartidas entre usuarios

Este EDD captura el diseño de la capa de multi-tenancy y los patrones de escalabilidad que deben establecerse desde ahora para evitar refactors costosos más adelante.

---

## 2. Objetivos

- Definir el modelo de **aislamiento de datos** entre usuarios (row-level vs schema-level)
- Establecer los límites de escalabilidad del setup actual (Nivel 1: 1–10 dispositivos)
- Diseñar la evolución hacia Nivel 2 (10–100 dispositivos) sin cambios de arquitectura mayor
- Garantizar que ningún usuario pueda acceder a datos de otro usuario sin permisos explícitos
- Documentar los puntos de saturación y cuándo escalar cada capa

---

## 3. No-objetivos

- Migración a microservicios (la arquitectura monolítica es intencional para esta escala)
- Multi-región o geografía distribuida
- SLA formal con uptime garantizado (el sistema actual es de uso personal/piloto)
- Billing o facturación por uso

---

## 4. Alternativas consideradas

### 4.1 Modelo de aislamiento de datos

| Opción                                      | Pros                                         | Contras                                          | Decisión                           |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| **Row-Level Security con userId (elegida)** | Simple, una sola DB, sin overhead de schemas | Queries deben incluir siempre `WHERE userId = ?` | ✅ Elegida — implementación actual |
| Schema-per-tenant (PostgreSQL schemas)      | Aislamiento fuerte, fácil backup por tenant  | Complejo de migrar, N schemas = N migraciones    | ❌ excesivo para escala actual     |
| Database-per-tenant                         | Aislamiento máximo                           | Operacionalmente inmanejable con muchos tenants  | ❌                                 |
| Sin aislamiento (shared data)               | Trivial                                      | Inaceptable por seguridad                        | ❌                                 |

### 4.2 Estrategia de escalabilidad de DB

| Opción                                     | Pros                         | Contras                              | Decisión                  |
| ------------------------------------------ | ---------------------------- | ------------------------------------ | ------------------------- |
| **Connection pooling + índices (elegida)** | Sin cambios de arquitectura  | Límite ~500 conn. simultáneas        | ✅ Elegida para Nivel 1–2 |
| Read replicas                              | Escala lectura de telemetría | Complejidad operacional alta         | 🟡 Planificada en Nivel 3 |
| TimescaleDB (extension PostgreSQL)         | Hypertables para time-series | Requiere migración de esquema        | 🟡 Evaluada en Nivel 3    |
| Sharding horizontal                        | Escala indefinida            | Muy complejo, rompe JOIN cross-shard | ❌ solo Nivel 5+          |

---

## 5. Solución propuesta

### 5.1 Modelo de tenancy actual (Row-Level Security)

La tenancy se implementa via middleware y asociaciones de Sequelize:

```javascript
// middleware/tenant.js
async function tenantMiddleware(req, res, next) {
  req.userId = req.user.id; // Del JWT decodificado
  req.deviceFilter = {
    include: [
      {
        model: UserChamberAccess,
        where: { userId: req.userId, isActive: true },
      },
    ],
  };
  next();
}

// Uso en controlador
const devices = await Device.findAll({
  ...req.deviceFilter, // Inyectado por middleware
  include: [Chamber],
});
```

### 5.2 Niveles de escalabilidad

| Nivel                | Dispositivos | Usuarios | Setup                                               | Telemetría/día  |
| -------------------- | ------------ | -------- | --------------------------------------------------- | --------------- |
| **1 — Dev (actual)** | 1–10         | 1–5      | PostgreSQL local, Node.js single process            | ~10K registros  |
| **2 — Piloto**       | 10–100       | 5–50     | PostgreSQL dedicado, Node.js + PM2, connection pool | ~100K registros |
| **3 — Producción**   | 100–1000     | 50–500   | PostgreSQL + read replica, TimescaleDB, Redis cache | ~1M registros   |
| **4 — Scale**        | 1000–10K     | 500–5K   | Kubernetes, múltiples instancias, MQTT propio       | ~10M registros  |
| **5 — Industrial**   | 10K+         | 5K+      | Sharding, CDN, microservicios por dominio           | ~100M registros |

### 5.3 Puntos de saturación y triggers de escala

```
Nivel 1 → Nivel 2 (triggers):
  - API p95 > 500ms sostenido
  - Telemetría DB > 50GB
  - > 10 usuarios concurrentes con SSE

Nivel 2 → Nivel 3 (triggers):
  - Connection pool exhausto (> 20 conn.)
  - Queries de telemetría histórica > 2s
  - > 100 dispositivos con polling simultáneo
```

### 5.4 Retención de datos de telemetría

Para evitar crecimiento indefinido de la tabla `Telemetry`:

```sql
-- Política de retención (a implementar en Fase 14)
-- Raw data: retener 30 días
DELETE FROM "Telemetries"
WHERE "createdAt" < NOW() - INTERVAL '30 days';

-- Agregados horarios: retener 1 año
-- (implementar con pg_cron o job de Node.js)
INSERT INTO "TelemetryHourly" (deviceId, hour, avg_temp, avg_humidity, avg_co2)
SELECT deviceId, DATE_TRUNC('hour', timestamp), AVG(value)...
```

### 5.5 Roles y permisos (RBAC actual)

```
SUPER_ADMIN
  └── Acceso completo a todo
ADMIN
  └── Gestión de usuarios en su organización
OPERATOR
  └── Control de dispositivos asignados via UserChamberAccess
VIEWER
  └── Solo lectura de dispositivos asignados
```

---

## 6. Impacto en componentes

| Componente      | Impacto nivel actual                | Impacto nivel 2+                           |
| --------------- | ----------------------------------- | ------------------------------------------ |
| Backend         | ✅ Implementado (middleware tenant) | Requiere connection pooling explícito      |
| Base de datos   | ✅ Índices básicos                  | Requiere índices en `deviceId + timestamp` |
| Frontend        | ✅ Filtrado por usuario             | Requiere paginación de telemetría          |
| Firmware        | Sin impacto (aislado por deviceId)  | Sin impacto                                |
| Infraestructura | Solo dev local                      | Nivel 2: VM dedicada + Nginx               |

---

## 7. Plan de implementación

### Fase actual (Nivel 1 — completado)

- [x] Middleware de tenant con userId
- [x] `UserChamberAccess` para asociación usuario-dispositivo
- [x] RBAC con 4 roles (ADR-007)
- [x] Audit logging de operaciones sensibles

### Fase 8 — Multi-cámara (Nivel 1+)

- [ ] Frontend: selector de dispositivo y vista multi-dispositivo
- [ ] Backend: rutas multi-device sin cambiar arquitectura
- [ ] Test con 3 ESP32 simultáneos

### Fase 9+ — Nivel 2

- [ ] Connection pooling configurado (pgBouncer o Sequelize pool)
- [ ] Índices en `Telemetry(deviceId, createdAt)`
- [ ] Retención de datos con job programado
- [ ] MQTT broker propio (elimina dependencia de brokers públicos)

---

## 8. Métricas de éxito

| Métrica                           | Nivel 1             | Nivel 2          |
| --------------------------------- | ------------------- | ---------------- |
| Usuarios aislados correctamente   | ✅                  | ✅               |
| Peticiones concurrentes sin error | ~50                 | ~500             |
| Telemetría query < 200ms          | ✅ (datos pequeños) | Requiere índices |
| Dispositivos simultáneos          | 1–3                 | 10–100           |

---

## 9. Riesgos y mitigaciones

| Riesgo                                          | Prob. | Impacto | Mitigación                                   |
| ----------------------------------------------- | ----- | ------- | -------------------------------------------- |
| Middleware de tenant olvidado en nuevo endpoint | Media | Alto    | Linting + tests de autorización obligatorios |
| Crecimiento de telemetría satura disco          | Media | Alto    | Política de retención en Fase 14             |
| MQTT broker público no disponible               | Alta  | Medio   | Fase 9: broker propio                        |
| N+1 queries en listados multi-device            | Media | Medio   | Eager loading con Sequelize `include`        |

---

## 10. Referencias

- [`docs/ADR/ADR-007-JWT-RBAC.md`](../ADR/ADR-007-JWT-RBAC.md) — Autenticación y roles
- [`docs/ADR/ADR-005-PostgreSQL-SequelizeORM.md`](../ADR/ADR-005-PostgreSQL-SequelizeORM.md)
- [`docs/scalability.md`](../scalability.md) — Guía de escalabilidad detallada
- [`docs/roadmap/roadmap.md`](../roadmap/roadmap.md) — Fases 8, 9, 14
