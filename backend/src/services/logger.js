import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(__dirname, '../../logs');
const LOG_FILE = resolve(LOG_DIR, 'backend.log');

if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

const defaultTimeZone = () => process.env.LOG_TIME_ZONE
  || Intl.DateTimeFormat().resolvedOptions().timeZone
  || 'UTC';

const timeZoneAbbr = (date, timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value.replace(/[^A-Za-z0-9]/g, '') : '???';
  } catch {
    return '???';
  }
};

const timestampParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map(part => [part.type, part.value]));
};

export function formatLogPrefix(date = new Date(), timeZone = defaultTimeZone()) {
  const parts = timestampParts(date, timeZone);
  const tz = timeZoneAbbr(date, timeZone);
  return `[${parts.day}-${parts.month}-${parts.year}_${parts.hour}:${parts.minute}:${parts.second}_${tz}]`;
}

function appendToFile(line) {
  try {
    appendFileSync(LOG_FILE, line + '\n', 'utf-8');
  } catch {
    // silent
  }
}

let installed = false;

export function installTimestampedConsole({ timeZone = defaultTimeZone() } = {}) {
  if (installed) return;

  appendToFile('');
  appendToFile(`--- Backend started PID ${process.pid} ---`);

  for (const method of ['debug', 'error', 'info', 'log', 'warn']) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      const prefix = formatLogPrefix(new Date(), timeZone);
      original(prefix, ...args);
      appendToFile([prefix, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))].join(' '));
    };
  }

  installed = true;
}
