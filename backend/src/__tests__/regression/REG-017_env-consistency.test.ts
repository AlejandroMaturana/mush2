import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

const NODE_22_DIGEST = 'sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32';
const PG16_DIGEST = 'sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777';
const MOSQUITTO_2_DIGEST = 'sha256:6f8d8a947c506f8a2290ec65cd4bd2bc7cb4d43fb5f6271f861cb013e2ef9797';

describe('REG-017: Env Consistency (PR-B: I64/I63/I73/I79/I83)', () => {
  const ci = readProjectFile('.github/workflows/ci.yml');
  const dockerfile = readProjectFile('Dockerfile');
  const compose = readProjectFile('docker-compose.yml');
  const composeDev = readProjectFile('docker-compose.dev.yml');
  const deployment = readProjectFile('docs/operations/deployment.md');

  describe('I064 — Node 22 en CI (runtime validado = prod)', () => {
    it('ci.yml fija NODE_VERSION 22', () => {
      expect(ci).toMatch(/NODE_VERSION:\s*'22'/);
    });
  });

  describe('I063 — PG16 en CI/compose/docs (una sola versión)', () => {
    it('ci.yml usa postgres:16-alpine (no 18)', () => {
      expect(ci).not.toContain('postgres:18');
      expect(ci).toContain('image: postgres:16-alpine');
    });

    it('deployment.md no referencia PostgreSQL 18', () => {
      expect(deployment).not.toContain('PostgreSQL 18');
      expect(deployment).not.toMatch(/PostgreSQL\s+18/);
    });
  });

  describe('I073 — lockfile estricto (frozen-lockfile)', () => {
    it('Dockerfile no tiene fallback `|| pnpm install`', () => {
      expect(dockerfile).not.toContain('|| pnpm install');
    });

    it('ci.yml instala con --frozen-lockfile en backend y frontend', () => {
      const frozenCount = (ci.match(/pnpm install --frozen-lockfile/g) || []).length;
      expect(frozenCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('I079 — imágenes base pinneadas a digest (reproducibles)', () => {
    it('Dockerfile usa node:22-alpine@sha256', () => {
      const nodeRefs = dockerfile.match(/FROM node:22-alpine@sha256:[0-9a-f:+]+/g) || [];
      expect(nodeRefs.length).toBe(2);
      expect(nodeRefs[0]).toContain(NODE_22_DIGEST);
      expect(nodeRefs[1]).toContain(NODE_22_DIGEST);
    });

    it('docker-compose pinnea postgres:16-alpine y eclipse-mosquitto:2 a digest', () => {
      expect(compose).toContain(`eclipse-mosquitto:2@${MOSQUITTO_2_DIGEST}`);
      expect(compose).toContain(`postgres:16-alpine@${PG16_DIGEST}`);
    });

    it('docker-compose.dev pinnea las mismas imágenes a digest', () => {
      expect(composeDev).toContain(`eclipse-mosquitto:2@${MOSQUITTO_2_DIGEST}`);
      expect(composeDev).toContain(`postgres:16-alpine@${PG16_DIGEST}`);
    });

    it('ci.yml postgres:16-alpine pinneada a digest', () => {
      expect(ci).toContain(`image: postgres:16-alpine@${PG16_DIGEST}`);
    });
  });

  describe('I083 — toolchain firmware pinneada', () => {
    it('ci.yml fija python 3.11 (no 3.12)', () => {
      expect(ci).toMatch(/python-version: '3\.11'/);
      expect(ci).not.toMatch(/python-version: '3\.12'/);
    });

    it('ci.yml instala platformio con versión fija (no latest)', () => {
      expect(ci).toMatch(/pip install platformio==/);
      expect(ci).not.toMatch(/pip install platformio\s*$/);
    });
  });
});