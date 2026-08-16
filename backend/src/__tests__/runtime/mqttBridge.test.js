import { jest, describe, it, beforeEach, expect } from '@jest/globals';

// ISSUE-107 (TST-003) - cobertura de la ruta runtime real.
// services/mqttBridge.js solo tenia tests source-scan (vitest). Este suite
// ejecuta el bridge end-to-end: cliente mqtt fake + capa de persistencia
// mockeada, verificando suscripciones, dispatch de mensajes y publicacion.

const mockConnect = jest.fn();
const mockDeviceFindOrCreate = jest.fn();
const mockDeviceUpdate = jest.fn();
const mockTelemetryCreate = jest.fn();
const mockActuatorFindOrCreate = jest.fn();
const mockActuatorUpdate = jest.fn();
const mockDeviceHealthCreate = jest.fn();
const mockDeviceMaintenanceCreate = jest.fn();
const mockEmit = jest.fn();
const mockSendActuatorUpdate = jest.fn();
const mockRecordIncoming = jest.fn();
const mockGetStatusFromDevice = jest.fn();

jest.unstable_mockModule('mqtt', () => ({
  default: { connect: mockConnect },
}));

jest.unstable_mockModule('../../models/index.js', () => ({
  Device: { findOrCreate: mockDeviceFindOrCreate },
  Telemetry: { create: mockTelemetryCreate },
  Actuator: { findOrCreate: mockActuatorFindOrCreate },
  DeviceHealth: { create: mockDeviceHealthCreate },
  DeviceMaintenance: { create: mockDeviceMaintenanceCreate },
}));

jest.unstable_mockModule('../../services/eventBus.js', () => ({
  events: { emit: mockEmit },
}));

jest.unstable_mockModule('../../services/webSocketServer.js', () => ({
  sendActuatorUpdate: mockSendActuatorUpdate,
}));

jest.unstable_mockModule('../../services/deviceHealthService.js', () => ({
  recordIncoming: mockRecordIncoming,
  getStatusFromDevice: mockGetStatusFromDevice,
}));

jest.unstable_mockModule('../../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), fatal: jest.fn() }),
}));

jest.unstable_mockModule('../../config/resetReasons.js', () => ({
  RESET_REASON_MAP: { 0x00: 'ESP32_RST' },
}));

jest.unstable_mockModule('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'development',
    MQTT: {
      brokerUrl: 'mqtt://localhost:1883',
      username: 'mush2',
      password: 'secret',
      rejectUnauthorized: false,
    },
  },
}));

const {
  startMqttBridge,
  stopMqttBridge,
  publishActuatorCommand,
  getMqttStatus,
} = await import('../../services/mqttBridge.js');

const flush = () => new Promise((r) => setImmediate(r));

function createFakeClient() {
  const handlers = {};
  const client = {
    connected: false,
    topics: [],
    publishes: [],
    handlers,
    ended: false,
    on(event, cb) { handlers[event] = cb; return client; },
    subscribe(topic, opts) { client.topics.push({ topic, opts }); },
    publish(topic, payload, opts) { client.publishes.push({ topic, payload, opts }); },
    end(force) { client.ended = force; },
    removeAllListeners() { for (const k of Object.keys(handlers)) delete handlers[k]; },
  };
  return client;
}

function makeDevice() {
  return [{ id: 1, deviceId: 'dev-1', update: mockDeviceUpdate }, true];
}

beforeEach(() => {
  for (const m of [
    mockConnect, mockDeviceFindOrCreate, mockDeviceUpdate, mockTelemetryCreate,
    mockActuatorFindOrCreate, mockActuatorUpdate, mockDeviceHealthCreate,
    mockDeviceMaintenanceCreate, mockEmit, mockSendActuatorUpdate,
    mockRecordIncoming, mockGetStatusFromDevice,
  ]) {
    m.mockReset();
  }
  mockDeviceUpdate.mockResolvedValue(undefined);
  mockDeviceFindOrCreate.mockResolvedValue(makeDevice());
  mockTelemetryCreate.mockResolvedValue({ id: 1 });
  mockDeviceHealthCreate.mockResolvedValue({ id: 1 });
  mockDeviceMaintenanceCreate.mockResolvedValue({ id: 1 });
  mockRecordIncoming.mockResolvedValue(undefined);
  stopMqttBridge();
});

async function connectBridge(fakeClient) {
  mockConnect.mockReturnValue(fakeClient);
  startMqttBridge();
  fakeClient.handlers.connect();
  await flush();
}

describe('startMqttBridge / ciclo de vida', () => {
  it('crea cliente y suscribe a los topics del contrato al conectar', async () => {
    const fake = createFakeClient();
    mockConnect.mockReturnValue(fake);
    startMqttBridge();

    expect(mockConnect).toHaveBeenCalledWith('mqtt://localhost:1883', expect.objectContaining({
      username: 'mush2',
      password: 'secret',
      reconnectPeriod: 5000,
    }));

    fake.handlers.connect();
    expect(fake.topics.map((t) => t.topic)).toEqual([
      'mush2/+/telemetry',
      'mush2/+/status',
      'mush2/+/alarm',
      'mush2/+/ack',
      'mush2/+/health',
      'mush2/+/maintenance',
    ]);
    expect(fake.topics.every((t) => t.opts.qos === 1)).toBe(true);
  });

  it('ignora starts duplicados', async () => {
    const fake = createFakeClient();
    mockConnect.mockReturnValue(fake);
    startMqttBridge();
    startMqttBridge();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('getMqttStatus refleja el estado del cliente y dispositivos conectados', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);
    fake.connected = true;
    fake.handlers.message('mush2/dev-1/status', Buffer.from(JSON.stringify({ state: 'RUNNING' })));
    await flush();

    const status = getMqttStatus();
    expect(status.broker).toBe('Mosquitto');
    expect(status.connected).toBe(true);
    expect(status.connectedDevices).toBe(1);
  });

  it('reintento de reconexión exhausto limpia el cliente', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);
    for (let i = 0; i < 21; i++) fake.handlers.reconnect();
    expect(getMqttStatus().connected).toBe(false);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('stopMqttBridge cierra el cliente y es idempotente', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);
    stopMqttBridge();
    expect(fake.ended).toBe(true);
    stopMqttBridge();
  });
});

describe('publishActuatorCommand', () => {
  it('devuelve false sin cliente conectado', () => {
    expect(publishActuatorCommand('dev-1', [{ channel: 1, state: 'ON' }])).toBe(false);
  });

  it('publica payload ACTUATOR_SET por comando con cliente conectado', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);
    fake.connected = true;

    const result = publishActuatorCommand('dev-1', [
      { channel: 1, state: 'ON', cmdId: 'c1', source: 'backend.controlEngine' },
      { channel: 2, state: false, cmdId: 'c2' },
    ]);

    expect(result).toBe(true);
    expect(fake.publishes).toHaveLength(2);
    const [p1, p2] = fake.publishes;
    expect(p1.topic).toBe('mush2/dev-1/actuators');
    expect(p1.opts.qos).toBe(1);
    const payload = JSON.parse(p1.payload);
    expect(payload.command).toEqual({ type: 'ACTUATOR_SET', channel: 1, value: true });
    expect(payload.source).toBe('backend.controlEngine');
    expect(JSON.parse(p2.payload).command.value).toBe(false);
  });
});

describe('dispatch de mensajes de dispositivo', () => {
  it('telemetry: persiste sensores y emite evento telemetry', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    fake.handlers.message('mush2/dev-1/telemetry', Buffer.from(JSON.stringify({
      ts: 1700000000, temp: 24.5, hum: 80, co2: 700,
    })));
    await flush();
    await flush();

    expect(mockDeviceFindOrCreate).toHaveBeenCalledWith({ where: { deviceId: 'dev-1' }, defaults: { deviceId: 'dev-1' } });
    expect(mockTelemetryCreate).toHaveBeenCalledTimes(3);
    const types = mockTelemetryCreate.mock.calls.map(([row]) => row.sensorType).sort();
    expect(types).toEqual(['CO2', 'HUMIDITY', 'TEMPERATURE']);
    const emitted = mockEmit.mock.calls.find(([ev]) => ev === 'telemetry');
    expect(emitted[1]).toEqual({
      deviceId: 'dev-1',
      sensors: { temperature: 24.5, humidity: 80, co2: 700, voc: undefined, aqi: undefined },
    });
    expect(mockRecordIncoming).toHaveBeenCalledWith('dev-1', 'telemetry');
  });

  it('status: emite state y persiste metadata del dispositivo', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    fake.handlers.message('mush2/dev-1/status', Buffer.from(JSON.stringify({
      state: 'RUNNING', mode: 'AUTO', mac: 'AA:BB', fwVer: '1.0',
    })));
    await flush();
    await flush();

    expect(mockEmit.mock.calls.find(([ev]) => ev === 'state')[1]).toMatchObject({
      deviceId: 'dev-1',
      state: 'RUNNING',
      mode: 'AUTO',
    });
    expect(mockDeviceUpdate).toHaveBeenCalledWith({
      macAddress: 'AA:BB',
      firmwareVersion: '1.0',
      lastFirmwareState: 'RUNNING',
      controlMode: 'AUTO',
    });
  });

  it('alarm: re-emite evento alarm en el bus', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    fake.handlers.message('mush2/dev-1/alarm', Buffer.from(JSON.stringify({ severity: 'CRITICAL' })));
    await flush();

    expect(mockEmit.mock.calls.find(([ev]) => ev === 'alarm')[1]).toMatchObject({
      deviceId: 'dev-1',
      severity: 'CRITICAL',
    });
  });

  it('ack: re-emite ack y actualiza el actuador', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);
    mockActuatorFindOrCreate.mockResolvedValue([{ id: 1, update: mockActuatorUpdate }, true]);

    fake.handlers.message('mush2/dev-1/ack', Buffer.from(JSON.stringify({
      channel: 2, cmdId: 'cmd-9', status: 'ACKED', state: true,
    })));
    await flush();
    await flush();

    expect(mockEmit.mock.calls.find(([ev]) => ev === 'ack')[1]).toMatchObject({
      deviceId: 'dev-1',
      actuatorState: { channel: 2, state: true },
      cmdId: 'cmd-9',
    });
    expect(mockActuatorUpdate).toHaveBeenCalledWith(expect.objectContaining({ state: 'ON', lastAck: 'cmd-9' }));
  });

  it('health: persiste métricas y emite health', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    fake.handlers.message('mush2/dev-1/health', Buffer.from(JSON.stringify({
      freeHeap: 120000, resetReason: 0x00, uptime: 3600,
    })));
    await flush();
    await flush();

    const row = mockDeviceHealthCreate.mock.calls[0][0];
    expect(row.deviceId).toBe(1);
    expect(row.freeHeap).toBe(120000);
    expect(row.resetReasonLabel).toBe('ESP32_RST');
    expect(mockEmit.mock.calls.find(([ev]) => ev === 'health')).toBeDefined();
  });

  it('maintenance: persiste y emite maintenance', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    fake.handlers.message('mush2/dev-1/maintenance', Buffer.from(JSON.stringify({
      component: 'FAN', health: 80, estimatedFailure: '2026-09-01', reason: 'wear',
    })));
    await flush();
    await flush();

    expect(mockDeviceMaintenanceCreate).toHaveBeenCalledWith(expect.objectContaining({
      component: 'FAN',
      health: 80,
      reason: 'wear',
    }));
    expect(mockEmit.mock.calls.find(([ev]) => ev === 'maintenance')).toBeDefined();
  });

  it('payload JSON inválido: loguea PARSE_ERROR sin crashear', async () => {
    const fake = createFakeClient();
    await connectBridge(fake);

    expect(() => {
      fake.handlers.message('mush2/dev-1/telemetry', Buffer.from('not-json'));
    }).not.toThrow();
  });
});
