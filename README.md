# thu-learn-lib

[![Check](https://github.com/robertying/thu-learn-lib/actions/workflows/check.yml/badge.svg)](https://github.com/robertying/thu-learn-lib/actions/workflows/check.yml)
[![npm version](https://img.shields.io/npm/v/@robertying/thu-learn-lib)](https://www.npmjs.com/package/@robertying/thu-learn-lib)

This is a JavaScript library aimed to provide a program-friendly interface of [web Learning of Tsinghua University](https://learn.tsinghua.edu.cn).

This is [robertying](https://github.com/robertying)'s fork of [Harry-Chen/thu-learn-lib](https://github.com/Harry-Chen/thu-learn-lib), maintained for [learnX](https://github.com/robertying/learnX) and published as `@robertying/thu-learn-lib`.

This project is licensed under MIT License. See [CHANGELOG.md](CHANGELOG.md) for release notes and [CONTRIBUTING.md](CONTRIBUTING.md) for development, testing and releasing.

## Compatibility

The library is ESM-only and uses [node-fetch-native](https://github.com/unjs/node-fetch-native) with [fetch-cookie](https://github.com/valeriangalliat/fetch-cookie) for cookie and redirect support. It runs in Node and in React Native; you can also pass your own `fetch` in `HelperConfig`.

Browsers block these cross-origin requests (CORS), so run the library in Node.js or React Native.

## Installation

```bash
pnpm add @robertying/thu-learn-lib
```

## Usage

### Logging in

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
try {
  await helper.login(username, password, fingerPrint);
} catch (e) {
  // e is an ApiError: check e.reason (a FailReason) and e.extra
}

// When resuming with a saved CSRF token and cookie jar, ensureSession logs in again only if the
// session has expired.
helper.setCSRFToken(savedToken);
await helper.ensureSession();

// To reuse cookies elsewhere (e.g. for file download), pass your own cookie jar in the config.

// Logout if you want, but the cookie jar will not be cleared.
await helper.logout();
```

`HelperConfig` also takes `maxConcurrentRequests` (default 6) and `requestTimeout` (milliseconds, default 60000).

### Courses and content

We currently support both student and teacher (or TA) version of web learning. To keep backwards compatibility, the **default behavior of all APIs is to use the student version**. The following APIs take an optional `courseType`; pass `CourseType.TEACHER` to access the teacher version. You **should use them when you are the teacher / TA** of one course, for you will get nothing from the student version in that case.

We do not maintain a global type in `Learn2018Helper` class, for there can be the situation that one can be a student and teacher of the same course simultaneously, on which by using different `CourseType` you can get different results.

- `getCourseList(semesterID, courseType, lang, options)`
- `getNotificationList(courseID, courseType, options)`, `getHomeworkList(courseID, courseType, options)`
- `getFileList/getFileCategoryList/getDiscussionList/getAnsweredQuestionList(courseID, courseType)`, `getFileListByCategory(courseID, categoryID, courseType)`
- `getNotificationAttachment(notification, courseType)`, `getUserInfo(courseType)`
- `getAllContents(courseIDs, type, { courseType })`

Note that currently fetching homework information from teacher version is **partially implemented**.

```typescript
// get ids of all semesters that current account has access to
const semesters = await helper.getSemesterIdList();

// get semester info
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
// questionnaires fetch their questions (one request each) unless you pass { details: 'none' }
const questionnaires = await helper.getQuestionnaireList(course.id, { details: 'none' });
```

Every time field is a `ServerTime`: an ISO 8601 string in Beijing time with its offset (`2026-11-07T18:28:00+08:00`), which `new Date()` reads as the right moment in any time zone.

### Details on demand

Details cost extra requests per item, so they are opt-in; fetch the rest on demand.

```typescript
import { ContentType } from '@robertying/thu-learn-lib';

const withDetails = await helper.getHomeworkList(course.id, undefined, { details: (h) => !h.submitted });
const detail = await helper.getHomeworkDetail(homework[0]);
const attachment = await helper.getNotificationAttachment(notifications[0]);

// get one type of content from many courses; a course that fails is in `errors` instead of failing the rest
const { contents, errors } = await helper.getAllContents(
  courses.map((c) => c.id),
  ContentType.HOMEWORK,
  { details: 'none' },
);
```

### Calendar

```typescript
import { ApiError } from '@robertying/thu-learn-lib';

// get course calendar in a period (yyyymmdd, inclusive)
// ranges over 28 days are fetched in windows; windows that still fail are in failedRanges
try {
  const { events, failedRanges } = await helper.getCalendar('20191001', '20191201', { graduate: false });
} catch (e) {
  // every window failed, or signing in to the registrar failed
  const error = e as ApiError;
  // check e.reason and e.extra for information
}
```

Off campus the registrar is reached through WebVPN, which reuses the id.tsinghua.edu.cn session of the last `login`.

### Errors

Rejected promises carry an `ApiError`: `reason` is a `FailReason` and `extra` holds what the server answered, when there is something useful. For example, a wrong password rejects with `BAD_CREDENTIAL`, an expired session without a `CredentialProvider` with `NOT_LOGGED_IN`, and a slow request with `REQUEST_TIMEOUT`. See `src/types.ts` for every reason and the other type definitions.

## Projects using this library

- [Harry-Chen/Learn Project](https://github.com/Harry-Chen/Learn-Project)
- [jiegec/clone-learn-tsinghua](https://github.com/jiegec/clone-learn-tsinghua)
- [robertying/learnX](https://github.com/robertying/learnX) (customized fork)
- [Konano/thu-weblearn-tgbot](https://github.com/Konano/thu-weblearn-tgbot)
- [Starrah/THUCourseHelper](https://github.com/Starrah/THUCourseHelper)
