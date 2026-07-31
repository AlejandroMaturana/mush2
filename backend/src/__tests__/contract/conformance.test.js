import { readFileSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFORMANCE_DIR = resolve(__dirname, '../../../../docs/contracts/conformance');

function isType(value, type) {
  switch (type) {
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number';
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    default: return true;
  }
}

function validate(schema, value, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.const !== undefined) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
      errors.push(`${path}: const mismatch (expected ${JSON.stringify(schema.const)})`);
    }
    return errors;
  }

  if (schema.enum) {
    if (!schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(value))) {
      errors.push(`${path}: not in enum ${JSON.stringify(schema.enum)}`);
    }
    return errors;
  }

  if (schema.anyOf) {
    const matched = schema.anyOf.some((sub) => validate(sub, value, path).length === 0);
    if (!matched) errors.push(`${path}: no anyOf branch matched`);
    return errors;
  }

  if (schema.type) {
    if (!isType(value, schema.type)) {
      errors.push(`${path}: expected type ${schema.type}, got ${value === null ? 'null' : typeof value}`);
      return errors;
    }

    if (schema.type === 'object') {
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (value[key] !== undefined) {
            errors.push(...validate(sub, value[key], `${path}.${key}`));
          }
        }
      }
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (value[key] === undefined) {
            errors.push(`${path}: missing required property '${key}'`);
          }
        }
      }
      if (schema.additionalProperties === false) {
        const known = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(value)) {
          if (!known.has(key)) errors.push(`${path}: additional property '${key}' not allowed`);
        }
      }
    }

    if (schema.type === 'array' && schema.items) {
      value.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${path}: at/below exclusiveMinimum ${schema.exclusiveMinimum}`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push(`${path}: at/above exclusiveMaximum ${schema.exclusiveMaximum}`);
  }

  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: pattern mismatch /${schema.pattern}/`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
  }

  return errors;
}

function loadSchemas() {
  const schemas = {};
  const dir = join(CONFORMANCE_DIR, 'schemas');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.schema.json'))) {
    schemas[file] = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
  }
  return schemas;
}

function loadManifest() {
  return JSON.parse(readFileSync(join(CONFORMANCE_DIR, 'examples/manifest.json'), 'utf-8'));
}

function loadExample(file) {
  return JSON.parse(readFileSync(join(CONFORMANCE_DIR, file), 'utf-8'));
}

describe('Conformance: contrato MQTT congelado (FASE 0.5)', () => {
  const schemas = loadSchemas();

  it('existen los 8 schemas canónicos del contrato', () => {
    const expected = [
      'telemetry.schema.json',
      'status.schema.json',
      'health.schema.json',
      'alarm.schema.json',
      'maintenance.schema.json',
      'command.schema.json',
      'ack.schema.json',
      'lwt.schema.json',
    ];
    for (const name of expected) {
      expect(schemas[name]).toBeDefined();
    }
  });

  const manifest = loadManifest();

  it.each(manifest.filter((c) => c.expectValid))(
    'ejemplo canónico $file valida contra $schema',
    ({ file, schema }) => {
      const errors = validate(schemas[schema], loadExample(file));
      expect(errors).toEqual([]);
    },
  );

  it.each(manifest.filter((c) => !c.expectValid))(
    'ejemplo divergente $file es rechazado por $schema (drift detectado)',
    ({ file, schema }) => {
      const errors = validate(schemas[schema], loadExample(file));
      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it('el comando canónico del backend (formato anidado RFC-0009 §5.1) valida contra el schema', () => {
    const bridgeFormat = {
      cmdId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      source: 'backend.controlEngine',
      ts: Math.floor(Date.now() / 1000),
      command: { type: 'ACTUATOR_SET', channel: 2, value: true },
    };
    const errors = validate(schemas['command.schema.json'], bridgeFormat);
    expect(errors).toEqual([]);
  });

  it('el formato legacy actuators[] es rechazado por el schema canónico (drift detectado)', () => {
    const legacyFormat = {
      protocol: '2.0.0',
      cmdId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      deviceId: 'mush2_s3_001',
      ts: Math.floor(Date.now() / 1000),
      source: 'auto',
      target: 'actuator',
      actuators: [
        { channel: 1, state: 'ON', mode: 'REMOTE' },
        { channel: 2, state: 'OFF', mode: 'REMOTE' },
      ],
    };
    const errors = validate(schemas['command.schema.json'], legacyFormat);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('el payload documentado con eco2/heap (DEV_ENVIRONMENT, H-05) es rechazado', () => {
    const telemetry = validate(schemas['telemetry.schema.json'], { eco2: 420, ts: 1785340800 });
    const health = validate(schemas['health.schema.json'], { heap: 180000, uptime: 3600, ts: 1785340800 });
    expect(telemetry.length).toBeGreaterThan(0);
    expect(health.length).toBeGreaterThan(0);
  });
});
