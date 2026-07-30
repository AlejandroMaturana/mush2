import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSource(relativeFromRoot: string): string {
  return readFileSync(resolve(__dirname, '../../', relativeFromRoot), 'utf-8');
}

describe('REG-003: Chambers routes contract', () => {
  const chambersSource = readSource('routes/chambers.js');

  it('todas las rutas CRUD llevan middleware authenticate', () => {
    expect(chambersSource).toContain("router.get('/', authenticate");
    expect(chambersSource).toContain("router.get('/:id', authenticate");
    expect(chambersSource).toContain("router.post('/', authenticate");
    expect(chambersSource).toContain("router.patch('/:id', authenticate");
    expect(chambersSource).toContain("router.delete('/:id', authenticate");
  });

  it('DELETE requiere ADMIN', () => {
    expect(chambersSource).toContain("requireMinRole('ADMIN')");
  });

  it('POST /migrate requiere ADMIN', () => {
    expect(chambersSource).toContain("router.post('/migrate', authenticate, requireMinRole('ADMIN')");
  });
});
