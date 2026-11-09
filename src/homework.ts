// Homework (课程作业), excellent homework and homework submission.

import { Base64 } from 'js-base64';

import { attachmentOf } from './attachments.ts';
import type { Session } from './request.ts';
import { addCSRFTokenToUrl } from './request.ts';
import type {
  ExcellentHomework,
  ExcellentHomeworkBase,
  Homework,
  HomeworkBase,
  HomeworkDetail,
  HomeworkListOptions,
  HomeworkStatus,
  HomeworkSubmitOptions,
  HomeworkSubmitRequest,
  HomeworkTA,
  RemoteFile,
} from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { GRADE_LEVEL_MAP } from './codes.ts';
import {
  $,
  YES,
  apiError,
  decodeHTML,
  favoriteFields,
  expectSuccess,
  isSelected,
  looksLikeLoginPage,
  toRequiredServerTime,
  toServerTime,
  trimAndDefine,
} from './utils.ts';
import type { Element } from './utils.ts';

/** the student homework lists, by submission status */
export const HOMEWORK_LIST_SOURCES: readonly { url: string; status: HomeworkStatus }[] = [
  { url: URLS.LEARN_HOMEWORK_LIST_NEW, status: { submitted: false, graded: false } },
  { url: URLS.LEARN_HOMEWORK_LIST_SUBMITTED, status: { submitted: true, graded: false } },
  { url: URLS.LEARN_HOMEWORK_LIST_GRADED, status: { submitted: true, graded: true } },
];

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
  return courseType === CourseType.TEACHER
    ? getTeacherHomeworkList(s, courseID)
    : getStudentHomeworkList(s, courseID, options);
}

async function getTeacherHomeworkList(s: Session, courseID: string): Promise<HomeworkTA[]> {
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
}

async function getStudentHomeworkList(s: Session, courseID: string, options: HomeworkListOptions): Promise<Homework[]> {
  const [lists, excellentHomeworkListByHomework] = await Promise.all([
    Promise.all(HOMEWORK_LIST_SOURCES.map((source) => getHomeworkListAtUrl(s, courseID, source.url, source.status))),
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

async function getHomeworkListAtUrl(
  s: Session,
  courseID: string,
  url: string,
  status: HomeworkStatus,
): Promise<HomeworkBase[]> {
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
        // a grade level comes as a negative grade; then `grade` is left out
        grade: h.cj == null || GRADE_LEVEL_MAP.has(h.cj) ? undefined : h.cj,
        gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
        graderName: trimAndDefine(h.jsm),
        gradeContent: trimAndDefine(h.pynr),
        gradeTime: toServerTime(h.pysj),
        ...favoriteFields(h),
        ...status,
      }) satisfies HomeworkBase,
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
        }) satisfies ExcellentHomeworkBase,
    )
    .reduce<{ [id: string]: ExcellentHomework[] }>((acc, cur) => {
      if (!acc[cur.baseId]) {
        acc[cur.baseId] = [];
      }
      acc[cur.baseId].push(cur);
      return acc;
    }, {});
}

async function parseHomeworkAtUrl(s: Session, url: string): Promise<HomeworkDetail> {
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
  homework: Pick<HomeworkBase | ExcellentHomeworkBase, 'url' | 'baseId'>,
): Promise<HomeworkDetail> {
  const [page, description] = await Promise.all([
    parseHomeworkAtUrl(s, homework.url),
    getHomeworkDescription(s, homework.baseId),
  ]);
  // the description JSON wins, but an empty one falls back to the page
  return { ...page, description: description.description ?? page.description };
}

async function getHomeworkDescription(s: Session, baseId: string): Promise<HomeworkDetail> {
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
  const block = $(fileDiv);
  const title = block('.ftitle').children('a').first();
  const link = title.length > 0 ? title : block('.fl').children('a').first();
  const href = link.attr('href');
  if (!href) return undefined;
  return attachmentOf(s, {
    href,
    idParam: 'fileId',
    name: link.text().trim(),
    size: trimAndDefine(block('.fl > span[class^="color"]').first().text()) ?? '',
    type: ContentType.HOMEWORK,
    courseType: CourseType.STUDENT,
  });
}

export async function submitHomework(s: Session, id: string, options: HomeworkSubmitOptions = {}): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_HOMEWORK_SUBMIT, {
    method: 'POST',
    body: homeworkSubmitForm(id, options),
    // the response only starts after the whole upload, which can take longer than `requestTimeout`
    timeout: options.attachment ? 0 : undefined,
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
  options: HomeworkSubmitOptions = {},
): Promise<HomeworkSubmitRequest> {
  await s.ensureSession(URLS.LEARN_CURRENT_SEMESTER);
  return {
    url: addCSRFTokenToUrl(URLS.LEARN_HOMEWORK_SUBMIT, s.csrfToken),
    body: homeworkSubmitForm(id, options),
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

/**
 * The form the website's submit page sends (`fileUploadProgress` in `/res/js/common/myApp.js`): `fileupload` is the
 * picked file, or the text "undefined" when none is picked (it appends `files[0]` as is); `zynr` is the whole current
 * answer as HTML from its editor, sent every time (also when only the attachment changes); `isDeleted` is "1" when the
 * existing attachment is deleted, and then the server ignores `zynr` (the submitted answer stays).
 */
export const homeworkSubmitForm = (
  id: string,
  { content = '', attachment, removeAttachment = false }: HomeworkSubmitOptions = {},
) => {
  const form = new FormData();
  form.append('xszyid', id);
  form.append('zynr', content);
  if (!attachment) form.append('fileupload', 'undefined');
  else if (attachment.content instanceof Blob) form.append('fileupload', attachment.content, attachment.filename);
  else {
    // React Native's FormData reads a file from an object with its uri, name and type
    const { uri, type } = attachment.content;
    form.append('fileupload', { uri, name: attachment.filename, type: type || 'application/octet-stream' } as any);
  }
  if (removeAttachment) form.append('isDeleted', '1');
  else form.append('isDeleted', '0');
  return form;
};

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
