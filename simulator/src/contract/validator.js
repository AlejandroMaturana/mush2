// Validador JSON Schema (subconjunto draft-07) usado por los contract tests de
// conformance (FASE 0.5) y por el Protocol Simulator para validar sus payloads.
//
// AISLAMIENTO DEL PROTOCOLO: este módulo es 100% puro (sin I/O, sin dependencias
// de mqtt/node). Es candidato a migrar a packages/protocol junto con schemas.js,
// command.js, ack.js, telemetry.js y status.js cuando esa fase sea aprobada.

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

export function validate(schema, value, path = '$') {
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

export function isValid(schema, value) {
  return validate(schema, value).length === 0;
}
