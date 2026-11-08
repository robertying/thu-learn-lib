# thu-learn-lib

[![Check](https://github.com/robertying/thu-learn-lib/actions/workflows/check.yml/badge.svg)](https://github.com/robertying/thu-learn-lib/actions/workflows/check.yml)
[![npm version](https://img.shields.io/npm/v/@robertying/thu-learn-lib)](https://www.npmjs.com/package/@robertying/thu-learn-lib)

This is a JavaScript library aimed to provide a program-friendly interface of [web Learning of Tsinghua University](https://learn.tsinghua.edu.cn).

This is [robertying](https://github.com/robertying)'s fork of [Harry-Chen/thu-learn-lib](https://github.com/Harry-Chen/thu-learn-lib), maintained for [learnX](https://github.com/robertying/learnX) and published as `@robertying/thu-learn-lib`.

This project is licensed under MIT License.

## Compatibility

The library is ESM-only and uses [node-fetch-native](https://github.com/unjs/node-fetch-native) with [fetch-cookie](https://github.com/valeriangalliat/fetch-cookie) for cookie and redirect support. It runs in Node and in React Native; you can also pass your own `fetch` in `HelperConfig`.

## Installation

```bash
pnpm add @robertying/thu-learn-lib
```

## Development

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm build # emits ESM + .d.ts to lib/
```

The code is split by area under `src/`: `request.ts` (session, CSRF token, re-login), `auth.ts`, `courses.ts`, `notices.ts`, `files.ts`, `homework.ts`, `discussions.ts`, `questionnaires.ts`, `favorites.ts`, `calendar.ts`, `contents.ts` and `user.ts`. `index.ts` holds the public `Learn2018Helper` class, which passes its private session to those functions.

Linting uses type-aware [oxlint](https://oxc.rs/docs/guide/usage/linter) and formatting uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter).

## Releasing

Bump `version` in `package.json`, merge, then push a matching tag (for example `git tag v5.1.0 && git push origin v5.1.0`). The Release workflow checks, builds, publishes to npm with provenance (npm trusted publishing, no token) and creates a GitHub release.

## Usage

### Authentication related (important changes since v1.2.0)

```typescript
import { Learn2018Helper } from '@robertying/thu-learn-lib';

// There are three ways of logging in:

// 1. provide a cookie jar with existing cookies (see `tough-cookie`)
const helper = new Learn2018Helper({ cookieJar });
// 2. provide nothing, and call login with your credentials
const helper = new Learn2018Helper();
// 3. provide a CredentialProvider function, which can be async
const helper = new Learn2018Helper({
  provider: () => ({ username, password, fingerPrint }),
});

// `fingerPrint` (and optionally `fingerGenPrint`, `fingerGenPrint3`) is the device fingerprint that
// id.tsinghua.edu.cn asks for; login fails with `NO_CREDENTIAL` without it.

// With the first two methods the session may time out. With a CredentialProvider the library logs in
// again and retries once when a request finds the session expired, so we strongly recommend it.

// Without a CredentialProvider you must log in yourself. With one, the first request logs in.
// When resuming with a saved CSRF token (setCSRFToken) and cookie jar, call `await helper.ensureSession()`:
// it logs in again only if the session has expired.
try {
  await helper.login(username, password, fingerPrint);
} catch (e) {
  // e is an ApiError: check e.reason (a FailReason) and e.extra
}

// To reuse cookies elsewhere (e.g. for file download), pass your own cookie jar in the config.

// Logout if you want, but the cookie jar will not be cleared.
await helper.logout();
```

### Content related

We currently support both student and teacher (or TA) version of web learning. To keep backwards compatibility, the **default behavior of all APIs is to use the student version**. The following APIs needs `CourseType.TEACHER` as the last (optional) parameter to access the teacher version. You **should use them when you are the teacher / TA** of one course, for you will get nothing from the student version in that case.

We do not maintain a global type in `Learn2018Helper` class, for there can be the situation that one can be a student and teacher of the same course simultaneously, on which by using different `CourseType` you can get different results.

- `getCourseList`
- `getNotificationList/getFileList/getHomeworkList/getDiscussionList/getAnsweredQuestionList`
- `getAllContents`

Note that currently fetching homework information from teacher version is **partially implemented**.

```typescript
import { ContentType, ApiError } from '@robertying/thu-learn-lib';

// get ids of all semesters that current account has access to
const semesters = await helper.getSemesterIdList();

// get get semester info
const semester = await helper.getCurrentSemester();

// get courses of this semester
const courses = await helper.getCourseList(semester.id);
const course = courses[0];

// get detail information about the course
const discussions = await helper.getDiscussionList(course.id);
const notifications = await helper.getNotificationList(course.id);
const files = await helper.getFileList(course.id);
const homework = await helper.getHomeworkList(course.id);
const questions = await helper.getAnsweredQuestionList(course.id);

// details cost extra requests per item, so they are opt-in; fetch the rest on demand
const withDetails = await helper.getHomeworkList(course.id, undefined, { details: (h) => !h.submitted });
const detail = await helper.getHomeworkDetail(homework[0]);
const attachment = await helper.getNotificationAttachment(notifications[0]);

// get one type of content from many courses; a course that fails is in `errors` instead of failing the rest
const { contents, errors } = await helper.getAllContents(
  courses.map((c) => c.id),
  ContentType.HOMEWORK,
  { details: 'none' },
);

// get course calendar in a period (yyyymmdd, inclusive)
// ranges over 28 days are fetched in windows; windows that still fail are in failedRanges
try {
  const { events, failedRanges } = await helper.getCalendar('20191001', '20191201', { graduate: false });
} catch (e) {
  // every window failed
  const error = e as ApiError;
  // check e.reason and e.extra for information
}
```

Browsers block these cross-origin requests (CORS), so run the library in Node.js or React Native.

## Typing

See `src/types.ts` for type definitions. Note that `ApiError` represents the type that will be used in rejected Promises.

## Testing

`pnpm test` runs the offline tests. They give the helper a fake `fetch` (`test/helpers/fake-server.ts`) that serves hand-written responses shaped like Web Learning's, simulates SSO login and session expiry, and records every request so tests can also check how many requests an API makes.

`pnpm test:live` runs the tests against the real server. It needs your own credentials: copy `test/live/template.env` to `test/live/.env` and fill it in.

## Changelog

- v5.1.0
  - Treat a 200 HTML page where JSON was expected as an expired session: log in again and retry once, like a 403
  - `ensureSession` checks the probe's body (the current semester) instead of only its status
  - Logins never overlap: `login(username, password, fingerPrint)` waits for a login in progress, and requests that find the session expired during it wait for it instead of starting another SSO login
  - `submitHomework` with an attachment has no timeout (the response only starts after the upload)
  - A caller's `signal` can still cancel reading a body after the headers arrived
  - `getCalendar`: timed-out windows are not retried, and after two in a row the rest go to `failedRanges` without a request; an invalid date throws a `RangeError`; a bad JSONP body rejects with an `ApiError` (`INVALID_RESPONSE`) instead of a bare string
  - `getNotificationAttachment` returns `undefined` when the detail page has no attachment link, instead of throwing
  - `getHomeworkList(courseID, undefined, options)` type-checks; `getAllContents` rejects homework of a teacher course with `NOT_IMPLEMENTED` instead of returning student data
  - Supports Node 22 and later (was 26)
- v5.0.0
  - (_BREAKING CHANGE_) Per-item detail requests are opt-in: `getHomeworkList(id, CourseType.STUDENT, { details })`, `getNotificationList(id, type, { attachments })` (notices get `attachmentName`), `getCourseList(semester, type, lang, { timeAndLocation })` (`timeAndLocation` is now optional); fetch the rest on demand with `getHomeworkDetail`, `getExcellentHomeworkDetail`, `getNotificationAttachment` and `getCourseTimeAndLocation`
  - (_BREAKING CHANGE_) The excellent homework list is fetched once per course and comes without details
  - (_BREAKING CHANGE_) `getAllContents(ids, type, { courseType, details })` returns `{ contents, errors }` and no longer rejects when a course fails
  - (_BREAKING CHANGE_) `getCalendar(start, end, { graduate })` fetches ranges over 28 days in windows and returns `{ events, failedRanges }`
  - Requests are capped (`maxConcurrentRequests`, default 6) and time out (`requestTimeout`, default 60 s, `FailReason.REQUEST_TIMEOUT`); concurrent re-logins share one SSO login
  - `ensureSession()` resumes a saved session (CSRF token + cookies) and logs in only if it has expired
- v4.1.0
  - Published as `@robertying/thu-learn-lib`
  - Tooling: pnpm, TypeScript 7 (`tsc` ESM + `.d.ts` build), oxlint + oxfmt, Vitest 5, Node 26
  - (_BREAKING CHANGE_) Drop the IIFE browser build and the browser-extension demo
  - Code split into modules, with offline tests
  - No API changes
- v4.0.0
  - Upgrade cheerio to 1.0
  - Add support for questionnaire (add `getQuestionnaireList` API and some public types)
  - Add support for managing favorite items
  - Add support for sorting courses (i.e. manage the order on web learning)
  - Add support for managing comments on content (e.g. files, notifications)
  - (_BREAKING CHANGE_) Deprecate usage of `studentHomeworkId`
- v3.2.1
  - Upgrade to eslint v9
  - Add `setCSRFToken` function to manually reuse previous (maybe valid) token and prevent unnecessary re-login (see [#49](https://github.com/Harry-Chen/thu-learn-lib/issues/49))  
    _Note:_ To use this feature in Node.js, `cookieJar` should also be reused, otherwise it will not work. (not the case in browser env)
  - Fix `CourseContent` type: default value for type param `T` (breaking change introduced in [#53](https://github.com/Harry-Chen/thu-learn-lib/issues/53))
  - _(Breaking...?)_ Rename `File.id2` added in previous version to actual `id` and previously used `id` to `fileId` (see [#60](https://github.com/Harry-Chen/thu-learn-lib/issues/60))
  - Upgrade dependencies
- v3.2.0
  - Support file categories (see [#57](https://github.com/Harry-Chen/thu-learn-lib/issues/57)):
    - Add `FileCategory` type and optional `category` field in `File` type
    - Now `getFileList` function automatically fetches all categories and saves them in each `File` object
    - Add `getFileCategoryList` function to fetch file categories
    - Add `getFileListByCategory` function to get file list by category
  - Fix content of file download url and visit count in for `CourseType.TEACHER`
- v3.1.4
  - Allow and check for undefined credential in login (see [#52](https://github.com/Harry-Chen/thu-learn-lib/issues/52))
  - Discriminate `getAllContents` return type based on input content type (see [#53](https://github.com/Harry-Chen/thu-learn-lib/issues/53))
  - Use `searchParams` to set csrf token & add csrf token to `getCalendar` (see [#54](https://github.com/Harry-Chen/thu-learn-lib/issues/54))
  - Update bunches of dependencies
- v3.1.3
  - Fix empty time and location of course (see [#145](https://github.com/Harry-Chen/Learn-Helper/issues/145))
- v3.1.2
  - Fix empty course name parsing
  - (Maybe BEARKING) `Homework.gradeLevel` changed to `HomeworkGradeLevel` (a string enum) for better i18n
  - Fix get language
- v3.1.1
  - Remove `fetch-cookie` dependency in browser build, reducing bundle size
  - Add `getUserInfo` interface (#48, thanks to @robertying)
- v3.1.0
  - **Refactor**:
    - Build tool: `webpack` -> `tsup`
    - Development tool: `webpack` -> `vite`
    - Test tool: `jest` -> `vitest`
    - Fetch:
      - `cross-fetch` -> `node-fetch-native` (Node.js now has native `fetch`)
      - `real-isomorphic-fetch` -> `fetch-cookie` (`fetch-cookie` now can handle redirects)
      - `tough-cookie-no-native` -> `tough-cookie` (`tough-cookie` is now native)
    - **(BREAKING)** Updated library output structure, now everything exported in index, cannot use `/lib` or `/lib/types` anymore
  - Added:
    - Submit homework
    - Language switching and related behaviour
    - Get TA's homework info (partial support)
  - Fixed:
    - **Web Learning API update**
    - Decode course name
  - Other:
    - Move `fake-parse5` to [a seperate library](https://github.com/AsakuraMizu/fake-parse5)
- v3.0.4
  - No feature changes, upgrade dependencies
- v3.0.3
  - No feature changes, upgrade dependencies
- v3.0.2
  - No feature changes, upgrade dependencies to mitigate security vulnerabilities
- v3.0.1
  - Add config `generatePreviewUrlForFirstPage` to switch preview URL type (default to `true`)
- v3.0.0
  - (BREAKING CHANGE) Redesign exported types, use `RemoteFile` to represent a file on Web Learning
  - Add support for parsing attachment sizes & preview URLs in homework & notifications (Harry-Chen/Learn-Helper#109)
- v2.5.4
  - Fix (sometimes) incorrect publish time of notifications (#36)
- v2.5.3
  - Add `allowFailure` in `getAllContents` for convenience
- v2.5.2
  - Allow retrieving CSRF token via `getCSRFToken` method
  - Export `addCSRFTokenToUrl` function as API for convenience
- v2.5.1
  - No feature change, add support for direct `import` in Node.js
- v2.5.0
  - Add transparent support for CSRF token (recently deployed) in all Web Learning APIs
- v2.4.2
  - No functionality change, bump some dependencies to mitigate security concerns
- v2.4.1
  - Replace `parse5` with `htmlparser2` in Cheerio and remove it from bundled file (replaced with `src/fake-parse5`)
  - Replace TSLint with ESLint
- v2.4.0
  - Upgrade to TypeScript 4.1 & Webpack 5.15
  - Add more null checking for disabled functionalities (see [xxr3376/Learn-Project#90](https://github.com/xxr3376/Learn-Project/issues/90))
- v2.3.2
  - Fix a problem in `v2.3.1` (not published) and `v2.3.0` that build output fails to be uploaded to npm
- v2.3.0
  - Refine error detecting & handling by using `ApiError` in usage of `Promise.reject` (might be a breaking change)
- v2.2.3
  - Add workaround for some strange behaviors in teacher mode (thanks to @MashPlant)
- v2.2.2
  - Return error when API return any non-success result
- v2.2.1
  - Fix a missing parameter in `previewUrl`
- v2.2.0
  - Use ECMAScript private fields in `Learn2018Helper` class to protect credentials
  - Add `previewUrl` to `File`
  - Upgrade to TypeScript 3.8.2
- v2.1.2
  - Fix problem in invoking JSONP callback (because some engines might do JIT)
- v2.1.1
  - Remove usage of `eval` in `getCalendar`
- v2.1.0
  - Catch errors returned by calendar API and throw user-defined error
  - Add documentation for all public APIs
- v2.0.0
  - Use ES2018 in generated library
  - Add `FailReason` to represent all strings that will be used as the reason of rejected Promises
  - `login` and `logout` no longer return Promises
- v1.2.2
  - Fix a function signature to keep compatibility
- v1.2.1
  - Support TA version of many APIs (see above for usage)
  - Fix some wrong URLs in fetched data
- v1.2.0
  - Support getting course calendars from academic.tsinghua.edu.cn (thanks to robertying)
  - Automatic retry logging in when fetching failed and `CredentialProvider` is provided (thanks to mayeths)
  - Add unit tests using `jest` (thanks to mayeths)
  - Filter out `null` values in `getSemesterIdList` API
  - Switch to `https://learn.tsinghua.edu.cn/` from `learn2018` permanently
- v1.1.4
  - Return empty array if any content module is disabled
  - Add `getTACourseList` to get TA's course list (temporarily can not be used by other functions)
- v1.1.3
  - Emergency fix of wrongly decoded base64 string, add `js-base64` back
- v1.1.2
  - Switch to `Base64.js` instead of `js-base64`, which uses evil `eval`
- v1.1.1
  - Decode HTML entities in the title of disscussions (the last one, I promise!)
- v1.1.0
  - Fix an typo in grade level mapping
  - Bump to a new minor version
- v1.0.16 (no v1.0.15 due to some publishing issues)
  - Switch to `yarn`
  - Add parsing of grade levels of homework (A+/A/.../F)
- v1.0.14
  - Add prefix for `attachmentUrl` filed of Notification
  - Deprecate all old versions
- v1.0.13
  - Decode HTML entities whenever possible
- v1.0.12
  - Add `url` for Course
  - Fix `url` for Question (to display correct section name)
- v1.0.11
  - Fix `url` error in Question
- v1.0.10
  - Decode the HTML entities in the `description` field of homework
- v1.0.9
  - Use `entities` to decode HTML entities
- v1.0.8
  - Export type CourseContent
- v1.0.7
  - No change made to code, update README
- v1.0.6
  - Add API to fetching content for a list of courses
- v1.0.5
  - Fix HTML entity replacement.
- v1.0.4
  - No change made to code
  - Remove unused build commands
  - Fix multiple typos in README
- v1.0.3
  - Add real logout API (thank @zhaofeng-shu33)
- v1.0.2
  - Add API to get IDs of all semesters (thank @jiegec)
- v1.0.1
  - Expose CookieJar in helper class
  - Fix some HTML entity decoding problems
  - **Rename of some APIs** (break compatibility before we have actual users)
- v1.0.0
  - First release
  - Support parsing of notification, homework, file, discussion and **answered** questions

## Projects using this library

- [Harry-Chen/Learn Project](https://github.com/Harry-Chen/Learn-Project)
- [jiegec/clone-learn-tsinghua](https://github.com/jiegec/clone-learn-tsinghua)
- [robertying/learnX](https://github.com/robertying/learnX) (customized fork)
- [Konano/thu-weblearn-tgbot](https://github.com/Konano/thu-weblearn-tgbot)
- [Starrah/THUCourseHelper](https://github.com/Starrah/THUCourseHelper)
