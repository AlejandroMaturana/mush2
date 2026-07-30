export interface ChamberInput {
  id?: number;
  name?: string;
  location?: string;
  userId?: number | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export function buildChamberInput(overrides: Partial<ChamberInput> = {}): ChamberInput {
  return {
    id: 1,
    name: 'Chamber A',
    location: 'Lab 1',
    userId: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
