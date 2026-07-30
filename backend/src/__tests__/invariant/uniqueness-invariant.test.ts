import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
}

describe('Invariant: unicidad de deviceId', () => {

  it('Device.deviceId tiene unique: true en el modelo Sequelize', () => {
    const source = readSource('models/Device.js');
    expect(source).toContain('deviceId');
    expect(source).toContain('unique: true');
    expect(source).toContain('allowNull: false');
  });

  it('ningún otro modelo tiene deviceId como STRING (debe ser INTEGER FK o no existir)', () => {
    const modelFiles = [
      'models/Alarm.js',
      'models/Actuator.js',
      'models/Telemetry.js',
      'models/DeviceHealth.js',
      'models/CultivationCycle.js',
      'models/Event.js',
    ];

    for (const file of modelFiles) {
      const source = readSource(file);
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('deviceId') && lines[i].includes('STRING')) {
          // deviceId as STRING is ONLY valid in Device.js
          expect(file).toBe('models/Device.js');
        }
      }
    }
  });
});
