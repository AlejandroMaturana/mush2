// Generador de telemetría conforme al contrato canónico (telemetry.schema.json).
//
// Dos modos:
//   - fixed:  valores base fijos (+ opcional drift manual por canal), 100%
//             determinístico para tests de integración.
//   - drift:  random walk acotado sobre los rangos del schema, usando un PRNG
//             con semilla (mulberry32) para reproducibilidad (--seed).
//
// Los rangos del schema: temp [-50,100], hum [0,100], co2 [0,10000] int,
// tvoc [0,65535] int, aqi [0,500] int. ts en segundos (ADR-026).
//
// AISLAMIENTO DEL PROTOCOLO: módulo puro, candidato a migrar a packages/protocol.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLAMP = (v, min, max) => Math.min(max, Math.max(min, v));
const INT = (v) => Math.round(v);

export const TELEMETRY_DEFAULTS = {
  temp: 24.5,
  hum: 68,
  co2: 620,
  tvoc: 120,
  aqi: 35,
};

export const TELEMETRY_LIMITS = {
  temp: [-50, 100],
  hum: [0, 100],
  co2: [0, 10000],
  tvoc: [0, 65535],
  aqi: [0, 500],
};

function step(rng, value, [min, max], amplitude) {
  return CLAMP(value + (rng() * 2 - 1) * amplitude, min, max);
}

function buildPayload({ temp, hum, co2, tvoc, aqi, ts }) {
  const t = Number.isFinite(ts) && ts > 0 ? ts : Math.floor(Date.now() / 1000);
  return {
    temp: Number(temp.toFixed(2)),
    hum: Number(hum.toFixed(2)),
    co2: INT(co2),
    tvoc: INT(tvoc),
    aqi: INT(aqi),
    ts: INT(t),
  };
}

export function createTelemetryGenerator({ mode = 'fixed', seed = 12345, base = {}, ts = null } = {}) {
  const rng = mulberry32(seed);
  const current = { ...TELEMETRY_DEFAULTS, ...base };
  let tick = 0;

  return function nextTelemetry() {
    tick += 1;
    if (mode === 'drift') {
      const [tMin, tMax] = TELEMETRY_LIMITS.temp;
      const [hMin, hMax] = TELEMETRY_LIMITS.hum;
      current.temp = step(rng, current.temp, [tMin, tMax], 0.4);
      current.hum = step(rng, current.hum, [hMin, hMax], 1.2);
      current.co2 = step(rng, current.co2, TELEMETRY_LIMITS.co2, 25);
      current.tvoc = step(rng, current.tvoc, TELEMETRY_LIMITS.tvoc, 8);
      current.aqi = step(rng, current.aqi, TELEMETRY_LIMITS.aqi, 3);
    }
    return buildPayload({ ...current, ts });
  };
}
