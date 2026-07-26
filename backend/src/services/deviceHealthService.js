import { Device, DeviceHealth } from '../models/index.js';
import { events } from './eventBus.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('HEALTH');

// ── Dimension values (DDD-008 / ADR-025) ───────────────────────────

const CONNECTIVITY = {
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
};

const HEALTH_CONDITION = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

const LIFECYCLE = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
};

// ── Connectivity dimension (computed from lastSeen) ─────────────────

function computeConnectivity(device) {
  if (device.lifecycle === 'RETIRED') return null;
  if (device.lifecycle === 'MAINTENANCE') return null;

  const now = Date.now();
  const lastSeen = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  if (!lastSeen) return null;

  const elapsed = (now - lastSeen) / 1000;
  const hb = device.heartbeatInterval || 10;
  const degradedThreshold = hb * (device.staleMultiplier || 3);

  if (elapsed <= hb) return CONNECTIVITY.ONLINE;
  if (elapsed <= degradedThreshold) return CONNECTIVITY.DEGRADED;
  return CONNECTIVITY.OFFLINE;
}

// ── Health dimension (computed from latest DeviceHealth record) ─────

function computeHealthFromMetrics(latestHealth) {
  if (!latestHealth) return null;

  if (
    latestHealth.heartbeatsHealthy === false ||
    latestHealth.i2cHealthy === false ||
    latestHealth.bootTestPassed === false
 ) {
    return HEALTH_CONDITION.ERROR;
  }

  if (
    latestHealth.staleTaskMask > 0 ||
    latestHealth.sensorAht21 === false ||
    latestHealth.sensorEns160 === false ||
    (latestHealth.freeHeap != null && latestHealth.freeHeap < 30000)
  ) {
    return HEALTH_CONDITION.WARNING;
  }

  return HEALTH_CONDITION.NORMAL;
}

// ── Lifecycle dimension (persisted in Device.lifecycle) ─────────────

function computeLifecycle(device) {
  if (!device.lastSeen) return 'PROVISIONING';
  return device.lifecycle || LIFECYCLE.ACTIVE;
}

// ── Composed status ────────────────────────────────────────────────

function computeStatus(device, latestHealth = null) {
  const lifecycle = computeLifecycle(device);
  if (lifecycle === 'PROVISIONING') {
    return { connectivity: null, health: null, lifecycle: 'PROVISIONING' };
  }
  if (lifecycle === 'RETIRED') {
    return { connectivity: null, health: null, lifecycle: 'RETIRED' };
  }
  if (lifecycle === 'MAINTENANCE') {
    return { connectivity: null, health: null, lifecycle: 'MAINTENANCE' };
  }

  return {
    connectivity: computeConnectivity(device),
    health: computeHealthFromMetrics(latestHealth),
    lifecycle,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function getSecondsSinceLastSeen(device) {
  if (!device.lastSeen) return null;
  return Math.floor((Date.now() - new Date(device.lastSeen).getTime()) / 1000);
}

function getStatusFromDevice(device, latestHealth = null) {
  return computeStatus(device, latestHealth);
}

// ── Health payload for /connectivity endpoint ──────────────────────

function buildHealthPayload(device, composedStatus, latestHealth) {
  const secondsSinceLastSeen = getSecondsSinceLastSeen(device);
  const hb = device.heartbeatInterval || 10;

  return {
    status: composedStatus,
    lastSeenAt: device.lastSeen,
    lastTelemetryAt: device.lastTelemetryAt,
    lastCommandAt: device.lastCommandAt,
    lastAckAt: device.lastAckAt,
    secondsSinceLastSeen,
    heartbeatInterval: hb,
    degradedThreshold: hb * (device.staleMultiplier || 3),
    offlineThreshold: hb * (device.offlineMultiplier || 6),
    maintenanceMode: device.maintenanceMode,
    diagnostics: latestHealth ? {
      i2c: latestHealth.i2cHealthy ? 'OK' : 'FAIL',
      sensorAht21: latestHealth.sensorAht21 ? 'OK' : 'FAIL',
      sensorEns160: latestHealth.sensorEns160 ? 'OK' : 'FAIL',
      heartbeatsHealthy: latestHealth.heartbeatsHealthy,
      staleTaskMask: latestHealth.staleTaskMask,
      bootTestPassed: latestHealth.bootTestPassed,
      freeHeap: latestHealth.freeHeap,
      rebootCount: latestHealth.rebootCount,
      uptime: latestHealth.uptime,
    } : null,
  };
}

// ── Transition detection ───────────────────────────────────────────

function statusChanged(prev, next) {
  if (!prev && !next) return false;
  if (!prev || !next) return true;
  return (
    prev.connectivity !== next.connectivity ||
    prev.health !== next.health ||
    prev.lifecycle !== next.lifecycle
  );
}

function emitTransition(deviceId, prevStatus, newStatus) {
  const payload = {
    deviceId,
    previousStatus: prevStatus,
    status: newStatus,
    timestamp: new Date().toISOString(),
  };

  const prevConn = prevStatus?.connectivity;
  const newConn = newStatus?.connectivity;
  const prevLife = prevStatus?.lifecycle;
  const newLife = newStatus?.lifecycle;

  if ((prevConn === 'OFFLINE' || prevConn === 'DEGRADED') && newConn === 'ONLINE') {
    events.emit('device_health', { ...payload, event: 'DeviceRecovered' });
  }

  if (newConn === 'ONLINE' && prevConn !== 'ONLINE') {
    events.emit('device_health', { ...payload, event: 'DeviceOnline' });
  } else if (newConn === 'DEGRADED') {
    events.emit('device_health', { ...payload, event: 'DeviceDegraded' });
  } else if (newConn === 'OFFLINE') {
    events.emit('device_health', { ...payload, event: 'DeviceOffline' });
  }

  if (newLife === 'MAINTENANCE' && prevLife !== 'MAINTENANCE') {
    events.emit('device_health', { ...payload, event: 'DeviceMaintenanceEnabled' });
  } else if (prevLife === 'MAINTENANCE' && newLife !== 'MAINTENANCE') {
    events.emit('device_health', { ...payload, event: 'DeviceMaintenanceDisabled' });
  }

  const newHealth = newStatus?.health;
  const prevHealth = prevStatus?.health;
  if (newHealth === 'ERROR' && prevHealth !== 'ERROR') {
    events.emit('device_health', { ...payload, event: 'DeviceHealthError' });
  } else if (newHealth === 'WARNING' && prevHealth !== 'WARNING' && prevHealth !== 'ERROR') {
    events.emit('device_health', { ...payload, event: 'DeviceHealthWarning' });
  } else if (newHealth === 'NORMAL' && prevHealth === 'ERROR') {
    events.emit('device_health', { ...payload, event: 'DeviceHealthRecovered' });
  }

  events.emit('device_status_changed', payload);
}

// ── Fetch latest health metrics for a device ───────────────────────

async function getLatestHealth(deviceId) {
  const record = await DeviceHealth.findOne({
    where: { deviceId },
    order: [['timestamp', 'DESC']],
  });
  return record;
}

// ── Core API ───────────────────────────────────────────────────────

async function recordEvent(deviceId, eventType) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const now = new Date();
  const updates = { lastSeen: now };

  if (eventType === 'telemetry') updates.lastTelemetryAt = now;
  else if (eventType === 'command') updates.lastCommandAt = now;
  else if (eventType === 'ack') updates.lastAckAt = now;

  const latestHealth = await getLatestHealth(device.id);
  const prevStatus = computeStatus(device, latestHealth);

  await device.update(updates);

  const newStatus = computeStatus(device, latestHealth);
  if (statusChanged(prevStatus, newStatus)) {
    emitTransition(device.deviceId, prevStatus, newStatus);
  }

  return device;
}

async function evaluateDevice(deviceOrId) {
  const device = typeof deviceOrId === 'object'
    ? deviceOrId
    : await Device.findByPk(deviceOrId);
  if (!device) return null;

  const latestHealth = await getLatestHealth(device.id);
  const prevStatus = computeStatus(device, latestHealth);
  const newStatus = computeStatus(device, latestHealth);

  if (statusChanged(prevStatus, newStatus)) {
    emitTransition(device.deviceId, prevStatus, newStatus);
  }

  return { device, previousStatus: prevStatus, newStatus };
}

async function evaluateAllDevices() {
  const devices = await Device.findAll({
    where: { lifecycle: { [Symbol.for('ne')]: 'RETIRED' } },
    attributes: ['id', 'deviceId', 'lifecycle', 'lastSeen', 'heartbeatInterval', 'staleMultiplier', 'offlineMultiplier', 'maintenanceMode'],
  });

  const transitions = [];

  for (const device of devices) {
    const latestHealth = await getLatestHealth(device.id);
    const prevStatus = computeStatus(device, latestHealth);
    const newStatus = computeStatus(device, latestHealth);

    if (statusChanged(prevStatus, newStatus)) {
      emitTransition(device.deviceId, prevStatus, newStatus);
      transitions.push({ deviceId: device.deviceId, from: prevStatus, to: newStatus });
    }
  }

  return transitions;
}

async function setMaintenanceMode(deviceId, enabled) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const latestHealth = await getLatestHealth(device.id);
  const prevStatus = computeStatus(device, latestHealth);

  const newLifecycle = enabled ? LIFECYCLE.MAINTENANCE : LIFECYCLE.ACTIVE;
  await device.update({ lifecycle: newLifecycle, maintenanceMode: enabled });

  const newStatus = computeStatus(device, latestHealth);
  if (statusChanged(prevStatus, newStatus)) {
    emitTransition(device.deviceId, prevStatus, newStatus);
  }

  return device;
}

async function getHealthInfo(deviceId) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const latestHealth = await getLatestHealth(device.id);
  const composedStatus = computeStatus(device, latestHealth);
  return buildHealthPayload(device, composedStatus, latestHealth);
}

export {
  CONNECTIVITY,
  HEALTH_CONDITION,
  LIFECYCLE,
  computeStatus,
  computeConnectivity,
  computeHealthFromMetrics,
  computeLifecycle,
  recordEvent,
  evaluateDevice,
  evaluateAllDevices,
  setMaintenanceMode,
  getHealthInfo,
  getSecondsSinceLastSeen,
  buildHealthPayload,
  getStatusFromDevice,
  getLatestHealth,
};
