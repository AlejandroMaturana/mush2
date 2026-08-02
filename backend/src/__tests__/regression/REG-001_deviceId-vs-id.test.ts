import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

describe('REG-001: deviceId vs id — checkDeviceAccess', () => {
  const source = readSource('middlewares/tenant.js');

  it('usa Device.findOne({ where: { deviceId } }) para resolver por deviceId', () => {
    expect(source).toContain("const device = await Device.findOne({ where: { deviceId } });");
  });

  it('no usa findByPk(id) con req.params.id como PK numérica', () => {
    expect(source).not.toMatch(/Device\.findByPk\(/);
  });

  it('UserChamberAccess busca por device.id (integer PK), no por deviceId string', () => {
    expect(source).toContain("deviceId: device.id");
  });

  it('NO pasa deviceId string directo a UserChamberAccess.findOne', () => {
    const lines = source.split('\n');
    const ucaIndex = lines.findIndex(line =>
      line.includes('UserChamberAccess') && line.includes('findOne')
    );
    expect(ucaIndex).toBeGreaterThanOrEqual(0);
    const block = lines.slice(ucaIndex, ucaIndex + 3).join(' ');
    expect(block).not.toMatch(/deviceId[,\s]/);
    expect(block).toContain('device.id');
  });
});
