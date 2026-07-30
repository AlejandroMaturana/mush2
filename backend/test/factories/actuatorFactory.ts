export interface ActuatorInput {
  id?: number;
  deviceId?: number;
  channel?: number;
  name?: string;
  type?: string;
  state?: boolean;
  value?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function buildActuatorInput(overrides: Partial<ActuatorInput> = {}): ActuatorInput {
  return {
    id: 1,
    deviceId: 1,
    channel: 1,
    name: 'SSR Channel 1',
    type: 'ssr',
    state: false,
    value: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
