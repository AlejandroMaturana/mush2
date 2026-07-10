import express from 'express';
import { Op } from 'sequelize';
import { ApiKey } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
      where.userId = req.user.id;
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await ApiKey.findAndCountAll({
      where,
      attributes: { exclude: ['keyHash'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (err) {
    console.error('[APIKEYS] Error listing:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { name, permissions, ipWhitelist, rateLimit, expiresAt } = req.body;
    const { raw, prefix, hash } = ApiKey.generateKey();

    const key = await ApiKey.create({
      userId: req.user.id,
      keyHash: hash,
      keyPrefix: prefix,
      name: name || null,
      permissions: permissions || { read: true, write: false, admin: false },
      ipWhitelist: ipWhitelist || [],
      rateLimit: rateLimit || 100,
      expiresAt: expiresAt || null,
    });

    res.status(201).json({
      data: { id: key.id, keyPrefix: key.keyPrefix, name: key.name, rawKey: raw, createdAt: key.createdAt },
      message: 'Guarda la API key ahora. No se mostrará de nuevo.',
    });
  } catch (err) {
    console.error('[APIKEYS] Error creating:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/:id', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const key = await ApiKey.findByPk(req.params.id);
    if (!key) return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.user.role !== 'SUPER_ADMIN' && key.userId !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const allowed = ['name', 'permissions', 'ipWhitelist', 'rateLimit', 'expiresAt'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await key.update(updates);
    res.json({ data: key });
  } catch (err) {
    console.error('[APIKEYS] Error updating:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/:id', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const key = await ApiKey.findByPk(req.params.id);
    if (!key) return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.user.role !== 'SUPER_ADMIN' && key.userId !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    await key.update({ isActive: false });
    res.json({ message: 'API key revocada' });
  } catch (err) {
    console.error('[APIKEYS] Error deleting:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/rotate', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const key = await ApiKey.findByPk(req.params.id);
    if (!key) return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.user.role !== 'SUPER_ADMIN' && key.userId !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { raw, prefix, hash } = ApiKey.generateKey();
    await key.update({ keyHash: hash, keyPrefix: prefix, authFailures: 0 });

    res.json({
      data: { id: key.id, keyPrefix: prefix, name: key.name, rawKey: raw },
      message: 'Key rotada. Guarda la nueva key ahora. No se mostrará de nuevo.',
    });
  } catch (err) {
    console.error('[APIKEYS] Error rotating:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
