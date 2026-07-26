import { computeStatus, buildHealthPayload, getSecondsSinceLastSeen, CONNECTIVITY, HEALTH_CONDITION, LIFECYCLE } from '../services/deviceHealthService.js';

function makeDevice(overrides = {}) {
  return {
    id: 1,
    deviceId: 'test-device-001',
    lifecycle: LIFECYCLE.ACTIVE,
    lastSeen: new Date(Date.now() - 5000),
    lastTelemetryAt: null,
    lastCommandAt: null,
    lastAckAt: null,
    heartbeatInterval: 10,
    staleMultiplier: 3,
    offlineMultiplier: 6,
    maintenanceMode: false,
    ...overrides,
  };
}

function makeHealth(overrides = {}) {
  return {
    id: 1,
    deviceId: 1,
    heartbeatsHealthy: true,
    i2cHealthy: true,
    sensorAht21: true,
    sensorEns160: true,
    staleTaskMask: 0,
    bootTestPassed: true,
    freeHeap: 50000,
    uptime: 1000,
    rebootCount: 0,
    timestamp: new Date(),
    ...overrides,
  };
}

describe('DeviceHealthService', () => {
  describe('computeStatus', () => {
    describe('PROVISIONING lifecycle', () => {
      it('returns PROVISIONING when no lastSeen', () => {
        const device = makeDevice({ lastSeen: null });
        const status = computeStatus(device);
        expect(status.lifecycle).toBe('PROVISIONING');
        expect(status.connectivity).toBeNull();
        expect(status.health).toBeNull();
      });
    });

    describe('RETIRED lifecycle', () => {
      it('returns RETIRED when lifecycle is RETIRED', () => {
        const device = makeDevice({ lifecycle: LIFECYCLE.RETIRED, lastSeen: new Date() });
        const status = computeStatus(device);
        expect(status.lifecycle).toBe('RETIRED');
        expect(status.connectivity).toBeNull();
        expect(status.health).toBeNull();
      });
    });

    describe('MAINTENANCE lifecycle', () => {
      it('returns MAINTENANCE when lifecycle is MAINTENANCE', () => {
        const device = makeDevice({ lifecycle: LIFECYCLE.MAINTENANCE, lastSeen: new Date() });
        const status = computeStatus(device);
        expect(status.lifecycle).toBe('MAINTENANCE');
        expect(status.connectivity).toBeNull();
        expect(status.health).toBeNull();
      });
    });

    describe('ACTIVE lifecycle — connectivity dimension', () => {
      it('returns ONLINE connectivity when lastSeen within heartbeat', () => {
        const device = makeDevice({ lastSeen: new Date(Date.now() - 5000) });
        const status = computeStatus(device);
        expect(status.connectivity).toBe(CONNECTIVITY.ONLINE);
      });

      it('returns DEGRADED connectivity when lastSeen between heartbeat and stale threshold', () => {
        const device = makeDevice({ lastSeen: new Date(Date.now() - 15000) });
        const status = computeStatus(device);
        expect(status.connectivity).toBe(CONNECTIVITY.DEGRADED);
      });

      it('returns OFFLINE connectivity when lastSeen exceeds stale threshold', () => {
        const device = makeDevice({ lastSeen: new Date(Date.now() - 70000) });
        const status = computeStatus(device);
        expect(status.connectivity).toBe(CONNECTIVITY.OFFLINE);
      });

      it('uses custom thresholds from device config', () => {
        const device = makeDevice({
          lastSeen: new Date(Date.now() - 25000),
          heartbeatInterval: 20,
          staleMultiplier: 2,
          offlineMultiplier: 4,
        });
        const status = computeStatus(device);
        // stale threshold = 20 * 2 = 40s, 25s > 20s (heartbeat) but < 40s → DEGRADED
        expect(status.connectivity).toBe(CONNECTIVITY.DEGRADED);
      });
    });

    describe('ACTIVE lifecycle — health dimension', () => {
      it('returns NORMAL health when all metrics OK', () => {
        const device = makeDevice();
        const health = makeHealth();
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.NORMAL);
      });

      it('returns ERROR health when heartbeatsHealthy is false', () => {
        const device = makeDevice();
        const health = makeHealth({ heartbeatsHealthy: false });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.ERROR);
      });

      it('returns ERROR health when i2cHealthy is false', () => {
        const device = makeDevice();
        const health = makeHealth({ i2cHealthy: false });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.ERROR);
      });

      it('returns ERROR health when bootTestPassed is false', () => {
        const device = makeDevice();
        const health = makeHealth({ bootTestPassed: false });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.ERROR);
      });

      it('returns WARNING health when staleTaskMask > 0', () => {
        const device = makeDevice();
        const health = makeHealth({ staleTaskMask: 3 });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.WARNING);
      });

      it('returns WARNING health when sensorAht21 is false', () => {
        const device = makeDevice();
        const health = makeHealth({ sensorAht21: false });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.WARNING);
      });

      it('returns WARNING health when freeHeap < 30000', () => {
        const device = makeDevice();
        const health = makeHealth({ freeHeap: 25000 });
        const status = computeStatus(device, health);
        expect(status.health).toBe(HEALTH_CONDITION.WARNING);
      });

      it('returns null health when no health metrics', () => {
        const device = makeDevice();
        const status = computeStatus(device, null);
        expect(status.health).toBeNull();
      });
    });
  });

  describe('getSecondsSinceLastSeen', () => {
    it('returns null when no lastSeen', () => {
      expect(getSecondsSinceLastSeen(makeDevice({ lastSeen: null }))).toBeNull();
    });

    it('returns seconds since lastSeen', () => {
      const device = makeDevice({ lastSeen: new Date(Date.now() - 30000) });
      const seconds = getSecondsSinceLastSeen(device);
      expect(seconds).toBeGreaterThanOrEqual(29);
      expect(seconds).toBeLessThanOrEqual(31);
    });
  });

  describe('buildHealthPayload', () => {
    it('returns complete health payload', () => {
      const device = makeDevice({
        lastSeen: new Date(Date.now() - 5000),
        lastTelemetryAt: new Date(Date.now() - 3000),
        lastAckAt: new Date(Date.now() - 8000),
        heartbeatInterval: 10,
        staleMultiplier: 3,
        offlineMultiplier: 6,
      });
      const health = makeHealth();
      const composedStatus = computeStatus(device, health);
      const payload = buildHealthPayload(device, composedStatus, health);

      expect(payload.status).toEqual(composedStatus);
      expect(payload.heartbeatInterval).toBe(10);
      expect(payload.degradedThreshold).toBe(30);
      expect(payload.offlineThreshold).toBe(60);
      expect(payload.maintenanceMode).toBe(false);
      expect(payload.secondsSinceLastSeen).toBeGreaterThanOrEqual(4);
      expect(payload.secondsSinceLastSeen).toBeLessThanOrEqual(6);
      expect(payload.diagnostics).toBeDefined();
      expect(payload.diagnostics.i2c).toBe('OK');
      expect(payload.diagnostics.heartbeatsHealthy).toBe(true);
    });
  });

  describe('dimension constants', () => {
    it('has all connectivity values', () => {
      expect(CONNECTIVITY.ONLINE).toBe('ONLINE');
      expect(CONNECTIVITY.DEGRADED).toBe('DEGRADED');
      expect(CONNECTIVITY.OFFLINE).toBe('OFFLINE');
    });

    it('has all health condition values', () => {
      expect(HEALTH_CONDITION.NORMAL).toBe('NORMAL');
      expect(HEALTH_CONDITION.WARNING).toBe('WARNING');
      expect(HEALTH_CONDITION.ERROR).toBe('ERROR');
    });

    it('has all lifecycle values', () => {
      expect(LIFECYCLE.ACTIVE).toBe('ACTIVE');
      expect(LIFECYCLE.MAINTENANCE).toBe('MAINTENANCE');
      expect(LIFECYCLE.RETIRED).toBe('RETIRED');
    });
  });
});
