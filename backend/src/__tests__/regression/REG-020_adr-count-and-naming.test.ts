import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-020: Conteo de ADRs y naming WebSocket (ISSUE-094 / ISSUE-103)', () => {
  describe('ISSUE-094 — README refleja 33 ADRs', () => {
    it('README.md de la raíz declara 33 ADRs (ADR-001 a ADR-033)', () => {
      const readme = readProjectFile('README.md');
      expect(readme).toContain('33 Architecture Decision Records (ADR-001 a ADR-033)');
    });

    it('docs/ADR/README.md referencia ADR-033', () => {
      const adrReadme = readProjectFile('docs/ADR/README.md');
      expect(adrReadme).toContain('ADR-033');
    });
  });

  describe('ISSUE-103 — webSocketServer se documenta como WebSocket, no SSE', () => {
    it('docs/architecture/backend.md ya no dice "Server para eventos SSE"', () => {
      const backendDoc = readProjectFile('docs/architecture/backend.md');
      expect(backendDoc).not.toContain('Server para eventos SSE');
      expect(backendDoc).toContain('webSocketServer.js');
    });

    it('docs/architecture/capability-matrix.md ya no dice "| SSE Server |"', () => {
      const matrix = readProjectFile('docs/architecture/capability-matrix.md');
      expect(matrix).not.toContain('| SSE Server |');
    });

    it('docs/diagrams/architecture.mmd usa WS Server', () => {
      const mmd = readProjectFile('docs/diagrams/architecture.mmd');
      expect(mmd).not.toContain('SSE Server');
      expect(mmd).toContain('WS Server');
    });

    it('docs/diagrams/sequence-telemetry.mmd usa WebSocket Server', () => {
      const seq = readProjectFile('docs/diagrams/sequence-telemetry.mmd');
      expect(seq).not.toContain('participant SSE as SSE Server');
      expect(seq).toContain('participant WS as WebSocket Server');
    });

    it('docs/DDD/DDD-007-migration-roadmap.md ya no dice "SSE Server"', () => {
      const ddd = readProjectFile('docs/DDD/DDD-007-migration-roadmap.md');
      expect(ddd).not.toContain('SSE Server');
    });
  });
});
