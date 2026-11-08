// Checks the v5 behavior that the offline tests can only assume: how the real server answers an expired session,
// session resume, on-demand details and windowed calendar. Run with `pnpm test:live` (see template.env).
import { CookieJar } from 'tough-cookie';
import { describe, expect, inject, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import { ContentType, CourseType, FailReason, Learn2018Helper } from '../../src/index.ts';
import { FP, U, credential } from './config.ts';

/** a helper whose provider counts its logins */
const counting = (cookieJar = new CookieJar()) => {
  const counter = { logins: 0 };
  const helper = new Learn2018Helper({
    cookieJar,
    provider: () => {
      counter.logins += 1;
      return credential;
    },
  });
  return { helper, counter, cookieJar };
};

describe('expired sessions on the real server', () => {
  it('logs in again after the session was logged out elsewhere, for JSON and HTML requests', async () => {
    const { helper, counter, cookieJar } = counting();
    await helper.login();
    const token = helper.getCSRFToken();

    // log the same session out with a second helper on the same cookies
    const other = new Learn2018Helper({ cookieJar });
    other.setCSRFToken(token);
    await other.logout();

    // JSON endpoint
    expect(Array.isArray(await helper.getSemesterIdList())).toBe(true);
    expect(counter.logins).toBe(2);

    await other.logout();
    // HTML page: a login page must not be parsed as a homepage with an empty name
    expect((await helper.getUserInfo()).name).toBeTruthy();
    expect(counter.logins).toBe(3);
  });

  it('rejects with NOT_LOGGED_IN without a provider, for JSON and HTML requests', async () => {
    const helper = new Learn2018Helper();
    await helper.login(U, credential.password, FP);
    const token = helper.getCSRFToken();
    await helper.logout();
    helper.setCSRFToken(token);

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    await expect(helper.getUserInfo()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
  });

  it('records how the server answers an expired session (see TODO.md)', async () => {
    const seen: { url: string; status: number; finalUrl: string; type: string | null; start: string }[] = [];
    const jar = new CookieJar();
    const helper = new Learn2018Helper({ cookieJar: jar });
    await helper.login(U, credential.password, FP);
    const token = helper.getCSRFToken();
    await helper.logout();

    const { fetch } = await import('node-fetch-native');
    const { default: fetchCookie } = await import('fetch-cookie');
    const raw = fetchCookie(fetch, jar) as unknown as Fetch;
    for (const url of [
      'https://learn.tsinghua.edu.cn/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq',
      'https://learn.tsinghua.edu.cn/f/wlxt/index/course/teacher/',
    ]) {
      const res = await raw(`${url}?_csrf=${token}`);
      const text = await res.text();
      seen.push({
        url,
        status: res.status,
        finalUrl: res.url,
        type: res.headers.get('content-type'),
        start: text.slice(0, 300),
      });
    }
    console.info(JSON.stringify(seen, null, 2));
    expect(seen).toHaveLength(2);
  });
});

describe('session resume', () => {
  it('ensureSession reuses a saved token and cookies without SSO', async () => {
    const first = counting();
    await first.helper.login();

    const resumed = counting(first.cookieJar);
    resumed.helper.setCSRFToken(first.helper.getCSRFToken());
    await resumed.helper.ensureSession();
    expect(resumed.counter.logins).toBe(0);
  });

  it('ensureSession logs in when the saved session has expired', async () => {
    const first = counting();
    await first.helper.login();
    const token = first.helper.getCSRFToken();
    await first.helper.logout();

    const resumed = counting(first.cookieJar);
    resumed.helper.setCSRFToken(token);
    await resumed.helper.ensureSession();
    expect(resumed.counter.logins).toBe(1);
    expect(Array.isArray(await resumed.helper.getSemesterIdList())).toBe(true);
  });
});

describe('on-demand details', () => {
  const semester = inject('S');
  const course = inject('C');

  it('gets the same homework details from the list option and on demand', async () => {
    if (!course) return;
    const { helper } = counting();
    const plain = await helper.getHomeworkList(course);
    const detailed = await helper.getHomeworkList(course, undefined, { details: 'all' });
    expect(detailed.map((h) => h.id)).toEqual(plain.map((h) => h.id));
    for (const [i, h] of plain.entries()) {
      expect(await helper.getHomeworkDetail(h)).toEqual({
        description: detailed[i].description,
        attachment: detailed[i].attachment,
        answerContent: detailed[i].answerContent,
        answerAttachment: detailed[i].answerAttachment,
        submittedContent: detailed[i].submittedContent,
        submittedAttachment: detailed[i].submittedAttachment,
        gradeAttachment: detailed[i].gradeAttachment,
      });
    }
    for (const excellent of plain.flatMap((h) => h.excellentHomeworkList ?? []).slice(0, 3)) {
      await helper.getExcellentHomeworkDetail(excellent);
    }
  });

  it('gets an attachment for every notice that names one', async () => {
    if (!course) return;
    const { helper } = counting();
    const notices = await helper.getNotificationList(course, CourseType.STUDENT, { attachments: 'all' });
    for (const n of notices) {
      if (n.attachmentName) expect(n.attachment?.id).toBeTruthy();
      else expect(n.attachment).toBeUndefined();
    }
  });

  it('gets course time and location on demand', async () => {
    const { helper } = counting();
    const courses = await helper.getCourseList(semester, CourseType.STUDENT, undefined, { timeAndLocation: true });
    for (const c of courses) expect(Array.isArray(c.timeAndLocation)).toBe(true);
  });

  it('gets contents of several courses with errors per course', async () => {
    const { helper } = counting();
    const courses = await helper.getCourseList(semester);
    const ids = courses.slice(0, 3).map((c) => c.id);
    const { contents, errors } = await helper.getAllContents(ids, ContentType.NOTIFICATION);
    expect(errors).toEqual({});
    expect(Object.keys(contents).toSorted()).toEqual(ids.toSorted());
  });

  it('parses favorite state of files by category as a boolean (TODO.md)', async () => {
    if (!course) return;
    const { helper } = counting();
    const categories = await helper.getFileCategoryList(course);
    if (categories.length === 0) return;
    const files = await helper.getFileListByCategory(course, categories[0].id);
    for (const f of files) expect(typeof f.isFavorite).toBe('boolean');
  });
});

describe('windowed calendar', () => {
  it('fetches a range of several windows without failed windows', async () => {
    const { helper } = counting();
    const semester = await helper.getCurrentSemester();
    const start = semester.startDate.replaceAll('-', '').slice(0, 8);
    const startTime = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(4, 6)) - 1, Number(start.slice(6, 8)));
    const end = new Date(startTime + 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replaceAll('-', '');

    const { events, failedRanges } = await helper.getCalendar(start, end);
    expect(failedRanges).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
  });
});
