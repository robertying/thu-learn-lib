// Homework (课程作业), excellent homework and homework submission.

import type { Element } from 'cheerio';
import { Base64 } from 'js-base64';

import type { Session } from './request.ts';
import { $, YES } from './request.ts';
import type {
  ApiError,
  ExcellentHomework,
  Homework,
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
import { GRADE_LEVEL_MAP, decodeHTML, trimAndDefine } from './utils.ts';

/** Get all homeworks （课程作业） of the specified course. */
export function getHomeworkList(s: Session, courseID: string): Promise<Homework[]>;

export function getHomeworkList(s: Session, courseID: string, courseType: CourseType.STUDENT): Promise<Homework[]>;

export function getHomeworkList(s: Session, courseID: string, courseType: CourseType.TEACHER): Promise<HomeworkTA[]>;

export async function getHomeworkList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<Homework[] | HomeworkTA[]> {
  if (courseType === CourseType.TEACHER) {
    const json = await (
      await s.fetchWithToken(URLS.LEARN_HOMEWORK_LIST_TEACHER, {
        method: 'POST',
        body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
      })
    ).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json,
      });
    }

    const result = (json.object?.aaData ?? []) as any[];

    return result.map(
      (d) =>
        ({
          id: d.zyid,
          index: d.wz,
          title: decodeHTML(d.bt),
          description: decodeHTML(Base64.decode(d.nr)),
          publisherId: d.fbr,
          publishTime: d.fbsj,
          startTime: d.kssj,
          deadline: d.jzsj,
          lateSubmissionDeadline: d.bjjzsj ?? undefined,
          url: URLS.LEARN_HOMEWORK_DETAIL_TEACHER(courseID, d.zyid),
          completionType: d.zywcfs,
          submissionType: d.zytjfs,
          gradedCount: d.ypys,
          submittedCount: d.yjs,
          unsubmittedCount: d.wjs,
        }) satisfies HomeworkTA,
    );
  } else {
    return Promise.all(
      URLS.LEARN_HOMEWORK_LIST_SOURCE.map((source) => getHomeworkListAtUrl(s, courseID, source.url, source.status)),
    ).then((r) => r.flat());
  }
}

async function getHomeworkListAtUrl(
  s: Session,
  courseID: string,
  url: string,
  status: IHomeworkStatus,
): Promise<Homework[]> {
  const json = await (
    await s.fetchWithToken(url, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  const result = (json.object?.aaData ?? []) as any[];

  let excellentHomeworkListByHomework: { [id: string]: ExcellentHomework[] } = {};
  try {
    excellentHomeworkListByHomework = await getExcellentHomeworkListByHomework(s, courseID);
  } catch (e) {
    // Don't block the whole process if excellent homework list cannot be fetched
  }

  return Promise.all(
    result
      .map(
        (h) =>
          ({
            id: h.xszyid,
            studentHomeworkId: h.xszyid,
            baseId: h.zyid,
            title: decodeHTML(h.bt),
            url: URLS.LEARN_HOMEWORK_PAGE(h.wlkcid, h.xszyid),
            deadline: h.jzsj,
            lateSubmissionDeadline: h.bjjzsj ? h.bjjzsj : undefined,
            isLateSubmission: h.sfbj === YES,
            completionType: h.zywcfs,
            submissionType: h.zytjfs,
            submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE(h.wlkcid, h.xszyid),
            submitTime: h.scsj === null ? undefined : h.scsj,
            grade: h.cj === null ? undefined : h.cj,
            gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
            graderName: trimAndDefine(h.jsm),
            gradeContent: trimAndDefine(h.pynr),
            gradeTime: h.pysj === null ? undefined : h.pysj,
            isFavorite: h.sfsc === YES,
            favoriteTime: h.scsj === null || h.sfsc !== YES ? undefined : h.scsj,
            comment: h.bznr ?? undefined,
            excellentHomeworkList: excellentHomeworkListByHomework[h.zyid],
            ...status,
          }) satisfies IHomework,
      )
      .map(
        async (h) =>
          ({
            ...h,
            ...(await parseHomeworkAtUrl(s, h.url)),
            ...(await getHomeworkDetail(s, h.baseId)),
          }) satisfies Homework,
      ),
  );
}

async function getExcellentHomeworkListByHomework(
  s: Session,
  courseID: string,
): Promise<{ [id: string]: ExcellentHomework[] }> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_HOMEWORK_LIST_EXCELLENT, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  const result = (json.object?.aaData ?? []) as any[];

  return (
    await Promise.all(
      result
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
        .map(
          async (h) =>
            ({
              ...h,
              ...(await parseHomeworkAtUrl(s, h.url)),
              ...(await getHomeworkDetail(s, h.baseId)),
            }) satisfies ExcellentHomework,
        ),
    )
  ).reduce<{ [id: string]: ExcellentHomework[] }>((acc, cur) => {
    if (!acc[cur.baseId]) {
      acc[cur.baseId] = [];
    }
    acc[cur.baseId].push(cur);
    return acc;
  }, {});
}

async function parseHomeworkAtUrl(s: Session, url: string): Promise<IHomeworkDetail> {
  const response = await s.fetchWithToken(url);
  const result = $(await response.text());

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

async function getHomeworkDetail(s: Session, baseId: string): Promise<IHomeworkDetail> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_HOMEWORK_DETAIL, {
      method: 'POST',
      body: URLS.LEARN_HOMEWORK_DETAIL_FORM_DATA(baseId),
    })
  ).json();
  if (json.result !== 'success') {
    throw {
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    } as ApiError;
  }
  return {
    description: trimAndDefine(json.msg),
  };
}

function parseHomeworkFile(s: Session, fileDiv: Element): RemoteFile | undefined {
  const fileNode = $(fileDiv)('.ftitle').children('a')[0] ?? $(fileDiv)('.fl').children('a')[0];
  if (fileNode !== undefined) {
    const size = trimAndDefine($(fileDiv)('.fl > span[class^="color"]').first().text())!;
    const params = new URLSearchParams(fileNode.attribs.href.split('?').slice(-1)[0]);
    const attachmentId = params.get('fileId')!;
    // so dirty here...
    let downloadUrl = URLS.LEARN_PREFIX + fileNode.attribs.href;
    if (params.has('downloadUrl')) {
      downloadUrl = URLS.LEARN_PREFIX + params.get('downloadUrl')!;
    }
    return {
      id: attachmentId,
      name: (fileNode.children[0] as { data: string }).data,
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
  const json = await (
    await s.fetchWithToken(URLS.LEARN_HOMEWORK_SUBMIT(), {
      method: 'POST',
      body: URLS.LEARN_HOMEWORK_SUBMIT_FORM_DATA(id, content, attachment, removeAttachment),
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}
