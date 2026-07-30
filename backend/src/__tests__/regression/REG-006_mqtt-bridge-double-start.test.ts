import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSource(relativeFromRoot: string): string {
  return readFileSync(resolve(__dirname, '../../', relativeFromRoot), 'utf-8');
}

describe('REG-006: MQTT bridge previene doble inicio', () => {
  const mqttSource = readSource('services/mqttBridge.js');

  it('startMqttBridge verifica si ya está corriendo', () => {
    expect(mqttSource).toContain('if (client)');
    expect(mqttSource).toContain('ALREADY_STARTED');
    expect(mqttSource).toContain('ignoring duplicate start');
  });

  it('startMqttBridge retorna el client existente en caso de duplicado', () => {
    expect(mqttSource).toContain('return client');
  });

  it('startMqttBridge solo crea nuevo client si no existe', () => {
    const guardLine = mqttSource.match(/if \(client\) \{[\s\S]*?return client;\s*\}/);
    expect(guardLine).not.toBeNull();
  });
});
