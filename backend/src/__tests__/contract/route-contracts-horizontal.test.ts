import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

function extractRoutes(source: string): Array<{ method: string; path: string }> {
  const pattern = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;
  const routes: Array<{ method: string; path: string }> = [];
  let match;
  while ((match = pattern.exec(source)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

describe('Horizontal: auth.js', () => {
  const source = readSource('routes/auth.js');
  const routes = extractRoutes(source);

  it('register y login son POST públicos', () => {
    const register = routes.find(r => r.path === '/register');
    expect(register?.method).toBe('POST');
    const login = routes.find(r => r.path === '/login');
    expect(login?.method).toBe('POST');
    const refresh = routes.find(r => r.path === '/refresh');
    expect(refresh?.method).toBe('POST');
  });

  it('/me de solo lectura es GET', () => {
    const me = routes.find(r => r.path === '/me' && r.method === 'GET');
    expect(me).toBeDefined();
  });

  it('actualización de /me es PATCH', () => {
    const patchMe = routes.find(r => r.path === '/me' && r.method === 'PATCH');
    expect(patchMe).toBeDefined();
  });

  it('logout requiere authenticate y es POST', () => {
    const logout = routes.find(r => r.path === '/logout');
    expect(logout?.method).toBe('POST');
    expect(source).toContain("router.post('/logout', authenticate");
  });

  it('respuesta de login usa error + Credenciales inválidas', () => {
    expect(source).toContain("error: 'Credenciales inválidas'");
  });

  it('respuesta 409 registro duplicado', () => {
    expect(source).toContain("error: 'El usuario ya existe'");
    expect(source).toContain("error: 'El email ya está registrado'");
  });

  it('refresh token maneja token inválido', () => {
    expect(source).toContain("error: 'Refresh token inválido o expirado'");
  });
});

describe('Horizontal: alarms.js', () => {
  const source = readSource('routes/alarms.js');
  const routes = extractRoutes(source);

  it('listado y stats son GET con authenticate', () => {
    const list = routes.find(r => r.path === '/');
    expect(list?.method).toBe('GET');
    const stats = routes.find(r => r.path === '/stats');
    expect(stats?.method).toBe('GET');
    expect(source).toContain("router.get('/', authenticate");
    expect(source).toContain("router.get('/stats', authenticate");
  });

  it('acknowledge y resolve son PATCH con authenticate', () => {
    const ack = routes.find(r => r.path === '/:id/acknowledge');
    expect(ack?.method).toBe('PATCH');
    const resolve = routes.find(r => r.path === '/:id/resolve');
    expect(resolve?.method).toBe('PATCH');
  });

  it('error 404 usa NOT_FOUND + message', () => {
    expect(source).toContain("error: 'NOT_FOUND'");
    expect(source).toContain("message: 'Alarma no encontrada'");
  });

  it('error 400 alarma ya resuelta', () => {
    expect(source).toContain("error: 'Alarma ya resuelta'");
  });
});

describe('Horizontal: admin.js', () => {
  const source = readSource('routes/admin.js');

  it('todas las rutas requieren authenticate + requireMinRole', () => {
    expect(source).toContain("router.get('/users', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.get('/users/:id', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.get('/audit-logs', authenticate, requireMinRole('ADMIN')");
  });

  it('cambio de rol requiere SUPER_ADMIN', () => {
    expect(source).toContain("router.patch('/users/:id/role', authenticate, requireMinRole('SUPER_ADMIN')");
  });

  it('toggle-active requiere ADMIN', () => {
    expect(source).toContain("router.patch('/users/:id/toggle-active', authenticate, requireMinRole('ADMIN')");
  });

  it('error 404 usuario no encontrado', () => {
    expect(source).toContain("error: 'Usuario no encontrado'");
  });

  it('error 400 rol inválido', () => {
    expect(source).toContain("error: 'Rol inválido'");
  });
});

describe('Horizontal: species.js', () => {
  const source = readSource('routes/species.js');
  const routes = extractRoutes(source);

  it('operaciones de solo lectura son GET sin authenticate obligatorio', () => {
    expect(routes.filter(r => r.path === '/').some(r => r.method === 'GET')).toBe(true);
    expect(routes.filter(r => r.path === '/:id').some(r => r.method === 'GET')).toBe(true);
  });

  it('mutaciones (POST/PUT/DELETE) verifican req.user inline', () => {
    expect(source).toContain("if (!req.user)");
    expect(source).toContain("return res.status(401).json({ error: 'Autenticación requerida' })");
  });

  it('error 404 especie no encontrada', () => {
    expect(source).toContain("error: 'NOT_FOUND'");
    expect(source).toContain("message: 'Especie no encontrada'");
  });
});

describe('Horizontal: cycles.js', () => {
  const source = readSource('routes/cycles.js');
  const routes = extractRoutes(source);

  it('listado y detalle son GET', () => {
    expect(routes.filter(r => r.path === '/').some(r => r.method === 'GET')).toBe(true);
    expect(routes.filter(r => r.path === '/:id').some(r => r.method === 'GET')).toBe(true);
  });

  it('creación es POST con validación de auth', () => {
    expect(routes.filter(r => r.path === '/').some(r => r.method === 'POST')).toBe(true);
    expect(source).toContain("if (!req.user)");
  });

  it('abort es POST', () => {
    const abort = routes.find(r => r.path === '/:id/abort');
    expect(abort?.method).toBe('POST');
    expect(source).toContain("router.post('/:id/abort'");
  });

  it('transición de fase es POST', () => {
    const transition = routes.find(r => r.path === '/:id/transition');
    expect(transition?.method).toBe('POST');
  });

  it('error 403 sin acceso a ciclo', () => {
    expect(source).toContain("error: 'Sin acceso a este ciclo'");
  });

  it('error 404 ciclo no encontrado', () => {
    expect(source).toContain("error: 'NOT_FOUND', message: 'Ciclo no encontrado'");
  });

  it('fases válidas definidas', () => {
    expect(source).toContain('INCUBATION');
    expect(source).toContain('FRUITING');
    expect(source).toContain('MAINTENANCE');
    expect(source).toContain('COMPLETED');
  });
});

describe('Horizontal: actuators.js (device-facing)', () => {
  const source = readSource('routes/actuators.js');
  const routes = extractRoutes(source);

  it('poller de estado es GET', () => {
    const poll = routes.find(r => r.path === '/');
    expect(poll?.method).toBe('GET');
  });

  it('comando directo es PATCH con channel', () => {
    const cmd = routes.find(r => r.path === '/:channel');
    expect(cmd?.method).toBe('PATCH');
  });

  it('deviceId query param requerido en GET', () => {
    expect(source).toContain("error: 'deviceId query param requerido'");
  });

  it('command debe ser ON u OFF', () => {
    expect(source).toContain("command debe ser ON u OFF");
  });

  it('overrideUntil se setea a 5 minutos', () => {
    expect(source).toContain('overrideUntil');
    expect(source).toContain('5 * 60 * 1000');
  });

  it('findOrCreate usado para device y actuator', () => {
    expect(source).toContain('Device.findOrCreate');
    expect(source).toContain('Actuator.findOrCreate');
  });
});

describe('Horizontal: settings.js', () => {
  const source = readSource('routes/settings.js');

  it('profile usa authenticate', () => {
    expect(source).toContain("router.get('/profile', authenticate");
    expect(source).toContain("router.patch('/profile', authenticate");
  });

  it('cambio de password usa authenticate', () => {
    expect(source).toContain("router.post('/change-password', authenticate");
  });

  it('system requiere SUPER_ADMIN', () => {
    expect(source).toContain("router.get('/system', authenticate, requireMinRole('SUPER_ADMIN')");
    expect(source).toContain("router.patch('/system', authenticate, requireMinRole('SUPER_ADMIN')");
  });

  it('system/public es público', () => {
    expect(source).toContain("router.get('/system/public'");
  });

  it('subscripción proxy rutas', () => {
    expect(source).toContain("router.get('/subscription'");
    expect(source).toContain("router.post('/subscription/upgrade'");
    expect(source).toContain("router.delete('/subscription'");
  });

  it('mounts telegram y api-keys como submódulos', () => {
    expect(source).toContain("router.use('/telegram'");
    expect(source).toContain("router.use('/api-keys'");
  });
});

describe('Horizontal: subscriptions.js', () => {
  const source = readSource('routes/subscriptions.js');

  it('planes válidos definidos', () => {
    expect(source).toContain('FREE');
    expect(source).toContain('BASIC');
    expect(source).toContain('PREMIUM');
  });

  it('upgrade valida plan destino', () => {
    expect(source).toContain("error: 'Plan inválido. Usa FREE, BASIC o PREMIUM'");
  });

  it('downgrade no permitido', () => {
    expect(source).toContain("error: 'No puedes downgrade");
  });

  it('admin puede listar todas con ADMIN role', () => {
    expect(source).toContain("router.get('/', authenticate, requireMinRole('ADMIN')");
  });
});

describe('Horizontal: telegram.js', () => {
  const source = readSource('routes/telegram.js');

  it('todas las rutas de telegram llevan authenticate (montado en index.js)', () => {
    expect(source).toContain("router.post('/link', authenticate");
    expect(source).toContain("router.get('/link', authenticate");
    expect(source).toContain("router.post('/unlink', authenticate");
  });

  it('configure y bot-status requieren ADMIN', () => {
    expect(source).toContain("router.post('/configure', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.get('/bot-status', authenticate, requireMinRole('ADMIN')");
  });

  it('error 403 FORBIDDEN definido', () => {
    expect(source).toContain("error: 'FORBIDDEN'");
  });
});

describe('Horizontal: events.js', () => {
  const source = readSource('routes/events.js');
  const routes = extractRoutes(source);

  it('rutas son GET con optionalAuth', () => {
    const list = routes.find(r => r.path === '/');
    expect(list?.method).toBe('GET');
    expect(source).toContain("router.get('/', optionalAuth");
    const device = routes.find(r => r.path === '/device/:deviceId');
    expect(device?.method).toBe('GET');
    expect(source).toContain("router.get('/device/:deviceId', optionalAuth");
  });
});

describe('Horizontal: apiKeys.js', () => {
  const source = readSource('routes/apiKeys.js');

  it('todas las rutas requieren authenticate + ADMIN', () => {
    expect(source).toContain("router.get('/', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.post('/', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.patch('/:id', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.delete('/:id', authenticate, requireMinRole('ADMIN')");
    expect(source).toContain("router.post('/:id/rotate', authenticate, requireMinRole('ADMIN')");
  });

  it('API key generation incluye prefix + hash', () => {
    expect(source).toContain('ApiKey.generateKey');
  });

  it('DELETE es soft (isActive)', () => {
    expect(source).toContain('isActive');
  });
});

describe('Horizontal: monitoring.js', () => {
  const source = readSource('routes/monitoring.js');
  const routes = extractRoutes(source);

  it('rutas de monitoreo son GET públicas', () => {
    const metrics = routes.find(r => r.path === '/metrics');
    expect(metrics?.method).toBe('GET');
    const dbHealth = routes.find(r => r.path === '/health/db');
    expect(dbHealth?.method).toBe('GET');
    const logs = routes.find(r => r.path === '/logs');
    expect(logs?.method).toBe('GET');
    const stream = routes.find(r => r.path === '/stream');
    expect(stream?.method).toBe('GET');
  });

  it('DB health usa sequelize.authenticate', () => {
    expect(source).toContain('sequelize.authenticate');
  });
});

describe('Horizontal: analytics.js (chamber)', () => {
  const source = readSource('routes/analytics.js');
  const routes = extractRoutes(source);

  it('analytics es GET con optionalAuth', () => {
    const analytics = routes.find(r => r.path === '/:chamberId/analytics');
    expect(analytics?.method).toBe('GET');
  });
});
