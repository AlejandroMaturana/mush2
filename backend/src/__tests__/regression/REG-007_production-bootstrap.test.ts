import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { isSeedAllowed } from '../../seed.js';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

function hasMigrationFiles(): boolean {
  const migrationsPath = resolve(PROJECT_ROOT, 'backend', 'src', 'db', 'migrations');
  if (!existsSync(migrationsPath)) return false;
  return readdirSync(migrationsPath).some((f) => f.endsWith('.cjs') || f.endsWith('.js'));
}

describe('REG-007: Production bootstrap hardening (I60/I61/I68)', () => {
  const dockerfile = readProjectFile('Dockerfile');

  it('Dockerfile CMD no ejecuta seed.js ni sync-db.js', () => {
    const cmdLine = dockerfile.split('\n').find((l) => l.startsWith('CMD')) || '';
    expect(cmdLine).not.toContain('seed.js');
    expect(cmdLine).not.toContain('sync-db.js');
  });

  it('Dockerfile CMD aplica migraciones versionadas antes de arrancar', () => {
    const cmdLine = dockerfile.split('\n').find((l) => l.startsWith('CMD')) || '';
    expect(cmdLine).toContain('db:migrate');
  });

  it('existen migraciones versionadas (snapshot inicial)', () => {
    expect(hasMigrationFiles()).toBe(true);
  });

  it('seed.js rechaza ejecutarse en producción', () => {
    expect(isSeedAllowed('production')).toBe(false);
    expect(isSeedAllowed('development')).toBe(true);
    expect(isSeedAllowed('test')).toBe(true);
  });

  it('sync-db.js incorpora guard de producción (sin alter:true en prod)', () => {
    const source = readProjectFile('backend/src/sync-db.js');
    expect(source).toContain('isSyncAllowed');
    expect(source).toContain('production');
  });

  it('existe seed-catalog.js separado de fixtures con guard explícito', () => {
    const catalogPath = resolve(PROJECT_ROOT, 'backend', 'src', 'db', 'seed-catalog.js');
    expect(existsSync(catalogPath)).toBe(true);
    const source = readFileSync(catalogPath, 'utf-8');
    expect(source).toContain('catalogSeedAllowed');
  });

  it('existe CLI de creación de admin por secret', () => {
    const cliPath = resolve(PROJECT_ROOT, 'backend', 'src', 'scripts', 'create-admin.js');
    expect(existsSync(cliPath)).toBe(true);
  });
});
