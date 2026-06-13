/**
 * DB Backup Script
 *
 * Usage:
 *   node src/scripts/backup-db.js [--output ./backups]
 *
 * Creates a SQL dump of the mush2 database using pg_dump.
 * Requires pg_dump in PATH and DATABASE_URL or DB_* env vars.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { env } from '../config/env.js';

const args = process.argv.slice(2);
const outputDir = args.includes('--output')
  ? resolve(args[args.indexOf('--output') + 1])
  : resolve(process.cwd(), 'backups');

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
const filename = `mush2_backup_${timestamp}.sql`;
const filepath = resolve(outputDir, filename);

const dbUrl = env.DB.url || `postgresql://${env.DB.username}:${env.DB.password}@${env.DB.host}:${env.DB.port}/${env.DB.database}`;

console.log(`[Backup] DB: ${env.DB.database}@${env.DB.host}`);
console.log(`[Backup] Output: ${filepath}`);

try {
  execSync(
    `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges --verbose > "${filepath}"`,
    { stdio: 'inherit', timeout: 120000 }
  );
  console.log(`[Backup] OK — ${filename}`);
} catch (err) {
  console.error('[Backup] Error:', err.message);
  process.exit(1);
}
