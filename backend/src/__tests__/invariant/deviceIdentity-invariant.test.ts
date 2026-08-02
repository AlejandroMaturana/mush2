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
      expect(apiSource).toContain("const actuators = await Actuator.findAll({ where: { deviceId: req.device.id } });");
    });

    it('POST /devices/:id/claim es la única excepción que consulta Device por req.params', () => {
      const lines = apiSource.split('\n');
      const deviceFindOneInHandlers = lines.filter(line =>
        line.includes('Device.findOne') && line.includes('req.params')
      );
      expect(deviceFindOneInHandlers).toHaveLength(1);
      const idx = lines.findIndex(line =>
        line.includes('Device.findOne') && line.includes('req.params')
      );
      expect(lines.slice(Math.max(0, idx - 10), idx).join(' ')).toContain('claim');
    });

    it('routes POST /devices/:id/claim resuelve por deviceId, no por PK integer', () => {
      expect(apiSource).toContain("const device = await Device.findOne({ where: { deviceId: req.params.id } });");
    });
  });

  describe('checkDeviceAccess resuelve por deviceId, no por PK numérica', () => {
    const tenantSource = readSource('middlewares/tenant.js');

    it('intenta Device.findOne({ where: { deviceId } })', () => {
      expect(tenantSource).toContain("const device = await Device.findOne({ where: { deviceId } });");
    });

    it('no usa findByPk con req.params.id', () => {
      expect(tenantSource).not.toMatch(/Device\.findByPk\(/);
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
