import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-012: Rate limit coverage — sin skip de /devices ni /actuators (I019/PR-J)', () => {
  const appSource = readProjectFile('backend/src/app.js');
  const subSource = readProjectFile('backend/src/middlewares/subscriptionRateLimit.js');
  const contract = readProjectFile('docs/contracts/api-contract.md');

  it('el limiter global NO omite /devices por método GET', () => {
    expect(appSource).not.toContain("req.originalUrl.startsWith('/api/v1/devices')");
  });

  it('el limiter global NO omite /actuators por método GET', () => {
    expect(appSource).not.toContain("req.originalUrl.startsWith('/api/v1/actuators')");
  });

  it('el skip del limiter no combina isDev con rutas sensibles', () => {
    expect(appSource).not.toMatch(/skip:\s*\(req\)\s*=>\s*isDev\s*\|\|/);
  });

  it('el limiter global sigue configurado con límite por IP (max + windowMs)', () => {
    expect(appSource).toContain('rateLimit({');
    expect(appSource).toContain('windowMs:');
    expect(appSource).toContain('max:');
    expect(appSource).toContain("app.use('/api/', limiter)");
  });

  it('la franquicia autenticada se mantiene vía subscriptionRateLimit (plan por usuario)', () => {
    expect(subSource).toContain('apiCallsPerMonth');
    expect(subSource).toContain('isExceeded');
    expect(subSource).toContain("res.status(429)");
    expect(subSource).toContain('rate_limit_exceeded');
  });

  it('api-contract documenta el throttling de rutas de devices/actuators', () => {
    expect(contract).toContain('429');
    expect(contract).toContain('Demasiadas solicitudes, intente más tarde');
    expect(contract).toMatch(/GET \/devices/);
    expect(contract).toMatch(/actuators/);
  });
});
