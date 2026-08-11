import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SEED_BCRYPT_ROUNDS } from '../../seed.js';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-011: Bootstrap config fail-fast (I16/I72)', () => {
  describe('I16 — bcrypt cost en bootstrap', () => {
    it('seed.js usa bcrypt cost >= 12 (constante exportada)', () => {
      expect(SEED_BCRYPT_ROUNDS).toBeGreaterThanOrEqual(12);
    });

    it('seed.js no usa bcrypt cost < 12 en el hash de fixtures', () => {
      const seedSource = readProjectFile('backend/src/seed.js');
      expect(seedSource).toContain('SEED_BCRYPT_ROUNDS');
      expect(seedSource).not.toContain('bcrypt.hash(u.password, 10)');
      expect(seedSource).not.toContain('bcrypt.hash(u.password, 11)');
    });

    it('create-admin.js (CLI/secret) usa bcrypt cost >= 12', () => {
      const adminSource = readProjectFile('backend/src/scripts/create-admin.js');
      expect(adminSource).not.toContain('bcrypt.hash(password, 10)');
      expect(adminSource).not.toContain('bcrypt.hash(password, 11)');
      expect(adminSource).toContain('bcrypt.hash(password, 12)');
    });
  });

  describe('I72 — validate(env) fail-fast en sync/seed', () => {
    it('sync-db.js importa y llama validate(env) antes de operar sobre la BD', () => {
      const syncSource = readProjectFile('backend/src/sync-db.js');
      expect(syncSource).toContain('ConfigurationService');
      expect(syncSource).toContain('validate(env)');
    });

    it('seed.js importa y llama validate(env) antes de operar sobre la BD', () => {
      const seedSource = readProjectFile('backend/src/seed.js');
      expect(seedSource).toContain('ConfigurationService');
      expect(seedSource).toContain('validate(env)');
    });

    it('env.js mantiene fallback de JWT_SECRET marcado como default de desarrollo', () => {
      const envSource = readProjectFile('backend/src/config/env.js');
      expect(envSource).toContain("'dev-secret-change-in-production'");
    });

    it('ConfigurationService valida JWT_SECRET en producción', () => {
      const configSource = readProjectFile('backend/src/config/ConfigurationService.js');
      expect(configSource).toContain("'dev-secret-change-in-production'");
      expect(configSource).toContain("env.NODE_ENV === 'production'");
    });
  });
});
