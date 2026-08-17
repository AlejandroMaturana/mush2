import { describe, it, expect } from '@jest/globals';

// I009 — Subscription PLANS quotas must match capability-catalog.md
// and be strictly monotonic: FREE < BASIC < PREMIUM.

const PLANS = {
  FREE: { apiCallsPerMonth: 1000, dataRetentionDays: 7 },
  BASIC: { apiCallsPerMonth: 5000, dataRetentionDays: 30 },
  PREMIUM: { apiCallsPerMonth: 25000, dataRetentionDays: 365 },
};

describe('Subscription PLANS — monotonicity (I009)', () => {
  it('apiCallsPerMonth is strictly increasing: FREE < BASIC < PREMIUM', () => {
    expect(PLANS.FREE.apiCallsPerMonth).toBeLessThan(PLANS.BASIC.apiCallsPerMonth);
    expect(PLANS.BASIC.apiCallsPerMonth).toBeLessThan(PLANS.PREMIUM.apiCallsPerMonth);
  });

  it('dataRetentionDays is strictly increasing: FREE < BASIC < PREMIUM', () => {
    expect(PLANS.FREE.dataRetentionDays).toBeLessThan(PLANS.BASIC.dataRetentionDays);
    expect(PLANS.BASIC.dataRetentionDays).toBeLessThan(PLANS.PREMIUM.dataRetentionDays);
  });

  it('FREE matches capability-catalog.md (1000 API / 7 days)', () => {
    expect(PLANS.FREE).toEqual({ apiCallsPerMonth: 1000, dataRetentionDays: 7 });
  });

  it('BASIC matches capability-catalog.md (5000 API / 30 days)', () => {
    expect(PLANS.BASIC).toEqual({ apiCallsPerMonth: 5000, dataRetentionDays: 30 });
  });

  it('PREMIUM matches capability-catalog.md (25000 API / 365 days)', () => {
    expect(PLANS.PREMIUM).toEqual({ apiCallsPerMonth: 25000, dataRetentionDays: 365 });
  });
});
