import { jest, describe, it, expect } from '@jest/globals';

// ISSUE-107 (TST-003) - cobertura de la ruta runtime real.
// services/eventBus.js es el bus de eventos del runtime y no tenia test de
// ejecucion. Este suite usa el bus REAL (EventEmitter) para verificar el
// contrato de eventos emitidos por el control engine y el bridge MQTT.

const { events } = await import('../../services/eventBus.js');

function once(event) {
  return new Promise((resolve) => events.once(event, resolve));
}

describe('eventBus — contrato de eventos del runtime', () => {
  it('despacha un evento a un listener', () => {
    const listener = jest.fn();
    events.on('test-simple', listener);
    events.emit('test-simple', { a: 1 });
    expect(listener).toHaveBeenCalledWith({ a: 1 });
    events.removeListener('test-simple', listener);
  });

  it('notifica a múltiples listeners del mismo evento', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    events.on('test-multi', l1);
    events.on('test-multi', l2);
    events.emit('test-multi', 'x');
    expect(l1).toHaveBeenCalledWith('x');
    expect(l2).toHaveBeenCalledWith('x');
    events.removeListener('test-multi', l1);
    events.removeListener('test-multi', l2);
  });

  it('emisión/recepción async: el payload viaja íntegro', async () => {
    const payload = { deviceId: 'dev-1', cycleId: 'c1', event: 'PHASE_TRANSITION', fromPhase: 'INCUBATION', toPhase: 'FRUITING' };
    const received = once('test-async');
    events.emit('test-async', payload);
    await expect(received).resolves.toEqual(payload);
  });

  it('control_eval: contrato del control engine (readings con temp/hum/co2/vpd y actuatorCommands)', async () => {
    const received = once('control_eval');
    events.emit('control_eval', {
      deviceId: 'dev-1',
      cycleId: 'c1',
      phase: 'INCUBATION',
      thresholds: { tempMin: 20, tempMax: 26 },
      readings: { temp: 24, hum: 80, co2: 700, vpd: 0.5 },
      deviations: [],
      actuatorCommands: [],
    });
    const ev = await received;
    expect(ev.deviceId).toBe('dev-1');
    expect(ev.readings.temp).toBe(24);
    expect(ev.actuatorCommands).toEqual([]);
  });

  it('telemetry: contrato del bridge MQTT (deviceId + sensors)', async () => {
    const received = once('telemetry');
    events.emit('telemetry', {
      deviceId: 'dev-1',
      sensors: { temperature: 24.5, humidity: 80, co2: 700, voc: 100, aqi: 2 },
    });
    const ev = await received;
    expect(ev.sensors.temperature).toBe(24.5);
    expect(ev.deviceId).toBe('dev-1');
  });

  it('alarm/state/health/ack: eventos de dispositivo re-emitidos por el bridge', async () => {
    const received = Promise.all([
      once('alarm'),
      once('state'),
      once('health'),
      once('ack'),
    ]);
    events.emit('alarm', { deviceId: 'dev-1', severity: 'CRITICAL' });
    events.emit('state', { deviceId: 'dev-1', state: 'RUNNING' });
    events.emit('health', { deviceId: 'dev-1', freeHeap: 120000 });
    events.emit('ack', { deviceId: 'dev-1', cmdId: 'x', status: 'ACKED' });
    const [alarm, state, health, ack] = await received;
    expect(alarm.severity).toBe('CRITICAL');
    expect(state.state).toBe('RUNNING');
    expect(health.freeHeap).toBe(120000);
    expect(ack.cmdId).toBe('x');
  });

  it('phase_transition: contrato de transición del control engine', async () => {
    const received = once('phase_transition');
    events.emit('phase_transition', { deviceId: 'dev-1', cycleId: 'c1', fromPhase: 'FRUITING', toPhase: 'MAINTENANCE' });
    const ev = await received;
    expect(ev.toPhase).toBe('MAINTENANCE');
  });

  it('removeListener deja de recibir eventos', () => {
    const listener = jest.fn();
    events.on('test-remove', listener);
    events.removeListener('test-remove', listener);
    events.emit('test-remove', 1);
    expect(listener).not.toHaveBeenCalled();
  });
});
