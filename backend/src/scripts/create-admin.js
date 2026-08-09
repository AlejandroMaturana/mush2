/**
 * Create an admin (SUPER_ADMIN) user via CLI (I60).
 *
 * Replaces the admin created implicitly by seed.js with an explicit,
 * credential-safe bootstrap flow:
 *  - Never seeds `admin/admin123` into a database.
 *  - Requires ADMIN_CREATE_SECRET to match an env var in production.
 *  - Password is provided by the operator (--password or ADMIN_PASSWORD),
 *    never a hard-coded default.
 *
 * Usage:
 *   node src/scripts/create-admin.js --username admin --email admin@mush2.local --password '<secret>'
 *
 * Production requires:
 *   ADMIN_CREATE_SECRET=<secret> node src/scripts/create-admin.js \
 *     --username admin --email admin@mush2.local --password '<secret>' --secret '<same-secret>'
 *
 * Exits non-zero on guard violation or failure (fail-fast, ADR-029).
 */
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
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

export function isAdminCreateAllowed(nodeEnv = env.NODE_ENV) {
  if (nodeEnv === 'development' || nodeEnv === 'test') return true;
  return nodeEnv === 'production';
}

export async function createAdmin({ username, email, password }) {
  if (!username || !email || !password) {
    throw new Error('create-admin requires --username, --email and --password.');
  }
  if (password.length < 8) {
    throw new Error('create-admin requires a password of at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user, created] = await User.findOrCreate({
    where: { username },
    defaults: { username, email, passwordHash, role: 'SUPER_ADMIN' },
  });

  if (!created) {
    await user.update({ email, passwordHash, role: 'SUPER_ADMIN', isActive: true });
    console.log(`[create-admin] Usuario "${username}" actualizado (SUPER_ADMIN).`);
  } else {
    console.log(`[create-admin] Usuario "${username}" creado (SUPER_ADMIN).`);
  }
  return user;
}

async function main() {
  const { username, email, password, secret } = parseArgs();

  try {
    validate(env);
  } catch (err) {
    console.error(`[create-admin] Configuration validation failed:\n${err.message}`);
    process.exit(1);
  }

  if (!isAdminCreateAllowed()) {
    console.error(
      `[create-admin] REFUSED: cannot run in environment "${env.NODE_ENV}". ` +
      'Use development/test locally, or production with ADMIN_CREATE_SECRET set.'
    );
    process.exit(1);
  }

  if (env.NODE_ENV === 'production') {
    const expectedSecret = process.env.ADMIN_CREATE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      console.error(
        '[create-admin] REFUSED: production requires --secret to match the ADMIN_CREATE_SECRET environment variable.'
      );
      process.exit(1);
    }
  }

  try {
    await createAdmin({ username, email, password });
  } catch (err) {
    console.error(`[create-admin] Error: ${err.message}`);
    process.exit(1);
  }
}

// Self-execute when run directly: `node src/scripts/create-admin.js`
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('/create-admin.js') || process.argv[1].endsWith('\\create-admin.js')
);

if (isDirectRun) {
  main();
}

export default main;
