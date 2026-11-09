import { describe, expect, it } from 'vitest';

import { ContentType, CourseType, FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, json, success } from './helpers/fake-server.ts';

// A server answer in a shape the parsers don't expect rejects with INVALID_RESPONSE, never with a bare TypeError.
describe('answers in an unexpected shape', () => {
  it('rejects a current semester without its fields with INVALID_RESPONSE', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_CURRENT_SEMESTER, () =>
      json({ message: 'success', result: null }),
    );
    const helper = await server.loggedInHelper();
    await expect(helper.getCurrentSemester()).rejects.toEqual({
      reason: FailReason.INVALID_RESPONSE,
      extra: { error: expect.stringContaining('TypeError') },
    });
  });

  it('rejects a list with a null row with INVALID_RESPONSE', async () => {
    const server = new FakeServer()
      .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, false), () => success({ aaData: [null] }))
      .on('POST', URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true), () => success({ aaData: [] }));
    const helper = await server.loggedInHelper();
    await expect(helper.getNotificationList('c1')).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });

  it('reports such a course in getAllContents errors as INVALID_RESPONSE', async () => {
    const server = new FakeServer().on('GET', URLS.LEARN_DISCUSSION_LIST('', CourseType.STUDENT), () =>
      success({ resultsList: [null] }),
    );
    const helper = await server.loggedInHelper();
    const { errors } = await helper.getAllContents(['c1'], ContentType.DISCUSSION);
    expect(errors.c1).toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});
