import { describe, expect, it } from 'vitest';

import { FailReason, QuestionnaireType } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, courseIdOf, field, json, success } from './helpers/fake-server.ts';

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
    const list = await helper.getQuestionnaireList('c1', { details: 'all' });

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
    await expect(helper.getQuestionnaireList('c1', { details: 'all' })).rejects.toHaveProperty(
      'reason',
      FailReason.INVALID_RESPONSE,
    );
  });
});
