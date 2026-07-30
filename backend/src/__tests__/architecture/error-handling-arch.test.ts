import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROUTES_DIR = resolve(__dirname, '../../routes');

function readSource(relativeFromRoot: string): string {
  return readFileSync(resolve(__dirname, '../../', relativeFromRoot), 'utf-8');
}

describe('ARCH-001: Error handling en route handlers', () => {
  const routeFiles = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  for (const file of routeFiles) {
    const source = readSource(`routes/${file}`);
    const handlerCount = (source.match(/async\s*\(req,\s*res\)/g) || []).length;
    const tryCatchCount = (source.match(/try\s*\{/g) || []).length;

    it(`${file}: todos los handlers async tienen try/catch (${handlerCount} handlers, ${tryCatchCount} try)`, () => {
      if (handlerCount > 0) {
        expect(tryCatchCount).toBeGreaterThanOrEqual(handlerCount);
      }
    });
  }
});

describe('ARCH-002: Sin console.log en producción', () => {
  const routeFiles = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  for (const file of routeFiles) {
    const source = readSource(`routes/${file}`);

    it(`${file}: sin console.log ni console.error`, () => {
      const lines = source.split('\n').filter(l => l.includes('console.'));
      const allowed = lines.filter(l =>
        l.includes('console.log') || l.includes('console.error') || l.includes('console.warn')
      );
      expect(allowed).toHaveLength(0);
    });
  }
});

describe('ARCH-003: Servicios exportan funciones nombradas', () => {
  const servicesDir = resolve(__dirname, '../../services');
  if (existsSync(servicesDir)) {
    const serviceFiles = readdirSync(servicesDir).filter(f => f.endsWith('.js'));

    for (const file of serviceFiles) {
      const source = readSource(`services/${file}`);

      it(`${file}: usa export function, export const, export class o export {`, () => {
        const hasExport = /export\s+(function|const|let|default\s+(class|function)|async\s+function|\{)/.test(source);
        expect(hasExport).toBe(true);
      });
    }
  }
});

describe('ARCH-004: checkDeviceAccess usado en rutas mutantes de devices', () => {
  const apiSource = readSource('routes/api.js');

  it('PATCH /devices/:id usa checkDeviceAccess', () => {
    expect(apiSource).toContain("router.patch('/devices/:id', checkDeviceAccess");
  });

  it('DELETE /devices/:id usa checkDeviceAccess', () => {
    expect(apiSource).toContain("router.delete('/devices/:id', checkDeviceAccess");
  });

  it('POST /devices/:id/claim NO usa checkDeviceAccess (verifica userId manualmente)', () => {
    const claimLine = apiSource.match(/router\.post\('\/devices\/:id\/claim'[\s\S]*?\);/);
    expect(claimLine).not.toBeNull();
    if (claimLine) {
      expect(claimLine[0]).not.toContain('checkDeviceAccess');
    }
  });
});

describe('ARCH-005: Formatos de respuesta consistentes', () => {
  const indexSource = readSource('routes/index.js');

  it('index.js usa router.use (no app.use) para montar rutas', () => {
    expect(indexSource).not.toContain('app.use');
  });

  it('no hay rutas montadas con app en ningún archivo de rutas', () => {
    const routeFiles = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
    for (const file of routeFiles) {
      const source = readSource(`routes/${file}`);
      expect(source).not.toMatch(/app\.(get|post|put|patch|delete|use)/);
    }
  });
});
