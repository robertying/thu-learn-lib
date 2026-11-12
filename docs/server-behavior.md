# Server behavior

What the live tests (`test/live/`) found out about Web Learning and the registrar, beyond what the website shows. The offline fake server (`test/helpers/fake-server.ts`) follows these. Open questions are in [TODO.md](../TODO.md).

## Web Learning (checked in 2026-11)

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
  so `getFileList` can't say a file is favorited by itself; `getFileList(..., { favorites: true })` fills it from `getFavorites({ courseID, type: ContentType.FILE })`.
- `read-mark` (2026-11-09): starting a file download does not mark it seen (`isNew` stays).
- `file-seen` run 1 (2026-11-09, 6 new files): the preview check `GET b/kc/wj_wjb/student/beforePlay` (answers
  `{mk, playUrl, sfgk, type}`), the download check `GET b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore` (answers
  `result: 'success'`, `msg: '文件存在'`) and the preview page (`previewUrl`) each leave every key of the file's row
  as it was, `isNew` and `llcs` included.
- `file-seen` run 2 (2026-11-09): a whole download (`downloadFileBefore`, then all of `downloadFile`) marks the file
  seen (`isNew` 1 → 0, `xzcs` + 1; `read-mark` stopped after the headers, which doesn't). The player page that
  `beforePlay` answers (`f/wlxt/kc/wj_wjb/student/beforePlay`) doesn't, and the file list page
  `f/wlxt/kj/wlkc_kjxxb/student/beforePageList` answers HTTP 500. `isNew` is per student, not by upload age: new
  files were 0-4 days old, seen ones 1-70 days.
- `read-mark` (2026-11-12): `downloadFile` alone, without `downloadFileBefore` first and cancelled after the headers,
  marked the file seen. On 2026-11-09 the same step didn't; a small file may have arrived whole before the cancel, so
  `downloadFileBefore` doesn't look required.
- A course the account can't open (not enrolled, or an id that doesn't exist; 2026-11-09, read-only) never answers
  403: the file list answers 200 `result: 'error'`, `msg: '您没有访问此功能的权限！'` (`INVALID_RESPONSE`); the notice
  list answers `result: 'success'`, `msg: '没有权限'`, `object: null` (an empty list); the discussion list answers an
  empty `resultsList`; the course page answers HTTP 500; the time and location answers `['您没有权限查看该课程的上课时间地点']`
  (which `parseCourseMeeting` reads as `null`). Only a wrong `_csrf` answered 403 (an HTML error page), so treating a
  403 as an expired session (log in again, retry with the new token) is right.
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
