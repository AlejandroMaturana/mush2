import { Device } from '../models/index.js';

export async function tenantScope(req, res, next) {
  if (!req.user) {
    req.tenant = { userId: null, filter: {} };
    return next();
  }

  req.tenant = {
    userId: req.user.id,
    filter: { userId: req.user.id },
  };

  next();
}

export async function checkDeviceAccess(req, res, next) {
  try {
    const deviceId = req.params.id;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    // Legacy devices (no userId assigned) are accessible by all authenticated users
    if (!device.userId) {
      req.device = device;
      return next();
    }

    if (req.user && device.userId === req.user.id) {
      req.device = device;
      return next();
    }

    // Dispositivo tiene dueño pero el request no está autenticado
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida para acceder a este dispositivo' });
    }

    const UserChamberAccess = (await import('../models/UserChamberAccess.js')).default;
    const access = await UserChamberAccess.findOne({
      where: { userId: req.user.id, deviceId },
    });

    if (!access) {
      return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
    }

    req.deviceAccess = access;
    req.device = device;
    next();
  } catch (err) {
    console.error('[TENANT] checkDeviceAccess error:', err.message);
    res.status(500).json({ error: 'Error al verificar acceso al dispositivo' });
  }
}
