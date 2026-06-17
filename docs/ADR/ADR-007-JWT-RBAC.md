# ADR-007: Autenticación basada en JWT con RBAC para control de acceso

**Fecha**: 2026-06-14
**Estado**: Aceptado

## Contexto
El sistema tiene un dashboard web desde donde los operadores consultan telemetría, gestionan ciclos de cultivo, envían comandos a actuadores y administran recetas. Distintos usuarios tienen distintos niveles de responsabilidad: un administrador configura cámaras y especies, un operador monitorea ciclos activos y responde a alarmas, y un eventual cliente podría requerir acceso de solo lectura a una cámara específica. Sin control de acceso, cualquier persona con acceso al dashboard podría modificar recetas o activar relés, comprometiendo cultivos vivos. Adicionalmente, Fase 6 introdujo multi-tenencia: un usuario solo debe ver las cámaras que le pertenecen.

## Decisión
Usar **JSON Web Tokens (JWT)** para autenticación sin estado y **Role-Based Access Control (RBAC)** con cuatro roles jerárquicos (`ADMIN`, `OPERATOR`, `VIEWER`, `TENANT`), combinado con un middleware de tenencia que filtra recursos por `userId` y una tabla de membresía `UserChamberAccess` para control de acceso a nivel de cámara.

## Motivos

### JWT sobre sesiones tradicionales
1. **Sin estado en el servidor**: El backend no necesita almacenar sesiones en memoria o en base de datos. El token contiene toda la información necesaria (userId, role, tenant) firmada criptográficamente. En un despliegue con múltiples instancias del backend, no hay que compartir estado de sesión entre ellas.
2. **Expiración y refresco incorporados**: Un access token de vida corta (15 minutos) limita la ventana de exposición si se filtra. Un refresh token de vida larga (7 días) permite renovar sin reautenticación. La revocación se implementa con una blacklist en base de datos para refresh tokens.
3. **Librerías maduras y ligeras**: `jsonwebtoken` en Node.js no requiere dependencias externas como Redis (necesario para sesiones distribuidas). La validación es una operación criptográfica de microsegundos.
4. **Transporte en header estándar**: `Authorization: Bearer <token>` funciona con Axios en el frontend, Postman para testing manual, y cualquier cliente HTTP.

### RBAC sobre listas de control de acceso (ACL)
5. **Modelo mental simple**: Cuatro roles con jerarquía clara. Un `ADMIN` hereda todos los permisos de `OPERATOR`, que hereda los de `VIEWER`. No hay que definir permisos granulares por endpoint (aunque el sistema lo permite si se necesita en el futuro).
6. **Middleware declarativo**: Una ruta se protege con `requireRole('OPERATOR')` y el middleware resuelve en una línea. No hay lógica de permisos dispersa en controladores.
7. **Extensible a permisos finos**: La tabla `RolePermissions` permite añadir permisos específicos (`recipes:write`, `actuators:override`) sin cambiar la jerarquía base.

### Tenencia por UserChamberAccess
8. **Aislamiento de datos multi-cámara**: Un usuario `TENANT` con acceso a la cámara A no puede ver telemetría de la cámara B. El middleware de tenencia inyecta `userId` en el request y todos los queries filtran por las cámaras accesibles vía `UserChamberAccess`.
9. **Tabla de membresía explícita**: `UserChamberAccess` (userId, chamberId, grantedBy, grantedAt) permite auditoría completa de quién dio acceso a quién y a qué cámara.

## Consecuencias
- **Los tokens JWT no se pueden revocar individualmente antes de su expiración**: Si un token es robado, el atacante tiene acceso hasta que expire (15 minutos). Para comandos críticos (activar relé), se mitiga requiriendo confirmación adicional o refresh token vigente. La blacklist de refresh tokens en base de datos permite revocar sesiones completas.
- **El payload del JWT viaja en texto plano (base64 decodificable)**: No debe contener información sensible. Solo `userId`, `role`, `tenant`. La firma (HMAC-SHA256 o RSA) garantiza integridad, no confidencialidad. Si se requiere confidencialidad, se usa JWE (JSON Web Encryption), pero añade complejidad innecesaria para este caso.
- **El middleware de tenencia añade una consulta a DB por request**: Resolver `UserChamberAccess` en cada request autenticado añade latencia. Se mitiga con un caché en memoria con TTL de 60 segundos (invalidado cuando se modifica la membresía).
- **La tabla UserChamberAccess debe mantenerse**: Cuando se elimina un usuario o una cámara, las filas correspondientes deben limpiarse (ON DELETE CASCADE). Si un administrador abandona el sistema, sus membresías otorgadas deben reasignarse.
- **Complejidad de testing**: Probar endpoints protegidos requiere generar tokens válidos con roles específicos. Se automatiza con un helper `generateTestToken(role, chambers)` en el entorno de testing.

## Alternativas descartadas
- **OAuth 2.0 con proveedor externo (Google, GitHub)**: Descartado en Fase 5 porque añade dependencia de un tercero para login, requiere configuración de aplicación OAuth, y complica la experiencia de desarrollo local. Se mantiene como opción futura para login social, pero no como mecanismo primario.
- **API Keys por usuario**: Simple pero inseguro. Las keys se transmiten en cada request, no expiran, y si se filtran comprometen acceso permanente. No hay concepto de sesión ni refresh.
- **Sesiones con cookies y almacenamiento en Redis**: Añade una dependencia de infraestructura (Redis) y complica despliegues multi-instancia. Las sesiones en memoria no sobreviven a reinicios del backend. JWT resuelve esto sin estado adicional.
- **Pasaporte.js con estrategia local**: Pasaporte es excelente para autenticación multicanal, pero para un sistema con login usuario/contraseña propio, la abstracción añade configuración innecesaria. La implementación directa con `jsonwebtoken` + `bcrypt` es más transparente y depurable.

## Detalle técnico

### Jerarquía de roles
```
ADMIN
 ├── OPERATOR
 │    └── VIEWER
 └── TENANT (rol especial: ve solo sus cámaras asignadas)
```

| Rol | Permisos |
|-----|----------|
| `ADMIN` | CRUD de usuarios, cámaras, especies, recetas. Ver todos los ciclos y telemetría. Configuración del sistema. |
| `OPERATOR` | Iniciar/detener ciclos de cultivo. Responder alarmas. Enviar comandos a actuadores. Ver telemetría de cámaras asignadas. |
| `VIEWER` | Solo lectura: telemetría, dashboards, ciclos activos. No puede modificar ni enviar comandos. |
| `TENANT` | Como VIEWER, pero restringido exclusivamente a las cámaras donde tiene UserChamberAccess. |

### Flujo de autenticación
```
1. POST /api/auth/login { email, password }
   → Backend valida credenciales con bcrypt
   → Genera accessToken (15 min) + refreshToken (7 días)
   → Guarda refreshToken en DB (hashed)
   → Responde { accessToken, refreshToken, user: { id, name, role } }

2. Frontend almacena accessToken en memoria (variable JS, no localStorage)
   y refreshToken en httpOnly cookie (Set-Cookie desde backend)

3. Cada request subsecuente envía Authorization: Bearer <accessToken>

4. Cuando el accessToken expira (401):
   → POST /api/auth/refresh (con cookie httpOnly que contiene refreshToken)
   → Backend valida refreshToken contra DB
   → Si es válido y no está en blacklist, emite nuevo accessToken
   → Si no, redirige a login

5. POST /api/auth/logout
   → Invalida refreshToken (lo añade a blacklist en DB)
   → Limpia cookie httpOnly
```

### Implementación de generación de tokens
```javascript
// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

async function login(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new AuthError('Credenciales inválidas');
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError('Credenciales inválidas');
  
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'mush2-backend',
      audience: 'mush2-api'
    }
  );
}

async function generateRefreshToken(user) {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    revoked: false
  });
  
  return token;  // Se envía el token plano; el hash se guarda en DB
}

async function refreshAccessToken(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = await RefreshToken.findOne({ 
    where: { tokenHash, revoked: false },
    include: [{ model: User, as: 'user' }]
  });
  
  if (!stored || stored.expiresAt < new Date()) {
    throw new AuthError('Refresh token inválido o expirado');
  }
  
  return generateAccessToken(stored.user);
}

async function logout(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshToken.update(
    { revoked: true },
    { where: { tokenHash } }
  );
}
```

### Middleware de autenticación y autorización
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const token = header.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'mush2-backend',
      audience: 'mush2-api'
    });
    req.user = decoded;  // { sub, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Jerarquía: ADMIN > OPERATOR > VIEWER
    const roleHierarchy = ['VIEWER', 'TENANT', 'OPERATOR', 'ADMIN'];
    const userLevel = roleHierarchy.indexOf(req.user.role);
    const requiredLevel = Math.min(...roles.map(r => roleHierarchy.indexOf(r)));
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
}

// Middleware de tenencia: inyecta cámaras accesibles
async function injectAccessibleChambers(req, res, next) {
  if (!req.user) return next();
  
  // ADMIN ve todas las cámaras
  if (req.user.role === 'ADMIN') {
    const { Chamber } = require('../models');
    const chambers = await Chamber.findAll({ attributes: ['id'] });
    req.accessibleChamberIds = chambers.map(c => c.id);
    return next();
  }
  
  // Otros roles: solo cámaras en UserChamberAccess
  const { UserChamberAccess } = require('../models');
  const accesses = await UserChamberAccess.findAll({
    where: { userId: req.user.sub },
    attributes: ['chamberId']
  });
  req.accessibleChamberIds = accesses.map(a => a.chamberId);
  
  if (req.accessibleChamberIds.length === 0) {
    return res.status(403).json({ error: 'Sin acceso a ninguna cámara' });
  }
  
  next();
}

module.exports = { authenticate, requireRole, injectAccessibleChambers };
```

### Uso en rutas
```javascript
// routes/api.js
const { authenticate, requireRole, injectAccessibleChambers } = require('../middleware/auth');

// Rutas públicas
router.post('/api/auth/login', authController.login);
router.post('/api/auth/refresh', authController.refresh);
router.post('/api/auth/logout', authenticate, authController.logout);

// Rutas protegidas: todo autenticado
router.get('/api/telemetry', 
  authenticate, 
  injectAccessibleChambers, 
  telemetryController.getTelemetry
);

// Solo OPERATOR o ADMIN pueden enviar comandos
router.patch('/api/actuator/:id', 
  authenticate, 
  requireRole('OPERATOR', 'ADMIN'), 
  injectAccessibleChambers,
  actuatorController.updateState
);

// Solo ADMIN puede gestionar usuarios
router.post('/api/users', 
  authenticate, 
  requireRole('ADMIN'), 
  userController.create
);
```

### Modelo de permisos (extensible)
```sql
-- Tabla de roles base
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,  -- 'ADMIN', 'OPERATOR', 'VIEWER', 'TENANT'
  description TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Permisos granulares (no implementados aún, estructura preparada)
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(50) NOT NULL,   -- 'telemetry', 'actuators', 'recipes', 'users'
  action VARCHAR(50) NOT NULL,      -- 'read', 'write', 'delete'
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Asignación de permisos a roles
CREATE TABLE role_permissions (
  "roleId" INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  "permissionId" INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY ("roleId", "permissionId")
);
```

### Tabla de membresía de cámara
```sql
CREATE TABLE user_chamber_access (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
  "chamberId" INTEGER REFERENCES chambers(id) ON DELETE CASCADE,
  "grantedBy" INTEGER REFERENCES users(id),  -- Admin que otorgó el acceso
  "grantedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "chamberId")
);
```

---
