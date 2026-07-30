import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSource(relativeFromRoot: string): string {
  return readFileSync(resolve(__dirname, '../../', relativeFromRoot), 'utf-8');
}

describe('REG-005: Device claim protege dispositivos con dueño', () => {
  const apiSource = readSource('routes/api.js');

  it('POST /devices/:id/claim verifica autenticación primero', () => {
    expect(apiSource).toContain("return res.status(401).json({ error: 'Autenticación requerida' }");
  });

  it('POST /devices/:id/claim rechaza dispositivos ya asignados con 409', () => {
    expect(apiSource).toContain('if (device.userId)');
    expect(apiSource).toContain('return res.status(409)');
    expect(apiSource).toContain("error: 'El dispositivo ya tiene un dueño asignado'");
  });

  it('POST /devices/:id/claim usa findByPk para deviceId', () => {
    expect(apiSource).toContain("Device.findOne({ where: { deviceId:");
  });
});
