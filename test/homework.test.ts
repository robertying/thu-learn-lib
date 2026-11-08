import { Base64 } from 'js-base64';
import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason, HomeworkGradeLevel } from '../src/index.ts';
import type { Request } from './helpers/fake-server.ts';
import { FakeServer, courseIdOf, field, html, json, success } from './helpers/fake-server.ts';
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

// The real page always has four attachment blocks (attachment, answer, submitted, grade); the parser expects them.
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
      homework('h3', { scsj: 1738000000000, cj: -99, jsm: ' TA ', pynr: ' good ', pysj: 1739500000000, sfsc: '是' }),
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
    const list = await helper.getHomeworkList('c1');

    expect(list.map((h) => [h.id, h.submitted, h.graded])).toEqual([
      ['s-h1', false, false],
      ['s-h2', true, false],
      ['s-h3', true, true],
    ]);
    const [h1, h2, h3] = list;
    expect(h1).toMatchObject({
      id: 's-h1',
      studentHomeworkId: 's-h1',
      baseId: 'h1',
      title: 'HW & h1',
      url: URLS.LEARN_HOMEWORK_PAGE('c1', 's-h1'),
      submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE('c1', 's-h1'),
      deadline: 1740000000000,
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
      excellentHomeworkList: undefined,
    });
    expect(h2).toMatchObject({
      isLateSubmission: true,
      lateSubmissionDeadline: 1741000000000,
      submitTime: 1739000000000,
    });
    expect(h3).toMatchObject({
      grade: -99,
      gradeLevel: HomeworkGradeLevel.A_PLUS,
      graderName: 'TA',
      gradeContent: 'good',
      gradeTime: 1739500000000,
      isFavorite: true,
      favoriteTime: 1738000000000,
    });
    expect(h3.excellentHomeworkList).toEqual([
      expect.objectContaining({
        id: 'x1',
        baseId: 'h3',
        title: 'Best',
        url: URLS.LEARN_HOMEWORK_EXCELLENT_PAGE('c1', 'x1'),
        author: { id: '2020011111', name: 'Alice', anonymous: false },
        description: 'detail h3',
        answerContent: 'answer x1',
      }),
    ]);
  });

  it('makes 3 list + 3 excellent list + 2 per homework + 2 per excellent item per list requests', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    await helper.getHomeworkList('c1');

    // The excellent list (and each excellent item's page + detail) is fetched again for every status list.
    expect(server.count(URLS.LEARN_HOMEWORK_LIST_EXCELLENT)).toBe(3);
    expect(server.count(URLS.LEARN_HOMEWORK_EXCELLENT_PAGE('', ''))).toBe(3);
    expect(server.count(URLS.LEARN_HOMEWORK_PAGE('', ''))).toBe(3);
    expect(server.count(URLS.LEARN_HOMEWORK_DETAIL)).toBe(3 + 3);
    expect(server.requests).toHaveLength(3 + 3 + 3 * 2 + 3 * 2);
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
            fbsj: 1,
            kssj: 2,
            jzsj: 3,
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
        publishTime: 1,
        startTime: 2,
        deadline: 3,
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
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT(), () => json({ result: 'success' }));
    const helper = await server.loggedInHelper();
    await helper.submitHomework('s-h1', 'my answer', { filename: 'a.txt', content: new Blob(['hi']) });

    const form = server.requests[0].form!;
    expect(form.get('xszyid')).toBe('s-h1');
    expect(form.get('zynr')).toBe('my answer');
    expect((form.get('fileupload') as File).name).toBe('a.txt');
    expect(form.get('isDeleted')).toBe('0');
  });

  it('rejects with OPERATION_FAILED on failure', async () => {
    const server = new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT(), () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.submitHomework('s-h1')).rejects.toHaveProperty('reason', FailReason.OPERATION_FAILED);
  });
});
