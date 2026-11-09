import { Base64 } from 'js-base64';
import { describe, expect, it } from 'vitest';

import { CourseType, FailReason, QuestionnaireType } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, courseIdOf, field, json, success } from './helpers/fake-server.ts';

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  wlkcid: 'c1',
  bt: `Topic &amp; ${id}`,
  fbrxm: 'Bob',
  fbsj: '2025-03-01 09:00:00',
  zhhfsj: '2025-03-02 10:30:00',
  zhhfrxm: 'Carol',
  djs: 10,
  hfcs: 2,
  sfsc: '是',
  bznr: null,
  ...overrides,
});

describe('getDiscussionList', () => {
  it('parses discussions with one request', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_DISCUSSION_LIST('c1', CourseType.STUDENT), () =>
      success({ resultsList: [post('d1', { bqid: 'b1' })] }),
    );
    const helper = await server.loggedInHelper();
    expect(await helper.getDiscussionList('c1')).toEqual([
      {
        id: 'd1',
        title: 'Topic & d1',
        publisherName: 'Bob',
        publishTime: '2025-03-01T09:00:00+08:00',
        lastReplyTime: '2025-03-02T10:30:00+08:00',
        lastReplierName: 'Carol',
        visitCount: 10,
        replyCount: 2,
        isFavorite: true,
        comment: undefined,
        boardId: 'b1',
        url: URLS.LEARN_DISCUSSION_DETAIL('c1', 'b1', 'd1', CourseType.STUDENT),
      },
    ]);
    expect(server.requests).toHaveLength(1);
  });

  it('rejects with INVALID_RESPONSE on failure', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_DISCUSSION_LIST('c1', CourseType.STUDENT), () =>
      json({ result: 'error' }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getDiscussionList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

describe('getAnsweredQuestionList', () => {
  it('reads a question without a body as empty', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_QUESTION_LIST_ANSWERED('c1', CourseType.STUDENT), () =>
      success({ resultsList: [post('q1', { wtnr: null })] }),
    );
    const helper = await server.loggedInHelper();
    const [q] = await helper.getAnsweredQuestionList('c1');
    expect(q.question).toBe('');
  });

  it('decodes the question body', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_QUESTION_LIST_ANSWERED('c1', CourseType.STUDENT), () =>
      success({ resultsList: [post('q1', { wtnr: Base64.encode('为什么？'), djs: undefined })] }),
    );
    const helper = await server.loggedInHelper();
    const [q] = await helper.getAnsweredQuestionList('c1');
    expect(q).toMatchObject({
      id: 'q1',
      question: '为什么？',
      visitCount: 0,
      url: URLS.LEARN_QUESTION_DETAIL('c1', 'q1', CourseType.STUDENT),
    });
  });
});

const qnr = (id: string, wjlx: string, tjsj: string | null) => ({
  wjid: id,
  wlkcid: 'c1',
  wjlx,
  wjbt: `Q ${id}`,
  kssj: 1740000000000,
  jssj: 1740607200000,
  scsj: 1739990000000,
  scr: 't1',
  scrxm: 'Teacher',
  tjsj,
  sfsc: '否',
  bznr: null,
});

describe('getQuestionnaireList', () => {
  it('merges ongoing and ended lists and fetches each detail', async () => {
    const server = new FakeServer()
      .on('POST', URLS.LEARN_QNR_LIST_ONGOING, (req) =>
        success({ aaData: courseIdOf(req) === 'c1' ? [qnr('w1', '投票', null)] : [] }),
      )
      .on('POST', URLS.LEARN_QNR_LIST_ENDED, () => success({ aaData: [qnr('w2', '未知', '2025-01-01')] }))
      .on('POST', URLS.LEARN_QNR_DETAIL, (req) =>
        json([
          {
            wtid: `${field(req, 'wjid')}-1`,
            wtbh: '1',
            type: 'dnx',
            require: '是',
            wtbt: 'Pick one',
            wtfz: '5',
            list: [{ xxid: 'o1', xxbh: '1', xxbt: 'A &amp; B' }],
          },
        ]),
      );
    const helper = await server.loggedInHelper();
    const list = await helper.getQuestionnaireList('c1');

    expect(list.map((q) => [q.id, q.type, q.submitTime])).toEqual([
      ['w1', QuestionnaireType.VOTE, undefined],
      ['w2', QuestionnaireType.SURVEY, '2025-01-01'],
    ]);
    expect(list[0].url).toBe(URLS.LEARN_QNR_SUBMIT_PAGE('c1', 'w1', QuestionnaireType.VOTE));
    expect(list[0].detail).toEqual([
      {
        id: 'w1-1',
        index: 1,
        type: 'dnx',
        required: true,
        title: 'Pick one',
        score: 5,
        options: [{ id: 'o1', index: 1, title: 'A & B' }],
      },
    ]);
    // 2 lists + 1 detail per questionnaire
    expect(server.requests).toHaveLength(4);
  });

  it('fetches questions only for the questionnaires details selects, or on demand', async () => {
    const server = new FakeServer()
      .on('POST', URLS.LEARN_QNR_LIST_ONGOING, () => success({ aaData: [qnr('w1', '投票', null)] }))
      .on('POST', URLS.LEARN_QNR_LIST_ENDED, () => success({ aaData: [qnr('w2', '问卷', '2025-01-01')] }))
      .on('POST', URLS.LEARN_QNR_DETAIL, () => json([]));
    const helper = await server.loggedInHelper();

    const none = await helper.getQuestionnaireList('c1', { details: 'none' });
    expect(none.map((q) => q.detail)).toEqual([undefined, undefined]);
    expect(server.count(URLS.LEARN_QNR_DETAIL)).toBe(0);

    const some = await helper.getQuestionnaireList('c1', { details: (q) => q.submitTime === undefined });
    expect(some.map((q) => q.detail)).toEqual([[], undefined]);
    expect(server.count(URLS.LEARN_QNR_DETAIL)).toBe(1);

    expect(await helper.getQuestionnaireDetail('c1', 'w2')).toEqual([]);
    expect(server.requests.at(-1)?.form?.get('wjid')).toBe('w2');
  });

  it('rejects with INVALID_RESPONSE when the questions are not a list', async () => {
    const server = new FakeServer()
      .on('POST', URLS.LEARN_QNR_LIST_ONGOING, () => success({ aaData: [qnr('w1', '投票', null)] }))
      .on('POST', URLS.LEARN_QNR_LIST_ENDED, () => success({ aaData: [] }))
      .on('POST', URLS.LEARN_QNR_DETAIL, () => json({ result: 'error' }));
    const helper = await server.loggedInHelper();
    await expect(helper.getQuestionnaireList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});
