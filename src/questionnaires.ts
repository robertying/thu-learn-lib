// Questionnaires (课程问卷).

import type { Session } from './request.ts';
import { YES } from './request.ts';
import type { ApiError, Questionnaire, QuestionnaireDetail, QuestionnaireListOptions } from './types.ts';
import { FailReason, QuestionnaireType } from './types.ts';
import * as URLS from './urls.ts';
import { QNR_TYPE_MAP, decodeHTML, isSelected } from './utils.ts';

/**
 * Get all questionnaires （课程问卷/QNR） of the specified course: ongoing and ended lists.
 * Questions (`detail`, 1 request each) only for the questionnaires `options.details` selects (default `'all'`).
 */
export async function getQuestionnaireList(
  s: Session,
  courseID: string,
  options: QuestionnaireListOptions = {},
): Promise<Questionnaire[]> {
  const details = options.details ?? 'all';
  const lists = await Promise.all([
    getQuestionnaireListAtUrl(s, courseID, URLS.LEARN_QNR_LIST_ONGOING),
    getQuestionnaireListAtUrl(s, courseID, URLS.LEARN_QNR_LIST_ENDED),
  ]);
  return Promise.all(
    lists
      .flat()
      .map(async (q) =>
        isSelected(details, q) ? { ...q, detail: await getQuestionnaireDetail(s, courseID, q.id) } : q,
      ),
  );
}

async function getQuestionnaireListAtUrl(s: Session, courseID: string, url: string): Promise<Questionnaire[]> {
  const json = await s.fetchJsonWithToken(url, { method: 'POST', body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID) });
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }
  const result = (json.object?.aaData ?? []) as any[];
  return result.map((e) => {
    const type = QNR_TYPE_MAP.get(e.wjlx) ?? QuestionnaireType.SURVEY;
    return {
      id: e.wjid,
      type,
      title: decodeHTML(e.wjbt),
      startTime: e.kssj,
      endTime: e.jssj,
      uploadTime: e.scsj,
      uploaderId: e.scr,
      uploaderName: e.scrxm,
      submitTime: e.tjsj ? e.tjsj : undefined,
      isFavorite: e.sfsc === YES,
      comment: e.bznr ?? undefined,
      url: URLS.LEARN_QNR_SUBMIT_PAGE(e.wlkcid, e.wjid, type),
    } satisfies Questionnaire;
  });
}

/** Get the questions of one questionnaire (1 request). */
export async function getQuestionnaireDetail(
  s: Session,
  courseID: string,
  qnrID: string,
): Promise<QuestionnaireDetail[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_QNR_DETAIL, {
    method: 'POST',
    body: URLS.LEARN_QNR_DETAIL_FORM(courseID, qnrID),
  });
  if (!Array.isArray(json)) {
    throw { reason: FailReason.INVALID_RESPONSE, extra: json } as ApiError;
  }
  return json.map(
    (e) =>
      ({
        id: e.wtid,
        index: Number(e.wtbh),
        type: e.type,
        required: e.require === YES,
        title: decodeHTML(e.wtbt),
        score: e.wtfz ? Number(e.wtfz) : undefined, // unsure about original type
        options: (e.list as any[])?.map((o) => ({
          id: o.xxid,
          index: Number(o.xxbh),
          title: decodeHTML(o.xxbt),
        })),
      }) satisfies QuestionnaireDetail,
  );
}
