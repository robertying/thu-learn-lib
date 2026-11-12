import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import type { Homework, HomeworkDetail } from '../../src/index.ts';
import {
  CourseType,
  FailReason,
  Learn2018Helper,
  checkHomeworkSubmitResponse,
  homeworkContentHtml,
} from '../../src/index.ts';
import * as URLS from '../../src/urls.ts';
import { FINGERPRINT, config } from './config.ts';
import { DAY_MS } from './dates.ts';
import { ALLOW_WRITES } from './guard.ts';
import { type OnceTest, recordAttempt, recordPass, recordResult, shouldRun } from './once.ts';
import { cookieJarConfig } from '../../src/cookies.ts';

// Run these alone, before the other live tests: those fetch notice details too, which may mark notices read.

const wrongPassword: OnceTest = { name: 'wrong-password', covers: ['src/auth.ts'], maxPerDay: 2 };
const readMark: OnceTest = {
  name: 'read-mark',
  covers: ['src/notices.ts', 'src/files.ts'],
  maxPerDay: 1,
};

const fileSeen: OnceTest = { name: 'file-seen', covers: ['src/files.ts', 'src/urls.ts'], maxPerDay: 2 };

/**
 * What the website calls when a student opens a course file (from its scripts, `play.js` and the file list's
 * `download_kj`). Run 1 (2026-11-09) found that the preview check `b/kc/wj_wjb/student/beforePlay`, the download check
 * `downloadFileBefore` and the preview page (`previewUrl`) each leave `isNew` (and every other row key) as it was.
 * These are the next guesses: the player page the preview check answers, a whole download, and the course's file
 * list page. Each answers a short description of what the server sent, without account data.
 */
type FileSeenTarget = { courseID: string; id: string; fileId: string; downloadUrl: string };
const FILE_SEEN_CANDIDATES: {
  name: string;
  run: (target: FileSeenTarget, get: (url: string) => Promise<Response>) => Promise<string>;
}[] = [
  {
    name: 'player page (beforePlay, then its playUrl as the website opens it)',
    run: async ({ fileId }, get) => {
      const check = await get(`${URLS.LEARN_PREFIX}/b/kc/wj_wjb/student/beforePlay?wjid=${fileId}&mk=mk_kcwj&sfgk=0`);
      const json = await check.json();
      const o = json.object ?? {};
      if (typeof o.playUrl !== 'string') return `beforePlay answered result ${JSON.stringify(json.result)}, no playUrl`;
      const page = new URL(`${o.playUrl}&mk=${o.mk}&sfgk=${o.sfgk}&browser=-1`, URLS.LEARN_PREFIX);
      return `playUrl path ${page.pathname}: ${await describeAnswer(await get(page.href))}`;
    },
  },
  {
    name: 'whole download (downloadFileBefore, then all of downloadFile)',
    run: async ({ fileId, downloadUrl }, get) => {
      await (await get(`${URLS.LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore?wjid=${fileId}`)).text();
      const res = await get(downloadUrl);
      const size = (await res.arrayBuffer()).byteLength;
      return `HTTP ${res.status} ${(res.headers.get('content-type') ?? '').split(';')[0]}, ${size} bytes`;
    },
  },
  {
    name: 'file list page (f/wlxt/kj/wlkc_kjxxb/student/beforePageList)',
    run: async ({ courseID }, get) =>
      describeAnswer(await get(`${URLS.LEARN_PREFIX}/f/wlxt/kj/wlkc_kjxxb/student/beforePageList?wlkcid=${courseID}`)),
  },
];

/** the spread of file ages, e.g. "0-30 days old" */
const ageRange = (xs: number[]) => (xs.length ? `${Math.min(...xs)}-${Math.max(...xs)} days old` : 'none');

/** how long to wait before reading the file lists again, in case the server updates `isNew` late */
const FILE_SEEN_RECHECK_MS = 60_000;

const submission: OnceTest = {
  name: 'submission',
  covers: ['src/homework.ts', 'src/urls.ts', 'src/request.ts'],
  maxPerDay: 1,
};

/**
 * The homework the submission check may submit to: its `id`. Never picked
 * automatically, since a submission can't be taken back: name one whose owner agreed to it, ungraded and still open.
 */
const SUBMIT_HOMEWORK = process.env.SUBMIT_HOMEWORK;

/** the shape of an answer, without account data: status, type, and `result` / `msg` / object keys if JSON */
const describeAnswer = async (res: Response) => {
  const type = res.headers.get('content-type') ?? '';
  const text = await res.text();
  let body = `${text.length} chars`;
  if (type.includes('json') || text.trimStart().startsWith('{')) {
    try {
      const json = JSON.parse(text);
      const obj = json.object;
      body = `result ${JSON.stringify(json.result)}, msg ${JSON.stringify(json.msg)}, object ${
        obj && typeof obj === 'object' ? `{${Object.keys(obj).toSorted().join(', ')}}` : JSON.stringify(obj)
      }`;
    } catch {
      // not JSON after all
    }
  }
  return `HTTP ${res.status} ${type.split(';')[0]}, ${body}`;
};

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
    const helper = new Learn2018Helper(cookieJarConfig());
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
      const h = new Learn2018Helper(config(cookieJar));
      await h.login();
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const withToken = (url: string) => {
        const u = new URL(url);
        u.searchParams.set('_csrf', h.getCSRFToken());
        return u.href;
      };

      const semester = await h.getCurrentSemester();
      const courses = await h.getCourseList(semester.id);
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

  it.runIf(shouldRun(fileSeen))(
    'records which request the website makes when a file is opened marks it seen',
    { retry: 0, timeout: 300_000 },
    async () => {
      recordAttempt(fileSeen.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper(config(cookieJar));
      await h.login();
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const withToken = (url: string) => {
        const u = new URL(url);
        u.searchParams.set('_csrf', h.getCSRFToken());
        return u.href;
      };
      /** the raw rows of a course's student file list, by `kjxxid` */
      const rawRows = async (courseID: string) => {
        const json = await (await raw(withToken(URLS.LEARN_FILE_LIST(courseID, CourseType.STUDENT)))).json();
        return new Map<string, Record<string, unknown>>(
          ((json.object ?? []) as Record<string, unknown>[]).map((r) => [r.kjxxid as string, r]),
        );
      };
      // read only: how isNew lines up with upload age and visit count, over every file of the semester
      const newFiles: FileSeenTarget[] = [];
      const ages = { new: [] as number[], seen: [] as number[] };
      const visited = { new: 0, seen: 0 };
      for (const c of await h.getCourseList((await h.getCurrentSemester()).id)) {
        for (const f of await h.getFileList(c.id)) {
          const key = f.isNew ? 'new' : 'seen';
          ages[key].push(Math.floor((Date.now() - new Date(f.uploadTime).getTime()) / DAY_MS));
          if ((f.visitCount ?? 0) > 0) visited[key]++;
          if (f.isNew) newFiles.push({ courseID: c.id, id: f.id, fileId: f.fileId, downloadUrl: f.downloadUrl });
        }
      }
      const findings: string[] = [
        `${newFiles.length} new files (${ageRange(ages.new)}, ${visited.new} with visits), ${ages.seen.length} seen (${ageRange(
          ages.seen,
        )}, ${visited.seen} with visits)`,
      ];
      if (newFiles.length === 0) {
        recordResult(fileSeen.name, findings.join('; '));
        return;
      }

      let marked: string | undefined;
      const tried: FileSeenTarget[] = [];
      for (const candidate of FILE_SEEN_CANDIDATES) {
        // a file still new: the next unused one, or the last one tried when it didn't flip
        const target = newFiles.shift();
        if (!target) {
          findings.push(`${candidate.name}: no new file left to try`);
          continue;
        }
        tried.push(target);
        const before = await rawRows(target.courseID);
        let answer: string;
        try {
          answer = await candidate.run(target, (url) => raw(withToken(url)));
        } catch (e) {
          answer = `failed: ${(e as Error).message}`;
        }
        const after = await rawRows(target.courseID);
        const row = { before: before.get(target.id)!, after: after.get(target.id)! };
        const changed = changedKeys(row.before, row.after);
        const othersChanged = [...before.keys()].filter(
          (id) => id !== target.id && JSON.stringify(before.get(id)?.isNew) !== JSON.stringify(after.get(id)?.isNew),
        );
        const flipped = !!row.after && row.before.isNew !== row.after.isNew && !Number(row.after.isNew);
        findings.push(
          `${candidate.name}: ${answer}; ${flipped ? 'marks it seen' : 'does not mark it seen'}; row keys changed: ${
            changed
              .map((k) => `${k} ${JSON.stringify(row.before[k])} -> ${JSON.stringify(row.after?.[k])}`)
              .join(', ') || 'none'
          }${othersChanged.length ? `; ${othersChanged.length} other files changed isNew` : ''}`,
        );
        if (flipped) marked ??= candidate.name;
        // reuse a file the candidate didn't mark when no other is left
        else if (newFiles.length === 0) newFiles.push(target);
      }

      // the server may update the list late: read the tried files once more after a wait
      await new Promise((r) => setTimeout(r, FILE_SEEN_RECHECK_MS));
      let lateSeen = 0;
      for (const t of tried) {
        const row = (await rawRows(t.courseID)).get(t.id);
        if (row && !Number(row.isNew)) lateSeen++;
      }
      findings.push(`after ${FILE_SEEN_RECHECK_MS / 1000}s: ${lateSeen} of ${tried.length} tried files seen`);

      await h.logout();
      const result = `${marked ? `marked seen by: ${marked}` : 'none marked it seen'}; ${findings.join('; ')}`;
      recordResult(fileSeen.name, result);
      console.log(`[once] file-seen: ${result}`);
      recordPass(fileSeen, result);
    },
  );

  it.runIf(ALLOW_WRITES && !!SUBMIT_HOMEWORK && shouldRun(submission))(
    'submits homework through both APIs, removes and replaces, then puts the earlier submission back',
    { retry: 0, timeout: 300_000 },
    async () => {
      recordAttempt(submission.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper(config(cookieJar));
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
        target = (await h.getHomeworkList(c.id)).find((x) => x.id === SUBMIT_HOMEWORK);
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
      const id = target.id;
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
        const request = await h.getHomeworkSubmitRequest(id, {
          content: homeworkContentHtml(`live test ${stamp}\nline 2`),
          attachment: { filename, content: new Blob([`thu-learn-lib live test ${stamp}`], { type: 'text/plain' }) },
        });
        const res = await raw(request.url, { method: 'POST', body: request.body });
        checkHomeworkSubmitResponse(await res.text());
        const sent = await detail();
        expect(sent.submittedContent).toContain(`live test ${stamp}`);
        expect(sent.submittedAttachment?.name).toBe(filename);
        findings.push('request API: answer and attachment submitted');

        // 2. removing the attachment keeps the answer (the server ignores zynr then)
        await h.submitHomework(id, { removeAttachment: true });
        const removed = await detail();
        expect(removed.submittedAttachment).toBeUndefined();
        expect(removed.submittedContent).toContain(`live test ${stamp}`);
        findings.push('removal: attachment gone, answer kept');

        // 3. a new answer replaces the submitted one
        await h.submitHomework(id, { content: homeworkContentHtml(`replaced ${stamp}`) });
        const replaced = await detail();
        expect(replaced.submittedContent).toContain(`replaced ${stamp}`);
        expect(replaced.submittedContent).not.toContain(`live test ${stamp}`);
        findings.push('answer replaced');
      } finally {
        // put the earlier submission back; an unsubmitted homework stays submitted (with an empty answer)
        await h.submitHomework(id, { content: before.submittedContent ?? '', attachment: previousFile });
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
