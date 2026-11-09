import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  CLASS_PERIOD_TIMES,
  ContentType,
  CourseType,
  Language,
  Learn2018Helper,
  parseCourseMeeting,
  semesterWeek,
} from '../../src/index.ts';
import { config } from './config.ts';

/** whether two dates are the same day, written as YYYY-MM-DD or yyyymmdd */
const sameDate = (a: string, b: string) => a.replaceAll('-', '') === b.replaceAll('-', '');

/** a course name as the registrar's calendar and Web Learning may each write it */
const normalize = (name: string) => name.replace(/\s/g, '').replace(/（/g, '(').replace(/）/g, ')');

// the server gives image links in descriptions a new random `videoVersion` each time it sends a page
const withoutVideoVersion = (text?: string) => text?.replace(/videoVersion=\d+/g, 'videoVersion=');

describe('helper data retrieval', () => {
  const h = new Learn2018Helper(config);

  beforeAll(async () => {
    await h.login();
  });
  afterAll(async () => {
    await h.logout();
  });

  const semesterTester = inject('studentSemester');
  const courseTester = inject('studentCourse');
  const semesterTATester = inject('teacherSemester');
  const courseTATester = inject('teacherCourse');

  it('should get correct language', async () => {
    const lang = h.getCurrentLanguage();
    expect(lang).toBeDefined();
    const courses = await h.getCourseList(semesterTester);
    courses.forEach((course) => {
      expect(course.name).toBe(lang === Language.EN ? course.englishName : course.chineseName);
    });
  });

  it('should get semesterIdList correctly', async () => {
    const semesters = await h.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
    for (const semester of semesters) {
      expect(typeof semester).toBe('string');
    }
    expect(semesters).toContain(semesterTester);
    expect(semesters).toContain(semesterTATester);
  });

  it('should get currentSemester correctly', async () => {
    const currSemester = await h.getCurrentSemester();
    expect(currSemester).not.toBeUndefined();
    expect(currSemester).not.toBeNull();
  });

  it('should get courseList correctly', async () => {
    const courses = await h.getCourseList(semesterTester);
    expect(courses.length).toBeGreaterThanOrEqual(0);
    if (courses.length > 0) {
      expect(courses.map((c) => c.id)).toContain(courseTester);
    }
  });

  it('should get TAcourses correctly', async () => {
    const courses = await h.getCourseList(semesterTATester, CourseType.TEACHER);
    expect(courses.length).toBeGreaterThanOrEqual(0);
    if (courses.length > 0) {
      expect(courses.map((c) => c.id)).toContain(courseTATester);
    }
  });

  it('should get contents (or throw on unimplemented function) correctly', async () => {
    if (courseTester !== undefined) {
      expect((await h.getHomeworkList(courseTester)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getDiscussionList(courseTester)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getNotificationList(courseTester)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getFileList(courseTester)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getAnsweredQuestionList(courseTester)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getQuestionnaireList(courseTester)).length).toBeGreaterThanOrEqual(0);
    }
    if (courseTATester !== undefined) {
      // expect((await h.getDiscussionList(courseTATester, CourseType.TEACHER)).length).toBeGreaterThanOrEqual(0);
      // expect((await h.getNotificationList(courseTATester, CourseType.TEACHER)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getFileList(courseTATester, CourseType.TEACHER)).length).toBeGreaterThanOrEqual(0);
      // expect((await h.getAnsweredQuestionList(courseTATester, CourseType.TEACHER)).length).toBeGreaterThanOrEqual(0);
      expect((await h.getHomeworkList(courseTATester, CourseType.TEACHER)).length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should get file categories and list correctly', async () => {
    if (courseTester !== undefined) {
      const categories = await h.getFileCategoryList(courseTester);
      expect(categories.length).toBeGreaterThanOrEqual(0);
      expect((await h.getFileListByCategory(courseTester, categories[0].id)).length).toBeGreaterThanOrEqual(0);
    }
    if (courseTATester !== undefined) {
      const categories = await h.getFileCategoryList(courseTATester, CourseType.TEACHER);
      expect(categories.length).toBeGreaterThanOrEqual(0);
      expect(
        (await h.getFileListByCategory(courseTATester, categories[0].id, CourseType.TEACHER)).length,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('should get user info correctly', async () => {
    const userInfo = await h.getUserInfo();
    expect(userInfo).toBeDefined();

    expect(userInfo.name).toBeTruthy();
    expect(typeof userInfo.name).toBe('string');

    expect(typeof userInfo.department).toBe('string');
    // in English, the page shows `none` for a 书院 (and some departments)
    if (h.getCurrentLanguage() === Language.ZH) expect(userInfo.department).toBeTruthy();
    expect(userInfo.department.toLowerCase()).not.toBe('none');
  });

  it('gets the same homework details from the list option and on demand', async () => {
    if (!courseTester) return;
    const plain = await h.getHomeworkList(courseTester);
    const detailed = await h.getHomeworkList(courseTester, undefined, { details: 'all' });
    expect(detailed.map((hw) => hw.id)).toEqual(plain.map((hw) => hw.id));
    for (const [i, hw] of plain.entries()) {
      const detail = await h.getHomeworkDetail(hw);
      expect({ ...detail, description: withoutVideoVersion(detail.description) }).toEqual({
        description: withoutVideoVersion(detailed[i].description),
        attachment: detailed[i].attachment,
        answerContent: detailed[i].answerContent,
        answerAttachment: detailed[i].answerAttachment,
        submittedContent: detailed[i].submittedContent,
        submittedAttachment: detailed[i].submittedAttachment,
        gradeAttachment: detailed[i].gradeAttachment,
      });
    }
    for (const excellent of plain.flatMap((hw) => hw.excellentHomeworkList ?? []).slice(0, 3)) {
      await h.getExcellentHomeworkDetail(excellent);
    }
  });

  it('gets an attachment for every notice that names one', async () => {
    if (!courseTester) return;
    const notices = await h.getNotificationList(courseTester, CourseType.STUDENT, { attachments: 'all' });
    for (const n of notices) {
      if (n.attachmentName) expect(n.attachment?.id).toBeTruthy();
      else expect(n.attachment).toBeUndefined();
    }
  });

  it('gets course time and location on demand', async () => {
    const courses = await h.getCourseList(semesterTester, CourseType.STUDENT, undefined, { timeAndLocation: true });
    for (const c of courses) expect(Array.isArray(c.timeAndLocation)).toBe(true);
  });

  it('gets contents of several courses with errors per course', async () => {
    const courses = await h.getCourseList(semesterTester);
    const ids = courses.slice(0, 3).map((c) => c.id);
    const { contents, errors } = await h.getAllContents(ids, ContentType.NOTIFICATION);
    expect(errors).toEqual({});
    expect(Object.keys(contents).toSorted()).toEqual(ids.toSorted());
  });

  it('gives every time as ISO 8601 with an offset', async () => {
    if (!courseTester) return;
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
    const times = [
      ...(await h.getHomeworkList(courseTester)).flatMap((hw) => [hw.deadline, hw.submitTime, hw.gradeTime]),
      ...(await h.getNotificationList(courseTester)).flatMap((n) => [n.publishTime, n.expireTime]),
      ...(await h.getFileList(courseTester)).flatMap((f) => [f.uploadTime, f.publishTime]),
      ...(await h.getDiscussionList(courseTester)).flatMap((d) => [d.publishTime, d.lastReplyTime]),
    ].filter((t) => t !== undefined);
    for (const t of times) expect(t).toMatch(iso);
  });

  it('maps every grade code the server sends to a grade level', async () => {
    if (!courseTester) return;
    const homework = await h.getHomeworkList(courseTester);
    for (const hw of homework) {
      if (hw.grade !== undefined && hw.grade < 0) expect(hw.gradeLevel, `grade code ${hw.grade}`).toBeDefined();
    }
  });

  it('parses favorite state of files by category as a boolean', async () => {
    if (!courseTester) return;
    const categories = await h.getFileCategoryList(courseTester);
    if (categories.length === 0) return;
    const files = await h.getFileListByCategory(courseTester, categories[0].id);
    for (const f of files) expect(typeof f.isFavorite).toBe('boolean');
  });

  it('fetches calendar ranges longer than one window without failed windows', async () => {
    const current = await h.getCurrentSemester();
    const start = current.startDate.replaceAll('-', '').slice(0, 8);
    const startTime = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(4, 6)) - 1, Number(start.slice(6, 8)));
    const end = new Date(startTime + 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replaceAll('-', '');

    const { events, failedRanges } = await h.getCalendar(start, end);
    expect(failedRanges).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
  });

  it("reads every entry of the courses' time and location", async () => {
    const courses = await h.getCourseList(semesterTester, CourseType.STUDENT, undefined, { timeAndLocation: true });
    const entries = courses.flatMap((c) => c.timeAndLocation ?? []);
    // entries without a day or period, which the server lists for courses with no fixed time
    const empty = /星期第0节|section\s*0\b/i;
    const unread = entries.filter((e) => !parseCourseMeeting(e) && !empty.test(e));
    expect(unread).toEqual([]);
    console.info(`[timetable] ${entries.length} entries in ${courses.length} courses, ${h.getCurrentLanguage()}`);
  });

  it("counts the first teaching week from the current term's first day", async () => {
    const { startDate } = await h.getCurrentSemester();
    // the first day is in week 1, or week 0 when it is a weekend before classes
    expect([0, 1]).toContain(semesterWeek(startDate, startDate));
    const day = (offset: number) =>
      new Date(Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`) + offset * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    expect(semesterWeek(startDate, day(14)) - semesterWeek(startDate, day(7))).toBe(1);
  });

  it("works out class times that the registrar's calendar agrees with", { timeout: 120_000 }, async () => {
    const semester = await h.getCurrentSemester();
    const courses = await h.getCourseList(semester.id, CourseType.STUDENT, Language.ZH, { timeAndLocation: true });
    // week 3: past any first-week changes
    const first = Date.parse(`${semester.startDate.slice(0, 10)}T00:00:00Z`);
    const days = Array.from({ length: 28 }, (_, i) =>
      new Date(first + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    );
    const week = days.filter((d) => semesterWeek(semester.startDate, d) === 3);
    const { events } = await h.getCalendar(week[0].replaceAll('-', ''), week.at(-1)!.replaceAll('-', ''));

    const expected = courses.flatMap((c) =>
      (c.timeAndLocation ?? []).flatMap((text) => {
        const meeting = parseCourseMeeting(text);
        if (!meeting || (meeting.weeks && !meeting.weeks.includes(3))) return [];
        const date = week[meeting.weekday - 1];
        const [start, end] = CLASS_PERIOD_TIMES[meeting.period];
        return [{ course: normalize(c.chineseName), date, start, end }];
      }),
    );
    // holidays (National Day falls in week 3 of the fall term) have no classes, so only days the calendar has
    // classes on count; a moved class or two courses in one slot can still miss
    const onTeachingDays = expected.filter((x) => events.some((e) => sameDate(e.date, x.date)));
    // a class on the calendar at that date, within the period (it may use only part of it)
    const found = onTeachingDays.filter((x) =>
      events.some(
        (e) =>
          normalize(e.courseName) === x.course &&
          sameDate(e.date, x.date) &&
          e.startTime >= x.start &&
          e.endTime <= x.end,
      ),
    );
    console.info(
      `[timetable] week 3: ${found.length} of ${onTeachingDays.length} worked-out classes on days with classes are on the calendar (${expected.length} worked out, ${events.length} events)`,
    );
    if (onTeachingDays.length > 0) expect(found.length / onTeachingDays.length).toBeGreaterThanOrEqual(0.75);
  });

  it('builds the homework submit request without sending it', async () => {
    const request = await h.getHomeworkSubmitRequest('live-test-not-sent', '<p>not sent</p>');
    const url = new URL(request.url);
    expect(url.pathname).toBe('/b/wlxt/kczy/zy/student/tjzy');
    // the token of a session that the check just found alive
    expect(url.searchParams.get('_csrf')).toBe(h.getCSRFToken());
    expect(request.body.get('xszyid')).toBe('live-test-not-sent');
    expect(request.body.get('fileupload')).toBe('undefined');
  });
});
