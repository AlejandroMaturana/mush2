import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, '../../logs/backend.log');

const LEVEL_ORDER = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };

export async function readLogs({ level, module: mod, limit = 100, offset = 0 } = {}) {
  const results = [];
  let skipped = 0;

  try {
    const fileStream = createReadStream(LOG_FILE, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;

      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      if (level && LEVEL_ORDER[parsed.level] < LEVEL_ORDER[level]) continue;
      if (mod && parsed.module !== mod) continue;

      if (skipped < offset) {
        skipped++;
        continue;
      }

      results.push(parsed);
      if (results.length >= limit) break;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  return results;
}
