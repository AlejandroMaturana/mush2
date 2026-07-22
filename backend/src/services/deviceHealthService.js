import { Device } from '../models/index.js';
import { events } from './eventBus.js';

const HEALTH_STATES = {
  PROVISIONING: 'PROVISIONING',
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE',
  RETIRED: 'RETIRED',
  MAINTENANCE: 'MAINTENANCE',
};

function computeStatus(device) {
  if (device.maintenanceMode) return HEALTH_STATES.MAINTENANCE;
  if (device.status === 'RETIRED') return HEALTH_STATES.RETIRED;

  const now = Date.now();
  const lastSeen = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
  if (!lastSeen) return HEALTH_STATES.PROVISIONING;

  const elapsed = (now - lastSeen) / 1000;
  const hb = device.heartbeatInterval || 10;
  const staleThreshold = hb * (device.staleMultiplier || 3);
  const offlineThreshold = hb * (device.offlineMultiplier || 6);

  if (elapsed <= hb) return HEALTH_STATES.ONLINE;
  if (elapsed <= staleThreshold) return HEALTH_STATES.DEGRADED;
  if (elapsed <= offlineThreshold) return HEALTH_STATES.STALE;
  return HEALTH_STATES.OFFLINE;
}

function getSecondsSinceLastSeen(device) {
  if (!device.lastSeen) return null;
  return Math.floor((Date.now() - new Date(device.lastSeen).getTime()) / 1000);
}

function buildHealthPayload(device, computedStatus) {
  const secondsSinceLastSeen = getSecondsSinceLastSeen(device);
  const hb = device.heartbeatInterval || 10;

  return {
    status: computedStatus,
    lastSeenAt: device.lastSeen,
    lastTelemetryAt: device.lastTelemetryAt,
    lastCommandAt: device.lastCommandAt,
    lastAckAt: device.lastAckAt,
    secondsSinceLastSeen,
    heartbeatInterval: hb,
    staleThreshold: hb * (device.staleMultiplier || 3),
    offlineThreshold: hb * (device.offlineMultiplier || 6),
    maintenanceMode: device.maintenanceMode,
  };
}

async function recordEvent(deviceId, eventType) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const now = new Date();
  const updates = { lastSeen: now };

  if (eventType === 'telemetry') updates.lastTelemetryAt = now;
  else if (eventType === 'command') updates.lastCommandAt = now;
  else if (eventType === 'ack') updates.lastAckAt = now;

  const previousStatus = device.status;
  await device.update(updates);

  const newStatus = computeStatus(device);
  if (newStatus !== previousStatus) {
    await device.update({ status: newStatus });
    emitTransition(device.deviceId, previousStatus, newStatus, device);
  }

  return device;
}

function emitTransition(deviceId, from, to, device) {
  const payload = {
    deviceId,
    previousStatus: from,
    status: to,
    timestamp: new Date().toISOString(),
  };

  if (from === 'OFFLINE' || from === 'STALE' || from === 'DEGRADED') {
    if (to === 'ONLINE') {
      events.emit('device_health', { ...payload, event: 'DeviceRecovered' });
    }
  }

  if (to === 'ONLINE' && from !== 'ONLINE') {
    events.emit('device_health', { ...payload, event: 'DeviceOnline' });
  } else if (to === 'STALE') {
    events.emit('device_health', { ...payload, event: 'DeviceStale' });
  } else if (to === 'OFFLINE') {
    events.emit('device_health', { ...payload, event: 'DeviceOffline' });
  } else if (to === 'DEGRADED') {
    events.emit('device_health', { ...payload, event: 'DeviceDegraded' });
  } else if (to === 'MAINTENANCE' && from !== 'MAINTENANCE') {
    events.emit('device_health', { ...payload, event: 'DeviceMaintenanceEnabled' });
  } else if (from === 'MAINTENANCE' && to !== 'MAINTENANCE') {
    events.emit('device_health', { ...payload, event: 'DeviceMaintenanceDisabled' });
  }

  events.emit('device_status_changed', payload);
}

async function evaluateDevice(deviceOrId) {
  const device = typeof deviceOrId === 'object'
    ? deviceOrId
    : await Device.findByPk(deviceOrId);
  if (!device) return null;

  const previousStatus = device.status;
  const newStatus = computeStatus(device);

  if (newStatus !== previousStatus) {
    await device.update({ status: newStatus });
    emitTransition(device.deviceId, previousStatus, newStatus, device);
  }

  return { device, previousStatus, newStatus };
}

async function evaluateAllDevices() {
  const devices = await Device.findAll({
    where: { maintenanceMode: false },
    attributes: ['id', 'deviceId', 'status', 'lastSeen', 'heartbeatInterval', 'staleMultiplier', 'offlineMultiplier', 'maintenanceMode'],
  });

  const transitions = [];

  for (const device of devices) {
    const previousStatus = device.status;
    const newStatus = computeStatus(device);

    if (newStatus !== previousStatus) {
      await device.update({ status: newStatus });
      emitTransition(device.deviceId, previousStatus, newStatus, device);
      transitions.push({ deviceId: device.deviceId, from: previousStatus, to: newStatus });
    }
  }

  return transitions;
}

async function setMaintenanceMode(deviceId, enabled) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const previousStatus = device.status;
  await device.update({ maintenanceMode: enabled });

  const newStatus = computeStatus({ ...device.toJSON(), maintenanceMode: enabled });
  await device.update({ status: newStatus });

  if (enabled && previousStatus !== 'MAINTENANCE') {
    emitTransition(device.deviceId, previousStatus, 'MAINTENANCE', device);
  } else if (!enabled && previousStatus === 'MAINTENANCE') {
    const restoredStatus = computeStatus(device);
    await device.update({ status: restoredStatus });
    emitTransition(device.deviceId, 'MAINTENANCE', restoredStatus, device);
  }

  return device;
}

async function getHealthInfo(deviceId) {
  const device = await Device.findOne({ where: { deviceId } });
  if (!device) return null;

  const computedStatus = computeStatus(device);
  return buildHealthPayload(device, computedStatus);
}

function getStatusFromDevice(device) {
  return computeStatus(device);
}

export {
  HEALTH_STATES,
  computeStatus,
  recordEvent,
  evaluateDevice,
  evaluateAllDevices,
  setMaintenanceMode,
  getHealthInfo,
  getSecondsSinceLastSeen,
  buildHealthPayload,
  getStatusFromDevice,
};
