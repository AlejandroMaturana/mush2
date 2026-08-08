import { Op } from 'sequelize';
import { Device, UserChamberAccess } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('TENANT');

// Flujos legítimos del firmware que operan anónimos por HTTP hasta que
// aterriza la transición con token (ISSUE-001 / PR-E) y las credenciales
// de dispositivo en NVS (ISSUE-050 / PR-C).
const PUBLIC_ANONYMOUS = new Set([
  'POST /api/v1/devices/register',
  'GET /api/v1/actuators',
]);

export async function tenantScope(req, res, next) {
  if (!req.user) {
    const key = `${req.method} ${(req.originalUrl || '').split('?')[0]}`;
    if (!PUBLIC_ANONYMOUS.has(key)) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    req.tenant = { userId: null, filter: {} };
    return next();
  }

  req.tenant = {
    userId: req.user.id,
    filter: { userId: req.user.id },
  };

  next();
}

export async function canAccessDevice(user, device) {
  if (!user || !device) return false;
  // Dispositivos legacy (sin dueño) accesibles por cualquier usuario autenticado
  if (!device.userId) return true;
  if (device.userId === user.id) return true;
  const access = await UserChamberAccess.findOne({
    where: { userId: user.id, deviceId: device.id },
  });
  return Boolean(access);
}

export async function getAccessibleDeviceIds(userId) {
  const [owned, shared] = await Promise.all([
    Device.findAll({
      where: { [Op.or]: [{ userId }, { userId: null }] },
      attributes: ['id'],
    }),
    UserChamberAccess.findAll({ where: { userId }, attributes: ['deviceId'] }),
  ]);
  const ids = new Set(owned.map(d => d.id));
  shared.forEach(s => ids.add(s.deviceId));
  return [...ids];
}

export async function checkDeviceAccess(req, res, next) {
  try {
    const { id: deviceId } = req.params;
    const device = await Device.findOne({ where: { deviceId } });

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
      return res.status(401).json({ error: 'Autenticación requerida para acceder a este dispositivo', code: 'AUTH_REQUIRED' });
    }

    const UserChamberAccess = (await import('../models/UserChamberAccess.js')).default;
    const access = await UserChamberAccess.findOne({
      where: { userId: req.user.id, deviceId: device.id },
    });

    if (!access) {
      return res.status(403).json({ error: 'Sin acceso a este dispositivo' });
    }

    req.deviceAccess = access;
    req.device = device;
    next();
  } catch (err) {
    log.error({ module: 'TENANT', event: 'DEVICE_ACCESS_ERROR', error: err.message }, 'checkDeviceAccess error');
    res.status(500).json({ error: 'Error al verificar acceso al dispositivo' });
  }
}
