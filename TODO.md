# TODO

## Check against the real server

- Not run yet: the notice half of `read-mark` (the 2026-11-09 run had no unread notice to try). learnX wants to know
  whether opening a notice's detail page marks it read, so reads made offline can be replayed.
- `file-seen` run 2 not run yet (`LIVE_ONCE=file-seen pnpm test:live test/live/once.test.ts`, needs a new file):
  tries the player page `beforePlay` answers, a whole download, and the course's file list page, then reads the
  lists again after a minute. It also records (read only) how `isNew` lines up with upload age and visit count, in
  case "new" is time-based. learnX wants a request that marks a file seen, to replay "file seen" to the server.
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
- The one-time `file-favorite-field` check (2026-11-09): favoriting a file changes no key of its student file-list row
  (`bt, fileSize, isNew, kjflid, kjxxid, llcs, ms, rownum_, scsj, sfqd, sxsj, sxsjStr, wjdx, wjid, wjlx, wlkcid, xzcs`),
  so `getFileList` can't say a file is favorited by itself; `getFileList(..., { favorites: true })` fills it from `getFavorites(courseID, ContentType.FILE)`.
- `read-mark` (2026-11-09): starting a file download does not mark it seen (`isNew` stays).
- `file-seen` run 1 (2026-11-09, 6 new files): the preview check `GET b/kc/wj_wjb/student/beforePlay` (answers
  `{mk, playUrl, sfgk, type}`), the download check `GET b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore` (answers
  `result: 'success'`, `msg: '文件存在'`) and the preview page (`previewUrl`) each leave every key of the file's row
  as it was, `isNew` and `llcs` included.
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
