import { Base64 } from 'js-base64';
import { describe, expect, it, vi } from 'vitest';

import {
  ContentType,
  CourseType,
  FailReason,
  HomeworkGradeLevel,
  checkHomeworkSubmitResponse,
  homeworkContentHtml,
} from '../src/index.ts';
import type { Request } from './helpers/fake-server.ts';
import { FakeServer, courseIdOf, field, html, json, success } from './helpers/fake-server.ts';
import { HOMEWORK_LIST_SOURCES, homeworkSubmitForm } from '../src/homework.ts';
import * as URLS from '../src/urls.ts';

const homework = (id: string, overrides: Record<string, unknown> = {}) => ({
  xszyid: `s-${id}`,
  zyid: id,
  wlkcid: 'c1',
  bt: `HW &amp; ${id}`,
  jzsj: 1740000000000,
  bjjzsj: null,
  sfbj: '否',
  zywcfs: 1,
  zytjfs: 2,
  scsj: null,
  cj: null,
  jsm: null,
  pynr: null,
  pysj: null,
  sfsc: '否',
  bznr: null,
  ...overrides,
});

// The real page usually has four attachment blocks (attachment, answer, submitted, grade); missing ones are skipped.
const page = (id: string) => `<html><body>
<div class="list calendar clearfix"><div class="fl right"><div class="c55">page description ${id}</div></div></div>
<div class="list calendar clearfix"><div class="fl right"><div class="c55">answer ${id}</div></div></div>
<div class="boxbox">first</div>
<div class="boxbox"><div class="right">a</div><div class="right">b</div><div class="right">submitted ${id}</div></div>
<div class="list fujian clearfix"><div class="ftitle"><a href="/b/wlxt/kczy/zy/student/downloadFile?fileId=att-${id}&amp;downloadUrl=/b/dl/att-${id}">${id}.pdf</a></div><div class="fl"><span class="color_999">10K</span></div></div>
<div class="list fujian clearfix"></div>
<div class="list fujian clearfix"></div>
<div class="list fujian clearfix"></div>
</body></html>`;

/** one homework in each status list, one excellent homework for `h3` */
const setup = () => {
  const lists: Record<string, ReturnType<typeof homework>[]> = {
    [URLS.LEARN_HOMEWORK_LIST_NEW]: [homework('h1')],
    [URLS.LEARN_HOMEWORK_LIST_SUBMITTED]: [homework('h2', { scsj: 1739000000000, sfbj: '是', bjjzsj: 1741000000000 })],
    [URLS.LEARN_HOMEWORK_LIST_GRADED]: [
      homework('h3', {
        scsj: 1738000000000,
        cj: -99,
        jsm: ' TA ',
        pynr: ' good ',
        pysj: '2025-02-14 12:00',
        sfsc: '是',
      }),
    ],
  };
  const server = new FakeServer();
  for (const [url, items] of Object.entries(lists)) {
    server.on('POST', url, (req: Request) => success({ aaData: courseIdOf(req) === 'c1' ? items : [] }));
  }
  return server
    .on('POST', URLS.LEARN_HOMEWORK_LIST_EXCELLENT, () =>
      success({
        aaData: [{ xszyid: 'x1', zyid: 'h3', wlkcid: 'c1', bt: 'Best', zywcfs: 1, cy: '2020011111 Alice', sfzm: '否' }],
      }),
    )
    .on('GET', URLS.LEARN_HOMEWORK_PAGE('', ''), (req) => html(page(req.url.searchParams.get('xszyid')!)))
    .on('GET', URLS.LEARN_HOMEWORK_EXCELLENT_PAGE('', ''), (req) => html(page(req.url.searchParams.get('xszyid')!)))
    .on('POST', URLS.LEARN_HOMEWORK_DETAIL, (req) => json({ result: 'success', msg: ` detail ${field(req, 'id')} ` }));
};

describe('getHomeworkList (student)', () => {
  it('parses the three status lists with page and detail content', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const list = await helper.getHomeworkList('c1', CourseType.STUDENT, { details: 'all' });

    expect(list.map((h) => [h.id, h.submitted, h.graded])).toEqual([
      ['s-h1', false, false],
      ['s-h2', true, false],
      ['s-h3', true, true],
    ]);
    const [h1, h2, h3] = list;
    expect(h1).toMatchObject({
      id: 's-h1',
      baseId: 'h1',
      title: 'HW & h1',
      url: URLS.LEARN_HOMEWORK_PAGE('c1', 's-h1'),
      submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE('c1', 's-h1'),
      deadline: '2025-02-20T05:20:00+08:00',
      lateSubmissionDeadline: undefined,
      isLateSubmission: false,
      submitTime: undefined,
      grade: undefined,
      // the detail JSON wins over the page for the description
      description: 'detail h1',
      answerContent: 'answer s-h1',
      submittedContent: 'submitted s-h1',
      attachment: {
        id: 'att-s-h1',
        name: 's-h1.pdf',
        downloadUrl: `${URLS.LEARN_PREFIX}/b/dl/att-s-h1`,
        previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.HOMEWORK, 'att-s-h1', CourseType.STUDENT, true),
        size: '10K',
      },
      answerAttachment: undefined,
      excellentHomeworkList: [],
    });
    expect(h2).toMatchObject({
      isLateSubmission: true,
      lateSubmissionDeadline: '2025-03-03T19:06:40+08:00',
      submitTime: '2025-02-08T15:33:20+08:00',
    });
    expect(h3).toMatchObject({
      grade: undefined,
      gradeLevel: HomeworkGradeLevel.A_PLUS,
      graderName: 'TA',
      gradeContent: 'good',
      gradeTime: '2025-02-14T12:00:00+08:00',
      submitTime: '2025-01-28T01:46:40+08:00',
      isFavorite: true,
    });
    expect(h3.excellentHomeworkList).toEqual([
      expect.objectContaining({
        id: 'x1',
        baseId: 'h3',
        title: 'Best',
        url: URLS.LEARN_HOMEWORK_EXCELLENT_PAGE('c1', 'x1'),
        author: { id: '2020011111', name: 'Alice', anonymous: false },
      }),
    ]);
    // excellent homework comes without its detail
    expect(h3.excellentHomeworkList?.[0]).not.toHaveProperty('description');
  });

  it('makes 3 status list + 1 excellent list requests and no detail requests by default', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const list = await helper.getHomeworkList('c1');

    expect(server.count(URLS.LEARN_HOMEWORK_LIST_EXCELLENT)).toBe(1);
    expect(server.requests).toHaveLength(3 + 1);
    expect(list.every((h) => h.description === undefined && h.attachment === undefined)).toBe(true);
    expect(list[2].excellentHomeworkList).toHaveLength(1);
  });

  it('adds 2 requests per homework with details: all', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    // the course type can be left out when passing options
    await helper.getHomeworkList('c1', undefined, { details: 'all' });

    expect(server.count(URLS.LEARN_HOMEWORK_PAGE('', ''))).toBe(3);
    expect(server.count(URLS.LEARN_HOMEWORK_DETAIL)).toBe(3);
    expect(server.count(URLS.LEARN_HOMEWORK_EXCELLENT_PAGE('', ''))).toBe(0);
    expect(server.requests).toHaveLength(3 + 1 + 3 * 2);
  });

  it('fetches details only for the homework a predicate selects', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const seen: string[] = [];
    const list = await helper.getHomeworkList('c1', CourseType.STUDENT, {
      details: (h) => {
        seen.push(h.id);
        return h.submitTime !== undefined && !h.graded;
      },
    });

    expect(seen.toSorted()).toEqual(['s-h1', 's-h2', 's-h3']);
    expect(list.map((h) => h.description)).toEqual([undefined, 'detail h2', undefined]);
    expect(server.requests).toHaveLength(3 + 1 + 2);
  });

  it('gets one homework or excellent homework detail on demand', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const [, h2, h3] = await helper.getHomeworkList('c1');
    server.reset();

    expect(await helper.getHomeworkDetail(h2)).toMatchObject({
      description: 'detail h2',
      submittedContent: 'submitted s-h2',
      attachment: expect.objectContaining({ id: 'att-s-h2' }),
    });
    expect(await helper.getExcellentHomeworkDetail(h3.excellentHomeworkList![0])).toMatchObject({
      description: 'detail h3',
      answerContent: 'answer x1',
    });
    expect(server.requests).toHaveLength(4);
  });

  it('reads a page with fewer attachment blocks, and falls back to its description when the JSON is empty', async () => {
    const server = setup()
      .on('GET', URLS.LEARN_HOMEWORK_PAGE('', ''), () =>
        html(`<html><body>
<div class="list calendar clearfix"><div class="fl right"><div class="c55">page description</div></div></div>
<div class="list fujian clearfix"></div>
</body></html>`),
      )
      .on('POST', URLS.LEARN_HOMEWORK_DETAIL, () => json({ result: 'success', msg: '  ' }));
    const helper = await server.loggedInHelper();
    const [h1] = await helper.getHomeworkList('c1');
    const detail = await helper.getHomeworkDetail(h1);
    expect(detail.description).toBe('page description');
    expect(detail.attachment).toBeUndefined();
    expect(detail.gradeAttachment).toBeUndefined();
  });

  it('reads the attachment name from the whole link text, and the link in .fl when there is no .ftitle', async () => {
    const server = setup().on('GET', URLS.LEARN_HOMEWORK_PAGE('', ''), () =>
      html(`<html><body>
<div class="list fujian clearfix"><div class="fl"><a href="/b/dl?fileId=f1"><span>report</span>.pdf</a><span class="color_999">1M</span></div></div>
</body></html>`),
    );
    const helper = await server.loggedInHelper();
    const [h1] = await helper.getHomeworkList('c1');
    expect((await helper.getHomeworkDetail(h1)).attachment).toMatchObject({
      id: 'f1',
      name: 'report.pdf',
      size: '1M',
      downloadUrl: `${URLS.LEARN_PREFIX}/b/dl?fileId=f1`,
    });
  });

  it('maps grade levels (leaving out the negative grade), with -63 as P and -60 as pass', async () => {
    const server = new FakeServer();
    for (const source of HOMEWORK_LIST_SOURCES) {
      server.on('POST', source.url, () =>
        success({
          aaData:
            source.url === URLS.LEARN_HOMEWORK_LIST_GRADED
              ? [homework('p', { cj: -63 }), homework('q', { cj: -60 }), homework('n', { cj: 95 })]
              : [],
        }),
      );
    }
    server.on('POST', URLS.LEARN_HOMEWORK_LIST_EXCELLENT, () => success({ aaData: [] }));
    const helper = await server.loggedInHelper();
    const list = await helper.getHomeworkList('c1');
    expect(list.map((h) => [h.grade, h.gradeLevel])).toEqual([
      [undefined, HomeworkGradeLevel.P],
      [undefined, HomeworkGradeLevel.PASS],
      [95, undefined],
    ]);
  });

  it('gives [] to homework without excellent homework, so a failed list (undefined) stands out', async () => {
    const helper = await setup().loggedInHelper();
    const list = await helper.getHomeworkList('c1');
    expect(Object.fromEntries(list.map((h) => [h.baseId, h.excellentHomeworkList?.length]))).toEqual({
      h1: 0,
      h2: 0,
      h3: 1,
    });
  });

  it('still returns homework when the excellent list fails', async () => {
    const server = setup().on('POST', URLS.LEARN_HOMEWORK_LIST_EXCELLENT, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    const list = await helper.getHomeworkList('c1');
    expect(list).toHaveLength(3);
    expect(list.every((h) => h.excellentHomeworkList === undefined)).toBe(true);
  });

  it('rejects with INVALID_RESPONSE when a status list fails', async () => {
    const server = setup().on('POST', URLS.LEARN_HOMEWORK_LIST_GRADED, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.getHomeworkList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

describe('getHomeworkList (teacher)', () => {
  it('reads a homework without content as an empty description', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_LIST_TEACHER, () =>
      success({ aaData: [{ zyid: 'h1', bt: 'HW 1', nr: null }] }),
    );
    const helper = await server.loggedInHelper();
    const [h] = await helper.getHomeworkList('c1', CourseType.TEACHER);
    expect(h.description).toBe('');
  });

  it('parses the teacher list with one request', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_LIST_TEACHER, () =>
      success({
        aaData: [
          {
            zyid: 'h1',
            wz: 1,
            bt: 'HW 1',
            nr: Base64.encode('<p>做这个</p>'),
            fbr: 't1',
            fbsj: 1740000000000,
            kssj: 1740003600000,
            jzsj: 1740607200000,
            bjjzsj: null,
            zywcfs: 1,
            zytjfs: 2,
            ypys: 4,
            yjs: 5,
            wjs: 6,
          },
        ],
      }),
    );
    const helper = await server.loggedInHelper();
    const list = await helper.getHomeworkList('c1', CourseType.TEACHER);
    expect(list).toEqual([
      {
        id: 'h1',
        index: 1,
        title: 'HW 1',
        description: '<p>做这个</p>',
        publisherId: 't1',
        publishTime: '2025-02-20T05:20:00+08:00',
        startTime: '2025-02-20T06:20:00+08:00',
        deadline: '2025-02-27T06:00:00+08:00',
        lateSubmissionDeadline: undefined,
        url: URLS.LEARN_HOMEWORK_DETAIL_TEACHER('c1', 'h1'),
        completionType: 1,
        submissionType: 2,
        gradedCount: 4,
        submittedCount: 5,
        unsubmittedCount: 6,
      },
    ]);
    expect(server.requests).toHaveLength(1);
  });
});

describe('submitHomework', () => {
  it('posts content and attachment', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'success' }));
    const helper = await server.loggedInHelper();
    await helper.submitHomework('s-h1', {
      content: 'my answer',
      attachment: { filename: 'a.txt', content: new Blob(['hi']) },
    });

    const form = server.requests[0].form!;
    expect(form.get('xszyid')).toBe('s-h1');
    expect(form.get('zynr')).toBe('my answer');
    expect((form.get('fileupload') as File).name).toBe('a.txt');
    expect(form.get('isDeleted')).toBe('0');
  });

  it('rejects with OPERATION_FAILED on failure', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.submitHomework('s-h1')).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
  });

  it('waits for an upload longer than requestTimeout, but not for a submission without attachment', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'success' }));
    const helper = await server.loggedInHelper({ requestTimeout: 10 });
    server.latency = 30;

    await helper.submitHomework('s-h1', { attachment: { filename: 'a.txt', content: new Blob(['hi']) } });
    await expect(helper.submitHomework('s-h1', { content: 'text' })).rejects.toHaveProperty(
      'reason',
      FailReason.REQUEST_TIMEOUT,
    );
  });

  it('logs in again when an expired session answers with a 200 HTML page', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'success' }));
    const helper = await server.loggedInHelper();
    server.expiry = 'html';
    server.expireSession();

    await helper.submitHomework('s-h1', { content: 'text' });
    expect(server.loginCount).toBe(2);
    expect(server.count(URLS.LEARN_HOMEWORK_SUBMIT)).toBe(2);
  });
});

describe('submitHomework with a React Native file', () => {
  it("appends { uri, name, type } as React Native's FormData expects", () => {
    const appended: unknown[][] = [];
    const append = vi.spyOn(FormData.prototype, 'append').mockImplementation(function (...args: unknown[]) {
      appended.push(args);
    });
    try {
      homeworkSubmitForm('s-h1', {
        content: '<p>a</p>',
        attachment: { filename: 'scan.pdf', content: { uri: 'file:///tmp/scan.pdf', type: 'application/pdf' } },
      });
      homeworkSubmitForm('s-h1', { attachment: { filename: 'x', content: { uri: 'file:///tmp/x' } } });
    } finally {
      append.mockRestore();
    }
    expect(appended.filter(([name]) => name === 'fileupload').map(([, value]) => value)).toEqual([
      { uri: 'file:///tmp/scan.pdf', name: 'scan.pdf', type: 'application/pdf' },
      { uri: 'file:///tmp/x', name: 'x', type: 'application/octet-stream' },
    ]);
  });

  it('sends the text "undefined" as fileupload without a file, as the website does', () => {
    const form = homeworkSubmitForm('s-h1', { content: '<p>a</p>', removeAttachment: true });
    expect(form.get('fileupload')).toBe('undefined');
    expect(form.get('isDeleted')).toBe('1');
  });
});

const submitServer = () =>
  new FakeServer()
    .on('GET', URLS.LEARN_CURRENT_SEMESTER, () => json({ message: 'success', result: {} }))
    .on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'success' }));

describe('getHomeworkSubmitRequest', () => {
  it('checks the session and returns the URL with the CSRF token and the form', async () => {
    const server = submitServer();
    const helper = await server.loggedInHelper();
    const request = await helper.getHomeworkSubmitRequest('s-h1', {
      content: '<p>answer</p>',
      attachment: { filename: 'a.txt', content: new Blob(['hi']) },
    });

    expect(server.count(URLS.LEARN_CURRENT_SEMESTER)).toBe(1);
    expect(server.loginCount).toBe(1);
    const url = new URL(request.url);
    expect(url.origin + url.pathname).toBe(URLS.LEARN_HOMEWORK_SUBMIT);
    expect(url.searchParams.get('_csrf')).toBe(server.csrfToken);
    expect(request.body.get('xszyid')).toBe('s-h1');
    expect(request.body.get('zynr')).toBe('<p>answer</p>');
    expect((request.body.get('fileupload') as File).name).toBe('a.txt');
    expect(request.body.get('isDeleted')).toBe('0');
    // nothing is submitted by the helper itself
    expect(server.count(URLS.LEARN_HOMEWORK_SUBMIT)).toBe(0);
  });

  it('logs in first when the session has expired, so the URL carries the new token', async () => {
    const server = submitServer();
    const helper = await server.loggedInHelper();
    server.expireSession();

    const request = await helper.getHomeworkSubmitRequest('s-h1', { content: '<p>answer</p>' });
    expect(server.loginCount).toBe(2);
    expect(new URL(request.url).searchParams.get('_csrf')).toBe('csrf-2');
  });
});

describe('checkHomeworkSubmitResponse', () => {
  it('accepts result success as JSON or as text', () => {
    expect(() => checkHomeworkSubmitResponse({ result: 'success', msg: '' })).not.toThrow();
    expect(() => checkHomeworkSubmitResponse('{"result":"success"}')).not.toThrow();
  });

  it('rejects with OPERATION_FAILED and the answer for anything but success', () => {
    const answer = { result: 'error', msg: '作业已截止' };
    expect(() => checkHomeworkSubmitResponse(answer)).toThrow(
      expect.objectContaining({ reason: FailReason.OPERATION_FAILED, extra: answer }),
    );
    expect(() => checkHomeworkSubmitResponse(undefined)).toThrow(
      expect.objectContaining({ reason: FailReason.OPERATION_FAILED }),
    );
  });

  it('rejects with NOT_LOGGED_IN for the login page of an expired session', () => {
    const loginPage = '<html><head><title>登录超时</title></head><body>您未登录或登录失效</body></html>';
    expect(() => checkHomeworkSubmitResponse(loginPage)).toThrow(
      expect.objectContaining({ reason: FailReason.NOT_LOGGED_IN }),
    );
  });

  it('rejects with INVALID_RESPONSE for another page', () => {
    expect(() => checkHomeworkSubmitResponse('<html>maintenance</html>')).toThrow(
      expect.objectContaining({ reason: FailReason.INVALID_RESPONSE }),
    );
  });
});

describe('homeworkContentHtml', () => {
  it('makes one paragraph per line and escapes the text', () => {
    expect(homeworkContentHtml('first line\n\n<b> & "quotes" \'s\r\nlast')).toBe(
      '<p>first line</p><p>&nbsp;</p><p>&lt;b&gt; &amp; &quot;quotes&quot; &#39;s</p><p>last</p>',
    );
  });

  it('is empty for text that is only whitespace', () => {
    expect(homeworkContentHtml('')).toBe('');
    expect(homeworkContentHtml(' \n ')).toBe('');
  });
});
