/**
 * Catalog-only seed CLI (I68).
 *
 * Seeds the reference catalog (species/recipes) independently from
 * development fixtures, without injecting test users, chambers or fake
 * external credentials.
 *
 * Guards (double):
 *  1. NODE_ENV — allowed in development/test; in production it requires
 *     an explicit opt-in flag.
 *  2. ALLOW_CATALOG_SEED=true — explicit flag required in production.
 *
 * Usage:
 *   node src/db/seed-catalog.js                    # development/test
 *   ALLOW_CATALOG_SEED=true node src/db/seed-catalog.js   # production
 */
import { runCatalogSeedAndClose } from './catalog-seed.js';
import { env } from '../config/env.js';

export function catalogSeedAllowed(nodeEnv = env.NODE_ENV, allowFlag = process.env.ALLOW_CATALOG_SEED) {
  if (nodeEnv === 'development' || nodeEnv === 'test') return true;
  return nodeEnv === 'production' && allowFlag === 'true';
}

async function main() {
  if (!catalogSeedAllowed()) {
    console.error(
      '[Seed-Catalog] REFUSED: catalog seed requires ALLOW_CATALOG_SEED=true ' +
      `in production. Current NODE_ENV="${env.NODE_ENV}".`
    );
    process.exit(1);
  }

  await runCatalogSeedAndClose();
}

// Self-execute when run directly: `node src/db/seed-catalog.js`
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('/seed-catalog.js') || process.argv[1].endsWith('\\seed-catalog.js')
);

if (isDirectRun) {
  main();
}

export default main;
