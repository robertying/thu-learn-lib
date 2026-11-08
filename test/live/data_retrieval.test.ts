import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { ContentType, CourseType, Language, Learn2018Helper } from '../../src/index.ts';
import { config } from './config.ts';

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

    expect(userInfo.department).toBeTruthy();
    expect(typeof userInfo.department).toBe('string');
  });

  it('gets the same homework details from the list option and on demand', async () => {
    if (!courseTester) return;
    const plain = await h.getHomeworkList(courseTester);
    const detailed = await h.getHomeworkList(courseTester, undefined, { details: 'all' });
    expect(detailed.map((hw) => hw.id)).toEqual(plain.map((hw) => hw.id));
    for (const [i, hw] of plain.entries()) {
      expect(await h.getHomeworkDetail(hw)).toEqual({
        description: detailed[i].description,
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
});
