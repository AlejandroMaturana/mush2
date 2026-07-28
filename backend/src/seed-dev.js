/**
 * Development-only seed script (ADR-029).
 *
 * Wraps the existing seed.js with an environment guard:
 * - Verifies NODE_ENV=development before running
 * - Uses the development database configuration
 *
 * Usage: npm run db:seed:dev
 */
import { env } from './config/env.js';
import { validate } from './config/ConfigurationService.js';

async function seedDev() {
  // ── Environment guard ──────────────────────────────────────────
  if (env.NODE_ENV !== 'development') {
    console.error(
      `[Seed-Dev] REFUSED: This script can only run in development mode. ` +
      `Current NODE_ENV: "${env.NODE_ENV}". Use npm run db:seed for production.`
    );
    process.exit(1);
  }

  // ── Validate configuration ─────────────────────────────────────
  try {
    validate(env);
    console.log(`[Seed-Dev] Environment validated: ${env.NODE_ENV}`);
    console.log(`[Seed-Dev] Database: ${env.DB.host}:${env.DB.port}/${env.DB.database}`);
  } catch (err) {
    console.error(`[Seed-Dev] Configuration validation failed:\n${err.message}`);
    process.exit(1);
  }

  // ── Run seed ───────────────────────────────────────────────────
  console.log('[Seed-Dev] Starting development seed...');
  const { default: seed } = await import('./seed.js');
  // seed.js self-executes, so the import triggers it
}

seedDev();
