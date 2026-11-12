import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/live/**', '**/node_modules/**'],
    // `pnpm test:coverage`, which CI runs: it fails below these thresholds,
    // kept just under the current numbers. Raise them as coverage grows.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: { statements: 99, branches: 92, functions: 99, lines: 99 },
    },
  },
});
