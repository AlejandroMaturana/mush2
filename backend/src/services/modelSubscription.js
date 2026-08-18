import { Subscription } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('MODEL_SUBSCRIPTION');

const PLAN_ORDER = { FREE: 0, BASIC: 1, PREMIUM: 2 };

export function validateUpgrade(currentPlan, requestedPlan) {
  if (!['FREE', 'BASIC', 'PREMIUM'].includes(requestedPlan)) {
    return { valid: false, error: 'Plan inválido. Usa FREE, BASIC o PREMIUM' };
  }
  if (PLAN_ORDER[requestedPlan] <= PLAN_ORDER[currentPlan]) {
    return { valid: false, error: 'El plan solicitado debe ser superior al actual' };
  }
  return { valid: true };
}

export async function requestUpgrade(userId, requestedPlan) {
  let sub = await Subscription.findOne({ where: { userId } });
  if (!sub) {
    sub = await Subscription.createForUser(userId);
  }

  if (sub.status === 'CANCELED') {
    throw Object.assign(new Error('No puedes cambiar un plan cancelado'), { status: 400 });
  }

  const validation = validateUpgrade(sub.plan, requestedPlan);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error), { status: 400 });
  }

  await sub.update({
    pendingPlan: requestedPlan,
    requestedAt: new Date(),
  });

  log.info({ userId, from: sub.plan, to: requestedPlan }, 'Upgrade requested');
  return sub;
}

export async function confirmUpgrade(subscriptionId, userId) {
  const sub = await Subscription.findOne({ where: { id: subscriptionId, userId } });
  if (!sub) {
    throw Object.assign(new Error('Suscripción no encontrada'), { status: 404 });
  }

  if (!sub.pendingPlan) {
    throw Object.assign(new Error('No hay upgrade pendiente'), { status: 400 });
  }

  const limits = Subscription.getPlanLimits(sub.pendingPlan);
  const newPlan = sub.pendingPlan;

  await sub.update({
    plan: newPlan,
    apiCallsPerMonth: limits.apiCallsPerMonth,
    dataRetentionDays: limits.dataRetentionDays,
    pendingPlan: null,
    requestedAt: null,
  });

  log.info({ userId, subscriptionId, newPlan }, 'Upgrade confirmed');
  return sub;
}
