// Contract tests del Protocol Simulator (FASE 1, EDD-007 §5.9).
//
// Garantizan que todo payload que el simulador EMITE (telemetry, status, ack)
// y todo comando que CONSUME (command) es conforme al contrato congelado
// (docs/contracts/conformance/schemas/). La lógica probada vive en
// src/contract/* — aislada y lista para extraerse a packages/protocol.

import { loadSchemas } from '../contract/schemas.js';
import { validate, isValid } from '../contract/validator.js';
import { parseCommand } from '../contract/command.js';
import { buildAck, ACK_STATUS, resolveAckStatus } from '../contract/ack.js';
import { createTelemetryGenerator, TELEMETRY_LIMITS } from '../contract/telemetry.js';
import { buildStatus } from '../contract/status.js';
import { CmdIdDedup } from '../dedup.js';

const SCHEMAS = loadSchemas();

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const now = Math.floor(Date.now() / 1000);

function canonicalCommand(overrides = {}) {
  return {
    cmdId: UUID,
    source: 'backend.controlEngine',
    ts: now,
    command: { type: 'ACTUATOR_SET', channel: 2, value: true },
    ...overrides,
  };
}

describe('Contract: telemetría emitida', () => {
  const schema = SCHEMAS['telemetry.schema.json'];

  it('modo fixed es válido y determinístico', () => {
    const gen = createTelemetryGenerator({ mode: 'fixed', base: { temp: 24.5, hum: 68, co2: 620 } });
    const a = gen();
    const b = gen();
    expect(validate(schema, a)).toEqual([]);
    expect(a).toEqual(b);
  });

  it('modo drift con misma seed es determinístico', () => {
    const genA = createTelemetryGenerator({ mode: 'drift', seed: 42 });
    const genB = createTelemetryGenerator({ mode: 'drift', seed: 42 });
    const seqA = Array.from({ length: 20 }, () => genA());
    const seqB = Array.from({ length: 20 }, () => genB());
    expect(seqA).toEqual(seqB);
  });

  it('modo drift con distinta seed diverge', () => {
    const genA = createTelemetryGenerator({ mode: 'drift', seed: 1 });
    const genB = createTelemetryGenerator({ mode: 'drift', seed: 2 });
    const a = genA();
    const b = genB();
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('modo drift respeta rangos del schema en 500 muestras', () => {
    const gen = createTelemetryGenerator({ mode: 'drift', seed: 7 });
    for (let i = 0; i < 500; i++) {
      const t = gen();
      expect(validate(schema, t)).toEqual([]);
      expect(t.co2).toBeGreaterThanOrEqual(TELEMETRY_LIMITS.co2[0]);
      expect(t.co2).toBeLessThanOrEqual(TELEMETRY_LIMITS.co2[1]);
      expect(t.tvoc).toBeGreaterThanOrEqual(TELEMETRY_LIMITS.tvoc[0]);
      expect(t.aqi).toBeGreaterThanOrEqual(TELEMETRY_LIMITS.aqi[0]);
    }
  });

  it('ts se emite en segundos (ADR-026) y respeta el máximo del schema', () => {
    const gen = createTelemetryGenerator({ mode: 'fixed', ts: 1785340800 });
    const t = gen();
    expect(t.ts).toBe(1785340800);
    expect(t.ts).toBeLessThan(4102444800);
  });
});

describe('Contract: status emitido', () => {
  const schema = SCHEMAS['status.schema.json'];

  it('online/offline válidos', () => {
    for (const state of ['online', 'offline', 'NORMAL', 'BOOT']) {
      const s = buildStatus({ state, ts: now });
      expect(validate(schema, s)).toEqual([]);
    }
  });

  it('campos opcionales respetan tipos', () => {
    const s = buildStatus({ state: 'online', mode: 'virtual', rssi: -55, mac: 'SIM_x', fwVer: '0.1.0', hwRev: '1.0', ts: now });
    expect(validate(schema, s)).toEqual([]);
  });
});

describe('Contract: ACK emitido', () => {
  const schema = SCHEMAS['ack.schema.json'];

  it.each(Object.values(ACK_STATUS))('status %s genera ACK conforme', (status) => {
    const channel = status === ACK_STATUS.OK ? 2 : 0;
    const ack = buildAck({ cmdId: UUID, channel, state: status === ACK_STATUS.OK, status, ts: now });
    expect(validate(schema, ack)).toEqual([]);
  });

  it('state siempre es boolean aunque se pase 1/0', () => {
    const ack = buildAck({ cmdId: UUID, channel: 2, state: 1, status: ACK_STATUS.OK, ts: now });
    expect(ack.state).toBe(true);
    expect(validate(schema, ack)).toEqual([]);
  });

  it('ts por defecto usa segundos actuales', () => {
    const before = Math.floor(Date.now() / 1000);
    const ack = buildAck({ cmdId: UUID, channel: 1, state: false, status: ACK_STATUS.OK });
    const after = Math.floor(Date.now() / 1000);
    expect(ack.ts).toBeGreaterThanOrEqual(before);
    expect(ack.ts).toBeLessThanOrEqual(after);
  });
});

describe('Contract: comandos consumidos', () => {
  const schema = SCHEMAS['command.schema.json'];

  it('el comando canónico del backend valida contra el schema y se parsea OK', () => {
    const payload = canonicalCommand();
    expect(validate(schema, payload)).toEqual([]);
    const parsed = parseCommand(JSON.stringify(payload));
    expect(parsed.ok).toBe(true);
    expect(parsed.status).toBe('OK');
    expect(parsed.command.channel).toBe(2);
    expect(parsed.command.value).toBe(true);
    expect(parsed.command.cmdId).toBe(UUID);
  });

  it('comando con setpoints/phase (ciclos) valida y se parsea', () => {
    const payload = canonicalCommand({
      setpoints: { tempMin: 22, tempMax: 26, humMin: 60, humMax: 80, co2Max: 800 },
      phase: 'INCUBATION',
    });
    expect(validate(schema, payload)).toEqual([]);
    const parsed = parseCommand(JSON.stringify(payload));
    expect(parsed.ok).toBe(true);
    expect(parsed.command.phase).toBe('INCUBATION');
    expect(parsed.command.setpoints.co2Max).toBe(800);
  });

  it('formato legacy actuators[] es rechazado (drift detectado) y NO es comando', () => {
    const legacy = {
      protocol: '2.0.0',
      cmdId: UUID,
      deviceId: 'mush2_s3_001',
      ts: now,
      source: 'auto',
      target: 'actuator',
      actuators: [{ channel: 1, state: 'ON', mode: 'REMOTE' }],
    };
    expect(validate(schema, legacy).length).toBeGreaterThan(0);
    const parsed = parseCommand(JSON.stringify(legacy));
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toBe('NOT_COMMAND');
  });

  it('JSON inválido → PARSE_ERROR (sin ACK, paridad firmware)', () => {
    const parsed = parseCommand('{not json');
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toBe('PARSE_ERROR');
  });

  it('type desconocido → UNKNOWN_CMD (precede a channel, paridad firmware)', () => {
    const parsed = parseCommand(JSON.stringify(canonicalCommand({ command: { type: 'FAKE', channel: 99, value: true } })));
    expect(parsed.ok).toBe(true);
    expect(resolveAckStatus(parsed)).toBe(ACK_STATUS.UNKNOWN_CMD);
  });

  it('channel fuera de 1..4 → INVALID_CHANNEL', () => {
    for (const channel of [0, -1, 5, 2.5, '1']) {
      const parsed = parseCommand(JSON.stringify(canonicalCommand({ command: { type: 'ACTUATOR_SET', channel, value: true } })));
      expect(parsed.ok).toBe(true);
      expect(resolveAckStatus(parsed)).toBe(ACK_STATUS.INVALID_CHANNEL);
    }
  });

  it('value no booleano se normaliza a false (paridad firmware)', () => {
    const parsed = parseCommand(JSON.stringify(canonicalCommand({ command: { type: 'ACTUATOR_SET', channel: 1, value: 'ON' } })));
    expect(parsed.ok).toBe(true);
    expect(parsed.command.value).toBe(false);
  });

  it('payload sin objeto command → NOT_COMMAND', () => {
    const parsed = parseCommand(JSON.stringify({ cmdId: UUID, source: 'x', ts: now }));
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toBe('NOT_COMMAND');
  });
});

describe('Contract: dedup de cmdId (política MVP)', () => {
  let nowMs;

  beforeEach(() => {
    nowMs = 1_000_000;
  });

  it('cmdId repetido es duplicado, vacío nunca', () => {
    const dedup = new CmdIdDedup({ now: () => nowMs });
    expect(dedup.isDuplicate(UUID)).toBe(false);
    expect(dedup.isDuplicate(UUID)).toBe(true);
    expect(dedup.isDuplicate('')).toBe(false);
    expect(dedup.isDuplicate(null)).toBe(false);
  });

  it('expira por TTL', () => {
    const dedup = new CmdIdDedup({ ttlMs: 1000, now: () => nowMs });
    expect(dedup.isDuplicate(UUID)).toBe(false);
    nowMs += 1001;
    expect(dedup.isDuplicate(UUID)).toBe(false);
  });

  it('estructura acotada (LRU): no crece más allá de maxSize', () => {
    const dedup = new CmdIdDedup({ maxSize: 4, now: () => nowMs });
    for (let i = 0; i < 100; i++) dedup.isDuplicate(`id-${i}`);
    expect(dedup.size).toBeLessThanOrEqual(4);
  });
});
