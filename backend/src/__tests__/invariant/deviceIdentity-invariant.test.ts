import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

describe('Invariant: identidad pública de dispositivos', () => {

  describe('Las rutas públicas usan deviceId, no id PK', () => {
    const apiSource = readSource('routes/api.js');

    it('GET /devices/:id usa req.device del middleware, no findByPk directo', () => {
      expect(apiSource).toContain("Device.findByPk(req.device.id");
    });

    it('POST /devices/:id/claim es la única excepción con findByPk(req.params)', () => {
      const lines = apiSource.split('\n');
      const deviceFindByPkInHandlers = lines.filter(line =>
        line.includes('Device.findByPk') && line.includes('req.params')
      );
      expect(deviceFindByPkInHandlers).toHaveLength(1);
      const idx = lines.findIndex(line =>
        line.includes('Device.findByPk') && line.includes('req.params')
      );
      expect(lines.slice(Math.max(0, idx - 10), idx).join(' ')).toContain('claim');
    });

    it('routes GET /devices/:id usa req.device del middleware (findByPk)', () => {
      expect(apiSource).toContain("Device.findByPk(req.device.id");
    });

    it('routes POST /devices/:id/claim intenta findByPk primero, fallback a deviceId', () => {
      expect(apiSource).toContain("Device.findByPk(req.params.id) || await Device.findOne({ where: { deviceId: req.params.id } })");
    });
  });

  describe('checkDeviceAccess resuelve por PK numérica con fallback a deviceId', () => {
    const tenantSource = readSource('middlewares/tenant.js');

    it('intenta Device.findByPk(id) primero (PK numérica del frontend)', () => {
      expect(tenantSource).toMatch(/Device\.findByPk\(\s*id\s*\)/);
    });

    it('fallback a Device.findOne por deviceId si no encuentra por PK', () => {
      expect(tenantSource).toContain("Device.findOne({ where: { deviceId: id } })");
    });
  });

  describe('canAccessDevice en telegram.js respeta la identidad pública', () => {
    const telegramSource = readSource('routes/telegram.js');

    it('resuelve por deviceId, no por PK', () => {
      expect(telegramSource).toContain("Device.findOne({ where: { deviceId } })");
    });

    it('UserChamberAccess en telegram.js usa device.id, no deviceId string', () => {
      expect(telegramSource).toContain("deviceId: device.id");
    });
  });

  describe('ciclos en cycles.js respetan la identidad pública', () => {
    const cyclesSource = readSource('routes/cycles.js');

    it('resuelve deviceId desde req.body por columna deviceId', () => {
      expect(cyclesSource).toContain("Device.findOne({ where: { deviceId } })");
    });
  });
});
