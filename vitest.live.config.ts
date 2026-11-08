import { defineConfig } from 'vitest/config';

// Runs against the real Web Learning server. Needs credentials in test/live/.env
// (see test/live/template.env).
export default defineConfig({
  test: {
    include: ['test/live/**/*.test.ts'],
    retry: 1,
    globalSetup: ['./test/live/globalSetup.ts'],
  },
});
