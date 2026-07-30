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

  it('busca por deviceId (columna), no por id (PK) en Device.findOne', () => {
    expect(source).toContain("Device.findOne({ where: { deviceId } })");
  });

  it('NO usa Device.findByPk(deviceId) en checkDeviceAccess', () => {
    const checkDeviceAccessLines = source
      .split('\n')
      .filter(line => line.includes('checkDeviceAccess') || line.includes('findByPk'));
    const linesWithFindByPk = checkDeviceAccessLines.filter(line => line.includes('findByPk'));
    expect(linesWithFindByPk).toHaveLength(0);
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
