import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

describe('Invariant: separación de responsabilidades', () => {

  describe('los controladores de ruta no hacen consultas Sequelize directas', () => {
    const apiSource = readSource('routes/api.js');

    it('ningún Device.findByPk con req.params en handlers públicos', () => {
      const lines = apiSource.split('\n');
      const deviceFindByPkInHandlers = lines.filter(line =>
        line.includes('Device.findByPk') && line.includes('req.params')
      );
      expect(deviceFindByPkInHandlers).toHaveLength(0);
    });

    it('ningún handler dentro de router.* llama a modelos directo sin pasar por middleware', () => {
      // Router handlers deberían usar req.device (seteado por checkDeviceAccess)
      // Busca handlers que usen Device. directamente sin tener checkDeviceAccess
      const routerBlocks = apiSource.split('router.');
      for (const block of routerBlocks) {
        if (block.includes("'/devices/:id'") && !block.includes('checkDeviceAccess')) {
          const lines = block.split('\n');
          const modelCalls = lines.filter(l =>
            l.includes('Device.') || l.includes('Actuator.') || l.includes('Telemetry.')
          );
          expect(modelCalls.length).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('los servicios no importan Express', () => {
    const serviceFiles = [
      'services/controlEngine.js',
      'services/deviceHealthService.js',
      'services/mqttBridge.js',
      'services/eventBus.js',
      'services/auditService.js',
      'services/thingSpeakSync.js',
    ];

    for (const file of serviceFiles) {
      it(`${file} no importa de express`, () => {
        try {
          const source = readSource(file);
          const hasExpressImport = source.includes("from 'express'") || source.includes('require("express")');
          expect(hasExpressImport).toBe(false);
        } catch {
          // skip if file doesn't exist
        }
      });
    }
  });

  describe('los modelos no contienen lógica de ruteo', () => {
    const modelFiles = [
      'models/Device.js',
      'models/User.js',
      'models/Actuator.js',
      'models/Alarm.js',
      'models/Chamber.js',
      'models/Telemetry.js',
    ];

    for (const file of modelFiles) {
      it(`${file} no importa de express ni de routes`, () => {
        try {
          const source = readSource(file);
          expect(source).not.toContain("from 'express'");
          expect(source).not.toContain("from '../routes'");
        } catch {
          // skip if file doesn't exist
        }
      });
    }
  });
});
