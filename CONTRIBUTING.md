# Contributing

## Development

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm build # emits ESM + .d.ts to lib/
```

The code is split by area under `src/`: `request.ts` (session, CSRF token, re-login), `auth.ts`, `courses.ts`, `notices.ts`, `files.ts`, `homework.ts`, `discussions.ts`, `questionnaires.ts`, `favorites.ts`, `calendar.ts`, `timetable.ts` (reading `Course.timeAndLocation`, class periods and teaching weeks), `contents.ts`, `user.ts`, `attachments.ts` (attachment links on detail pages), `utils.ts`, and `cookies.ts`, the `@robertying/thu-learn-lib/cookies` entry point (a cookie jar for Node; nothing else imports it). `index.ts` holds the public `Learn2018Helper` class, which passes its private session to those functions. Types are in `types.ts`, URLs in `urls.ts`, and the server's codes (content types, grade levels, semester and questionnaire types) in `codes.ts`.

Linting uses type-aware [oxlint](https://oxc.rs/docs/guide/usage/linter) and formatting uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter).

## Testing

`pnpm test` runs the offline tests. They give the helper a fake `fetch` (`test/helpers/fake-server.ts`) that serves hand-written responses shaped like Web Learning's, simulates SSO login and session expiry, and records every request so tests can also check how many requests an API makes. `pnpm test:coverage` runs them with a coverage report (V8) for `src` and fails below the thresholds in `vitest.config.ts`; CI runs it.

`pnpm test:live` runs the tests against the real server. It needs your own credentials and a device fingerprint: copy `test/live/template.env` to `test/live/.env` and fill it in. The script sets `OPENSSL_CONF=test/live/openssl.cnf`, which the server's TLS needs; set it too when running them from an editor. The live tests also check what the offline tests can only assume, such as how the server answers an expired session; [TODO.md](TODO.md) lists what is still unconfirmed.

The live tests are read-only by default: requests that change something on the server (submitting homework, favorites, comments, course order) are refused unless `LIVE_ALLOW_WRITES=1`. Checks that leave a trace on the account (a failed login, items marked read, a favorite added and removed again; that one also needs `LIVE_ALLOW_WRITES=1`) are in `test/live/once.test.ts` and run only when named in `LIVE_ONCE`, e.g. `LIVE_ONCE=read-mark pnpm test:live test/live/once.test.ts`; run them alone, before the other live tests. Other runs warn when the code one covers has changed since it last passed.

## Releasing

Add the release to [CHANGELOG.md](CHANGELOG.md) and bump `version` in `package.json`, merge, then push a matching tag (for example `git tag v6.0.0 && git push origin v6.0.0`). The Release workflow checks, builds, publishes to npm with provenance (npm trusted publishing, no token) and creates a GitHub release.
