/**
 * ConfigurationService — Fail-fast environment validation (ADR-029).
 *
 * Validates that the current environment configuration is consistent
 * and safe before the server establishes any connections.
 *
 * Call `validate(env)` before DB authenticate in server.js.
 * Throws a descriptive error on any critical violation.
 */

const VALID_ENVIRONMENTS = ['development', 'production'];

const PRODUCTION_HOSTNAME_PATTERNS = [
  /render\.com/i,
  /onrender\.com/i,
  /\.render\.app/i,
];

/**
 * Extract hostname from a value that may be a bare hostname or a full URL.
 * Returns the hostname portion, or the original string if parsing fails.
 */
function extractHostname(value) {
  if (!value) return '';
  try {
    if (/^[a-z]+:\/\//i.test(value)) {
      return new URL(value).hostname;
    }
  } catch { /* not a valid URL */ }
  return value;
}

/**
 * Validate the environment configuration.
 * @param {object} env - The env object from config/env.js
 * @throws {Error} If any critical validation fails
 */
export function validate(env) {
  const errors = [];
  const warnings = [];

  // ── 1. Validate NODE_ENV ───────────────────────────────────────
  if (!VALID_ENVIRONMENTS.includes(env.NODE_ENV)) {
    errors.push(
      `Invalid NODE_ENV: "${env.NODE_ENV}". Expected one of: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }

  // ── 2. Validate required variables ─────────────────────────────
  const hasDatabaseUrl = !!env.DB.url;
  const hasDatabaseComponents = env.DB.host && env.DB.database && env.DB.username;

  if (!hasDatabaseUrl && !hasDatabaseComponents) {
    errors.push(
      'Database configuration is incomplete. Set DATABASE_URL or all of DB_HOST, DB_NAME, DB_USER.'
    );
  }

  // ── 3. Environment-specific validation ─────────────────────────
  if (env.NODE_ENV === 'production') {
    if (!env.JWT_SECRET || env.JWT_SECRET === 'dev-secret-change-in-production') {
      errors.push(
        'JWT_SECRET is required in production and must not be the default dev value.'
      );
    }
  }

  // ── 4. Cross-environment detection (CRITICAL) ──────────────────
  if (env.NODE_ENV === 'development') {
    const dbHost = extractHostname(env.DB.url || env.DB.host || '');

    for (const pattern of PRODUCTION_HOSTNAME_PATTERNS) {
      if (pattern.test(dbHost)) {
        errors.push(
          `CRITICAL: Production database detected in development environment. ` +
          `Database host "${dbHost}" matches a production pattern. ` +
          `Set DATABASE_URL or DB_HOST to a local development instance.`
        );
      }
    }

    // Detect production MQTT broker in development
    const mqttHost = extractHostname(env.MQTT?.brokerUrl || '');
    for (const pattern of PRODUCTION_HOSTNAME_PATTERNS) {
      if (pattern.test(mqttHost)) {
        errors.push(
          `CRITICAL: Production MQTT broker detected in development environment. ` +
          `Broker host "${mqttHost}" matches a production pattern. ` +
          `Set MQTT_BROKER_URL to a local development instance.`
        );
      }
    }

    // Warn if port is not the dev default (5433)
    if (env.DB.port === 5432 && !hasDatabaseUrl) {
      warnings.push(
        'DB_PORT is 5432 (default PostgreSQL port). ' +
        'Development stack uses port 5433. Ensure this is intentional.'
      );
    }
  }

  // ── 5. Report ──────────────────────────────────────────────────
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`[CONFIG] WARNING: ${w}`);
    }
  }

  if (errors.length > 0) {
    const message = errors.map(e => `  - ${e}`).join('\n');
    throw new Error(
      `Configuration validation failed (${errors.length} error(s)):\n${message}`
    );
  }

  return { valid: true, environment: env.NODE_ENV, warnings: warnings.length };
}

/**
 * Get a summary of the current configuration (safe to log, no secrets).
 * @param {object} env
 * @returns {object}
 */
export function getConfigSummary(env) {
  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    database: {
      hasUrl: !!env.DB.url,
      host: env.DB.host,
      database: env.DB.database,
      port: env.DB.port,
    },
    mqtt: {
      url: env.MQTT?.brokerUrl || '(not set)',
    },
    cors: env.CORS_ORIGIN,
  };
}
