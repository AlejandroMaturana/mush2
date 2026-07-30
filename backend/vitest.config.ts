import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'src/__tests__/api.test.js'],
    setupFiles: ['./test/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.test.*'],
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
