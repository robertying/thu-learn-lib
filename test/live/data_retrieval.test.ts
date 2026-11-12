import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  CLASS_PERIOD_TIMES,
  ContentType,
  CourseType,
  Language,
  Learn2018Helper,
  SemesterType,
  parseCourseMeeting,
  semesterWeek,
} from '../../src/index.ts';
import * as URLS from '../../src/urls.ts';
import { urlOf } from '../../src/utils.ts';
import { config } from './config.ts';
import { addDays, sameDate, toYyyymmdd } from './dates.ts';

/** `list` is an array whose items all have a string (possibly empty) at each of `keys` */
const expectItems = (list: unknown, keys: string[]) => {
  expect(Array.isArray(list)).toBe(true);
  for (const item of list as Record<string, unknown>[]) {
    for (const key of keys) expect(typeof item[key], `${key} of ${JSON.stringify(item).slice(0, 200)}`).toBe('string');
  }
};

/** a course name as the registrar's calendar and Web Learning may each write it */
const normalize = (name: string) => name.replace(/\s/g, '').replace(/（/g, '(').replace(/）/g, ')');

// the server gives image links in descriptions a new random `videoVersion` each time it sends a page
const withoutVideoVersion = (text?: string) => text?.replace(/videoVersion=\d+/g, 'videoVersion=');

describe('helper data retrieval', () => {
  const h = new Learn2018Helper(config());

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

  it('gives course names in the website language', async () => {
    const lang = h.getCurrentLanguage();
    expect(Object.values(Language)).toContain(lang);
    const courses = await h.getCourseList(semesterTester);
    courses.forEach((course) => {
      expect(course.name).toBe(lang === Language.EN ? course.englishName : course.chineseName);
    });
  });

  it('lists the semester ids, including the tested semesters', async () => {
    const semesters = await h.getSemesterIdList();
    expect(Array.isArray(semesters)).toBe(true);
    for (const semester of semesters) expect(typeof semester).toBe('string');
    expect(semesters).toContain(semesterTester);
    expect(semesters).toContain(semesterTATester);
  });

  it('gets the current semester', async () => {
    const semester = await h.getCurrentSemester();
    expect(semester.id).toBeTruthy();
    expect(semester.startDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(semester.endDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(semester.endYear).toBe(semester.startYear + 1);
    expect(Object.values(SemesterType)).toContain(semester.type);
  });

  it('lists the student courses of the tested semester', async () => {
    const courses = await h.getCourseList(semesterTester);
    expectItems(courses, ['id', 'name', 'chineseName', 'url']);
    for (const c of courses) expect(c.courseType).toBe(CourseType.STUDENT);
  });

  it.skipIf(!courseTester)('includes the tested course in the student course list', async () => {
    const courses = await h.getCourseList(semesterTester);
    expect(courses.map((c) => c.id)).toContain(courseTester);
  });

  it('lists the teacher courses of the tested semester', async () => {
    const courses = await h.getCourseList(semesterTATester, { courseType: CourseType.TEACHER });
    expectItems(courses, ['id', 'name', 'url']);
    for (const c of courses) expect(c.courseType).toBe(CourseType.TEACHER);
  });

  it.skipIf(!courseTATester)('includes the tested course in the teacher course list', async () => {
    const courses = await h.getCourseList(semesterTATester, { courseType: CourseType.TEACHER });
    expect(courses.map((c) => c.id)).toContain(courseTATester);
  });

  it.skipIf(!courseTester)('gets every kind of content of a student course', async () => {
    const id = courseTester!;
    expectItems(await h.getHomeworkList(id), ['id', 'title', 'url', 'deadline']);
    expectItems(await h.getDiscussionList(id), ['id', 'title', 'url']);
    expectItems(await h.getNotificationList(id), ['id', 'title', 'content', 'url', 'publishTime']);
    expectItems(await h.getFileList(id), ['id', 'title', 'downloadUrl', 'previewUrl']);
    expectItems(await h.getAnsweredQuestionList(id), ['id', 'title', 'question', 'url']);
    expectItems(await h.getQuestionnaireList(id), ['id', 'type', 'title', 'url']);
  });

  it.skipIf(!courseTATester)('gets the files and homework of a teacher course', async () => {
    const id = courseTATester!;
    expectItems(await h.getFileList(id, CourseType.TEACHER), ['id', 'title', 'downloadUrl']);
    expectItems(await h.getHomeworkList(id, CourseType.TEACHER), ['id', 'title', 'url', 'deadline']);
  });

  // the library has teacher URLs for these too; this checks they work against the real server
  it.skipIf(!courseTATester)('gets the discussions, notifications and questions of a teacher course', async () => {
    const id = courseTATester!;
    expectItems(await h.getDiscussionList(id, CourseType.TEACHER), ['id', 'title', 'url']);
    expectItems(await h.getNotificationList(id, CourseType.TEACHER), ['id', 'title', 'url']);
    expectItems(await h.getAnsweredQuestionList(id, CourseType.TEACHER), ['id', 'title', 'url']);
  });

  it.skipIf(!courseTester)('lists the files of the first file category of a student course', async ({ skip }) => {
    const categories = await h.getFileCategoryList(courseTester!);
    expectItems(categories, ['id', 'title']);
    skip(categories.length === 0, 'the course has no file categories');
    const files = await h.getFileListByCategory(courseTester!, categories[0].id);
    expectItems(files, ['id', 'title', 'size', 'downloadUrl']);
    for (const f of files) expect(typeof f.isFavorite).toBe('boolean');
  });

  it.skipIf(!courseTATester)('lists the files of the first file category of a teacher course', async ({ skip }) => {
    const categories = await h.getFileCategoryList(courseTATester!, CourseType.TEACHER);
    expectItems(categories, ['id', 'title']);
    skip(categories.length === 0, 'the course has no file categories');
    const files = await h.getFileListByCategory(courseTATester!, categories[0].id, CourseType.TEACHER);
    expectItems(files, ['id', 'title', 'downloadUrl']);
  });

  it('reads the user name and department', async () => {
    const userInfo = await h.getUserInfo();
    expect(typeof userInfo.name).toBe('string');
    expect(userInfo.name).toBeTruthy();

    expect(typeof userInfo.department).toBe('string');
    // in English, the page shows `none` for a 书院 (and some departments)
    if (h.getCurrentLanguage() === Language.ZH) expect(userInfo.department).toBeTruthy();
    expect(userInfo.department.toLowerCase()).not.toBe('none');
  });

  it.skipIf(!courseTester)('gets the same homework details from the list option and on demand', async () => {
    const plain = await h.getHomeworkList(courseTester!);
    const detailed = await h.getHomeworkList(courseTester!, undefined, { details: 'all' });
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

  it.skipIf(!courseTester)(
    'gets the description JSON with its HTML escaped, which the library decodes',
    async ({ skip }) => {
      // the raw `msg` of each description answer, read through a fetch of this helper's own
      const messages: string[] = [];
      const base = config();
      const helper = new Learn2018Helper({
        ...base,
        fetch: async (input, init) => {
          const res = await base.fetch(input, init);
          if (urlOf(input).startsWith(URLS.LEARN_HOMEWORK_DETAIL)) {
            const msg: unknown = (await res.clone().json()).msg;
            if (typeof msg === 'string' && msg.trim()) messages.push(msg);
          }
          return res;
        },
      });
      await helper.login();
      try {
        await helper.getHomeworkList(courseTester!, undefined, { details: 'all' });
      } finally {
        await helper.logout();
      }
      skip(messages.length === 0, 'no homework of the course has a description');
      // escaped HTML (`&lt;p&gt;`) has no raw tag; raw HTML would be decoded once too often
      for (const msg of messages) expect(/<[a-z!/]/i.test(msg), 'a description JSON with a raw tag').toBe(false);
    },
  );

  it.skipIf(!courseTester)('gets an attachment for every notice that names one', async () => {
    const notices = await h.getNotificationList(courseTester!, CourseType.STUDENT, { attachments: 'all' });
    for (const n of notices) {
      if (n.attachmentName) expect(n.attachment?.id).toBeTruthy();
      else expect(n.attachment).toBeUndefined();
    }
  });

  it('gets course time and location on demand', async () => {
    const courses = await h.getCourseList(semesterTester, { timeAndLocation: true });
    for (const c of courses) expect(Array.isArray(c.timeAndLocation)).toBe(true);
  });

  it('gets contents of several courses with errors per course', async () => {
    const courses = await h.getCourseList(semesterTester);
    const ids = courses.slice(0, 3).map((c) => c.id);
    const { contents, errors } = await h.getAllContents(ids, ContentType.NOTIFICATION);
    expect(errors).toEqual({});
    expect(Object.keys(contents).toSorted()).toEqual(ids.toSorted());
  });

  it.skipIf(!courseTester)('gives every time as ISO 8601 with an offset', async () => {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
    const times = [
      ...(await h.getHomeworkList(courseTester!)).flatMap((hw) => [hw.deadline, hw.submitTime, hw.gradeTime]),
      ...(await h.getNotificationList(courseTester!)).flatMap((n) => [n.publishTime, n.expireTime]),
      ...(await h.getFileList(courseTester!)).flatMap((f) => [f.uploadTime, f.publishTime]),
      ...(await h.getDiscussionList(courseTester!)).flatMap((d) => [d.publishTime, d.lastReplyTime]),
    ].filter((t) => t !== undefined);
    for (const t of times) expect(t).toMatch(iso);
  });

  it.skipIf(!courseTester)('maps every grade code the server sends to a grade level', async () => {
    const homework = await h.getHomeworkList(courseTester!);
    for (const hw of homework) {
      if (hw.grade !== undefined && hw.grade < 0) expect(hw.gradeLevel, `grade code ${hw.grade}`).toBeDefined();
    }
  });

  it('fetches calendar ranges longer than one window without failed windows', async () => {
    const { startDate } = await h.getCurrentSemester();
    // 90 days: four windows
    const { events, failedRanges } = await h.getCalendar(toYyyymmdd(startDate), toYyyymmdd(addDays(startDate, 89)));
    expect(failedRanges).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
  });

  it("reads every entry of the courses' time and location", async () => {
    const courses = await h.getCourseList(semesterTester, { timeAndLocation: true });
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
    expect(semesterWeek(startDate, addDays(startDate, 14)) - semesterWeek(startDate, addDays(startDate, 7))).toBe(1);
  });

  it("works out class times that the registrar's calendar agrees with", { timeout: 120_000 }, async () => {
    const semester = await h.getCurrentSemester();
    const courses = await h.getCourseList(semester.id, { lang: Language.ZH, timeAndLocation: true });
    // week 3: past any first-week changes
    const days = Array.from({ length: 28 }, (_, i) => addDays(semester.startDate, i));
    const week = days.filter((d) => semesterWeek(semester.startDate, d) === 3);
    const { events } = await h.getCalendar(toYyyymmdd(week[0]), toYyyymmdd(week.at(-1)!));

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
    const request = await h.getHomeworkSubmitRequest('live-test-not-sent', { content: '<p>not sent</p>' });
    const url = new URL(request.url);
    expect(url.pathname).toBe('/b/wlxt/kczy/zy/student/tjzy');
    // the token of a session that the check just found alive
    expect(url.searchParams.get('_csrf')).toBe(h.getCSRFToken());
    expect(request.body.get('xszyid')).toBe('live-test-not-sent');
    expect(request.body.get('fileupload')).toBe('undefined');
  });
});
