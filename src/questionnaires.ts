// Questionnaires (课程问卷).

import type { Session } from './request.ts';
import { YES } from './request.ts';
import type { Questionnaire, QuestionnaireDetail } from './types.ts';
import { FailReason, QuestionnaireType } from './types.ts';
import * as URLS from './urls.ts';
import { QNR_TYPE_MAP, decodeHTML } from './utils.ts';

/**
 * Get all questionnaires （课程问卷/QNR） of the specified course.
 */
export async function getQuestionnaireList(s: Session, courseID: string): Promise<Questionnaire[]> {
  return Promise.all([
    getQuestionnaireListAtUrl(s, courseID, URLS.LEARN_QNR_LIST_ONGOING),
    getQuestionnaireListAtUrl(s, courseID, URLS.LEARN_QNR_LIST_ENDED),
  ]).then((r) => r.flat());
}

async function getQuestionnaireListAtUrl(s: Session, courseID: string, url: string): Promise<Questionnaire[]> {
  const json = await (
    await s.fetchWithToken(url, { method: 'POST', body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID) })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }
  const result = (json.object?.aaData ?? []) as any[];
  return Promise.all(
    result.map(async (e) => {
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
        detail: await getQuestionnaireDetail(s, courseID, e.wjid),
      } satisfies Questionnaire;
    }),
  );
}

async function getQuestionnaireDetail(s: Session, courseID: string, qnrID: string): Promise<QuestionnaireDetail[]> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_QNR_DETAIL, {
      method: 'POST',
      body: URLS.LEARN_QNR_DETAIL_FORM(courseID, qnrID),
    })
  ).json();
  return (json as any[]).map(
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
