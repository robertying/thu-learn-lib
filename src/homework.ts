// Homework (课程作业), excellent homework and homework submission.

import type { Element } from 'cheerio';
import { Base64 } from 'js-base64';

import type { Session } from './request.ts';
import { addCSRFTokenToUrl } from './request.ts';
import type {
  ExcellentHomework,
  Homework,
  HomeworkListOptions,
  HomeworkSubmitRequest,
  HomeworkTA,
  IExcellentHomework,
  IHomework,
  IHomeworkDetail,
  IHomeworkStatus,
  IHomeworkSubmitAttachment,
  RemoteFile,
} from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import {
  $,
  GRADE_LEVEL_MAP,
  YES,
  apiError,
  decodeHTML,
  expectSuccess,
  isSelected,
  looksLikeLoginPage,
  toRequiredServerTime,
  toServerTime,
  trimAndDefine,
} from './utils.ts';

/**
 * Get all homeworks （课程作业） of the specified course: 3 status lists and the excellent homework list.
 * Details (page + description) only for the homework `options.details` selects.
 */
export function getHomeworkList(
  s: Session,
  courseID: string,
  courseType?: CourseType.STUDENT,
  options?: HomeworkListOptions,
): Promise<Homework[]>;

export function getHomeworkList(s: Session, courseID: string, courseType: CourseType.TEACHER): Promise<HomeworkTA[]>;

export async function getHomeworkList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
  options: HomeworkListOptions = {},
): Promise<Homework[] | HomeworkTA[]> {
  if (courseType === CourseType.TEACHER) {
    const json = await s.fetchJsonWithToken(URLS.LEARN_HOMEWORK_LIST_TEACHER, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
    });
    expectSuccess(json, FailReason.INVALID_RESPONSE);

    const result = (json.object?.aaData ?? []) as any[];

    return result.map(
      (d) =>
        ({
          id: d.zyid,
          index: d.wz,
          title: decodeHTML(d.bt),
          description: decodeHTML(Base64.decode(d.nr ?? '')),
          publisherId: d.fbr,
          publishTime: toRequiredServerTime(d.fbsj),
          startTime: toRequiredServerTime(d.kssj),
          deadline: toRequiredServerTime(d.jzsj),
          lateSubmissionDeadline: toServerTime(d.bjjzsj),
          url: URLS.LEARN_HOMEWORK_DETAIL_TEACHER(courseID, d.zyid),
          completionType: d.zywcfs,
          submissionType: d.zytjfs,
          gradedCount: d.ypys,
          submittedCount: d.yjs,
          unsubmittedCount: d.wjs,
        }) satisfies HomeworkTA,
    );
  } else {
    const [lists, excellentHomeworkListByHomework] = await Promise.all([
      Promise.all(
        URLS.LEARN_HOMEWORK_LIST_SOURCE.map((source) => getHomeworkListAtUrl(s, courseID, source.url, source.status)),
      ),
      // a failed excellent homework list doesn't fail the homework list: its items get `excellentHomeworkList: undefined`
      getExcellentHomeworkListByHomework(s, courseID).catch(() => undefined),
    ]);
    return Promise.all(
      lists.flat().map(async (h) => {
        const homework: Homework = {
          ...h,
          excellentHomeworkList: excellentHomeworkListByHomework && (excellentHomeworkListByHomework[h.baseId] ?? []),
        };
        return isSelected(options.details, homework) ? { ...homework, ...(await getHomeworkDetail(s, h)) } : homework;
      }),
    );
  }
}

async function getHomeworkListAtUrl(
  s: Session,
  courseID: string,
  url: string,
  status: IHomeworkStatus,
): Promise<IHomework[]> {
  const json = await s.fetchJsonWithToken(url, {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object?.aaData ?? []) as any[];

  return result.map(
    (h) =>
      ({
        id: h.xszyid,
        studentHomeworkId: h.xszyid,
        baseId: h.zyid,
        title: decodeHTML(h.bt),
        url: URLS.LEARN_HOMEWORK_PAGE(h.wlkcid, h.xszyid),
        deadline: toRequiredServerTime(h.jzsj),
        lateSubmissionDeadline: toServerTime(h.bjjzsj),
        isLateSubmission: h.sfbj === YES,
        completionType: h.zywcfs,
        submissionType: h.zytjfs,
        submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE(h.wlkcid, h.xszyid),
        submitTime: toServerTime(h.scsj),
        grade: h.cj === null ? undefined : h.cj,
        gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
        graderName: trimAndDefine(h.jsm),
        gradeContent: trimAndDefine(h.pynr),
        gradeTime: toServerTime(h.pysj),
        isFavorite: h.sfsc === YES,
        comment: h.bznr ?? undefined,
        ...status,
      }) satisfies IHomework,
  );
}

async function getExcellentHomeworkListByHomework(
  s: Session,
  courseID: string,
): Promise<{ [id: string]: ExcellentHomework[] }> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_HOMEWORK_LIST_EXCELLENT, {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object?.aaData ?? []) as any[];

  return result
    .map(
      (h) =>
        ({
          id: h.xszyid,
          baseId: h.zyid,
          title: decodeHTML(h.bt),
          url: URLS.LEARN_HOMEWORK_EXCELLENT_PAGE(h.wlkcid, h.xszyid),
          completionType: h.zywcfs,
          author: {
            id: h.cy?.split(' ')?.[0],
            name: h.cy?.split(' ')?.[1],
            anonymous: h.sfzm === YES,
          },
        }) satisfies IExcellentHomework,
    )
    .reduce<{ [id: string]: ExcellentHomework[] }>((acc, cur) => {
      if (!acc[cur.baseId]) {
        acc[cur.baseId] = [];
      }
      acc[cur.baseId].push(cur);
      return acc;
    }, {});
}

async function parseHomeworkAtUrl(s: Session, url: string): Promise<IHomeworkDetail> {
  const result = $(await s.fetchTextWithToken(url));

  const fileDivs = result('div.list.fujian.clearfix');

  return {
    description: trimAndDefine(result('div.list.calendar.clearfix > div.fl.right > div.c55').slice(0, 1).html()),
    answerContent: trimAndDefine(result('div.list.calendar.clearfix > div.fl.right > div.c55').slice(1, 2).html()),
    submittedContent: trimAndDefine($(result('div.boxbox').slice(1, 2).toArray())('div.right').slice(2, 3).html()),
    attachment: parseHomeworkFile(s, fileDivs[0]),
    answerAttachment: parseHomeworkFile(s, fileDivs[1]),
    submittedAttachment: parseHomeworkFile(s, fileDivs[2]),
    gradeAttachment: parseHomeworkFile(s, fileDivs[3]),
  };
}

/**
 * Get the detail of one homework or excellent homework: its page (answer, submitted content, attachments) and the
 * description JSON (which wins for `description`). 2 requests.
 */
export async function getHomeworkDetail(
  s: Session,
  homework: Pick<IHomework | IExcellentHomework, 'url' | 'baseId'>,
): Promise<IHomeworkDetail> {
  const [page, description] = await Promise.all([
    parseHomeworkAtUrl(s, homework.url),
    getHomeworkDescription(s, homework.baseId),
  ]);
  // the description JSON wins, but an empty one falls back to the page
  return { ...page, description: description.description ?? page.description };
}

async function getHomeworkDescription(s: Session, baseId: string): Promise<IHomeworkDetail> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_HOMEWORK_DETAIL, {
    method: 'POST',
    body: URLS.LEARN_HOMEWORK_DETAIL_FORM_DATA(baseId),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);
  return {
    description: trimAndDefine(json.msg),
  };
}

/** the attachment in one `div.list.fujian` block; `undefined` if the block is missing or has no link */
function parseHomeworkFile(s: Session, fileDiv: Element | undefined): RemoteFile | undefined {
  if (!fileDiv) return undefined;
  const fileNode = $(fileDiv)('.ftitle').children('a')[0] ?? $(fileDiv)('.fl').children('a')[0];
  const href = fileNode?.attribs.href;
  if (fileNode !== undefined && href) {
    const size = trimAndDefine($(fileDiv)('.fl > span[class^="color"]').first().text()) ?? '';
    const params = new URLSearchParams(href.split('?').slice(-1)[0]);
    const attachmentId = params.get('fileId')!;
    // so dirty here...
    let downloadUrl = URLS.LEARN_PREFIX + href;
    if (params.has('downloadUrl')) {
      downloadUrl = URLS.LEARN_PREFIX + params.get('downloadUrl')!;
    }
    return {
      id: attachmentId,
      name: (fileNode.children[0] as { data?: string } | undefined)?.data ?? '',
      downloadUrl,
      previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.HOMEWORK, attachmentId, CourseType.STUDENT, s.previewFirstPage),
      size,
    };
  } else {
    return undefined;
  }
}

export async function submitHomework(
  s: Session,
  id: string,
  content = '',
  attachment?: IHomeworkSubmitAttachment,
  removeAttachment = false,
): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_HOMEWORK_SUBMIT(), {
    method: 'POST',
    body: URLS.LEARN_HOMEWORK_SUBMIT_FORM_DATA(id, content, attachment, removeAttachment),
    // the response only starts after the whole upload, which can take longer than `requestTimeout`
    timeout: attachment ? 0 : undefined,
  });
  checkHomeworkSubmitResponse(json);
}

/**
 * The request `submitHomework` would send, for sending it with another HTTP client (e.g. one that reports upload
 * progress). Checks the session first (`ensureSession`: one request, and a login only if it has expired), as the
 * request is sent without the helper's re-login and retry. Read the answer with `checkHomeworkSubmitResponse`.
 */
export async function getHomeworkSubmitRequest(
  s: Session,
  id: string,
  content = '',
  attachment?: IHomeworkSubmitAttachment,
  removeAttachment = false,
): Promise<HomeworkSubmitRequest> {
  await s.ensureSession(URLS.LEARN_CURRENT_SEMESTER());
  return {
    url: addCSRFTokenToUrl(URLS.LEARN_HOMEWORK_SUBMIT(), s.csrfToken),
    body: URLS.LEARN_HOMEWORK_SUBMIT_FORM_DATA(id, content, attachment, removeAttachment),
  };
}

/**
 * Check the server's answer to a homework submission: its parsed JSON, or the body as text. Rejects with
 * `NOT_LOGGED_IN` for the login page of an expired session (which the server sends with status 200),
 * `INVALID_RESPONSE` for any other text that isn't JSON, and `OPERATION_FAILED` (with the answer in `extra`) unless
 * `result` is `'success'`.
 */
export function checkHomeworkSubmitResponse(body: unknown): void {
  let json = body;
  if (typeof body === 'string') {
    try {
      json = JSON.parse(body);
    } catch {
      throw apiError(
        looksLikeLoginPage(body) ? FailReason.NOT_LOGGED_IN : FailReason.INVALID_RESPONSE,
        body.slice(0, 200),
      );
    }
  }
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Plain text as the website's answer editor sends it: one `<p>` per line, with `&nbsp;` for an empty line, and `''`
 * for text that is only whitespace. The server replaces the submitted answer with what is sent, so send its HTML
 * as it is when the answer wasn't edited, to keep its formatting.
 */
export function homeworkContentHtml(text: string): string {
  if (!text.trim()) return '';
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${line.trim() ? line.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]) : '&nbsp;'}</p>`)
    .join('');
}
