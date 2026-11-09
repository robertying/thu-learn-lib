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

The request layer and on-demand details (v5) have only been tested offline (`test/helpers/fake-server.ts`), since
nobody had a real account at the time. The live tests (`test/live/`) cover these; run `pnpm test:live` and fix
whatever it finds:

- How an expired session answers a JSON request and an HTML page: a 403, a redirect to `login_timeout`, or a 200
  page. The "records how the server answers an expired session" test in `authentication.test.ts` prints it. The library assumes all three are possible and treats a
  short 200 page that mentions `login_timeout` or the SSO login (`looksLikeLoginPage` in `src/request.ts`) as expired.
  Adjust that heuristic and the fake server's `expiry` modes to what the server really does.
- `ensureSession()` resumes a saved CSRF token and cookies without SSO, and logs in again when the session expired.
- A wrong password answers the SSO check with a page that has no ticket link (`BAD_CREDENTIAL`), not an error status.
- On-demand details match the old eager ones (homework, excellent homework, notice attachments, course time/location).
- `getCalendar` on campus. Off campus (checked 2026-11) the registrar redirects every request to WebVPN, and
  `getCalendar` signs in to WebVPN with the id.tsinghua.edu.cn session of the last `login` (see
  `authenticateRegistrar` in `src/calendar.ts`). On campus the auth URL should reach the registrar directly; check it
  still does and that no WebVPN step is attempted.
- Homework `favoriteTime` is read from `scsj`, the same field as `submitTime` (in the favorites list `scsj` is the
  time an item was favorited). Check what the homework lists send and use the right field, or drop `favoriteTime`.
- Grade code -63 maps to `HomeworkGradeLevel.P` (it used to map to `PASS`, like -60); confirm with a P grade.
- `getFileListByCategory` (student) reads `isFavorite` from `f[11]` without converting it; check whether the server
  sends a boolean or `'是'` / `'否'` like the other lists.

## Registrar (`getCalendar`)

- Checked off campus in 2026-11: ranges over 28 days come back complete (a 70-day range: 3 windows, none failed,
  events in date order), and the registrar's JSONP argument is plain JSON.
- Off campus, `getCalendar` needs the id.tsinghua.edu.cn session from the last `login`. A session resumed from saved
  cookies after that one expired gets `FailReason.ERROR_REGISTRAR_AUTH` (id.tsinghua.edu.cn asks for the password
  again) instead of logging in by itself; consider logging in again with the `CredentialProvider` and retrying once.
