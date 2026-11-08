import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, html, json, success } from './helpers/fake-server.ts';

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
});
