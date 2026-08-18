import { Router } from 'express';
import { Subscription, User } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { requestUpgrade, confirmUpgrade } from '../services/modelSubscription.js';
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
        pendingPlan: sub.pendingPlan,
        requestedAt: sub.requestedAt,
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
    const sub = await requestUpgrade(req.user.id, plan);
    res.status(202).json({
      data: {
        id: sub.id,
        plan: sub.plan,
        pendingPlan: sub.pendingPlan,
        requestedAt: sub.requestedAt,
      },
      message: `Upgrade a ${plan} solicitado. Confirme para aplicar.`,
    });
  } catch (err) {
    const status = err.status || 500;
    log.error({ module: 'SUBSCRIPTION', event: 'UPGRADE_REQUEST_ERROR', error: err.message }, 'Error requesting upgrade');
    res.status(status).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const sub = await confirmUpgrade(parseInt(req.params.id), req.user.id);
    res.json({
      data: sub,
      message: `Plan actualizado a ${sub.plan}`,
    });
  } catch (err) {
    const status = err.status || 500;
    log.error({ module: 'SUBSCRIPTION', event: 'CONFIRM_ERROR', error: err.message }, 'Error confirming upgrade');
    res.status(status).json({ error: 'SERVER_ERROR', message: err.message });
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
