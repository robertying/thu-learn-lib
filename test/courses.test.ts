import { describe, expect, it } from 'vitest';

import { CourseType, FailReason, Language, SemesterType } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, html, json } from './helpers/fake-server.ts';

const course = (id: string, overrides: Record<string, unknown> = {}) => ({
  wlkcid: id,
  zywkcm: `Course ${id}`,
  kcm: `课程${id}`,
  ywkcm: `Course ${id}`,
  jsm: 'Teacher',
  jsh: 't1',
  kch: `kch-${id}`,
  kxh: 0,
  ...overrides,
});

describe('semesters', () => {
  it('drops null semester ids', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_SEMESTER_LIST(), () => json(['2024-2025-1', null]));
    const helper = await server.loggedInHelper();
    expect(await helper.getSemesterIdList()).toEqual(['2024-2025-1']);
  });

  it('rejects a non-array semester list with INVALID_RESPONSE', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_SEMESTER_LIST(), () => json({ message: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });

  it('parses the current semester', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_CURRENT_SEMESTER(), () =>
      json({
        message: 'success',
        result: { id: '2024-2025-2', kssj: '2025-02-17', jssj: '2025-06-15', xnxq: '2024-2025-2' },
      }),
    );
    const helper = await server.loggedInHelper();
    expect(await helper.getCurrentSemester()).toEqual({
      id: '2024-2025-2',
      startDate: '2025-02-17',
      endDate: '2025-06-15',
      startYear: 2024,
      endYear: 2025,
      type: SemesterType.SPRING,
    });
  });
});

const setup = () => {
  const server = new FakeServer()
    .on('GET', URLS.LEARN_COURSE_LIST('2024-2025-1', CourseType.STUDENT, Language.ZH), () =>
      json({ message: 'success', resultList: [course('c1'), course('c2', { zywkcm: 'A &amp; B', jsm: null })] }),
    )
    .on('GET', URLS.LEARN_COURSE_TIME_LOCATION(''), (req) =>
      req.url.searchParams.get('id') === 'c1' ? json(['Mon 1-2, 6A101']) : new Response('oops', { status: 500 }),
    );
  return server;
};

describe('getCourseList', () => {
  it('parses courses without time and location by default, in one request', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const courses = await helper.getCourseList('2024-2025-1');

    expect(courses.map((c) => [c.id, c.timeAndLocation])).toEqual([
      ['c1', undefined],
      ['c2', undefined],
    ]);
    expect(server.requests).toHaveLength(1);
  });

  it('gets one course’s time and location', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    expect(await helper.getCourseTimeAndLocation('c1')).toEqual(['Mon 1-2, 6A101']);
    await expect(helper.getCourseTimeAndLocation('c2')).rejects.toBeDefined();
  });

  it('parses courses and fetches time and location per course with timeAndLocation', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const courses = await helper.getCourseList('2024-2025-1', CourseType.STUDENT, Language.ZH, {
      timeAndLocation: true,
    });

    expect(courses).toEqual([
      {
        id: 'c1',
        name: 'Course c1',
        chineseName: '课程c1',
        englishName: 'Course c1',
        timeAndLocation: ['Mon 1-2, 6A101'],
        url: URLS.LEARN_COURSE_PAGE('c1', CourseType.STUDENT),
        teacherName: 'Teacher',
        teacherNumber: 't1',
        courseNumber: 'kch-c1',
        courseIndex: 0,
        courseType: CourseType.STUDENT,
      },
      expect.objectContaining({ id: 'c2', name: 'A & B', teacherName: '', timeAndLocation: [] }),
    ]);
    // 1 list + 1 time/location request per course
    expect(server.requests).toHaveLength(3);
    expect(server.count(URLS.LEARN_COURSE_TIME_LOCATION(''))).toBe(2);
  });

  it('uses the teacher course list for CourseType.TEACHER', async () => {
    const server = new FakeServer()
      .on('GET', URLS.LEARN_COURSE_LIST('2024-2025-1', CourseType.TEACHER, Language.ZH), () =>
        json({ message: 'success', resultList: [course('t1', { kxh: '2' })] }),
      )
      .on('GET', URLS.LEARN_COURSE_TIME_LOCATION(''), () => json([]));
    const helper = await server.loggedInHelper();
    const [c] = await helper.getCourseList('2024-2025-1', CourseType.TEACHER);
    expect(c).toMatchObject({ id: 't1', courseIndex: 2, courseType: CourseType.TEACHER });
  });

  it('rejects with INVALID_RESPONSE when the list is not a success', async () => {
    const server = new FakeServer().on(
      'GET',
      URLS.LEARN_COURSE_LIST('2024-2025-1', CourseType.STUDENT, Language.ZH),
      () => json({ message: 'error' }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getCourseList('2024-2025-1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

describe('sortCourses', () => {
  it('posts the order as JSON', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_SORT_COURSES, () => json({ result: 'success' }));
    const helper = await server.loggedInHelper();
    await helper.sortCourses(['b', 'a']);
    expect(JSON.parse(server.requests[0].body!)).toEqual([
      { wlkcid: 'b', xh: 1 },
      { wlkcid: 'a', xh: 2 },
    ]);
  });

  it('rejects with OPERATION_FAILED on failure', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_SORT_COURSES, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.sortCourses(['a'])).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
  });
});

describe('user', () => {
  it('reads name and department from the homepage', async () => {
    const server = new FakeServer();
    server.homepageBody =
      '<a class="user-log"> 张三 </a><div class="fl up-img-info"><p>x</p><p><label> 计算机系 </label></p></div>';
    const helper = await server.loggedInHelper();
    expect(await helper.getUserInfo()).toEqual({ name: '张三', department: '计算机系' });
  });

  it('switches the website language', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_WEBSITE_LANGUAGE(Language.EN), () => html(''));
    const helper = await server.loggedInHelper();
    await helper.setLanguage(Language.EN);
    expect(helper.getCurrentLanguage()).toBe(Language.EN);
    expect(server.requests[0].url.searchParams.get('websiteShowLanguage')).toBe('en_US');
  });
});
