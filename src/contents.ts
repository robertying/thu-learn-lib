// One kind of content for many courses at once.

import type { Session } from './request.ts';
import type { ContentTypeMap, CourseContent } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import { getAnsweredQuestionList, getDiscussionList } from './discussions.ts';
import { getFileList } from './files.ts';
import { getHomeworkList } from './homework.ts';
import { getNotificationList } from './notices.ts';
import { getQuestionnaireList } from './questionnaires.ts';

/**
 * Get certain type of content of all specified courses.
 * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
 */
export async function getAllContents<T extends ContentType>(
  s: Session,
  courseIDs: string[],
  type: T,
  courseType: CourseType = CourseType.STUDENT,
  allowFailure = false,
) {
  const fetchContentForCourse = (id: string) => {
    switch (type) {
      case ContentType.NOTIFICATION:
        return getNotificationList(s, id, courseType) as Promise<ContentTypeMap[T][]>;
      case ContentType.FILE:
        return getFileList(s, id, courseType) as Promise<ContentTypeMap[T][]>;
      case ContentType.HOMEWORK:
        return getHomeworkList(s, id) as Promise<ContentTypeMap[T][]>;
      case ContentType.DISCUSSION:
        return getDiscussionList(s, id, courseType) as Promise<ContentTypeMap[T][]>;
      case ContentType.QUESTION:
        return getAnsweredQuestionList(s, id, courseType) as Promise<ContentTypeMap[T][]>;
      case ContentType.QUESTIONNAIRE:
        return getQuestionnaireList(s, id) as Promise<ContentTypeMap[T][]>;
      default:
        return Promise.reject({
          reason: FailReason.NOT_IMPLEMENTED,
          extra: 'Unknown content type',
        });
    }
  };

  const contents: CourseContent<T> = {};

  const results = await Promise.allSettled(
    courseIDs.map(async (id) => {
      contents[id] = await fetchContentForCourse(id);
    }),
  );

  if (!allowFailure) {
    for (const r of results) {
      if (r.status === 'rejected') {
        return Promise.reject({
          reason: FailReason.INVALID_RESPONSE,
          extra: {
            reason: r.reason,
          },
        });
      }
    }
  }

  return contents;
}
