import { computeStatus, buildHealthPayload, getSecondsSinceLastSeen, HEALTH_STATES } from '../services/deviceHealthService.js';

function makeDevice(overrides = {}) {
  return {
    id: 1,
    deviceId: 'test-device-001',
    status: 'ONLINE',
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

describe('DeviceHealthService', () => {
  describe('computeStatus', () => {
    it('returns PROVISIONING when no lastSeen', () => {
      const device = makeDevice({ lastSeen: null });
      expect(computeStatus(device)).toBe(HEALTH_STATES.PROVISIONING);
    });

    it('returns ONLINE when lastSeen is within heartbeat interval', () => {
      const device = makeDevice({ lastSeen: new Date(Date.now() - 5000) });
      expect(computeStatus(device)).toBe(HEALTH_STATES.ONLINE);
    });

    it('returns DEGRADED when lastSeen is between heartbeat and stale threshold', () => {
      const device = makeDevice({ lastSeen: new Date(Date.now() - 15000) });
      expect(computeStatus(device)).toBe(HEALTH_STATES.DEGRADED);
    });

    it('returns STALE when lastSeen is between stale and offline threshold', () => {
      const device = makeDevice({ lastSeen: new Date(Date.now() - 40000) });
      expect(computeStatus(device)).toBe(HEALTH_STATES.STALE);
    });

    it('returns OFFLINE when lastSeen exceeds offline threshold', () => {
      const device = makeDevice({ lastSeen: new Date(Date.now() - 70000) });
      expect(computeStatus(device)).toBe(HEALTH_STATES.OFFLINE);
    });

    it('returns MAINTENANCE when maintenanceMode is true', () => {
      const device = makeDevice({ maintenanceMode: true, lastSeen: new Date() });
      expect(computeStatus(device)).toBe(HEALTH_STATES.MAINTENANCE);
    });

    it('returns RETIRED when status is RETIRED', () => {
      const device = makeDevice({ status: 'RETIRED', lastSeen: new Date() });
      expect(computeStatus(device)).toBe(HEALTH_STATES.RETIRED);
    });

    it('uses custom thresholds from device config', () => {
      const device = makeDevice({
        lastSeen: new Date(Date.now() - 25000),
        heartbeatInterval: 20,
        staleMultiplier: 2,
        offlineMultiplier: 4,
      });
      // stale threshold = 20 * 2 = 40s, offline = 20 * 4 = 80s
      // 25s > 20s (heartbeat) but < 40s (stale) → DEGRADED
      expect(computeStatus(device)).toBe(HEALTH_STATES.DEGRADED);
    });

    it('returns STALE when between custom stale and offline thresholds', () => {
      const device = makeDevice({
        lastSeen: new Date(Date.now() - 50000),
        heartbeatInterval: 10,
        staleMultiplier: 3,
        offlineMultiplier: 6,
      });
      // stale = 30s, offline = 60s, 50s is between → STALE
      expect(computeStatus(device)).toBe(HEALTH_STATES.STALE);
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
      const payload = buildHealthPayload(device, 'ONLINE');

      expect(payload.status).toBe('ONLINE');
      expect(payload.heartbeatInterval).toBe(10);
      expect(payload.staleThreshold).toBe(30);
      expect(payload.offlineThreshold).toBe(60);
      expect(payload.maintenanceMode).toBe(false);
      expect(payload.secondsSinceLastSeen).toBeGreaterThanOrEqual(4);
      expect(payload.secondsSinceLastSeen).toBeLessThanOrEqual(6);
    });
  });

  describe('HEALTH_STATES', () => {
    it('has all required states', () => {
      expect(HEALTH_STATES.PROVISIONING).toBe('PROVISIONING');
      expect(HEALTH_STATES.ONLINE).toBe('ONLINE');
      expect(HEALTH_STATES.DEGRADED).toBe('DEGRADED');
      expect(HEALTH_STATES.STALE).toBe('STALE');
      expect(HEALTH_STATES.OFFLINE).toBe('OFFLINE');
      expect(HEALTH_STATES.RETIRED).toBe('RETIRED');
      expect(HEALTH_STATES.MAINTENANCE).toBe('MAINTENANCE');
    });
  });
});
