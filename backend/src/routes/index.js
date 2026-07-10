import { Router } from 'express';
import apiRouter from './api.js';
import recipesRouter from './recipes.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import monitoringRouter from './monitoring.js';
import actuatorsRouter from './actuators.js';
import alarmsRouter from './alarms.js';
import apiKeysRouter from './apiKeys.js';
import settingsRouter from './settings.js';
import diagnosticsRouter from './diagnostics.js';
import eventsRouter from './events.js';
import analyticsRouter from './analytics.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { tenantScope } from '../middlewares/tenant.js';

const router = Router();

router.use('/auth', authRouter);

router.use('/admin', authenticate, requireMinRole('ADMIN'), adminRouter);

router.use('/monitoring', monitoringRouter);

router.use('/', optionalAuth, tenantScope, apiRouter);
router.use('/', optionalAuth, tenantScope, recipesRouter);
router.use('/actuators', optionalAuth, tenantScope, actuatorsRouter);
router.use('/alarms', authenticate, tenantScope, alarmsRouter);
router.use('/api-keys', apiKeysRouter);
router.use('/settings', settingsRouter);
router.use('/diag', authenticate, diagnosticsRouter);
router.use('/events', eventsRouter);
router.use('/chambers', analyticsRouter);

export default router;
