# Modelo de Autorización — Mush2

> Define cómo se aplican las capacidades, cuotas y políticas definidas en el Capability Catalog,
> combinando autenticación dual (JWT + API Key), RBAC por roles y autorización basada en suscripción.

---

## Arquitectura de Capas

```
Request
  │
  ▼
┌─────────────────────────────────┐
│  1. Autenticación (auth.js)     │  ← JWT o API Key
│     ¿Quién eres?                │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  2. Autorización (rbac.js)     │  ← Role Hierarchy
│     ¿Qué rol tienes?            │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  3. Suscripción (rateLimit)    │  ← Plan + Quotas
│     ¿Qué capacidades tienes?   │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  4. Tenant Scope (tenant.js)   │  ← Data isolation
│     ¿A qué datos accedes?      │
└─────────────────────────────────┘
  │
  ▼
       ┌─── Route Handler ───┐
       │  Lógica de negocio   │
       └──────────────────────┘
```

---

## Capa 1: Autenticación Dual

| Método | Header | Prioridad | Implementación |
|--------|--------|-----------|----------------|
| **JWT** | `Authorization: Bearer <token>` | Alta | `jsonwebtoken`, expiración configurable, refresh token rotation |
| **API Key** | `X-API-Key: <key>` | Baja (fallback) | Hash SHA-256 almacenado, IP whitelist, expiración, rate limit por key |

**Middleware**: `authenticate` (requiere auth) y `optionalAuth` (auth opcional, `req.user = null` si no hay).

Ver `backend/src/middlewares/auth.js`.

---

## Capa 2: RBAC por Roles

Jerarquía numérica:

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| `SUPER_ADMIN` | 100 | Acceso completo, configuración del sistema, gestión de usuarios y roles |
| `ADMIN` | 80 | Gestión de usuarios y dispositivos, auditoría |
| `OPERATOR` | 50 | Operación diaria: control de actuadores, recetas, ciclos (default) |
| `VIEWER` | 10 | Solo lectura: dashboards, alarmas, telemetría |

**Funciones**:
- `requireRole(...roles)`: requiere que el usuario tenga UNO de los roles especificados.
- `requireMinRole(role)`: requiere nivel >= al del rol especificado.

Las capacidades de suscripción **NUNCA** reemplazan el RBAC: un `VIEWER` con plan PREMIUM sigue siendo VIEWER.

Ver `backend/src/middlewares/rbac.js`.

---

## Capa 3: Autorización por Suscripción (Capabilities)

### Mecanismos de Enforcement

| Mecanismo | Descripción | Ejemplo |
|-----------|-------------|---------|
| **Feature Flag** | Habilita/deshabilita una ruta o funcionalidad según el plan | `automation.recipes` habilitado para todos |
| **Quota Check** | Verifica contadores contra límites del plan antes de ejecutar | `apiCallsUsedThisMonth < apiCallsPerMonth` |
| **QoS Limit** | Limita frecuencia o calidad del servicio | `qos.dashboard.refresh` = 30s para FREE |
| **Resource Gate** | Bloquea creación de recursos si se alcanzó el máximo del plan | `devices.max` → 1 para FREE |

### Implementación Actual

**Quota middleware** (`backend/src/middlewares/subscriptionRateLimit.js`):
```js
// Flujo:
1. Obtener Subscription del usuario (crear FREE si no existe)
2. Si currentPeriodEnd expiró → resetear contadores
3. Si apiCallsUsedThisMonth >= apiCallsPerMonth → 429
4. Incrementar apiCallsUsedThisMonth
5. next()
```

**Data Retention Job** (`backend/src/jobs/dataRetentionJob.js`):
```js
// Flujo:
1. Obtener todas las suscripciones ACTIVE
2. Para cada una: purgar AuditLog donde createdAt < NOW() - dataRetentionDays
3. Purga global: Telemetry y Alarm con la retención mínima entre suscripciones activas
```

### Mecanismos Planeados

| Mecanismo | Descripción | Prioridad |
|-----------|-------------|-----------|
| **Capability Gate Middleware** | Middleware genérico que verifica si el usuario tiene una capacidad específica habilitada | Alta |
| **Resource Counter** | Servicio que lleva conteo de recursos consumidos (dispositivos, storage) | Alta |
| **QoS Enforcer** | Middleware que limita frecuencia de refresco según plan | Media |
| **WebSocket Auth** | Verificación de capacidades al establecer conexión WebSocket | Alta |

---

## Capa 4: Tenant Scope

**Middleware**: `tenantScope` — filtra automáticamente las consultas por `userId` para garantizar aislamiento de datos entre usuarios.

Reglas:
- Usuarios autenticados ven SOLO sus datos.
- Usuarios con rol ADMIN/SUPER_ADMIN pueden ver datos de otros usuarios mediante filtros explícitos.
- Usuarios no autenticados (optionalAuth) ven datos públicos.

Ver `backend/src/middlewares/tenant.js`.

---

## Matriz de Autorización (Request → Decisión)

```
Request entrante
  │
  ├─ ¿Tiene JWT válido? ──Sí──→ ¿Token expirado? ──Sí──→ 401 TOKEN_EXPIRED
  │                             │
  │                             ▼ No
  │                           Extraer user del JWT
  │
  ├─ No JWT ──→ ¿Tiene X-API-Key? ──Sí──→ ¿Key válida y activa? ──Sí──→ Extraer user
  │                                         │                          de ApiKey
  │                                         ▼ No
  │                                       401
  │
  └─ Sin auth ──→ ¿Middleware es optionalAuth? ──Sí──→ req.user = null
                       │                              (rutas públicas)
                       ▼ No
                     401
```

Luego:
```
req.user definido
  │
  ├─ ¿requireMinRole? ──Sí──→ ¿userLevel >= minLevel? ──Sí──→ Continuar
  │                                   │
  │                                   ▼ No
  │                                 403
  │
  ├─ ¿checkApiRateLimit? ──Sí──→ ¿sub.isExceeded? ──Sí──→ 429
  │                                   │
  │                                   ▼ No
  │                                 Incrementar contador
  │                                 Continuar
  │
  └─ Sin middleware de capabilities → Continuar (ruta pública o sin restricción)
```

---

## Registro de Decisiones de Autorización

Toda decisión de autorización (grant/deny) se registra en `AuditLog`:

| Acción | Cuándo se registra |
|--------|-------------------|
| `LOGIN_SUCCESS` | Autenticación JWT exitosa |
| `LOGIN_FAILURE` | Credenciales inválidas |
| `API_KEY_USED` | Autenticación via API Key |
| `RATE_LIMIT_EXCEEDED` | 429 por superar cuota mensual |
| `UNAUTHORIZED_ACCESS` | 401 o 403 |
| `QOS_DEGRADE` | Degradación de servicio aplicada |
| `SUBSCRIPTION_CHANGE` | Upgrade/cancel de plan |
