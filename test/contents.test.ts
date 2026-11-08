import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, json, success } from './helpers/fake-server.ts';

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
    const contents = await helper.getAllContents(['c1', 'c2'], ContentType.DISCUSSION);

    expect(Object.keys(contents).toSorted()).toEqual(['c1', 'c2']);
    expect(contents.c1.map((d) => d.id)).toEqual(['d-c1']);
    expect(server.requests).toHaveLength(2);
  });

  it('rejects when one course fails, unless allowFailure', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();

    await expect(helper.getAllContents(['c1', 'broken'], ContentType.DISCUSSION)).rejects.toMatchObject({
      reason: FailReason.INVALID_RESPONSE,
      extra: { reason: { reason: FailReason.INVALID_RESPONSE } },
    });

    const contents = await helper.getAllContents(['c1', 'broken'], ContentType.DISCUSSION, CourseType.STUDENT, true);
    expect(Object.keys(contents)).toEqual(['c1']);
  });

  it('dispatches questions to the answered-question list', async () => {
    const server = setup();
    const helper = await server.loggedInHelper();
    expect(await helper.getAllContents(['c1'], ContentType.QUESTION)).toEqual({ c1: [] });
  });
});
