import { describe, expect, it } from '@jest/globals';
import { classifyTelegramError } from '../services/telegramErrors.js';

function apiError(status, description) {
  const err = new Error(description);
  err.response = { status, body: { description } };
  return err;
}

describe('classifyTelegramError (ISSUE-048)', () => {
  it('401 → INVALID_TOKEN, no retryable, failed', () => {
    const c = classifyTelegramError(apiError(401, 'Unauthorized'));
    expect(c).toMatchObject({ kind: 'INVALID_TOKEN', code: 401, retryable: false, stateEffect: 'failed' });
  });

  it('403 → FORBIDDEN, no retryable, failed', () => {
    const c = classifyTelegramError(apiError(403, 'Forbidden: bot was blocked by the user'));
    expect(c).toMatchObject({ kind: 'FORBIDDEN', code: 403, retryable: false, stateEffect: 'failed' });
  });

  it('409 → POLLING_CONFLICT, retryable, degraded', () => {
    const c = classifyTelegramError(apiError(409, 'Conflict: terminated by other getUpdates request'));
    expect(c).toMatchObject({ kind: 'POLLING_CONFLICT', code: 409, retryable: true, stateEffect: 'degraded' });
  });

  it('429 → RATE_LIMITED, retryable, degraded', () => {
    const c = classifyTelegramError(apiError(429, 'Too Many Requests'));
    expect(c).toMatchObject({ kind: 'RATE_LIMITED', code: 429, retryable: true, stateEffect: 'degraded' });
  });

  it('timeout (ETIMEDOUT) → NETWORK_ERROR, retryable, degraded', () => {
    const err = new Error('connect ETIMEDOUT');
    err.code = 'ETIMEDOUT';
    const c = classifyTelegramError(err);
    expect(c).toMatchObject({ kind: 'NETWORK_ERROR', code: 'ETIMEDOUT', retryable: true, stateEffect: 'degraded' });
  });

  it('network error (ENOTFOUND) → NETWORK_ERROR, retryable, degraded', () => {
    const err = new Error('getaddrinfo ENOTFOUND api.telegram.org');
    err.code = 'ENOTFOUND';
    const c = classifyTelegramError(err);
    expect(c).toMatchObject({ kind: 'NETWORK_ERROR', code: 'ENOTFOUND', retryable: true, stateEffect: 'degraded' });
  });

  it('5xx → TELEGRAM_5XX, retryable, degraded', () => {
    const c = classifyTelegramError(apiError(502, 'Bad Gateway'));
    expect(c).toMatchObject({ kind: 'TELEGRAM_5XX', code: 502, retryable: true, stateEffect: 'degraded' });
  });

  it('other 4xx → TELEGRAM_API_ERROR, no retryable, degraded', () => {
    const c = classifyTelegramError(apiError(400, 'Bad Request: chat not found'));
    expect(c).toMatchObject({ kind: 'TELEGRAM_API_ERROR', code: 400, retryable: false, stateEffect: 'degraded' });
  });

  it('internal error (no response/code) → INTERNAL_ERROR, no retryable, unknown', () => {
    const c = classifyTelegramError(new Error('something broke'));
    expect(c).toMatchObject({ kind: 'INTERNAL_ERROR', code: null, retryable: false, stateEffect: 'unknown' });
    expect(c.description).toContain('something broke');
  });

  it('never throws on undefined/null', () => {
    expect(() => classifyTelegramError(undefined)).not.toThrow();
    expect(classifyTelegramError(null)).toMatchObject({ kind: 'INTERNAL_ERROR' });
  });

  it('keeps description from response body over message', () => {
    const c = classifyTelegramError(apiError(401, 'Unauthorized: token invalid'));
    expect(c.description).toBe('Unauthorized: token invalid');
  });
});
