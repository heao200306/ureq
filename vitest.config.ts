import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
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
      '@xrequest/core': resolve(__dirname, 'packages/core/src'),
      '@xrequest/xhr': resolve(__dirname, 'packages/xhr/src'),
      '@xrequest/fetch': resolve(__dirname, 'packages/fetch/src'),
      '@xrequest/entry': resolve(__dirname, 'packages/entry/src'),
    },
  },
});