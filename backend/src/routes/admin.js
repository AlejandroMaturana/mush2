import { Router } from 'express';
import { Op } from 'sequelize';
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
    const { page = 1, limit = 50, action, resource, status, search, from, to } = req.query;
    const where = {};
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (resource) where.resource = { [Op.iLike]: `%${resource}%` };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    if (search) {
      where[Op.or] = [
        { details: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
        { resource: { [Op.iLike]: `%${search}%` } },
        { resourceId: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['username'], as: 'user' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
