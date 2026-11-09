// Course files (课程文件) and file categories.

import type { Session } from './request.ts';
import type { CourseFile, FileCategory } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { YES, decodeHTML, expectSuccess, formatFileSize, toRequiredServerTime } from './utils.ts';

/** Get all files （课程文件） of the specified course; `category` is left out if the categories can't be fetched. */
export async function getFileList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<CourseFile[]> {
  // categories only fill `category`; don't fail the whole list when they can't be fetched
  const [json, categoryList] = await Promise.all([
    s.fetchJsonWithToken(URLS.LEARN_FILE_LIST(courseID, courseType)),
    getFileCategoryList(s, courseID, courseType).catch((): FileCategory[] => []),
  ]);
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  let result: any[] = [];
  if (Array.isArray(json.object?.resultsList)) {
    // teacher
    result = json.object.resultsList;
  } else if (Array.isArray(json.object)) {
    // student
    result = json.object;
  }

  const categories = new Map(categoryList.map((c) => [c.id, c]));
  return result.map((f) => ({ ...parseFile(s, f, courseType), category: categories.get(f.kjflid) }));
}

/** a 0 / 1 flag, which the server sends as a number, a string or (in older answers) a boolean */
const isSet = (flag: unknown): boolean => flag === true || Number(flag) === 1;

/** a count or size, which the server sends as a number or a string */
const toNumber = (value: unknown): number => Number(value ?? 0) || 0;

/** a file of the object-shaped lists (`getFileList`, and `getFileListByCategory` for a teacher) */
function parseFile(s: Session, f: any, courseType: CourseType): CourseFile {
  const title = decodeHTML(f.bt);
  const fileId = f.wjid;
  const uploadTime = toRequiredServerTime(f.scsj);
  const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
  const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, s.previewFirstPage);
  return {
    id: f.kjxxid,
    fileId,
    title,
    description: decodeHTML(f.ms),
    rawSize: toNumber(f.wjdx),
    size: f.fileSize,
    uploadTime,
    publishTime: uploadTime,
    downloadUrl,
    previewUrl,
    isNew: isSet(f.isNew), // 1 / 0 for a student
    markedImportant: isSet(f.sfqd), // string '1' for a teacher, number 1 for a student
    visitCount: toNumber(f.xsllcs ?? f.llcs),
    downloadCount: toNumber(f.xzcs),
    fileType: f.wjlx,
    remoteFile: {
      id: fileId,
      name: title,
      downloadUrl,
      previewUrl,
      size: f.fileSize,
    },
  };
}

/** Get file categories of the specified course. */
export async function getFileCategoryList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<FileCategory[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FILE_CATEGORY_LIST(courseID, courseType));
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object?.rows ?? []) as any[];

  return result.map(
    (c) =>
      ({
        id: c.kjflid,
        title: decodeHTML(c.bt),
        creationTime: toRequiredServerTime(c.czsj),
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
): Promise<CourseFile[]> {
  return courseType === CourseType.STUDENT
    ? getStudentFileListByCategory(s, courseID, categoryId)
    : getTeacherFileListByCategory(s, courseID, categoryId);
}

/** the columns of a row of the student's file list of a category, which is an array instead of an object */
const COLUMN = {
  ID: 0,
  TITLE: 1,
  MARKED_IMPORTANT: 2,
  DESCRIPTION: 5,
  UPLOAD_TIME: 6,
  FILE_ID: 7,
  IS_NEW: 8,
  RAW_SIZE: 9,
  PUBLISH_TIME: 10,
  IS_FAVORITE: 11,
  FILE_TYPE: 13,
  COMMENT: 14,
} as const;

async function getStudentFileListByCategory(s: Session, courseID: string, categoryId: string): Promise<CourseFile[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT(courseID, categoryId));
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object ?? []) as any[][];

  return result.map((f) => {
    const fileId = f[COLUMN.FILE_ID];
    const title = decodeHTML(f[COLUMN.TITLE]);
    const rawSize = toNumber(f[COLUMN.RAW_SIZE]);
    const size = formatFileSize(rawSize);
    const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, CourseType.STUDENT);
    const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, CourseType.STUDENT, s.previewFirstPage);
    return {
      id: f[COLUMN.ID],
      fileId,
      title,
      description: decodeHTML(f[COLUMN.DESCRIPTION]),
      rawSize,
      size,
      uploadTime: toRequiredServerTime(f[COLUMN.UPLOAD_TIME]),
      publishTime: toRequiredServerTime(f[COLUMN.PUBLISH_TIME]),
      downloadUrl,
      previewUrl,
      isNew: isSet(f[COLUMN.IS_NEW]),
      markedImportant: isSet(f[COLUMN.MARKED_IMPORTANT]),
      // not in this list
      visitCount: 0,
      downloadCount: 0,
      fileType: f[COLUMN.FILE_TYPE],
      remoteFile: {
        id: fileId,
        name: title,
        downloadUrl,
        previewUrl,
        size,
      },
      isFavorite: f[COLUMN.IS_FAVORITE] === YES, // '是' / '否' like the other lists
      comment: f[COLUMN.COMMENT] ?? undefined,
    } satisfies CourseFile;
  });
}

async function getTeacherFileListByCategory(s: Session, courseID: string, categoryId: string): Promise<CourseFile[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER, {
    method: 'POST',
    body: URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA(courseID, categoryId),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object?.aaData ?? []) as any[];

  return result.map((f) => parseFile(s, f, CourseType.TEACHER));
}
