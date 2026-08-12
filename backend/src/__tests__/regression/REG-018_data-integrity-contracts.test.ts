import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-018: Data Integrity & Contracts (PR-C: I6/I12)', () => {
  const api = readProjectFile('backend/src/routes/api.js');
  const alarms = readProjectFile('backend/src/routes/alarms.js');
  const events = readProjectFile('backend/src/routes/events.js');
  const modelsIndex = readProjectFile('backend/src/models/index.js');

  describe('I006 — DELETE /devices/:id transaccional con cascada', () => {
    it('el handler de DELETE usa sequelize.transaction (atomicidad)', () => {
      const deleteHandler = api.split('router.delete');
      // El primer bloque router.delete encontrado con el comentario del bloque
      const handlerMatches = api.match(/router\.delete\('\/devices\/:id'[\s\S]*?\n\}\);/);
      expect(handlerMatches).not.toBeNull();
      expect(handlerMatches![0]).toContain('sequelize.transaction');
    });

    it('borra Event, Alarm, Sensor y TelegramDeviceConfig dentro del DELETE de devices', () => {
      const handlerMatches = api.match(/router\.delete\('\/devices\/:id'[\s\S]*?\n\}\);/);
      expect(handlerMatches).not.toBeNull();
      const handler = handlerMatches![0];
      expect(handler).toContain('Event.destroy');
      expect(handler).toContain('Alarm.destroy');
      expect(handler).toContain('Sensor.destroy');
      expect(handler).toContain('TelegramDeviceConfig.destroy');
    });

    it('los modelos child usan onDelete CASCADE o el handler mantiene limpieza explícita', () => {
      const handlerMatches = api.match(/router\.delete\('\/devices\/:id'[\s\S]*?\n\}\);/);
      expect(handlerMatches).not.toBeNull();
      const handler = handlerMatches![0];
      // Todas las tablas hijas de Device cubiertas: telemetry, health, maintenance,
      // actuator, integration_credentials, access, cycles/states, events, alarms, sensors
      const covered = [
        'Telemetry.destroy',
        'DeviceHealth.destroy',
        'DeviceMaintenance.destroy',
        'Actuator.destroy',
        'IntegrationCredentials.destroy',
        'UserChamberAccess.destroy',
        'CultivationCycle.destroy',
        'CycleState.destroy',
        'Event.destroy',
        'Alarm.destroy',
        'Sensor.destroy',
        'TelegramDeviceConfig.destroy',
      ];
      for (const c of covered) {
        expect(handler).toContain(c);
      }
    });

    it('declara las asociaciones de cascada en models/index.js para Event/Alarm/Sensor', () => {
      expect(modelsIndex).toMatch(/Device\.hasMany\(Event, \{ foreignKey: 'deviceId', onDelete: 'CASCADE' \}\)/);
      expect(modelsIndex).toMatch(/Device\.hasMany\(Alarm, \{ foreignKey: 'deviceId', onDelete: 'CASCADE' \}\)/);
      expect(modelsIndex).toMatch(/Device\.hasMany\(Sensor, \{ foreignKey: 'deviceId', onDelete: 'CASCADE' \}\)/);
    });
  });

  describe('I012 — deviceId tipado en el boundary (filtros correctos)', () => {
    it('alarms.js resuelve el device por id o deviceId string antes del filtro', () => {
      expect(alarms).toMatch(/Device\.findOne\(\{\s*where:\s*\{\s*\[Op\.or\]:\s*\[\{ id: deviceId \}, \{ deviceId \}\]/);
      expect(alarms).toContain('where.deviceId = device.id');
    });

    it('alarms.js NO asigna el query string crudo a la columna INTEGER deviceId', () => {
      // El tipo del filtro queda alineado: se resuelve el Device y se usa su id INTEGER.
      expect(alarms).not.toMatch(/where\.deviceId\s*=\s*deviceId\s*;?\s*$/m);
    });

    it('events.js resuelve deviceId query string (ya alineado) en ambos endpoints', () => {
      expect(events).toContain('{ id: deviceId }, { deviceId }');
      expect(events).toContain('where = { deviceId: device.id }');
    });
  });
});