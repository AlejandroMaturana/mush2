import { Router } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { authenticate } from '../middlewares/auth.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Usuario, email y contraseña requeridos' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });

    await logAudit({
      userId: user.id, action: 'REGISTER', resource: 'auth',
      details: { username }, ip: req.ip, userAgent: req.headers['user-agent'],
    });

    const tokenPayload = { id: user.id, username: user.username, role: user.role };
    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_SECRET + '_refresh', { expiresIn: '7d' });

    res.status(201).json({
      token: { accessToken, refreshToken, expiresIn: 3600 },
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await User.findOne({ where: { username, isActive: true } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const tokenPayload = { id: user.id, username: user.username, role: user.role };

    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_SECRET + '_refresh', { expiresIn: '7d' });

    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.update({ refreshToken, refreshTokenExpires: refreshExpires, lastLoginAt: new Date() });

    await logAudit({
      userId: user.id, action: 'LOGIN', resource: 'auth',
      details: { username }, ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({
      token: { accessToken, refreshToken, expiresIn: 3600 },
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_SECRET + '_refresh');
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido o expirado', code: 'REFRESH_EXPIRED' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token revocado' });
    }

    const tokenPayload = { id: user.id, username: user.username, role: user.role };
    const newAccessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign(tokenPayload, env.JWT_SECRET + '_refresh', { expiresIn: '7d' });

    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.update({ refreshToken: newRefreshToken, refreshTokenExpires: refreshExpires });

    res.json({
      token: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 3600 },
    });
  } catch (err) {
    console.error('[AUTH] Refresh error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.update({ refreshToken: null, refreshTokenExpires: null });
    }

    await logAudit({
      userId: req.user.id, action: 'LOGOUT', resource: 'auth',
      details: {}, ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    console.error('[AUTH] Logout error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'username', 'email', 'role', 'lastLoginAt', 'createdAt'],
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.patch('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { username, email } = req.body;

    if (username !== undefined) {
      const existing = await User.findOne({ where: { username, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(409).json({ error: 'El usuario ya existe' });
      user.username = username;
    }

    if (email !== undefined) {
      const existing = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(409).json({ error: 'El email ya está registrado' });
      user.email = email;
    }

    await user.save();

    await logAudit({
      userId: user.id, action: 'UPDATE_PROFILE', resource: 'auth',
      details: { username, email }, ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    console.error('[AUTH] Update error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
