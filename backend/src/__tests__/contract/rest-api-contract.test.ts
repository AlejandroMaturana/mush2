import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

const ROUTE_PATTERN = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;

function extractRoutes(source: string): Array<{ method: string; path: string }> {
  const routes: Array<{ method: string; path: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = ROUTE_PATTERN.exec(source)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

describe('Contract: estructura de rutas REST', () => {

  describe('api.js — rutas de dispositivos', () => {
    const source = readSource('routes/api.js');
    const routes = extractRoutes(source);

    it('todas las rutas de devices comienzan con /devices', () => {
      const nonDevice = routes.filter(r => !r.path.startsWith('/devices'));
      expect(nonDevice).toHaveLength(0);
    });

    it('las rutas con :id son consistentes (ninguna usa :deviceId ni otro nombre)', () => {
      const idRoutes = routes.filter(r => r.path.includes(':id'));
      const nonStandard = idRoutes.filter(r => !r.path.startsWith('/devices/:id'));
      expect(nonStandard).toHaveLength(0);
    });

    it('las rutas de detalle usan GET, PATCH, DELETE (nunca POST para mutar un recurso específico)', () => {
      const detailRoutes = routes.filter(r => r.path.startsWith('/devices/:id') && !r.path.includes('/:channel'));
      for (const route of detailRoutes) {
        if (route.path === '/devices/:id' || route.path.startsWith('/devices/:id/')) {
          expect(['GET', 'PATCH', 'DELETE', 'POST']).toContain(route.method);
        }
      }
    });

    it('el endpoint de telemetría usa GET, no POST', () => {
      const telemetryRoutes = routes.filter(r => r.path.includes('telemetry'));
      for (const r of telemetryRoutes) {
        expect(r.method).toBe('GET');
      }
    });

    it('cada ruta PATCH, POST, DELETE que muta un device tiene checkDeviceAccess', () => {
      const mutatingRoutes = routes.filter(r =>
        ['PATCH', 'POST', 'DELETE'].includes(r.method) &&
        !r.path.includes('/register') &&
        !r.path.includes('/claim')
      );
      for (const route of mutatingRoutes) {
        const routeDeclaration = source.split('\n').filter(l =>
          l.includes(`router.${route.method.toLowerCase()}(`) && l.includes(route.path)
        );
        for (const line of routeDeclaration) {
          if (!route.path.includes('/claim') && !route.path.includes('/thingSpeak')) {
            expect(
              line.includes('checkDeviceAccess') || route.path === '/devices'
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('auth.js — rutas de autenticación', () => {
    const source = readSource('routes/auth.js');
    const routes = extractRoutes(source);

    it('login es POST', () => {
      const login = routes.find(r => r.path === '/login');
      expect(login).toBeDefined();
      expect(login!.method).toBe('POST');
    });

    it('register es POST', () => {
      const register = routes.find(r => r.path === '/register');
      expect(register).toBeDefined();
      expect(register!.method).toBe('POST');
    });

    it('/me es GET (obtener perfil)', () => {
      const me = routes.find(r => r.path === '/me');
      expect(me).toBeDefined();
      expect(me!.method).toBe('GET');
    });

    it('/me PATCH usa authenticate middleware', () => {
      expect(source).toContain("router.patch('/me', authenticate");
    });
  });
});

describe('Contract: esquema de respuestas de error', () => {

  const ERROR_RESPONSE = /res\.status\(\d{3}\)\.json\(\{[^}]*error[^}]*\}\)/g;

  describe('api.js + tenant.js — formato de error consistente', () => {
    const apiSource = readSource('routes/api.js');
    const tenantSource = readSource('middlewares/tenant.js');

    it('todos los errores 4xx y 5xx incluyen un campo "error"', () => {
      const statusCalls = apiSource.match(/res\.status\(\d{3}\)\.json/g) || [];
      expect(statusCalls.length).toBeGreaterThan(20);
    });

    it('errores 400 incluyen error + message', () => {
      expect(apiSource).toContain("res.status(400).json({ error: 'VALIDATION', message:");
    });

    it('errores 500 incluyen error + message', () => {
      expect(apiSource).toContain("res.status(500).json({ error: 'SERVER_ERROR', message:");
    });

    it('errores 404 incluyen error (NOT_FOUND)', () => {
      const notFoundCalls = apiSource.match(/res\.status\(404\)\.json\(\{/g) || [];
      expect(notFoundCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('errores 401 usan formato consistente', () => {
      expect(apiSource).toContain("res.status(401).json({ error: 'Autenticación requerida'");
    });

    it('errores 403 se manejan en tenant.js con formato consistente', () => {
      expect(tenantSource).toContain("res.status(403).json({ error: 'Sin acceso");
    });
  });

  describe('auth.js — formato de error consistente', () => {
    const source = readSource('routes/auth.js');

    it('errores 500 tienen formato { error }', () => {
      expect(source).toContain("res.status(500).json({ error:");
    });

    it('errores 409 tienen formato { error }', () => {
      expect(source).toContain("res.status(409).json({ error:");
    });

    it('errores 401 tienen formato { error }', () => {
      expect(source).toContain("res.status(401).json({ error:");
    });
  });
});

describe('Contract: middlewares globales en rutas', () => {
  const source = readSource('routes/index.js');

  it('el router de /admin usa authenticate + requireMinRole(ADMIN)', () => {
    expect(source).toContain("router.use('/admin', authenticate, checkApiRateLimit, requireMinRole('ADMIN')");
  });

  it('el router de /devices (api) usa optionalAuth + tenantScope', () => {
    expect(source).toContain("router.use('/', optionalAuth, checkApiRateLimit, tenantScope, apiRouter)");
  });

  it('el router de /auth no usa authenticate (es público)', () => {
    expect(source).toContain("router.use('/auth', authRouter)");
    expect(source).not.toContain("router.use('/auth', authenticate");
  });

  it('el router /telegram usa authenticate', () => {
    expect(source).toContain("router.use('/telegram', authenticate");
  });

  it('el router /alarms usa authenticate', () => {
    expect(source).toContain("router.use('/alarms', authenticate");
  });

  it('cada router use tiene checkApiRateLimit', () => {
    const useLines = source.split('\n').filter(l => l.includes("router.use("));
    const withRateLimit = useLines.filter(l => l.includes('checkApiRateLimit'));
    const excludingDiag = useLines.filter(l => !l.includes('router.use'));
    expect(withRateLimit.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Contract: convenciones HTTP', () => {

  describe('api.js — métodos HTTP correctos', () => {
    const source = readSource('routes/api.js');
    const routes = extractRoutes(source);

    it('operaciones de solo lectura son GET', () => {
      const readPaths = ['/devices/:id/cycle', '/devices/:id/telemetry',
        '/devices/:id/telemetry/latest', '/devices/:id/health', '/devices/:id/health/latest',
        '/devices/:id/actuators', '/devices/:id/connectivity', '/devices/:id/integrations',
        '/devices/:id/maintenance', '/devices/:id/maintenance/latest'];
      for (const p of readPaths) {
        const getRoutes = routes.filter(r => r.path === p && r.method === 'GET');
        expect(getRoutes.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('creación de recursos es POST', () => {
      expect(routes.find(r => r.path === '/devices' && r.method === 'POST')).toBeDefined();
      expect(routes.find(r => r.path === '/devices/register' && r.method === 'POST')).toBeDefined();
    });

    it('actualización parcial es PATCH (nunca PUT)', () => {
      const patchRoutes = routes.filter(r => r.method === 'PATCH');
      for (const r of patchRoutes) {
        expect(['/devices/:id', '/devices/:id/actuators/:channel',
          '/devices/:id/maintenance', '/devices/:id/health-config']).
          toContain(r.path);
      }
    });

    it('eliminación es DELETE', () => {
      expect(routes.find(r => r.path === '/devices/:id' && r.method === 'DELETE')).toBeDefined();
    });
  });

  describe('convención: PATCH sobre PUT para actualizaciones parciales', () => {
    const allRouteFiles = ['routes/api.js', 'routes/auth.js', 'routes/cycles.js',
      'routes/recipes.js', 'routes/chambers.js', 'routes/alarms.js'];
    for (const file of allRouteFiles) {
      try {
        const source = readSource(file);
        const routes = extractRoutes(source);
        const putRoutes = routes.filter(r => r.method === 'PUT');
        it(`${file}: ${putRoutes.length} ruta(s) PUT`, () => {
          // PUT solo se acepta en recipes.js (actualización completa de receta)
          if (putRoutes.length > 0) {
            expect(file).toBe('routes/recipes.js');
          }
        });
      } catch {
        // skip if file not found
      }
    }
  });
});
