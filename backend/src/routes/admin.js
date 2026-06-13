import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { User, AuditLog } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/users', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
    });
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/role', authenticate, requireMinRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const oldRole = user.role;
    await user.update({ role });

    await logAudit({
      userId: req.user.id,
      action: 'USER_ROLE_CHANGE',
      resource: 'user',
      resourceId: user.id,
      details: { oldRole, newRole: role },
    });

    res.json({ message: 'Rol actualizado', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/toggle-active', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await user.update({ isActive: !user.isActive });

    await logAudit({
      userId: req.user.id,
      action: 'USER_TOGGLE_ACTIVE',
      resource: 'user',
      resourceId: user.id,
      details: { isActive: user.isActive },
    });

    res.json({ message: `Usuario ${user.isActive ? 'activado' : 'desactivado'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
