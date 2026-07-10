import { Router } from 'express';
import crypto from 'crypto';
import { UserPreference, TelegramDeviceConfig, Device, UserChamberAccess, SystemSetting } from '../models/index.js';
import { authenticate } from '../middlewares/auth.js';
import { requireMinRole } from '../middlewares/rbac.js';
import { reconfigureBot, getBotStatus } from '../services/telegramService.js';

const router = Router();

router.post('/link', authenticate, async (req, res) => {
  try {
    let prefs = await UserPreference.findOne({ where: { userId: req.user.id } });
    if (!prefs) {
      prefs = await UserPreference.create({ userId: req.user.id });
    }

    if (prefs.telegramChatId) {
      return res.json({ data: { linked: true, chatId: prefs.telegramChatId } });
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prefs.update({
      telegramLinkToken: code,
      telegramLinkTokenExpires: expires,
    });

    res.json({ data: { linked: false, code, expiresAt: expires.toISOString() } });
  } catch (err) {
    console.error('[TELEGRAM] Error generating link:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/link', authenticate, async (req, res) => {
  try {
    const prefs = await UserPreference.findOne({ where: { userId: req.user.id } });
    if (!prefs) {
      return res.json({ data: { linked: false } });
    }
    res.json({
      data: {
        linked: !!prefs.telegramChatId,
        chatId: prefs.telegramChatId,
        code: prefs.telegramLinkToken,
        codeExpiresAt: prefs.telegramLinkTokenExpires,
      },
    });
  } catch (err) {
    console.error('[TELEGRAM] Error checking link:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/unlink', authenticate, async (req, res) => {
  try {
    const prefs = await UserPreference.findOne({ where: { userId: req.user.id } });
    if (prefs) {
      await prefs.update({
        telegramChatId: null,
        telegramEnabled: false,
        telegramLinkToken: null,
        telegramLinkTokenExpires: null,
      });
    }
    res.json({ data: { linked: false } });
  } catch (err) {
    console.error('[TELEGRAM] Error unlinking:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

async function canAccessDevice(userId, deviceId) {
  const device = await Device.findByPk(deviceId);
  if (!device) return false;
  if (device.userId === userId) return true;
  const access = await UserChamberAccess.findOne({ where: { userId, deviceId } });
  return !!access;
}

router.get('/device/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!await canAccessDevice(req.user.id, deviceId)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    let config = await TelegramDeviceConfig.findOne({ where: { deviceId } });
    if (!config) {
      config = await TelegramDeviceConfig.create({ deviceId });
    }

    res.json({ data: config });
  } catch (err) {
    console.error('[TELEGRAM] Error getting device config:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/device/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!await canAccessDevice(req.user.id, deviceId)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const allowed = ['enabled', 'alertOnFault', 'alertOnRange', 'alertOnDisconnect', 'alertOnSystem', 'minSeverity'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [config] = await TelegramDeviceConfig.findOrCreate({ where: { deviceId }, defaults: { deviceId } });
    await config.update(updates);

    res.json({ data: config });
  } catch (err) {
    console.error('[TELEGRAM] Error updating device config:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/configure', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { token, username } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const [tokenSetting] = await SystemSetting.findOrCreate({
      where: { key: 'telegram_bot_token' },
      defaults: { key: 'telegram_bot_token', value: '', type: 'string', label: 'Telegram Bot Token', category: 'integration' },
    });
    const [usernameSetting] = await SystemSetting.findOrCreate({
      where: { key: 'telegram_bot_username' },
      defaults: { key: 'telegram_bot_username', value: '', type: 'string', label: 'Telegram Bot Username', category: 'integration' },
    });

    await tokenSetting.update({ value: token });
    await usernameSetting.update({ value: username || '' });

    try {
      await reconfigureBot(token, username || 'Mush2Bot');
    } catch (botErr) {
      return res.status(400).json({ error: `Error al iniciar bot: ${botErr.message}` });
    }

    const status = getBotStatus();
    res.json({ data: { configured: true, running: status.running, username: status.username, lastError: status.lastError } });
  } catch (err) {
    console.error('[TELEGRAM] Error configuring bot:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/bot-status', authenticate, requireMinRole('ADMIN'), async (req, res) => {
  try {
    const status = getBotStatus();
    const tokenSetting = await SystemSetting.findOne({ where: { key: 'telegram_bot_token' } });
    const usernameSetting = await SystemSetting.findOne({ where: { key: 'telegram_bot_username' } });

    res.json({
      data: {
        ...status,
        tokenConfigured: !!tokenSetting?.value,
        configuredUsername: usernameSetting?.value || '',
      },
    });
  } catch (err) {
    console.error('[TELEGRAM] Error getting bot status:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
