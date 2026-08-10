import { consumeProvisioningToken } from '../services/provisioningTokenService.js';

/**
 * requireProvisioningAuth — gate de autenticación para POST /devices/register
 * (ISSUE-001 / PR-E).
 *
 * Acepta:
 *  1. Sesión JWT / API key ya validada (req.user presente → optionalAuth).
 *  2. Token de aprovisionamiento de un solo uso en header `X-Provision-Token`.
 *
 * Sin sesión ni token → 401. Ningún llamador anónimo puede acuñar credenciales
 * MQTT sin presentar un token válido (DoD ISSUE-001).
 */
export async function requireProvisioningAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  const rawToken = req.headers['x-provision-token'];
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(401).json({ error: 'Autenticación requerida', code: 'AUTH_REQUIRED' });
  }

  const deviceId = (req.body && req.body.deviceId) || undefined;
  const result = await consumeProvisioningToken(rawToken.trim(), { deviceId, ip: req.ip });

  if (!result.ok) {
    return res.status(result.status || 401).json({ error: result.error, code: result.code });
  }

  req.provisionToken = result.token;
  return next();
}
