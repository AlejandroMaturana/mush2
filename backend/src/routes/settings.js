import express from 'express';
import bcrypt from 'bcryptjs';
import { User, UserPreference, SystemSetting } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { seedSystemSettings } from '../config/systemSettingsDefaults.js';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash', 'refreshToken', 'refreshTokenExpires'] },
    });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

    let prefs = await UserPreference.findOne({ where: { userId: req.user.id } });
    if (!prefs) {
      prefs = await UserPreference.create({ userId: req.user.id });
    }

    res.json({ data: { user, preferences: prefs } });
  } catch (err) {
    console.error('[SETTINGS] Error reading profile:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { username, email, preferences } = req.body;

    if (username || email) {
      const updates = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      await User.update(updates, { where: { id: req.user.id } });
    }

    if (preferences) {
      const allowed = [
        'theme', 'language', 'dateFormat', 'defaultDashboard', 'refreshFrequency',
        'pushNotifications', 'alertSounds', 'emailAlerts',
        'telegramEnabled', 'telegramChatId', 'webhookUrl', 'minAlertSeverity',
      ];
      const filtered = {};
      for (const key of allowed) {
        if (preferences[key] !== undefined) filtered[key] = preferences[key];
      }
      const [prefs] = await UserPreference.findOrCreate({ where: { userId: req.user.id } });
      await prefs.update(filtered);
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash', 'refreshToken', 'refreshTokenExpires'] },
    });
    const prefs = await UserPreference.findOne({ where: { userId: req.user.id } });

    res.json({ data: { user, preferences: prefs } });
  } catch (err) {
    console.error('[SETTINGS] Error updating profile:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword y newPassword requeridos' });
    }

    const user = await User.findByPk(req.user.id);
    const valid = await user.validatePassword(currentPassword);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.update({ passwordHash }, { where: { id: req.user.id } });

    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('[SETTINGS] Error changing password:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/system', authenticate, requireMinRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({ order: [['category', 'ASC'], ['key', 'ASC']] });
    res.json({ data: settings });
  } catch (err) {
    console.error('[SETTINGS] Error reading system settings:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/system', authenticate, requireMinRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) return res.status(400).json({ error: 'settings debe ser un array' });

    for (const { key, value } of settings) {
      await SystemSetting.update({ value: String(value) }, { where: { key } });
    }

    const updated = await SystemSetting.findAll({ order: [['category', 'ASC'], ['key', 'ASC']] });
    res.json({ data: updated, message: 'Configuración actualizada' });
  } catch (err) {
    console.error('[SETTINGS] Error updating system settings:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/system/seed', authenticate, requireMinRole('SUPER_ADMIN'), async (req, res) => {
  try {
    await seedSystemSettings(SystemSetting);
    const settings = await SystemSetting.findAll({ order: [['category', 'ASC'], ['key', 'ASC']] });
    res.json({ data: settings, message: 'Defaults sembrados' });
  } catch (err) {
    console.error('[SETTINGS] Error seeding system settings:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/system/public', async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      where: { isPublic: true },
      order: [['key', 'ASC']],
    });
    res.json({ data: settings });
  } catch (err) {
    console.error('[SETTINGS] Error reading public settings:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
