import { describe, expect, it } from 'vitest';

import type { Learn2018Helper } from '../src/index.ts';
import { CourseType, FailReason, Language } from '../src/index.ts';
import { HOMEWORK_LIST_SOURCES } from '../src/homework.ts';
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

  // Every list method of the helper, against a server whose lists hold a `null` row: each must reject with
  // INVALID_RESPONSE (so a new method can't forget `parsed()`).
  const body = {
    result: 'success',
    message: 'success',
    object: { aaData: [null], resultsList: [null], rows: [null] },
    resultList: [null],
  };
  const listServer = () => {
    const server = new FakeServer();
    const get = [
      URLS.LEARN_COURSE_LIST('2024-2025-1', CourseType.STUDENT, Language.ZH),
      URLS.LEARN_FILE_LIST('c1', CourseType.STUDENT),
      URLS.LEARN_FILE_CATEGORY_LIST('c1', CourseType.STUDENT),
      URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT('c1', 'k1'),
      URLS.LEARN_DISCUSSION_LIST('c1', CourseType.STUDENT),
      URLS.LEARN_QUESTION_LIST_ANSWERED('c1', CourseType.STUDENT),
    ];
    const post = [
      URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, false),
      URLS.LEARN_NOTIFICATION_LIST(CourseType.STUDENT, true),
      ...HOMEWORK_LIST_SOURCES.map((source) => source.url),
      URLS.LEARN_HOMEWORK_LIST_EXCELLENT,
      URLS.LEARN_QNR_LIST_ONGOING,
      URLS.LEARN_QNR_LIST_ENDED,
      URLS.LEARN_FAVORITE_LIST(),
      URLS.LEARN_COMMENT_LIST(),
    ];
    for (const url of get) server.on('GET', url, () => json(body));
    for (const url of post) server.on('POST', url, () => json(body));
    return server.on('POST', URLS.LEARN_QNR_DETAIL, () => json([null]));
  };

  it.each<[string, (helper: Learn2018Helper) => Promise<unknown>]>([
    ['getCourseList', (h) => h.getCourseList('2024-2025-1')],
    ['getNotificationList', (h) => h.getNotificationList('c1')],
    ['getFileList', (h) => h.getFileList('c1')],
    ['getFileCategoryList', (h) => h.getFileCategoryList('c1')],
    ['getFileListByCategory', (h) => h.getFileListByCategory('c1', 'k1')],
    ['getHomeworkList', (h) => h.getHomeworkList('c1')],
    ['getDiscussionList', (h) => h.getDiscussionList('c1')],
    ['getAnsweredQuestionList', (h) => h.getAnsweredQuestionList('c1')],
    ['getQuestionnaireList', (h) => h.getQuestionnaireList('c1')],
    ['getQuestionnaireDetail', (h) => h.getQuestionnaireDetail('c1', 'q1')],
    ['getFavorites', (h) => h.getFavorites()],
    ['getComments', (h) => h.getComments()],
  ])('rejects a null row in %s with INVALID_RESPONSE', async (_, call) => {
    const helper = await listServer().loggedInHelper();
    await expect(call(helper)).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});
