# TODO

## Dependency upgrades (blocked until the live tests can run)

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

The live tests (`test/live/`) cover the request layer and on-demand details; run `pnpm test:live` and fix whatever it
finds. Still open:

- A wrong password answers the SSO check with a page that has no ticket link (`BAD_CREDENTIAL`), not an error status
  (one-time check `wrong-password` in `test/live/once.test.ts`).
- Grade code -63 maps to `HomeworkGradeLevel.P` (it used to map to `PASS`, like -60); confirm with a P grade. The
  account checked in 2026-11 (graded homework in 4 semesters) only had -100, -99 and -98 besides numeric grades.

Checked in 2026-11 (reads only):

- The homework lists (unsubmitted, submitted, graded) have no favorite time: their `scsj` is the submit time (`null`
  until submitted) next to `sfsc` (`'是'` / `'否'`). `favoriteTime` is now deprecated and always `undefined`; the
  favorites list's `scsj` (`FavoriteItem.addedTime`) has the time an item was favorited. Not compared with a
  favorited homework: the account had none.
- `getFileListByCategory` (student) rows are 15-column arrays; `f[11]` (favorited) is `'是'` / `'否'` like the other
  lists, not a boolean, and `isFavorite` now compares it with `'是'`.

## Registrar (`getCalendar`)

- Checked off campus in 2026-11: ranges over 28 days come back complete (a 70-day range: 3 windows, none failed,
  events in date order), and the registrar's JSONP argument is plain JSON.
- Off campus, `getCalendar` needs the id.tsinghua.edu.cn session from the last `login`. A session resumed from saved
  cookies after that one expired gets `FailReason.ERROR_REGISTRAR_AUTH` (id.tsinghua.edu.cn asks for the password
  again) instead of logging in by itself; consider logging in again with the `CredentialProvider` and retrying once.
