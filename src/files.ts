// Course files (课程文件) and file categories.

import type { Session } from './request.ts';
import type { File, FileCategory } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { decodeHTML, formatFileSize } from './utils.ts';

/** Get all files （课程文件） of the specified course. */
export async function getFileList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<File[]> {
  const json = await (await s.fetchWithToken(URLS.LEARN_FILE_LIST(courseID, courseType))).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  let result: any[] = [];
  if (Array.isArray(json.object?.resultsList)) {
    // teacher
    result = json.object.resultsList;
  } else if (Array.isArray(json.object)) {
    // student
    result = json.object;
  }

  const categories = new Map((await getFileCategoryList(s, courseID, courseType)).map((c) => [c.id, c]));

  return result.map((f) => {
    const title = decodeHTML(f.bt);
    const fileId = f.wjid;
    const uploadTime = f.scsj;
    const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
    const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, s.previewFirstPage);
    return {
      id: f.kjxxid,
      fileId,
      category: categories.get(f.kjflid),
      title,
      description: decodeHTML(f.ms),
      rawSize: f.wjdx,
      size: f.fileSize,
      uploadTime,
      publishTime: uploadTime,
      downloadUrl,
      previewUrl,
      isNew: f.isNew ?? false,
      markedImportant: f.sfqd === 1,
      visitCount: f.xsllcs ?? f.llcs ?? 0,
      downloadCount: f.xzcs ?? 0,
      fileType: f.wjlx,
      remoteFile: {
        id: fileId,
        name: title,
        downloadUrl,
        previewUrl,
        size: f.fileSize,
      },
    } satisfies File;
  });
}

/** Get file categories of the specified course. */
export async function getFileCategoryList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<FileCategory[]> {
  const json = await (await s.fetchWithToken(URLS.LEARN_FILE_CATEGORY_LIST(courseID, courseType))).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

  const result = (json.object?.rows ?? []) as any[];

  return result.map(
    (c) =>
      ({
        id: c.kjflid,
        title: decodeHTML(c.bt),
        creationTime: c.czsj,
      }) satisfies FileCategory,
  );
}

/**
 * Get all files of the specified category of the specified course.
 * Note: this cannot get correct `visitCount` and `downloadCount` for student
 */
export async function getFileListByCategory(
  s: Session,
  courseID: string,
  categoryId: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<File[]> {
  if (courseType === CourseType.STUDENT) {
    const json = await (await s.fetchWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT(courseID, categoryId))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json,
      });
    }

    const result = (json.object ?? []) as any[];

    return result.map((f) => {
      const fileId = f[7];
      const title = decodeHTML(f[1]);
      const rawSize = f[9];
      const size = formatFileSize(rawSize);
      const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
      const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, s.previewFirstPage);
      return {
        id: f[0],
        fileId,
        title,
        description: decodeHTML(f[5]),
        rawSize,
        size,
        uploadTime: f[6],
        publishTime: f[10],
        downloadUrl,
        previewUrl,
        isNew: f[8] === 1,
        markedImportant: f[2] === 1,
        visitCount: 0,
        downloadCount: 0,
        fileType: f[13],
        remoteFile: {
          id: fileId,
          name: title,
          downloadUrl,
          previewUrl,
          size,
        },
        isFavorite: f[11],
        comment: f[14] ?? undefined,
      } satisfies File;
    });
  } else {
    const json = await (
      await s.fetchWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER, {
        method: 'POST',
        body: URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA(courseID, categoryId),
      })
    ).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json,
      });
    }

    const result = (json.object.aaData ?? []) as any[];

    return result.map((f) => {
      const title = decodeHTML(f.bt);
      const fileId = f.wjid;
      const uploadTime = f.scsj;
      const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
      const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, s.previewFirstPage);
      return {
        id: f.kjxxid,
        fileId,
        title,
        description: decodeHTML(f.ms),
        rawSize: f.wjdx,
        size: f.fileSize,
        uploadTime,
        publishTime: uploadTime,
        downloadUrl,
        previewUrl,
        isNew: f.isNew ?? false,
        markedImportant: f.sfqd === 1,
        visitCount: f.xsllcs ?? f.llcs ?? 0,
        downloadCount: f.xzcs ?? 0,
        fileType: f.wjlx,
        remoteFile: {
          id: fileId,
          name: title,
          downloadUrl,
          previewUrl,
          size: f.fileSize,
        },
      } satisfies File;
    });
  }
}
