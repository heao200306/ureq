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
      '@xrequest/core': resolve(__dirname, 'components/core'),
      '@xrequest/xhr': resolve(__dirname, 'components/xhr'),
      '@xrequest/fetch': resolve(__dirname, 'components/fetch'),
      '@xrequest/entry': resolve(__dirname, 'components/entry'),
    },
  },
});