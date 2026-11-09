# TODO

## Check against the real server

- Not run yet: the notice half of `read-mark` (the 2026-11-09 run had no unread notice to try). learnX wants to know
  whether opening a notice's detail page marks it read, so reads made offline can be replayed.
- Not known yet: whether a whole `downloadFile` marks a file seen without `downloadFileBefore` first (`file-seen` run 2
  sent both). learnX sends both, like the website.
- Not run yet: the `submission` one-time check (`LIVE_ONCE=submission LIVE_ALLOW_WRITES=1 SUBMIT_HOMEWORK=… pnpm
  test:live test/live/once.test.ts`, only with the account owner's OK).
- `FailReason.NETWORK_ERROR` in React Native (`Network request failed`, airplane mode) can't be checked from Node;
  check it in learnX.

The live tests (`test/live/`) cover the request layer and on-demand details; run `pnpm test:live` and fix whatever it
finds. Still open:

- Grade code -63 maps to `HomeworkGradeLevel.P` (-60 is `PASS`); confirm with a P grade. The account checked in
  2026-11 (graded homework in 4 semesters) only had -100, -99 and -98 besides numeric grades.

What the live checks found so far is in [docs/server-behavior.md](docs/server-behavior.md); add new findings there.
