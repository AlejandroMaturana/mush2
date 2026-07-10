/**
 * Authentication Middleware — Mush2 Backend
 * 
 * Middleware para validación de JWT y/o API Key.
 * Soporta autenticación dual:
 * 1. JWT via header `Authorization: Bearer <token>` (prioridad)
 * 2. API Key via header `X-API-Key: <key>` (fallback)
 * 
 * @module middlewares/auth
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiKey, User } from '../models/index.js';

async function authenticateWithApiKey(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return null;

  const keyHash = ApiKey.hashKey(apiKey);
  const key = await ApiKey.findOne({
    where: { keyHash, isActive: true },
    include: [{ model: User, attributes: ['id', 'username', 'role', 'isActive'] }],
  });

  if (!key) return { error: 'API key inválida' };
  if (!key.User || !key.User.isActive) return { error: 'Usuario inactivo' };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { error: 'API key expirada' };

  const clientIp = req.ip || req.connection?.remoteAddress;
  if (key.ipWhitelist && key.ipWhitelist.length > 0) {
    if (!key.ipWhitelist.includes(clientIp)) return { error: 'IP no autorizada para esta API key' };
  }

  await key.update({ lastUsedAt: new Date(), lastIpAddress: clientIp, authFailures: 0 });

  return {
    user: {
      id: key.User.id,
      username: key.User.username,
      role: key.User.role,
      authMethod: 'api_key',
      apiKeyId: key.id,
    },
  };
}

function authenticateWithJwt(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return { user: { ...decoded, authMethod: 'jwt' } };
  } catch (err) {
    if (err.name === 'TokenExpiredError') return { error: 'Token expirado', code: 'TOKEN_EXPIRED' };
    return { error: 'Token inválido' };
  }
}

export async function authenticate(req, res, next) {
  const jwtResult = authenticateWithJwt(req);
  if (jwtResult && jwtResult.user) {
    req.user = jwtResult.user;
    return next();
  }

  const apiResult = await authenticateWithApiKey(req);
  if (apiResult && apiResult.user) {
    req.user = apiResult.user;
    return next();
  }

  const errMsg = apiResult?.error || jwtResult?.error || 'Autenticación requerida';
  const code = jwtResult?.code;
  return res.status(401).json({ error: errMsg, ...(code ? { code } : {}) });
}

export async function optionalAuth(req, res, next) {
  const jwtResult = authenticateWithJwt(req);
  if (jwtResult && jwtResult.user) {
    req.user = jwtResult.user;
    return next();
  }

  const apiResult = await authenticateWithApiKey(req);
  if (apiResult && apiResult.user) {
    req.user = apiResult.user;
    return next();
  }

  req.user = null;
  next();
}

