import { defineConfig } from 'vitest/config';

// Runs against the real Web Learning server. Needs credentials in test/live/.env
// (see test/live/template.env). Read-only by default; see guard.ts and once.ts.
export default defineConfig({
  test: {
    include: ['test/live/**/*.test.ts'],
    retry: 1,
    globalSetup: ['./test/live/globalSetup.ts'],
    // refuses requests that change something on the server unless LIVE_ALLOW_WRITES=1
    setupFiles: ['./test/live/guard.ts'],
  },
});
