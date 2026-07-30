export interface UserInput {
  id?: number;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export function buildUserInput(overrides: Partial<UserInput> = {}): UserInput {
  return {
    id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
    password: '$2a$10$hashedpassword',
    role: 'user',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
