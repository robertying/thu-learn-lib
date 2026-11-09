import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import { ContentType, CourseType, FailReason, Learn2018Helper } from '../../src/index.ts';
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

/** the keys of `after` whose values differ from `before`, and keys only one of them has */
const changedKeys = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .toSorted();

describe('one-time checks', () => {
  it.runIf(shouldRun(wrongPassword))('answers a wrong password with BAD_CREDENTIAL', { retry: 0 }, async () => {
    recordAttempt(wrongPassword.name);
    recordResult(wrongPassword.name, 'started');
    // a made-up user, so the failed login doesn't count against the real account
    const helper = new Learn2018Helper();
    await expect(helper.login('nouser', 'nopass', FINGERPRINT)).rejects.toHaveProperty(
      'reason',
      FailReason.BAD_CREDENTIAL,
    );
    recordPass(wrongPassword, 'wrong password rejects with BAD_CREDENTIAL');
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
        for (const { url } of URLS.LEARN_HOMEWORK_LIST_SOURCE) {
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
});
