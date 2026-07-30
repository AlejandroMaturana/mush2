import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSource(relativeFromRoot: string): string {
  return readFileSync(resolve(__dirname, '../../', relativeFromRoot), 'utf-8');
}

describe('REG-004: Sin prefijos duplicados en rutas', () => {
  it('species.js no incluye prefijo /species en sus rutas', () => {
    const source = readSource('routes/species.js');
    const routeLines = source.match(/router\.(get|post|put|patch|delete)\(\s*'[^']+'/g) || [];
    for (const line of routeLines) {
      const path = line.match(/'([^']+)'/)?.[1] || '';
      expect(path.startsWith('/species')).toBe(false);
    }
  });

  it('todos los routers montados en index.js usan un segmento único', () => {
    const indexSource = readSource('routes/index.js');
    const mounts = indexSource.match(/router\.use\('\/[^']+/g) || [];
    const paths = mounts.map(m => m.replace("router.use('", ''));
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(duplicates).toHaveLength(0);
  });
});
