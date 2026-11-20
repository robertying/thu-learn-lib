import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { DownloadRequest, Fetch } from '../../src/index.ts';
import type { Homework, HomeworkDetail } from '../../src/index.ts';
import { FailReason, Learn2018Helper, homeworkContentHtml } from '../../src/index.ts';
import * as URLS from '../../src/urls.ts';
import { urlOf } from '../../src/utils.ts';
import { FINGERPRINT, PASSWORD, USERNAME, config } from './config.ts';
import { ALLOW_WRITES } from './guard.ts';
import { type OnceTest, recordAttempt, recordPass, recordResult, shouldRun } from './once.ts';
import { cookieJarConfig } from '../../src/cookies.ts';

// Run these alone, before the other live tests: those fetch notice details too, which may mark notices read.

const wrongPassword: OnceTest = { name: 'wrong-password', covers: ['src/auth.ts'], maxPerDay: 2 };
/**
 * What id.tsinghua.edu.cn answers for the right password with a device fingerprint it has never trusted, as for one
 * that expired or was removed from the account's trusted browsers. It may show the account's owner a sign-in attempt.
 */
const untrustedDevice: OnceTest = { name: 'untrusted-device', covers: ['src/auth.ts'], maxPerDay: 1 };
const readMark: OnceTest = {
  name: 'read-mark',
  covers: ['src/notices.ts', 'src/files.ts'],
  maxPerDay: 1,
};

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

  it.runIf(shouldRun(untrustedDevice))(
    'answers a device fingerprint it does not trust with DEVICE_NOT_TRUSTED',
    { retry: 0 },
    async () => {
      recordAttempt(untrustedDevice.name);
      recordResult(untrustedDevice.name, 'started');
      // a fingerprint no browser of the account has ever trusted
      const fingerPrint = globalThis.crypto.randomUUID().replaceAll('-', '');
      // what the credential check answers, recorded before the helper reads it
      let answer = '';
      const jar = cookieJarConfig();
      const helper = new Learn2018Helper({
        ...jar,
        fetch: async (input, init) => {
          const res = await jar.fetch(input, init);
          if (urlOf(input).startsWith(URLS.ID_LOGIN_CHECK)) {
            const body = await res.clone().text();
            answer = `HTTP ${res.status} at ${res.url}: ${body.replace(/\s+/g, ' ').slice(0, 600)}`;
          }
          return res;
        },
      });
      const err = await helper
        .login({ username: USERNAME, password: PASSWORD, fingerPrint })
        .then(() => 'logged in')
        .catch((e: unknown) => e);
      recordResult(untrustedDevice.name, `${JSON.stringify(err)}; check answered ${answer}`);
      expect(err).toHaveProperty('reason', FailReason.DEVICE_NOT_TRUSTED);
      recordPass(untrustedDevice, `an untrusted fingerprint rejects with DEVICE_NOT_TRUSTED; ${answer}`);
    },
  );

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

  it.runIf(ALLOW_WRITES && !!SUBMIT_HOMEWORK && shouldRun(submission))(
    'submits homework with progress, removes and replaces, then puts the earlier submission back',
    { retry: 0, timeout: 300_000 },
    async () => {
      recordAttempt(submission.name);
      const cookieJar = new CookieJar();
      const h = new Learn2018Helper(config(cookieJar));
      await h.login();
      // what an app downloading with another client does: download() with a transport that shares the cookies
      const raw = fetchCookie(fetch, cookieJar) as unknown as Fetch;
      const transport = async ({ url, headers }: DownloadRequest) => {
        const res = await raw(url, { headers });
        const blob = await res.blob();
        return { status: res.status, url: res.url, size: blob.size, text: () => blob.text(), blob };
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
        const { blob } = await h.download(before.submittedAttachment.downloadUrl, transport);
        previousFile = { filename: before.submittedAttachment.name, content: blob };
      }

      const stamp = new Date().toISOString();
      const filename = 'thu-learn-lib-live-test.txt';
      const findings: string[] = [`was ${target.submitted ? 'submitted' : 'not submitted'}`];
      try {
        // 1. an answer and an attachment, reporting progress (Node has no XMLHttpRequest: fetch, no progress events)
        await h.submitHomework(id, {
          content: homeworkContentHtml(`live test ${stamp}\nline 2`),
          attachment: { filename, content: new Blob([`thu-learn-lib live test ${stamp}`], { type: 'text/plain' }) },
          onProgress: () => {},
        });
        const sent = await detail();
        expect(sent.submittedContent).toContain(`live test ${stamp}`);
        expect(sent.submittedAttachment?.name).toBe(filename);
        findings.push('answer and attachment submitted');

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
