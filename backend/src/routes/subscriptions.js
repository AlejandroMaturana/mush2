import { Router } from 'express';
import { Subscription, User } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('SUBSCRIPTION');
const router = Router();

router.get('/mine', authenticate, async (req, res) => {
  try {
    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      sub = await Subscription.createForUser(req.user.id);
    }
    res.json({ data: sub });
  } catch (err) {
    log.error({ module: 'SUBSCRIPTION', event: 'READ_ERROR', error: err.message }, 'Error reading subscription');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/mine/usage', authenticate, async (req, res) => {
  try {
    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      sub = await Subscription.createForUser(req.user.id);
    }
    res.json({
      data: {
        plan: sub.plan,
        status: sub.status,
        apiCallsPerMonth: sub.apiCallsPerMonth,
        apiCallsUsedThisMonth: sub.apiCallsUsedThisMonth,
        percentage: sub.usagePercentage,
        dataRetentionDays: sub.dataRetentionDays,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    });
  } catch (err) {
    log.error({ module: 'SUBSCRIPTION', event: 'READ_USAGE_ERROR', error: err.message }, 'Error reading subscription usage');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/mine/upgrade', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'BASIC', 'PREMIUM'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido. Usa FREE, BASIC o PREMIUM' });
    }

    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      sub = await Subscription.createForUser(req.user.id, plan);
      return res.json({ data: sub, message: `Plan actualizado a ${plan}` });
    }

    if (sub.status === 'CANCELED') {
      return res.status(400).json({ error: 'No puedes cambiar un plan cancelado. Contacta al administrador.' });
    }

    const limits = Subscription.getPlanLimits(plan);
    const upgradeOrder = { FREE: 0, BASIC: 1, PREMIUM: 2 };
    if (upgradeOrder[plan] < upgradeOrder[sub.plan]) {
      return res.status(400).json({ error: 'No puedes downgrade. Contacta al administrador.' });
    }

    await sub.update({
      plan,
      apiCallsPerMonth: limits.apiCallsPerMonth,
      dataRetentionDays: limits.dataRetentionDays,
    });

    res.json({ data: sub, message: `Plan actualizado a ${plan}` });
  } catch (err) {
    log.error({ module: 'SUBSCRIPTION', event: 'UPGRADE_ERROR', error: err.message }, 'Error upgrading subscription');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/mine/cancel', authenticate, async (req, res) => {
  try {
    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      return res.status(404).json({ error: 'No tienes una suscripción activa' });
    }

    await sub.update({ status: 'CANCELED', canceledAt: new Date() });
    res.json({ data: sub, message: 'Suscripción cancelada' });
  } catch (err) {
    log.error({ module: 'SUBSCRIPTION', event: 'CANCEL_ERROR', error: err.message }, 'Error canceling subscription');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Subscription.findAndCountAll({
      include: [{ model: User, attributes: ['id', 'username', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    log.error({ module: 'SUBSCRIPTION', event: 'LIST_ERROR', error: err.message }, 'Error listing subscriptions');
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
