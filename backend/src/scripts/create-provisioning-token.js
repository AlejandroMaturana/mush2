/**
 * Create a one-time provisioning token via CLI (ISSUE-001 / PR-E).
 *
 * Emite un token de aprovisionamiento de un solo uso (cuota `maxUses`) para
 * el registro de dispositivos (`POST /devices/register`). El token crudo se
 * imprime UNA sola vez; la base de datos conserva solo su hash sha256.
 *
 * Usage:
 *   node src/scripts/create-provisioning-token.js --label "flota-1" --max-uses 1
 *   node src/scripts/create-provisioning-token.js --label "dev-a" --device-id mush2_A0F262E55CBC
 *
 * Production requires:
 *   PROVISION_TOKEN_CREATE_SECRET=<secret> node src/scripts/create-provisioning-token.js \
 *     --label "flota-1" --secret '<same-secret>'
 *
 * Exits non-zero on guard violation or failure (fail-fast, ADR-029).
 */
import { createProvisioningToken } from '../services/provisioningTokenService.js';
import sequelize from '../config/database.js';
import { env } from '../config/env.js';
import { validate } from '../config/ConfigurationService.js';

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

export function isProvisionTokenCreateAllowed(nodeEnv = env.NODE_ENV) {
  if (nodeEnv === 'development' || nodeEnv === 'test') return true;
  return nodeEnv === 'production';
}

async function main() {
  const {
    label,
    'max-uses': maxUses,
    'ttl-days': ttlDays,
    'device-id': deviceId,
    secret,
  } = parseArgs();

  try {
    validate(env);
  } catch (err) {
    console.error(`[create-provisioning-token] Configuration validation failed:\n${err.message}`);
    process.exit(1);
  }

  if (!isProvisionTokenCreateAllowed()) {
    console.error(
      `[create-provisioning-token] REFUSED: cannot run in environment "${env.NODE_ENV}". ` +
      'Use development/test locally, or production with PROVISION_TOKEN_CREATE_SECRET set.'
    );
    process.exit(1);
  }

  if (env.NODE_ENV === 'production') {
    const expectedSecret = process.env.PROVISION_TOKEN_CREATE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      console.error(
        '[create-provisioning-token] REFUSED: production requires --secret to match the PROVISION_TOKEN_CREATE_SECRET environment variable.'
      );
      process.exit(1);
    }
  }

  try {
    const { raw } = await createProvisioningToken({ label, maxUses, ttlDays, deviceId });
    console.log('[create-provisioning-token] Token de aprovisionamiento creado (el token se muestra UNA sola vez):');
    console.log(raw);
    console.log('[create-provisioning-token] Usarlo en el header `X-Provision-Token` de POST /devices/register.');
  } catch (err) {
    console.error(`[create-provisioning-token] Error: ${err.message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Self-execute when run directly: `node src/scripts/create-provisioning-token.js`
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('/create-provisioning-token.js') || process.argv[1].endsWith('\\create-provisioning-token.js')
);

if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[create-provisioning-token] Fatal: ${err.message}`);
      process.exit(1);
    });
}

export default main;
