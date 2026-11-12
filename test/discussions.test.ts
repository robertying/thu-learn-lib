import { describe, expect, it } from 'vitest';

import { CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, base64, json, success } from './helpers/fake-server.ts';

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
      success({ resultsList: [post('q1', { wtnr: base64('为什么？'), djs: undefined })] }),
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
