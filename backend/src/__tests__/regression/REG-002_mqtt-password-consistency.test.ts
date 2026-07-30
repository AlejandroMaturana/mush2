import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-002: MQTT password consistency', () => {
  const envDev = readProjectFile('.env.development');
  const setupScript = readProjectFile('scripts/dev-mqtt-setup.ps1');

  it('MQTT_BROKER_PASS en .env.development coincide con dev-mqtt-setup.ps1', () => {
    const envPass = envDev.match(/MQTT_BROKER_PASS=(\S+)/)?.[1];
    expect(envPass).toBeDefined();
    const scriptPass = setupScript.match(/Pass\s*=\s*"([^"]+)";?\s*Desc\s*=\s*"Backend MQTT bridge service"/);
    expect(scriptPass).toBeDefined();
    expect(envPass).toBe(scriptPass![1]);
  });

  it('dev-mqtt-setup.ps1 define usuario backend_bridge', () => {
    expect(setupScript).toContain('backend_bridge');
    expect(setupScript).toContain('mush2_backend_bridge_2026!');
  });
});
