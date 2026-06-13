import { Router } from 'express';
import apiRouter from './api.js';
import recipesRouter from './recipes.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import monitoringRouter from './monitoring.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { tenantScope } from '../middlewares/tenant.js';

const router = Router();

router.use('/auth', authRouter);

router.use('/admin', authenticate, requireMinRole('ADMIN'), adminRouter);

router.use('/monitoring', monitoringRouter);

router.use('/', optionalAuth, tenantScope, apiRouter);
router.use('/', optionalAuth, tenantScope, recipesRouter);

export default router;
