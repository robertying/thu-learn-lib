// Discussions (课程讨论) and answered questions (课程答疑).

import { Base64 } from 'js-base64';

import type { Session } from './request.ts';
import { YES } from './request.ts';
import type { Discussion, IDiscussionBase, Question } from './types.ts';
import { CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { decodeHTML } from './utils.ts';

/** Get all discussions （课程讨论） of the specified course. */
export async function getDiscussionList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<Discussion[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_DISCUSSION_LIST(courseID, courseType));
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  const result = (json.object?.resultsList ?? []) as any[];

  return result.map(
    (d) =>
      ({
        ...parseDiscussionBase(d),
        boardId: d.bqid,
        url: URLS.LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType),
      }) satisfies Discussion,
  );
}

/**
 * Get all notifications （课程答疑） of the specified course.
 * The student version supports only answered questions, while the teacher version supports all questions.
 */
export async function getAnsweredQuestionList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<Question[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType));
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  const result = (json.object?.resultsList ?? []) as any[];

  return result.map(
    (q) =>
      ({
        ...parseDiscussionBase(q),
        question: Base64.decode(q.wtnr),
        url: URLS.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType),
      }) satisfies Question,
  );
}

function parseDiscussionBase(d: any): IDiscussionBase {
  return {
    id: d.id,
    title: decodeHTML(d.bt),
    publisherName: d.fbrxm,
    publishTime: d.fbsj,
    lastReplyTime: d.zhhfsj,
    lastReplierName: d.zhhfrxm,
    visitCount: d.djs ?? 0, // teacher cannot fetch this
    replyCount: d.hfcs,
    isFavorite: d.sfsc === YES,
    comment: d.bznr ?? undefined,
  };
}
