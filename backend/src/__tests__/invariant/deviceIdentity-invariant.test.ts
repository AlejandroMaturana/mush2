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

    it('ningún handler de ruta /devices/:id usa Device.findByPk(req.params.id)', () => {
      const lines = apiSource.split('\n');
      const offendingLines = lines.filter(line =>
        line.includes('Device.findByPk') && line.includes('req.params')
      );
      expect(offendingLines).toHaveLength(0);
    });

    it('todo Device.findByPk en api.js usa un valor entero resuelto, no req.params.id', () => {
      const findByPkLines = apiSource
        .split('\n')
        .filter(line => line.includes('Device.findByPk'));
      for (const line of findByPkLines) {
        expect(line).not.toMatch(/req\.params/);
      }
    });

    it('routes GET /devices/:id busca por deviceId:', () => {
      expect(apiSource).toContain("findOne({ where: { deviceId: req.params.id }");
    });

    it('routes POST /devices/:id/claim busca por deviceId:', () => {
      expect(apiSource).toContain("Device.findOne({ where: { deviceId: req.params.id } }");
    });
  });

  describe('checkDeviceAccess respeta la identidad pública', () => {
    const tenantSource = readSource('middlewares/tenant.js');

    it('resuelve el dispositivo por deviceId (columna pública)', () => {
      expect(tenantSource).toContain("Device.findOne({ where: { deviceId } })");
    });

    it('NO usa Device.findByPk para resolver el dispositivo', () => {
      const findByPkLines = tenantSource
        .split('\n')
        .filter(line => line.includes('findByPk'));
      expect(findByPkLines).toHaveLength(0);
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
