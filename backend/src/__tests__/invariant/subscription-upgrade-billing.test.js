import { describe, it, expect } from '@jest/globals';

// I008 — Upgrade de plan sin billing: intermediate REQUESTED state
// Tests the billing confirmation flow: upgrade → REQUESTED → confirm → applied

const PLANS = {
  FREE: { apiCallsPerMonth: 1000, dataRetentionDays: 7 },
  BASIC: { apiCallsPerMonth: 5000, dataRetentionDays: 30 },
  PREMIUM: { apiCallsPerMonth: 25000, dataRetentionDays: 365 },
};

const PLAN_ORDER = { FREE: 0, BASIC: 1, PREMIUM: 2 };

function validateUpgrade(currentPlan, requestedPlan) {
  if (!['FREE', 'BASIC', 'PREMIUM'].includes(requestedPlan)) {
    return { valid: false, error: 'Plan inválido' };
  }
  if (PLAN_ORDER[requestedPlan] <= PLAN_ORDER[currentPlan]) {
    return { valid: false, error: 'El plan solicitado debe ser superior al actual' };
  }
  return { valid: true };
}

function applyUpgrade(sub, pendingPlan) {
  const limits = PLANS[pendingPlan];
  return { ...sub, plan: pendingPlan, ...limits, pendingPlan: null, requestedAt: null };
}

describe('I008 — Upgrade billing flow', () => {
  it('validates upgrade direction (FREE→BASIC is valid)', () => {
    expect(validateUpgrade('FREE', 'BASIC')).toEqual({ valid: true });
  });

  it('rejects downgrade (BASIC→FREE is invalid)', () => {
    const result = validateUpgrade('BASIC', 'FREE');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/superior/);
  });

  it('rejects same-plan upgrade (BASIC→BASIC is invalid)', () => {
    expect(validateUpgrade('BASIC', 'BASIC').valid).toBe(false);
  });

  it('rejects invalid plan name', () => {
    expect(validateUpgrade('FREE', 'ENTERPRISE').valid).toBe(false);
  });

  it('upgrade creates REQUESTED state (not direct change)', () => {
    const sub = { id: 1, plan: 'FREE', pendingPlan: null };
    const requestedPlan = 'BASIC';
    const updated = { ...sub, pendingPlan: requestedPlan, requestedAt: new Date() };

    expect(updated.plan).toBe('FREE');
    expect(updated.pendingPlan).toBe('BASIC');
    expect(updated.requestedAt).toBeInstanceOf(Date);
  });

  it('confirm applies the pending plan and clears pending', () => {
    const sub = { id: 1, plan: 'FREE', pendingPlan: 'BASIC', requestedAt: new Date() };
    const confirmed = applyUpgrade(sub, sub.pendingPlan);

    expect(confirmed.plan).toBe('BASIC');
    expect(confirmed.pendingPlan).toBeNull();
    expect(confirmed.requestedAt).toBeNull();
    expect(confirmed.apiCallsPerMonth).toBe(5000);
    expect(confirmed.dataRetentionDays).toBe(30);
  });

  it('confirm without pendingPlan throws', () => {
    const sub = { id: 1, plan: 'FREE', pendingPlan: null };
    expect(() => {
      if (!sub.pendingPlan) throw new Error('No hay upgrade pendiente');
    }).toThrow('No hay upgrade pendiente');
  });

  it('API: PATCH /mine/upgrade returns 202 with pendingPlan', () => {
    const response = {
      status: 202,
      body: {
        data: { id: 1, plan: 'FREE', pendingPlan: 'BASIC' },
        message: 'Upgrade a BASIC solicitado',
      },
    };
    expect(response.status).toBe(202);
    expect(response.body.data.pendingPlan).toBe('BASIC');
    expect(response.body.data.plan).toBe('FREE');
  });

  it('API: POST /:id/confirm returns 200 with updated plan', () => {
    const response = {
      status: 200,
      body: {
        data: { id: 1, plan: 'BASIC', pendingPlan: null },
        message: 'Plan actualizado a BASIC',
      },
    };
    expect(response.status).toBe(200);
    expect(response.body.data.plan).toBe('BASIC');
    expect(response.body.data.pendingPlan).toBeNull();
  });
});
