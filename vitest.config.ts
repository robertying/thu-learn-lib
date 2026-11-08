import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/live/**', '**/node_modules/**'],
    passWithNoTests: true,
  },
});
