import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

describe('Invariant: ownership de dispositivos', () => {

  describe('checkDeviceAccess en tenant.js', () => {
    const source = readSource('middlewares/tenant.js');

    it('valida ownership comparando device.userId con req.user.id', () => {
      expect(source).toContain('device.userId === req.user.id');
    });

    it('devuelve 401 si el dispositivo tiene dueño y no hay req.user', () => {
      expect(source).toContain('401');
      expect(source).toContain('Autenticación requerida');
    });

    it('devuelve 403 si el usuario no tiene acceso via UserChamberAccess', () => {
      expect(source).toContain('403');
      expect(source).toContain('Sin acceso a este dispositivo');
    });

    it('devuelve 404 si el dispositivo no existe', () => {
      expect(source).toContain('404');
      expect(source).toContain('Dispositivo no encontrado');
    });

    it('los dispositivos legacy (sin userId) son accesibles por cualquier usuario autenticado', () => {
      expect(source).toContain('!device.userId');
    });
  });

  describe('ninguna ruta muta dispositivos sin pasar por checkDeviceAccess', () => {
    const apiSource = readSource('routes/api.js');

    const mutatingRoutes = [
      { method: 'PATCH', path: "'/devices/:id'" },
      { method: 'PATCH', path: "'/devices/:id/actuators/:channel'" },
      { method: 'PATCH', path: "'/devices/:id/maintenance'" },
      { method: 'PATCH', path: "'/devices/:id/health-config'" },
      { method: 'DELETE', path: "'/devices/:id'" },
      { method: 'POST', path: "'/devices/:id/integrations/thingspeak'" },
    ];

    for (const route of mutatingRoutes) {
      it(`${route.method} ${route.path} tiene checkDeviceAccess antes del handler`, () => {
        const pattern = new RegExp(
          `router\\.${route.method.toLowerCase()}\\(${route.path}, checkDeviceAccess`
        );
        expect(apiSource).toMatch(pattern);
      });
    }
  });
});
