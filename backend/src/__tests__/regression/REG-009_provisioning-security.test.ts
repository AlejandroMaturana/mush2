import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-009: Provisioning security — /devices/register autenticado + reload idempotente (I001/PR-E)', () => {
  const apiSource = readProjectFile('backend/src/routes/api.js');
  const tenantSource = readProjectFile('backend/src/middlewares/tenant.js');
  const serviceSource = readProjectFile('backend/src/services/mosquittoProvisioningService.js');
  const middlewareSource = readProjectFile('backend/src/middlewares/provisioningAuth.js');
  const modelSource = readProjectFile('backend/src/models/ProvisioningToken.js');
  const cliSource = readProjectFile('backend/src/scripts/create-provisioning-token.js');
  const contract = readProjectFile('docs/contracts/api-contract.md');

  it('middleware de aprovisionamiento consume el token y rechaza sin header', () => {
    expect(middlewareSource).toContain('consumeProvisioningToken');
    expect(middlewareSource).toContain('x-provision-token');
    expect(middlewareSource).toContain('AUTH_REQUIRED');
  });

  it('POST /devices/register monta rate-limit y middleware de aprovisionamiento', () => {
    expect(apiSource).toContain("router.post('/devices/register'");
    expect(apiSource).toContain('requireProvisioningAuth');
    expect(apiSource).toContain('refundProvisioningToken');
  });

  it('la ruta aplica rate limit por IP solo a anónimos (skip si req.user)', () => {
    expect(apiSource).toContain('rateLimit');
    expect(apiSource).toContain('skip: (req) => Boolean(req.user)');
  });

  it('tenantScope mantiene register en la whitelist solo para llegar al gate de token (no minting anónimo)', () => {
    expect(tenantSource).toContain('POST /api/v1/devices/register');
  });

  it('credenciales MQTT vinculadas a la clave de dispositivo (ADR-028)', () => {
    expect(apiSource).toContain('`dev_${deviceId}`');
    expect(apiSource).toContain('crypto.randomBytes');
  });

  it('el modelo NO almacena el token en claro: solo hash sha256', () => {
    expect(modelSource).toContain('tokenHash');
    expect(modelSource).toContain('sha256');
    expect(modelSource).toContain('musht_');
  });

  it('reload del broker usa SIGHUP idempotente y NO docker restart', () => {
    expect(serviceSource).toContain('kill');
    expect(serviceSource).toContain('HUP');
    expect(serviceSource).not.toContain("['docker', ['restart'");
    expect(serviceSource).not.toContain('docker restart');
  });

  it('la recarga se programa como job con debounce (scheduleReload)', () => {
    expect(serviceSource).toContain('scheduleReload');
    expect(serviceSource).toContain('setTimeout');
  });

  it('la CLI de emisión de tokens tiene guard de producción', () => {
    expect(cliSource).toContain('PROVISION_TOKEN_CREATE_SECRET');
    expect(cliSource).toContain('production');
  });

  it('existe migración versionada de provisioning_tokens', () => {
    const migrationsPath = resolve(PROJECT_ROOT, 'backend', 'src', 'db', 'migrations');
    const files = existsSync(migrationsPath)
      ? readdirSync(migrationsPath).filter((f) => f.endsWith('.cjs'))
      : [];
    expect(files.some((f) => f.includes('provisioning-tokens'))).toBe(true);
  });

  it('api-contract documenta el header X-Provision-Token y la exigencia de auth', () => {
    expect(contract).toContain('X-Provision-Token');
    expect(contract).toContain('devices/register');
    expect(contract).toContain('AUTH_REQUIRED');
  });
});
