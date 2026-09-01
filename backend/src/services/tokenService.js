import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';

const ACCESS_TTL_SECONDS = 3600;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL_SECONDS, jwtid: randomUUID() });
}

export function signRefreshToken(user, jti) {
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, `${env.JWT_SECRET}_refresh`, { expiresIn: REFRESH_TTL_SECONDS, jwtid: jti });
}

export function parseRefreshToken(req) {
  if (req.body && req.body.refreshToken) return req.body.refreshToken;
  const cookieHeader = req.headers && req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(`${COOKIE_NAME}=`.length));
}

export function setRefreshCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${REFRESH_TTL_SECONDS}`,
  ];
  if (env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearRefreshCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0`
  );
}

export async function issueRefreshToken(user) {
  const jti = randomUUID();
  const token = signRefreshToken(user, jti);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await RefreshToken.create({
    userId: user.id,
    jti,
    tokenHash: RefreshToken.hashToken(token),
    expiresAt,
  });
  return { token, jti, expiresAt };
}

export async function verifyAndRotate(rawToken) {
  let decoded;
  try {
    decoded = jwt.verify(rawToken, `${env.JWT_SECRET}_refresh`);
  } catch {
    return { ok: false, status: 401, error: 'REFRESH_EXPIRED' };
  }

  const record = await RefreshToken.findOne({ where: { jti: decoded.jti, userId: decoded.id } });
  if (!record || record.revokedAt || record.tokenHash !== RefreshToken.hashToken(rawToken)) {
    return { ok: false, status: 401, error: 'Refresh token revocado' };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, status: 401, error: 'Refresh token revocado' };
  }

  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    return { ok: false, status: 401, error: 'Refresh token revocado' };
  }

  const newJti = randomUUID();
  const newToken = signRefreshToken(user, newJti);
  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await record.update({ revokedAt: new Date(), replacedByJti: newJti });
  await RefreshToken.create({
    userId: user.id,
    jti: newJti,
    tokenHash: RefreshToken.hashToken(newToken),
    expiresAt: newExpiresAt,
  });

  return { ok: true, token: newToken, expiresAt: newExpiresAt, user };
}

export async function revokeAllForUser(userId) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } }
  );
}
