import { Subscription } from '../models/index.js';

export async function checkApiRateLimit(req, res, next) {
  if (!req.user) return next();

  try {
    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      sub = await Subscription.createForUser(req.user.id);
    }

    if (sub.currentPeriodEnd < new Date()) {
      const limits = Subscription.getPlanLimits(sub.plan);
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await sub.update({
        apiCallsUsedThisMonth: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        apiCallsPerMonth: limits.apiCallsPerMonth,
        dataRetentionDays: limits.dataRetentionDays,
      });
    }

    if (sub.isExceeded) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `Has alcanzado el límite de ${sub.apiCallsPerMonth} llamadas API de tu plan ${sub.plan}`,
        plan: sub.plan,
        limit: sub.apiCallsPerMonth,
        used: sub.apiCallsUsedThisMonth,
        resetAt: sub.currentPeriodEnd,
      });
    }

    await sub.increment('apiCallsUsedThisMonth');
    next();
  } catch (err) {
    console.error('[RATE_LIMIT] Error:', err.message);
    next();
  }
}
