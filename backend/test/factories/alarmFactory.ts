export interface AlarmInput {
  id?: number;
  deviceId?: number;
  type?: string;
  severity?: string;
  message?: string;
  resolvedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function buildAlarmInput(overrides: Partial<AlarmInput> = {}): AlarmInput {
  return {
    id: 1,
    deviceId: 1,
    type: 'temperature_high',
    severity: 'warning',
    message: 'Temperature above threshold',
    resolvedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
