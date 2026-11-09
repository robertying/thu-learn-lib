# TODO

## Dependency upgrades

Several runtime dependencies are pinned to old versions on purpose: upgrading them broke the library before, and the
offline tests can't show whether the real server still works. Upgrade them one at a time, each with a full
`pnpm test:live` run against a real account.

| Package        | Pinned        | Latest (2026-11) | Notes                                                                                                                                                                          |
| -------------- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cheerio`      | `1.0.0-rc.12` | 1.2.0            | Parses every HTML page (homework, notice detail, SSO). 1.x changed the default parser and `load` options; check `CHEERIO_CONFIG` (`xml: true`) still gives the same selectors. |
| `tough-cookie` | `4.1.4`       | 6.1.0            | Cookie jar for SSO and roaming. Major versions changed the API to promises / ESM; must stay compatible with `fetch-cookie`.                                                    |
| `fetch-cookie` | `3.0.1`       | 3.2.0            | Handles redirects itself during SSO; check the roaming redirect chain and `Response.url` (used to spot `login_timeout`).                                                       |
| `entities`     | `^8.1.0`      | 9.0.0            | `decodeHTML` for titles and descriptions.                                                                                                                                      |

Other dependencies (`js-base64`, `sm-crypto`, `node-fetch-native`) are on their latest versions.

## Check against the real server

- Not run yet: the live tests added with `NETWORK_ERROR`, the registrar re-login, the timetable helpers and the
  submit request (`pnpm test:live`, read-only), and the `submission` one-time check (`LIVE_ONCE=submission
  LIVE_ALLOW_WRITES=1 SUBMIT_HOMEWORK=… pnpm test:live test/live/once.test.ts`, only with the account owner's OK).
- `FailReason.NETWORK_ERROR` in React Native (`Network request failed`, airplane mode) can't be checked from Node;
  check it in learnX.

The live tests (`test/live/`) cover the request layer and on-demand details; run `pnpm test:live` and fix whatever it
finds. Still open:

- Grade code -63 maps to `HomeworkGradeLevel.P` (-60 is `PASS`); confirm with a P grade. The account checked in
  2026-11 (graded homework in 4 semesters) only had -100, -99 and -98 besides numeric grades.

Checked in 2026-11:

- The homework lists (unsubmitted, submitted, graded) have no favorite time: their `scsj` is the submit time (`null`
  until submitted) next to `sfsc` (`'是'` / `'否'`). The one-time `favorite` check (adds one homework to favorites
  and removes it) confirmed it: favoriting changes only `sfsc` (`'否'` → `'是'`) in the homework row, and
  `getFavorites` lists the item with `addedTime` as a date string.
- Adding and removing favorites (and setting comments) answer `result: 'success'` with a message in the website's
  language ("Added successfully." in English), so only `result` is checked.
- `getFileListByCategory` (student) rows are 15-column arrays; `f[11]` (favorited) is `'是'` / `'否'` like the other
  lists, not a boolean.

## Registrar (`getCalendar`)

- Checked off campus in 2026-11: ranges over 28 days come back complete (a 70-day range: 3 windows, none failed,
  events in date order), and the registrar's JSONP argument is plain JSON.
- Off campus, `getCalendar` needs the id.tsinghua.edu.cn session from the last `login`. When id.tsinghua.edu.cn turns
  the registrar sign-in down, a helper with a `CredentialProvider` logs in again and tries once more; the live test
  `registrar sign-in` (authentication.test.ts) drops the id.tsinghua.edu.cn cookies of a resumed session to check it.
