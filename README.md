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
  await helper.login({ username, password, fingerPrint });
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

The lists give `CourseNotification`, `CourseFile`, `Homework`, `Discussion`, `Question` and `Questionnaire` items. A type for an item without its on-demand detail ends in `Base` (`HomeworkBase`, `CourseNotificationBase`), and the detail alone in `Detail` (`HomeworkDetail`).

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

Off campus the registrar is reached through WebVPN, which reuses the id.tsinghua.edu.cn session of the last `login`. When that session has expired (e.g. in a session resumed from saved cookies), a helper with a `CredentialProvider` logs in again and tries once more.

### Timetable

The registrar's calendar knows about holidays and moved classes, but it fails now and then. A timetable can also be worked out from each course's time and location (`getCourseList(..., { timeAndLocation: true })`) and the term's first day:

```typescript
import { CLASS_PERIOD_TIMES, parseCourseMeeting, semesterWeek } from '@robertying/thu-learn-lib';

// '星期六第1节(9,11周)，六教6A414' (or 'Section 1 of Sat (Week 9,11 ), 六教6A414' in English)
const meeting = parseCourseMeeting(course.timeAndLocation[0]);
// { weekday: 6, period: 1, weeks: [9, 11], location: '六教6A414' }; weeks is null for every week
const [start, end] = CLASS_PERIOD_TIMES[meeting.period]; // Beijing time, ['08:00', '09:35']

// the teaching week of a Beijing date; week 1 starts on the Monday after a weekend first day
const week = semesterWeek(semester.startDate, '2026-11-04');
```

### Submitting homework

```typescript
import { homeworkContentHtml } from '@robertying/thu-learn-lib';

// the answer is HTML and replaces the submitted one; pass the submitted HTML to only change the attachment
await helper.submitHomework(homework.studentHomeworkId, homeworkContentHtml('my answer'), {
  filename: 'answer.pdf',
  content: blob, // in React Native: { uri, type }
});
```

`fetch` can't report upload progress. To send the submission with another HTTP client, get the request with `getHomeworkSubmitRequest` (it checks the session first) and read the answer with `checkHomeworkSubmitResponse`:

```typescript
import { checkHomeworkSubmitResponse } from '@robertying/thu-learn-lib';

const { url, body } = await helper.getHomeworkSubmitRequest(id, content, attachment);
const res = await axios.post(url, body, { onUploadProgress });
checkHomeworkSubmitResponse(res.data);
```

### Errors

Rejected promises carry an `ApiError`: `reason` is a `FailReason` and `extra` holds what the server answered, when there is something useful. For example, a wrong password rejects with `BAD_CREDENTIAL`, an expired session without a `CredentialProvider` with `NOT_LOGGED_IN`, a request that gets no answer (offline, DNS or TLS failure) with `NETWORK_ERROR`, and a slow request with `REQUEST_TIMEOUT`; `isConnectionError(e)` is true for the last two, also for a login. See `src/types.ts` for every reason and the other type definitions.

## Projects using this library

- [Harry-Chen/Learn Project](https://github.com/Harry-Chen/Learn-Project)
- [jiegec/clone-learn-tsinghua](https://github.com/jiegec/clone-learn-tsinghua)
- [robertying/learnX](https://github.com/robertying/learnX) (customized fork)
- [Konano/thu-weblearn-tgbot](https://github.com/Konano/thu-weblearn-tgbot)
- [Starrah/THUCourseHelper](https://github.com/Starrah/THUCourseHelper)
