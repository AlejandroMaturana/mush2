import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-010: Monitoring security — /monitoring/* tras auth+ADMIN y errores genéricos (I003/PR-F)', () => {
  const indexSource = readProjectFile('backend/src/routes/index.js');
  const monitoringSource = readProjectFile('backend/src/routes/monitoring.js');
  const adminSource = readProjectFile('backend/src/routes/admin.js');
  const appSource = readProjectFile('backend/src/app.js');
  const contract = readProjectFile('docs/contracts/api-contract.md');

  it('el montaje de /monitoring exige authenticate + rol ADMIN', () => {
    expect(indexSource).toMatch(/router\.use\('\/monitoring', authenticate, [^)]*requireMinRole\('ADMIN'\)/);
  });

  it('NINGÚN endpoint de monitoring filtra err.message al cliente', () => {
    expect(monitoringSource).not.toMatch(/json\(\{\s*error:\s*err\.message/);
  });

  it('NINGÚN endpoint de admin filtra err.message al cliente', () => {
    expect(adminSource).not.toMatch(/json\(\{\s*error:\s*err\.message/);
  });

  it('/health queda explícitamente público en app.js', () => {
    expect(appSource).toContain("app.get('/health'");
  });

  it('api-contract documenta que /monitoring/* requiere ADMIN y /health público', () => {
    expect(contract).toContain('/monitoring/metrics');
    expect(contract).toContain('ADMIN');
    expect(contract).toContain('/health');
  });
});
