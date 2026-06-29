# Backend — Mush2

Sistema API REST para gestión de cultivos de hongos adaptógenos. Orquesta dispositivos IoT, recetas de cultivo, telemetría en tiempo real y control ambiental automático.

## 📋 Stack Tecnológico

| Componente | Versión | Propósito |
|---|---|---|
| **Runtime** | Node.js 20+ | JavaScript server runtime |
| **Framework** | Express 5 | Routing, middleware, HTTP |
| **ORM** | Sequelize 6 | PostgreSQL abstraction layer |
| **Database** | PostgreSQL 16 | Persistencia principal |
| **Comunicación** | HTTP (axios) | Comunicación HTTP con firmware |
| **Auth** | jsonwebtoken (JWT) | Autenticación stateless |
| **Seguridad** | bcryptjs, helmet, express-validator | Criptografía, headers, validación |
| **Testing** | Jest + Supertest | Tests unitarios e integración |

## 🚀 Inicio Rápido

### Requisitos

- Node.js 20.x o superior
- PostgreSQL 16.x
- Backend API HTTP (puerto 3797)
- pnpm (gestor de paquetes)

### Instalación

```bash
# 1. Instalar dependencias
cd backend
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales locales:
# - DB_HOST, DB_USER, DB_PASSWORD
# - API_HOST
# - JWT_SECRET (cambiar en producción)

# 3. Sincronizar base de datos
pnpm run db:reset       # Limpia + crea esquema
pnpm run db:seed        # Datos de prueba

# 4. Iniciar servidor
pnpm run dev            # nodemon con hot reload (puerto 3797)
```

## 📚 Estructura del Proyecto

```
src/
├── app.js                    # Configuración Express (middleware, rutas)
├── server.js                 # Entry point (init DB, HTTP, services)
├── config/
│   ├── env.js               # Gestión de variables de entorno
│   └── database.js          # Configuración Sequelize
├── models/                   # ORM Sequelize models
│   ├── index.js
│   ├── User.js
│   ├── Device.js
│   ├── Telemetry.js
│   ├── Recipe.js
│   ├── CultivationCycle.js
│   └── ...
├── routes/                   # Definición de endpoints
│   ├── index.js             # Agregador de rutas
│   ├── auth.js              # Autenticación (login, register, logout)
│   ├── api.js               # Dispositivos, sensores, actuadores
│   ├── recipes.js           # Gestión de recetas y ciclos
│   ├── admin.js             # Endpoints administrativos
│   └── monitoring.js        # Health checks, estado
├── services/                 # Lógica de negocio
│   ├── httpService.js       # Cliente HTTP polling, parseo de respuestas
│   ├── controlEngine.js     # Motor de control ambiental
│   ├── auditService.js      # Logging de acciones
│   ├── encryptionService.js # AES-256 para secretos
│   └── thingSpeakSync.js    # Telemetría backupea ThingSpeak
├── middlewares/              # Middleware Express
│   ├── auth.js              # Autenticación JWT
│   ├── rbac.js              # Control de acceso por rol
│   ├── tenant.js            # Aislamiento de tenants
│   └── errorHandler.js      # Manejo centralizado de errores
└── __tests__/               # Suite de tests
    ├── api.test.js
    ├── rbac.test.js
    └── ...
```

## 🔌 API Endpoints

Documentación completa en [`docs/contracts/api-contract.md`](../../docs/contracts/api-contract.md).

**Ejemplos rápidos:**

```bash
# Autenticación
POST   /api/v1/auth/login         # Obtener JWT token
POST   /api/v1/auth/register      # Crear usuario
POST   /api/v1/auth/logout        # Revoke token
GET    /api/v1/auth/me            # Perfil del usuario

# Dispositivos
GET    /api/v1/devices            # Listar dispositivos
GET    /api/v1/devices/:id        # Detalles
POST   /api/v1/devices/:id/actuators/:channel   # Enviar comando

# Recetas
GET    /api/v1/recipes            # Listar recetas
POST   /api/v1/recipes            # Crear nueva receta
GET    /api/v1/recipes/:id        # Detalles

# Ciclos de cultivo
GET    /api/v1/cycles             # Ciclos activos/históricos
POST   /api/v1/cycles             # Iniciar nuevo ciclo
GET    /api/v1/cycles/:id/states  # Histórico de estados

# Admin
GET    /api/v1/admin/users        # Listar usuarios (ADMIN only)
GET    /api/v1/admin/audit-logs   # Audit trail
```

## 🏗️ Arquitectura

### Flujo de Datos

```
Firmware (ESP32-S3)
    ↓
    │ HTTP Polling (POST /api/v1/telemetry)
    ↓
Backend (Node.js)
    ├→ httpService.js (procesa payloads)
    ├→ Models (persiste en PostgreSQL)
    ├→ Events (emite a controlEngine)
    ├→ controlEngine.js (compara con umbrales)
    └→ Frontend (WebSocket → dashboard)
```

### Modelo de Datos

**Entidades principales:**

- **User** — Usuarios del sistema con roles (ADMIN, USER)
- **Device** — Dispositivos IoT (ESP32-S3) en el terreno
- **Sensor** — Tipos de sensor por dispositivo (temp, humidity, CO2)
- **Telemetry** — Lecturas históricas (timestamp series)
- **Recipe** — Receta de cultivo con thresholds por fase
- **CultivationCycle** — Instancia activa de receta en una cámara
- **CycleState** — Snapshot de estado en punto de evaluación
- **Actuator** — Controladores SSR (relés) para ambiente
- **AuditLog** — Trail de acciones para compliance

**Relaciones:**

```
Recipe (1) ←→ (N) CultivationCycle
CultivationCycle (1) ←→ (N) CycleState
Device (1) ←→ (N) Sensor
Device (1) ←→ (N) Actuator
Device (1) ←→ (N) Telemetry
Sensor (1) ←→ (N) Telemetry
```

### Control Engine

Motor que evalúa cada ciclo activo cada 60s:

1. **Lectura**: Toma telemetría más reciente del dispositivo
2. **Validación**: Compara contra umbrales de la fase actual
3. **Alertas**: Emite alarmas si hay desviaciones (TEMP_HIGH, HUM_LOW, etc)
4. **Transiciones**: Avanza fase si se cumple duración
5. **Persistencia**: Crea snapshot de estado en DB

Estado del ciclo en DB (`CycleState`):

```json
{
  "cycleId": 123,
  "phase": "FRUITING",
  "temperature": 18.5,
  "humidity": 88.2,
  "co2": 1250,
  "voc": 45,
  "snapshotDate": "2026-06-13T10:30:00Z",
  "deviations": ["TEMP_LOW:18.5"]
}
```

## 🔐 Seguridad

### Autenticación

- JWT con algoritmo HS256 (desarrollo) o RS256 (producción)
- Token expira en 24 horas
- Refresh token en httpOnly cookie (opcional)

```bash
# Obtener token
curl -X POST http://localhost:3797/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass123"}'

# Usar token
curl http://localhost:3797/api/v1/devices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Control de Acceso (RBAC)

Roles y permisos:

| Rol | Permisos |
|---|---|
| **ADMIN** | Todas las operaciones, gestión de usuarios, auditoría |
| **USER** | CRUD recetas y ciclos propios, ver dispositivos |
| **VIEWER** | Solo lectura de dispositivos y ciclos |

Middleware `requireMinRole()`:

```javascript
router.get('/admin/users', authenticate, requireMinRole('ADMIN'), controller);
```

### Validación y Sanitización

- Validación de entrada con `express-validator`
- Escapeo automático de XSS
- Prevención de SQL injection (Sequelize parameterized queries)
- Rate limiting: 100 requests/15min en `/api/`
- CORS restrictivo

### Secretos

- **NUNCA** comitear `.env` con valores reales
- Variables sensibles: `JWT_SECRET`, `DB_PASSWORD`, `TS_API_KEY`
- En producción: usar AWS Secrets Manager, Azure Key Vault, o HashiCorp Vault
- Cifrado AES-256 para datos sensibles persistidos

## 🧪 Testing

```bash
# Correr todos los tests
pnpm test

# Modo watch
pnpm run test:watch

# Con cobertura
pnpm run test:coverage

# Un archivo específico
pnpm test src/__tests__/api.test.js
```

**Requisitos:**

- Mínimo 60% cobertura en nuevos archivos
- Tests de error cases (validación, permisos)
- Mocking de HTTP, DB cuando es apropiado

**Ejemplo:**

```javascript
describe('RBAC Middleware', () => {
  it('should deny USER access to admin endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('should allow ADMIN access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

## 📊 Monitoreo y Logs

### Healthcheck

```bash
curl http://localhost:3797/health
# { "status": "ok", "uptime": 3600 }

curl http://localhost:3797/monitoring/health/backend
# { "status": "ok", "http": "reachable" }
```

### Logs

Todos los logs tienen prefijo `[COMPONENT_NAME]`:

```
[DB] Conexión establecida
[HTTP] Conexión con backend establecida
[CONTROL] Cycle 1 avanzó a fase FRUITING
[AUTH] Login exitoso para usuario admin
[ERROR] Telemetria inválida: temperatura fuera de rango
```

**Niveles:**

- `console.log()` — INFO
- `console.warn()` — WARN (recuperable)
- `console.error()` — ERROR (afecta funcionalidad)

## 📦 Comandos Principales

```bash
# Desarrollo
pnpm run dev                # Servidor con nodemon (auto-reload)

# Base de datos
pnpm run db:sync            # Sincronizar modelos (dev only)
pnpm run db:migrate         # Ejecutar migraciones
pnpm run db:seed            # Sembrar datos de prueba
pnpm run db:reset           # Limpiar + recrear DB

# Testing
pnpm test                   # Tests una vez
pnpm run test:watch         # Modo watch
pnpm run test:coverage      # Con reporte de cobertura

# Linting y formato
pnpm run lint               # ESLint
pnpm run format:check       # Verificar formato Prettier
pnpm run format:fix         # Auto-formatear

# Producción
pnpm run build              # Build (si aplica)
pnpm run start              # Iniciar servidor
```

## 🔗 Integración HTTP

Endpoints de comunicación con firmware:

**POST (firmware → backend)**

```
POST /api/v1/telemetry/sensors   → Lectura de sensores
POST /api/v1/telemetry/state     → Estado de actuadores
POST /api/v1/events/boot         → Device boot
POST /api/v1/events/ack          → Confirmación de comando
POST /api/v1/events/alarm        → Alarma del dispositivo
POST /api/v1/state/online        → Status online/offline
```

**GET (firmware → backend polling)**

```
GET /api/v1/devices/[deviceId]/commands   → Comandos pendientes
```

Detalles: [`docs/contracts/api-contract.md`](../../docs/contracts/api-contract.md)

## 📖 Documentación Relacionada

- [`docs/architecture/backend.md`](../../docs/architecture/backend.md) — Arquitectura detallada
- [`docs/contracts/api-contract.md`](../../docs/contracts/api-contract.md) — Especificación de endpoints
- [`docs/contracts/api-contract.md`](../../docs/contracts/api-contract.md) — Protocolo HTTP
- [`docs/governance/coding-standards.md`](../../docs/governance/coding-standards.md) — Estándares de código
- [`docs/deployment.md`](../../docs/deployment.md) — Deployment a producción

## 🐛 Troubleshooting

### "Cannot find module 'sequelize'"

```bash
pnpm install --force
```

### "Database connection refused"

Verifica:
- PostgreSQL está running: `psql -U postgres`
- Variables en `.env.local`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Pool de conexiones no saturado: `SELECT count(*) FROM pg_stat_activity;`

### "HTTP connection timeout"

Verifica:
- Backend está accesible: `curl http://localhost:3797/health`
- Firewall permite puerto HTTP (3797)
- `API_HOST` configurado correctamente en `.env.local`

### "Token invalid"

- JWT_SECRET cambió → redondea session (tokens antiguos inválidos)
- Token expiró → re-login

## 🚢 Deployment

Para ambientes de producción:

- [ ] Cambiar `JWT_SECRET` a valor fuerte (32+ caracteres)
- [ ] Usar `NODE_ENV=production`
- [ ] Configurar base de datos PostgreSQL dedicada
- [ ] Certificados SSL/TLS para HTTPS
- [ ] Comunicación vía HTTPS (TLS)
- [ ] Logging centralizado (ELK, Datadog, CloudWatch)
- [ ] Monitoreo de salud (healthchecks cada 30s)
- [ ] Backups automáticos de DB (diarios)

Ver [`docs/deployment.md`](../../docs/deployment.md) para detalles.

## 📄 Licencia

MIT — Ver [`LICENSE`](../../LICENSE)

---

**Última actualización:** 2026-06-13  
**Versión:** 0.1.0  
**Mantenedores:** [@team](https://github.com/mush2)

