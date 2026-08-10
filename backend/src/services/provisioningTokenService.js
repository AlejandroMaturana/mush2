import ProvisioningToken from '../models/ProvisioningToken.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('PROV_TOKEN');

/**
 * ProvisioningTokenService — emisión y consumo atómico de tokens de
 * aprovisionamiento de un solo uso (ISSUE-001 / PR-E).
 *
 * El token crudo solo se muestra una vez (CLI/operador); la base de datos
 * conserva únicamente el hash sha256.
 */

export async function createProvisioningToken({
  label = null,
  maxUses = 1,
  ttlDays = null,
  deviceId = null,
} = {}) {
  const uses = Math.max(1, Number.parseInt(maxUses, 10) || 1);
  const { raw, hash } = ProvisioningToken.generate();
  const expiresAt = ttlDays
    ? new Date(Date.now() + Number.parseInt(ttlDays, 10) * 24 * 60 * 60 * 1000)
    : null;

  const token = await ProvisioningToken.create({
    tokenHash: hash,
    label: label || null,
    deviceId: deviceId || null,
    maxUses: uses,
    usesRemaining: uses,
    expiresAt,
  });

  return { id: token.id, raw, token };
}

/**
 * Consume una cuota del token de forma atómica (optimistic lock sobre
 * `usesRemaining`): si dos peticiones concurrentes usan el mismo token,
 * solo una logra decrementar.
 */
export async function consumeProvisioningToken(rawToken, { deviceId = null, ip = null } = {}) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { ok: false, status: 401, code: 'INVALID_TOKEN', error: 'Token de aprovisionamiento inválido' };
  }

  const tokenHash = ProvisioningToken.hashToken(rawToken);
  const token = await ProvisioningToken.findOne({ where: { tokenHash } });

  if (!token) {
    log.warn({ event: 'TOKEN_NOT_FOUND', ip }, 'Provisioning token invalid');
    return { ok: false, status: 401, code: 'INVALID_TOKEN', error: 'Token de aprovisionamiento inválido' };
  }

  if (token.revokedAt) {
    return { ok: false, status: 401, code: 'TOKEN_REVOKED', error: 'Token de aprovisionamiento revocado' };
  }

  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    return { ok: false, status: 401, code: 'TOKEN_EXPIRED', error: 'Token de aprovisionamiento expirado' };
  }

  if (token.deviceId && deviceId !== token.deviceId) {
    return { ok: false, status: 403, code: 'TOKEN_DEVICE_MISMATCH', error: 'El token no está vinculado a este dispositivo' };
  }

  if (token.usesRemaining <= 0) {
    return { ok: false, status: 401, code: 'TOKEN_EXHAUSTED', error: 'Token de aprovisionamiento sin usos disponibles' };
  }

  const [affected] = await ProvisioningToken.update(
    { usesRemaining: token.usesRemaining - 1, lastUsedAt: new Date() },
    { where: { id: token.id, usesRemaining: token.usesRemaining } },
  );

  if (affected === 0) {
    return { ok: false, status: 401, code: 'TOKEN_EXHAUSTED', error: 'Token de aprovisionamiento sin usos disponibles' };
  }

  log.info({ event: 'TOKEN_CONSUMED', tokenId: token.id, deviceId, ip }, 'Provisioning token consumed');
  return { ok: true, token: { id: token.id, label: token.label, deviceId: token.deviceId } };
}

/**
 * Reintegra una cuota si el registro no llegó a completarse (body inválido o
 * error 5xx). Nunca supera maxUses.
 */
export async function refundProvisioningToken(tokenId) {
  if (!tokenId) return { ok: false };
  const token = await ProvisioningToken.findByPk(tokenId);
  if (!token) return { ok: false };
  if (token.usesRemaining < token.maxUses) {
    await token.increment('usesRemaining');
  }
  return { ok: true };
}

export async function revokeProvisioningToken(tokenId) {
  const token = await ProvisioningToken.findByPk(tokenId);
  if (!token) return { ok: false, error: 'Token no encontrado' };
  await token.update({ revokedAt: new Date() });
  return { ok: true, token };
}

export async function listProvisioningTokens() {
  return ProvisioningToken.findAll({
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['tokenHash'] },
  });
}
