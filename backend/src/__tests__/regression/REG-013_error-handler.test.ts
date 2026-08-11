import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-013: Generic error responses — middleware global de error (I027/PR-K)', () => {
  const appSource = readProjectFile('backend/src/app.js');
  const handlerSource = readProjectFile('backend/src/middlewares/errorHandler.js');
  const monitoringSource = readProjectFile('backend/src/routes/monitoring.js');
  const adminSource = readProjectFile('backend/src/routes/admin.js');

  it('existe un middleware global de error en middlewares/errorHandler.js', () => {
    expect(handlerSource).toContain('err');
    expect(handlerSource).toContain('res');
    expect(handlerSource).toContain('next');
  });

  it('el middleware tiene firma de 4 argumentos (err, req, res, next)', () => {
    const hasFunctionForm = /function\s+\w*\(err,\s*req,\s*res,\s*next\)/.test(handlerSource);
    const hasArrowForm = /\(err,\s*req,\s*res,\s*next\)\s*=>/.test(handlerSource);
    expect(hasFunctionForm || hasArrowForm).toBe(true);
  });

  it('responde 500 genérico sin err.message al cliente', () => {
    expect(handlerSource).toContain("'SERVER_ERROR'");
    expect(handlerSource).toContain("'Error interno del servidor'");
    expect(handlerSource).not.toMatch(/json\(\{[\s\S]*err\.message/);
  });

  it('loguea el detalle (err.message) SOLO en servidor con child logger', () => {
    expect(handlerSource).toContain('createChildLogger');
    expect(handlerSource).toContain('log.error');
    expect(handlerSource).toContain('err.message');
  });

  it('app.js importa y monta el errorHandler al final de la pila', () => {
    expect(appSource).toContain("import errorHandler from './middlewares/errorHandler.js'");
    const handlerIndex = appSource.indexOf('app.use(errorHandler)');
    const routerIndex = appSource.indexOf("app.use('/api/v1', router)");
    expect(handlerIndex).toBeGreaterThan(-1);
    expect(routerIndex).toBeGreaterThan(-1);
    expect(handlerIndex).toBeGreaterThan(routerIndex);
  });

  it('regresión: monitoring y admin siguen genéricos (sin err.message al cliente)', () => {
    expect(monitoringSource).not.toMatch(/json\(\{\s*error:\s*err\.message/);
    expect(adminSource).not.toMatch(/json\(\{\s*error:\s*err\.message/);
  });
});
