import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
        '**/examples/**',
        '**/test/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@generic-request/core': resolve(__dirname, 'components/core'),
      '@generic-request/xhr': resolve(__dirname, 'components/xhr'),
      '@generic-request/fetch': resolve(__dirname, 'components/fetch'),
      '@generic-request/entry': resolve(__dirname, 'components/entry'),
    },
  },
});