# TODO

## Check against the real server

- Not run yet: the `submission` one-time check (`LIVE_ONCE=submission LIVE_ALLOW_WRITES=1 SUBMIT_HOMEWORK=… pnpm
  test:live test/live/once.test.ts`, only with the account owner's OK).
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
- The one-time `favorite-types` check (2026-11-09): notices are favorited by their id and `isFavorite` flips in the
  notice list. Files take `CourseFile.id` (kjxxid); `fileId` (wjid) answers HTTP 500. Adding twice keeps one favorite
  and removing a non-favorite succeeds, so both are safe to retry. An unknown id answers HTTP 500
  (`UNEXPECTED_STATUS`). The favorites list returns every row when `aoData` has no paging (`iDisplayLength` null);
  it pages only when asked (`iDisplayStart` / `iDisplayLength`).
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
