export interface DeviceInput {
  id?: number;
  deviceId?: string;
  userId?: number | null;
  chamberId?: number | null;
  chamberName?: string;
  chamberLocation?: string;
  firmwareVersion?: string;
  hwRevision?: string;
  thingSpeakEnabled?: boolean;
  thingSpeakChannelId?: number | null;
  thingSpeakReadKey?: string;
  thingSpeakWriteKey?: string;
  thingSpeakSyncInterval?: number;
  heartbeatInterval?: number;
  staleMultiplier?: number;
  offlineMultiplier?: number;
  ssrActiveLow?: boolean;
  lastSeenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function buildDeviceInput(overrides: Partial<DeviceInput> = {}): DeviceInput {
  return {
    id: 1,
    deviceId: 'mush2_test_device_001',
    userId: null,
    chamberId: null,
    chamberName: 'Test Chamber',
    chamberLocation: 'Lab Bench',
    firmwareVersion: '0.22.0',
    hwRevision: 'esp32-s3-v1',
    thingSpeakEnabled: false,
    thingSpeakChannelId: null,
    thingSpeakReadKey: '',
    thingSpeakWriteKey: '',
    thingSpeakSyncInterval: 300000,
    heartbeatInterval: 60000,
    staleMultiplier: 3,
    offlineMultiplier: 5,
    ssrActiveLow: true,
    lastSeenAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
