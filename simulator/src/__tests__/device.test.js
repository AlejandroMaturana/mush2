// Tests unitarios del VirtualDevice (FASE 1). Usan un cliente MQTT fake para
// verificar: suscripción, publicación de status, respuesta ACK ante comandos
// canónicos (paridad firmware), dedup, y telemetría conforme al schema.

import { VirtualDevice } from '../device.js';
import { CmdIdDedup } from '../dedup.js';
import { loadSchemas } from '../contract/schemas.js';
import { isValid } from '../contract/validator.js';

const SCHEMAS = loadSchemas();
const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const DEVICE_ID = 'sim_001';
const PREFIX = 'mush2';

class FakeMqttClient {
  constructor() {
    this.handlers = {};
    this.published = [];
    this.subscribed = [];
  }

  on(event, cb) {
    this.handlers[event] = cb;
  }

  off(event) {
    delete this.handlers[event];
  }

  emit(event, ...args) {
    if (this.handlers[event]) this.handlers[event](...args);
  }

  subscribe(topic, opts) {
    this.subscribed.push({ topic, opts });
  }

  publish(topic, payload, opts) {
    this.published.push({ topic, payload: String(payload), opts });
  }

  end(_force, cb) {
    if (cb) cb();
  }
}

function makeDevice(overrides = {}) {
  const client = new FakeMqttClient();
  const config = {
    deviceId: DEVICE_ID,
    brokerUrl: 'mqtt://fake:1884',
    apiUrl: 'http://fake:3797/api/v1',
    telemetryIntervalMs: 25,
    telemetryMode: 'fixed',
    seed: 12345,
    telemetryBase: {},
    topicPrefix: PREFIX,
    mqttUsername: 'u',
    mqttPassword: 'p',
    credentialsFile: '.sim-credentials.json',
    reconnectPeriod: 5000,
    qos: 1,
    retainStatus: true,
    logLevel: 'info',
    ...overrides,
  };
  const dedup = new CmdIdDedup();
  const device = new VirtualDevice({ config, mqttClient: client, dedup });
  return { device, client, config };
}

function publishCommand(client, payload) {
  client.emit('message', `${PREFIX}/${DEVICE_ID}/actuators`, Buffer.from(JSON.stringify(payload)));
}

function publishedOn(client, topic) {
  return client.published.filter((p) => p.topic === topic);
}

async function connectDevice(device, client, timeoutMs = 1000) {
  const p = device.start(timeoutMs);
  client.emit('connect');
  await p;
}

const cmd = (overrides = {}) => ({
  cmdId: UUID,
  source: 'backend.controlEngine',
  ts: Math.floor(Date.now() / 1000),
  command: { type: 'ACTUATOR_SET', channel: 2, value: true },
  ...overrides,
});

describe('VirtualDevice', () => {
  it('al conectar: suscribe al tópico de comandos y publica status online', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    expect(client.subscribed).toContainEqual({
      topic: `${PREFIX}/${DEVICE_ID}/actuators`,
      opts: { qos: 1 },
    });

    const status = publishedOn(client, `${PREFIX}/${DEVICE_ID}/status`);
    expect(status.length).toBe(1);
    const body = JSON.parse(status[0].payload);
    expect(body.state).toBe('online');
    expect(body.ts).toBeGreaterThan(0);
    expect(isValid(SCHEMAS['status.schema.json'], body)).toBe(true);
    await device.stop();
  });

  it('comando canónico → ACK OK y actualiza estado del canal', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    publishCommand(client, cmd());
    const acks = publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`);
    expect(acks.length).toBe(1);
    const ack = JSON.parse(acks[0].payload);
    expect(ack).toMatchObject({ cmdId: UUID, channel: 2, state: true, status: 'OK' });
    expect(isValid(SCHEMAS['ack.schema.json'], ack)).toBe(true);
    expect(device.getChannelState(2)).toBe(true);
    await device.stop();
  });

  it('comando ON luego OFF actualiza estado', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    publishCommand(client, cmd());
    publishCommand(client, cmd({ cmdId: 'b2b2c3d4-e5f6-7890-abcd-ef1234567890', command: { type: 'ACTUATOR_SET', channel: 2, value: false } }));

    const acks = publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`);
    expect(JSON.parse(acks[1].payload).state).toBe(false);
    expect(device.getChannelState(2)).toBe(false);
    await device.stop();
  });

  it('cmdId duplicado → ALREADY_EXECUTED y NO re-aplica el estado', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    publishCommand(client, cmd());
    publishCommand(client, cmd({ command: { type: 'ACTUATOR_SET', channel: 2, value: false } }));

    const acks = publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`);
    expect(acks.length).toBe(2);
    const dup = JSON.parse(acks[1].payload);
    expect(dup.status).toBe('ALREADY_EXECUTED');
    expect(dup.channel).toBe(2);
    expect(device.getChannelState(2)).toBe(true);
    await device.stop();
  });

  it('type desconocido → ACK UNKNOWN_CMD con channel 0', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    publishCommand(client, cmd({ command: { type: 'FAKE', channel: 99, value: true } }));
    const ack = JSON.parse(publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`)[0].payload);
    expect(ack.status).toBe('UNKNOWN_CMD');
    expect(ack.channel).toBe(0);
    await device.stop();
  });

  it('channel inválido → ACK INVALID_CHANNEL con channel 0', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    publishCommand(client, cmd({ command: { type: 'ACTUATOR_SET', channel: 5, value: true } }));
    const ack = JSON.parse(publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`)[0].payload);
    expect(ack.status).toBe('INVALID_CHANNEL');
    expect(ack.channel).toBe(0);
    await device.stop();
  });

  it('formato legacy → sin ACK (paridad firmware)', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    client.emit('message', `${PREFIX}/${DEVICE_ID}/actuators`, Buffer.from(JSON.stringify({
      protocol: '2.0.0',
      cmdId: UUID,
      ts: Math.floor(Date.now() / 1000),
      source: 'auto',
      actuators: [{ channel: 1, state: 'ON', mode: 'REMOTE' }],
    })));

    expect(publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`)).toHaveLength(0);
    await device.stop();
  });

  it('payload no-JSON → sin ACK', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    client.emit('message', `${PREFIX}/${DEVICE_ID}/actuators`, Buffer.from('{broken'));
    expect(publishedOn(client, `${PREFIX}/${DEVICE_ID}/ack`)).toHaveLength(0);
    await device.stop();
  });

  it('intervalo publica telemetría conforme al schema', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    await new Promise((r) => setTimeout(r, 150));
    const telemetry = publishedOn(client, `${PREFIX}/${DEVICE_ID}/telemetry`);
    expect(telemetry.length).toBeGreaterThanOrEqual(3);
    for (const t of telemetry) {
      expect(isValid(SCHEMAS['telemetry.schema.json'], JSON.parse(t.payload))).toBe(true);
    }
    await device.stop();
  });

  it('stop() publica status offline', async () => {
    const { device, client } = makeDevice();
    await connectDevice(device, client);

    await device.stop();
    const statuses = publishedOn(client, `${PREFIX}/${DEVICE_ID}/status`);
    const last = JSON.parse(statuses[statuses.length - 1].payload);
    expect(last.state).toBe('offline');
  });
});
