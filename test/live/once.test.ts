import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import type { Homework, HomeworkDetail } from '../../src/index.ts';
import {
  ContentType,
  CourseType,
  FailReason,
  Learn2018Helper,
  checkHomeworkSubmitResponse,
  homeworkContentHtml,
} from '../../src/index.ts';
import { HOMEWORK_LIST_SOURCES } from '../../src/homework.ts';
import * as URLS from '../../src/urls.ts';
import { FINGERPRINT, config } from './config.ts';
import { ALLOW_WRITES } from './guard.ts';
import { type OnceTest, recordAttempt, recordPass, recordResult, shouldRun } from './once.ts';

// Run these alone, before the other live tests: those fetch notice details too, which may mark notices read.

const wrongPassword: OnceTest = { name: 'wrong-password', covers: ['src/auth.ts'], maxPerDay: 2 };
const readMark: OnceTest = {
  name: 'read-mark',
  covers: ['src/notices.ts', 'src/files.ts'],
  maxPerDay: 1,
};

const favorite: OnceTest = { name: 'favorite', covers: ['src/favorites.ts', 'src/homework.ts'], maxPerDay: 1 };

const favoriteTypes: OnceTest = {
  name: 'favorite-types',
  covers: ['src/favorites.ts', 'src/notices.ts', 'src/files.ts'],
  maxPerDay: 1,
};

const submission: OnceTest = {
  name: 'submission',
  covers: ['src/homework.ts', 'src/urls.ts', 'src/request.ts'],
  maxPerDay: 1,
};

/**
 * The homework the submission check may submit to: its `studentHomeworkId` (or homework id). Never picked
 * automatically, since a submission can't be taken back: name one whose owner agreed to it, ungraded and still open.
 */
const SUBMIT_HOMEWORK = process.env.SUBMIT_HOMEWORK;

/** the keys of `after` whose values differ from `before`, and keys only one of them has */
const changedKeys = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .toSorted();

/** what a call answers, without account data: ok, or its fail reason and the server's result field */
const outcome = async (call: () => Promise<unknown>) => {
  try {
    await call();
    return 'ok';
  } catch (e) {
    const err = e as { reason?: string; message?: string; extra?: { result?: unknown } };
    return `${err.reason ?? err.message} (result ${JSON.stringify(err.extra?.result)})`;
  }
};

describe('one-time checks', () => {
  it.runIf(shouldRun(wrongPassword))('answers a wrong password with BAD_CREDENTIAL', { retry: 0 }, async () => {
    recordAttempt(wrongPassword.name);
    recordResult(wrongPassword.name, 'started');
    // a made-up user, so the failed login doesn't count against the real account
    const helper = new Learn2018Helper();
    const err = await helper
      .login({ username: 'nouser', password: 'nopass', fingerPrint: FINGERPRINT })
      .catch((e: unknown) => e);
    recordResult(wrongPassword.name, `rejected with ${JSON.stringify(err)}`);
    expect(err).toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
    recordPass(
      wrongPassword,
      `wrong password rejects with BAD_CREDENTIAL, message ${JSON.stringify((err as any).extra)}`,
    );
  });

  it.runIf(shouldRun(readMark))(
    'records whether opening a notice or downloading a file marks it read',
    { retry: 0, timeout: 120_000 },
    async () => {
      recordAttempt(readMark.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper({ ...config, cookieJar });
      await h.login();
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const withToken = (url: string) => {
        const u = new URL(url);
        u.searchParams.set('_csrf', h.getCSRFToken());
        return u.href;
      };

      const semester = await h.getCurrentSemester();
      const courses = await h.getCourseList(semester.id, CourseType.STUDENT);
      const findings: string[] = [];

      // notices: the detail page, as getNotificationAttachment fetches it
      for (const c of courses) {
        const before = await h.getNotificationList(c.id);
        const target = before.find((n) => !n.hasRead);
        if (!target) continue;
        await (await raw(withToken(target.url))).text();
        const after = await h.getNotificationList(c.id);
        const others = before.filter((n) => n.id !== target.id);
        const changed = others.filter((n) => after.find((a) => a.id === n.id)?.hasRead !== n.hasRead);
        expect(changed).toHaveLength(0);
        const flipped = after.find((a) => a.id === target.id)?.hasRead === true;
        findings.push(`notice detail page ${flipped ? 'marks it read' : 'does not mark it read'}`);
        break;
      }

      // files: start the download, then stop after the headers
      for (const c of courses) {
        const before = await h.getFileList(c.id);
        const target = before.find((f) => f.isNew);
        if (!target) continue;
        const res = await raw(withToken(target.downloadUrl));
        await res.body?.cancel();
        const after = await h.getFileList(c.id);
        const others = before.filter((f) => f.id !== target.id);
        const changed = others.filter((f) => after.find((a) => a.id === f.id)?.isNew !== f.isNew);
        expect(changed).toHaveLength(0);
        const flipped = after.find((a) => a.id === target.id)?.isNew === false;
        findings.push(`file download ${flipped ? 'marks it seen' : 'does not mark it seen'}`);
        break;
      }

      await h.logout();
      if (findings.length < 2) {
        findings.push(
          ...['notice detail page', 'file download']
            .filter((k) => !findings.some((f) => f.startsWith(k)))
            .map((k) => `${k}: nothing unread to try`),
        );
      }
      recordResult(readMark.name, findings.join('; '));
      if (!findings.some((f) => f.includes('nothing unread'))) recordPass(readMark, findings.join('; '));
    },
  );

  it.runIf(ALLOW_WRITES && shouldRun(favorite))(
    'records what the server sends for a favorited homework (adds one favorite and removes it)',
    { retry: 0, timeout: 120_000 },
    async () => {
      recordAttempt(favorite.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper({ ...config, cookieJar });
      await h.login();
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      /** the raw homework rows of a course in every student list, by `xszyid` */
      const rawRows = async (courseID: string) => {
        const rows = new Map<string, { list: string; row: Record<string, unknown> }>();
        for (const { url } of HOMEWORK_LIST_SOURCES) {
          const u = new URL(url);
          u.searchParams.set('_csrf', h.getCSRFToken());
          const json = await (
            await raw(u.href, { method: 'POST', body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID) })
          ).json();
          for (const row of json.object?.aaData ?? [])
            rows.set(row.xszyid, { list: u.pathname.split('/').pop()!, row });
        }
        return rows;
      };

      const semester = await h.getCurrentSemester();
      const favoritesBefore = await h.getFavorites();
      let target: { courseID: string; id: string; studentHomeworkId: string } | undefined;
      for (const c of await h.getCourseList(semester.id)) {
        const hw = (await h.getHomeworkList(c.id)).find(
          (x) => !x.isFavorite && !favoritesBefore.some((f) => f.id === x.id),
        );
        if (hw) {
          target = { courseID: c.id, id: hw.id, studentHomeworkId: hw.studentHomeworkId };
          break;
        }
      }
      if (!target) {
        recordResult(favorite.name, 'no homework to try');
        return;
      }

      const findings: string[] = [];
      const before = (await rawRows(target.courseID)).get(target.studentHomeworkId)!;
      try {
        try {
          await h.addToFavorites(ContentType.HOMEWORK, target.id);
        } catch (e) {
          const err = e as { reason?: string; message?: string; extra?: { result?: unknown; msg?: unknown } };
          recordResult(
            favorite.name,
            `addToFavorites failed: ${err.reason ?? err.message} ${JSON.stringify({ result: err.extra?.result, msg: err.extra?.msg })}`,
          );
          throw e;
        }
        const after = (await rawRows(target.courseID)).get(target.studentHomeworkId)!;
        findings.push(
          `homework row (${after.list}) changed keys: ${changedKeys(before.row, after.row).join(', ') || 'none'}`,
          `sfsc ${JSON.stringify(before.row.sfsc)} -> ${JSON.stringify(after.row.sfsc)}`,
        );
        const homework = (await h.getHomeworkList(target.courseID)).find((x) => x.id === target.id)!;
        findings.push(`isFavorite ${homework.isFavorite}`);
        const added = (await h.getFavorites()).find((f) => f.id === target.id);
        expect(added).toBeDefined();
        findings.push(
          `getFavorites item: ${Object.entries(added!)
            .map(([k, v]) => `${k}:${v === undefined ? 'undefined' : typeof v}`)
            .join(', ')}`,
          `addedTime looks like ${/^\d{10,}$/.test(added!.addedTime) ? 'a ms timestamp' : /^\d{4}-\d{2}-\d{2}/.test(added!.addedTime) ? 'a date string' : 'something else'}`,
        );
      } finally {
        await h.removeFromFavorites(target.id);
      }
      const left = (await h.getFavorites()).some((f) => f.id === target.id);
      findings.push(`removed: ${!left}`);
      await h.logout();
      recordResult(favorite.name, findings.join('; '));
      expect(left).toBe(false);
      recordPass(favorite, findings.join('; '));
    },
  );

  it.runIf(ALLOW_WRITES && shouldRun(favoriteTypes))(
    'records how notices and files are favorited, and what odd calls answer (adds and removes a few favorites)',
    { retry: 0, timeout: 180_000 },
    async () => {
      recordAttempt(favoriteTypes.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper({ ...config, cookieJar });
      await h.login();
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const findings: string[] = [];
      /** ids added by this test, removed at the end whatever happens */
      const added = new Set<string>();

      try {
        // the raw favorites list: does it page?
        const u = new URL(URLS.LEARN_FAVORITE_LIST());
        u.searchParams.set('_csrf', h.getCSRFToken());
        const json = await (await raw(u.href, { method: 'POST', body: URLS.LEARN_PAGE_LIST_FORM_DATA() })).json();
        const obj = json.object ?? {};
        findings.push(
          `list object keys: ${Object.keys(obj).toSorted().join(', ')}`,
          `list rows ${(obj.aaData ?? []).length}, iTotalRecords ${obj.iTotalRecords}, iTotalDisplayRecords ${obj.iTotalDisplayRecords}`,
        );

        const favoritesBefore = await h.getFavorites();
        const isFav = (id: string) => favoritesBefore.some((f) => f.id === id);
        const semester = await h.getCurrentSemester();
        const courses = await h.getCourseList(semester.id);

        // a notice
        for (const c of courses) {
          const notice = (await h.getNotificationList(c.id)).find((n) => !n.isFavorite && !isFav(n.id));
          if (!notice) continue;
          findings.push(`notice add: ${await outcome(() => h.addToFavorites(ContentType.NOTIFICATION, notice.id))}`);
          added.add(notice.id);
          const listed = (await h.getFavorites()).find((f) => f.id === notice.id);
          findings.push(`notice listed by id: ${!!listed}, courseId matches: ${listed?.courseId === c.id}`);
          const after = (await h.getNotificationList(c.id)).find((n) => n.id === notice.id);
          findings.push(`notice isFavorite after add: ${after?.isFavorite}`);
          findings.push(
            `notice add again: ${await outcome(() => h.addToFavorites(ContentType.NOTIFICATION, notice.id))}`,
          );
          findings.push(
            `notice favorites after adding twice: ${(await h.getFavorites()).filter((f) => f.id === notice.id).length}`,
          );
          break;
        }

        // a file: which of its ids (kjxxid as id, wjid as fileId) the server takes
        for (const c of courses) {
          const file = (await h.getFileList(c.id)).find((f) => !isFav(f.id) && !isFav(f.fileId));
          if (!file) continue;
          for (const [name, id] of [
            ['id (kjxxid)', file.id],
            ['fileId (wjid)', file.fileId],
          ] as const) {
            const result = await outcome(() => h.addToFavorites(ContentType.FILE, id));
            const listed = (await h.getFavorites()).filter((f) => f.type === ContentType.FILE);
            const byId = listed.find((f) => f.id === file.id);
            const byFileId = listed.find((f) => f.id === file.fileId);
            for (const f of [byId, byFileId]) if (f) added.add(f.id);
            added.add(id);
            findings.push(`file add with ${name}: ${result}; listed under id ${!!byId}, under fileId ${!!byFileId}`);
            if (byId && file.category) {
              const inCategory = (await h.getFileListByCategory(c.id, file.category.id)).find((f) => f.id === file.id);
              findings.push(`file isFavorite in category list: ${inCategory?.isFavorite}`);
            }
            for (const f of [byId, byFileId]) if (f) await h.removeFromFavorites(f.id);
          }
          break;
        }

        // ids the server doesn't know, and removing what isn't a favorite
        findings.push(
          `add unknown homework id: ${await outcome(() => h.addToFavorites(ContentType.HOMEWORK, 'no-such-id'))}`,
        );
        added.add('no-such-id');
        const listedUnknown = (await h.getFavorites()).some((f) => f.id === 'no-such-id');
        findings.push(`unknown id listed: ${listedUnknown}`);
        findings.push(
          `remove an id that isn't a favorite: ${await outcome(() => h.removeFromFavorites('not-a-favorite'))}`,
        );
      } finally {
        for (const id of added) await h.removeFromFavorites(id).catch(() => {});
      }
      const left = (await h.getFavorites()).filter((f) => added.has(f.id)).length;
      findings.push(`left behind: ${left}`);
      await h.logout();
      recordResult(favoriteTypes.name, findings.join('; '));
      expect(left).toBe(0);
      if (findings.some((f) => f.startsWith('notice add:')) && findings.some((f) => f.startsWith('file add')))
        recordPass(favoriteTypes, findings.join('; '));
    },
  );

  it.runIf(ALLOW_WRITES && !!SUBMIT_HOMEWORK && shouldRun(submission))(
    'submits homework through both APIs, removes and replaces, then puts the earlier submission back',
    { retry: 0, timeout: 300_000 },
    async () => {
      recordAttempt(submission.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper({ ...config, cookieJar });
      await h.login();
      // what an app with its own HTTP client does with getHomeworkSubmitRequest: same cookies, its own fetch
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const withToken = (url: string) => {
        const u = new URL(url);
        u.searchParams.set('_csrf', h.getCSRFToken());
        return u.href;
      };

      let target: Homework | undefined;
      for (const c of await h.getCourseList((await h.getCurrentSemester()).id)) {
        target = (await h.getHomeworkList(c.id)).find(
          (x) => x.studentHomeworkId === SUBMIT_HOMEWORK || x.id === SUBMIT_HOMEWORK,
        );
        if (target) break;
      }
      if (!target) {
        recordResult(submission.name, 'SUBMIT_HOMEWORK not found in the current semester');
        throw new Error('SUBMIT_HOMEWORK not found in the current semester');
      }
      const open = Date.parse(target.lateSubmissionDeadline ?? target.deadline) > Date.now();
      if (target.graded || !open) {
        recordResult(submission.name, `refused: homework is ${target.graded ? 'graded' : 'closed'}`);
        throw new Error(`refusing to submit to a ${target.graded ? 'graded' : 'closed'} homework`);
      }
      const id = target.studentHomeworkId;
      const detail = () => h.getHomeworkDetail(target);

      // what to put back afterwards: the submitted answer and attachment (downloaded), if any
      const before: HomeworkDetail = await detail();
      let previousFile: { filename: string; content: Blob } | undefined;
      if (before.submittedAttachment) {
        const res = await raw(withToken(before.submittedAttachment.downloadUrl));
        expect(res.ok).toBe(true);
        previousFile = { filename: before.submittedAttachment.name, content: await res.blob() };
      }

      const stamp = new Date().toISOString();
      const filename = 'thu-learn-lib-live-test.txt';
      const findings: string[] = [`was ${target.submitted ? 'submitted' : 'not submitted'}`];
      try {
        // 1. getHomeworkSubmitRequest, sent with another client, with an attachment
        const request = await h.getHomeworkSubmitRequest(id, homeworkContentHtml(`live test ${stamp}\nline 2`), {
          filename,
          content: new Blob([`thu-learn-lib live test ${stamp}`], { type: 'text/plain' }),
        });
        const res = await raw(request.url, { method: 'POST', body: request.body });
        checkHomeworkSubmitResponse(await res.text());
        const sent = await detail();
        expect(sent.submittedContent).toContain(`live test ${stamp}`);
        expect(sent.submittedAttachment?.name).toBe(filename);
        findings.push('request API: answer and attachment submitted');

        // 2. removing the attachment keeps the answer (the server ignores zynr then)
        await h.submitHomework(id, '', undefined, true);
        const removed = await detail();
        expect(removed.submittedAttachment).toBeUndefined();
        expect(removed.submittedContent).toContain(`live test ${stamp}`);
        findings.push('removal: attachment gone, answer kept');

        // 3. a new answer replaces the submitted one
        await h.submitHomework(id, homeworkContentHtml(`replaced ${stamp}`));
        const replaced = await detail();
        expect(replaced.submittedContent).toContain(`replaced ${stamp}`);
        expect(replaced.submittedContent).not.toContain(`live test ${stamp}`);
        findings.push('answer replaced');
      } finally {
        // put the earlier submission back; an unsubmitted homework stays submitted (with an empty answer)
        await h.submitHomework(id, before.submittedContent ?? '', previousFile, false);
        const restored = await detail();
        findings.push(
          `restored: answer ${restored.submittedContent === before.submittedContent ? 'same' : 'differs'}, attachment ${
            restored.submittedAttachment?.name === before.submittedAttachment?.name ? 'same' : 'differs'
          }`,
        );
        recordResult(submission.name, findings.join('; '));
        await h.logout();
      }
      recordPass(submission, findings.join('; '));
    },
  );
});
