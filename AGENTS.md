# AGENTS.md

`@robertying/thu-learn-lib` is a TypeScript client for Tsinghua's Web Learning (learn.tsinghua.edu.cn) and the registrar's calendar, published to npm as ESM and used by [learnX](https://github.com/robertying/learnX) (React Native). [CONTRIBUTING.md](CONTRIBUTING.md) has the commands, the layout of `src/` and how testing and releasing work; read it first.

## Rules

- `pnpm format`, then `pnpm typecheck`, `pnpm lint` and `pnpm test` must pass before committing (CI runs `pnpm lint --deny-warnings` and `pnpm format --check`).
- The library has to bundle in React Native (Metro): import `cheerio/slim`, never `cheerio` (lint enforces it), and no `node:` modules or Node-only APIs in `src/`. Requests go through the helper's `fetch` (`HelperConfig.fetch`, which tests replace).
- Times the library returns are `ServerTime` strings (ISO 8601 in Beijing time with the offset); keep new time fields that way.
- Errors are plain `{ reason, extra }` objects with a `FailReason`, not `Error` instances.
- Every user-visible change gets an entry under the next version in [CHANGELOG.md](CHANGELOG.md), marked `(_BREAKING CHANGE_)` with a migration note when it breaks callers. Only the maintainer pushes release tags (pushing one publishes to npm).
- Test new or changed requests offline against `test/helpers/fake-server.ts`, shaped like the real responses, and check request counts where an API promises them.

## Live tests

- `pnpm test:live` uses a real account from `test/live/.env`. Never print or commit its values.
- The live tests are read-only unless `LIVE_ALLOW_WRITES=1`. Don't set it, or run a `LIVE_ONCE` check that leaves a trace on the account (`test/live/once.test.ts`), without the account owner's OK for that run.
- Record what a live run finds about the server in [docs/server-behavior.md](docs/server-behavior.md), and keep [TODO.md](TODO.md) to what is still unchecked.
