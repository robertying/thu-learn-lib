import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, html, json, success } from './helpers/fake-server.ts';

const empty = () => success({ aaData: [] });

const setup = () =>
  new FakeServer()
    .on('GET', URLS.LEARN_DISCUSSION_LIST('', CourseType.STUDENT), (req) =>
      req.url.searchParams.get('wlkcid') === 'broken'
        ? json({ result: 'error' })
        : success({ resultsList: [{ id: `d-${req.url.searchParams.get('wlkcid')}`, wlkcid: 'x', bqid: 'b' }] }),
    )
    .on('GET', URLS.LEARN_QUESTION_LIST_ANSWERED('', CourseType.STUDENT), () => success({ resultsList: [] }));

describe('getAllContents', () => {
  it('returns each course’s content keyed by course id, one request per course', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    const { contents, errors } = await helper.getAllContents(['c1', 'c2'], ContentType.DISCUSSION);

    expect(Object.keys(contents).toSorted()).toEqual(['c1', 'c2']);
    expect(errors).toEqual({});
    expect(contents.c1.map((d) => d.id)).toEqual(['d-c1']);
    expect(server.requests).toHaveLength(2);
  });

  it('reports a failed course in errors and still returns the others', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();

    const { contents, errors } = await helper.getAllContents(['c1', 'broken'], ContentType.DISCUSSION);
    expect(Object.keys(contents)).toEqual(['c1']);
    expect(errors).toEqual({ broken: expect.objectContaining({ reason: FailReason.INVALID_RESPONSE }) });
  });

  it('passes details on to the homework and notification lists', async () => {
    const server = setup()
      .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, false), () =>
        success({ aaData: [{ ggid: 'n1', bt: 'N', fjmc: 'a.pdf', fbsj: '' }] }),
      )
      .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true), () => success({ aaData: [] }))
      .on('GET', URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT), () =>
        html('<div id="attachment"><div class="fl"><a class="ml-10" href="/dl?wjid=f1">a</a></div></div>'),
      );
    const helper = await server.loggedInHelper();

    const none = await helper.getAllContents(['c1'], ContentType.NOTIFICATION);
    expect(none.contents.c1[0].attachment).toBeUndefined();
    expect(server.count(URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT))).toBe(0);

    const all = await helper.getAllContents(['c1'], ContentType.NOTIFICATION, { details: 'all' });
    expect(all.contents.c1[0].attachment?.id).toBe('f1');
    expect(server.count(URLS.LEARN_NOTIFICATION_DETAIL('', '', CourseType.STUDENT))).toBe(1);
  });

  it('dispatches questions to the answered-question list', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    expect(await helper.getAllContents(['c1'], ContentType.QUESTION)).toEqual({ contents: { c1: [] }, errors: {} });
  });

  it('rejects homework of a teacher course for every course instead of returning student data', async () => {
    const server = new FakeServer();
    const helper = await server.loggedInHelper();
    const result = await helper.getAllContents(['c1'], ContentType.HOMEWORK, { courseType: CourseType.TEACHER });

    expect(result.contents).toEqual({});
    expect(result.errors.c1).toHaveProperty('reason', FailReason.NOT_IMPLEMENTED);
    expect(server.requests).toHaveLength(0);
  });

  it('passes details on to the homework and questionnaire lists', async () => {
    const server = setup()
      .on('POST', URLS.LEARN_HOMEWORK_LIST_NEW, () =>
        success({ aaData: [{ xszyid: 'h1', zyid: 'b1', wlkcid: 'c1', bt: 'H', jzsj: 0 }] }),
      )
      .on('POST', URLS.LEARN_HOMEWORK_LIST_SUBMITTED, empty)
      .on('POST', URLS.LEARN_HOMEWORK_LIST_GRADED, empty)
      .on('POST', URLS.LEARN_HOMEWORK_LIST_EXCELLENT, empty)
      .on('GET', URLS.LEARN_HOMEWORK_PAGE('', ''), () => html('<html></html>'))
      .on('POST', URLS.LEARN_HOMEWORK_DETAIL, () => success(undefined))
      .on('POST', URLS.LEARN_QNR_LIST_ONGOING, () =>
        success({ aaData: [{ wjid: 'q1', wlkcid: 'c1', wjlx: '问卷', wjbt: 'Q' }] }),
      )
      .on('POST', URLS.LEARN_QNR_LIST_ENDED, empty)
      .on('POST', URLS.LEARN_QNR_DETAIL, () => json([]));
    const helper = await server.loggedInHelper();

    await helper.getAllContents(['c1'], ContentType.HOMEWORK, { details: (h) => h.id === 'h1' });
    expect(server.count(URLS.LEARN_HOMEWORK_DETAIL)).toBe(1);

    const qnr = await helper.getAllContents(['c1'], ContentType.QUESTIONNAIRE, { details: 'none' });
    expect(qnr.contents.c1.map((q) => q.id)).toEqual(['q1']);
    expect(server.count(URLS.LEARN_QNR_DETAIL)).toBe(0);
  });

  it('dispatches files to the file list', async () => {
    const server = setup()
      .on('GET', URLS.LEARN_FILE_LIST('', CourseType.STUDENT), () => success([]))
      .on('GET', URLS.LEARN_FILE_CATEGORY_LIST('', CourseType.STUDENT), () => success({ rows: [] }));
    const helper = await server.loggedInHelper();
    expect(await helper.getAllContents(['c1'], ContentType.FILE)).toEqual({ contents: { c1: [] }, errors: {} });
  });
});
