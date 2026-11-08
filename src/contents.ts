// One kind of content for many courses at once.

import type { Session } from './request.ts';
import type { AllContentsOptions, AllContentsResult, ContentTypeMap, CourseContent } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import { getAnsweredQuestionList, getDiscussionList } from './discussions.ts';
import { getFileList } from './files.ts';
import { getHomeworkList } from './homework.ts';
import { getNotificationList } from './notices.ts';
import { getQuestionnaireList } from './questionnaires.ts';

/**
 * Get certain type of content of all specified courses.
 * It wraps around the `getXXX` list functions; one course failing doesn't fail the others: its error is in `errors`.
 */
export async function getAllContents<T extends ContentType>(
  s: Session,
  courseIDs: string[],
  type: T,
  options: AllContentsOptions<T> = {},
): Promise<AllContentsResult<T>> {
  const courseType = options.courseType ?? CourseType.STUDENT;
  const fetchContentForCourse = (id: string): Promise<ContentTypeMap[T][]> => {
    switch (type) {
      case ContentType.NOTIFICATION:
        return getNotificationList(s, id, courseType, {
          attachments: (options as AllContentsOptions<ContentType.NOTIFICATION>).details,
        }) as Promise<ContentTypeMap[T][]>;
      case ContentType.FILE:
        return getFileList(s, id, courseType) as Promise<ContentTypeMap[T][]>;
      case ContentType.HOMEWORK:
        return getHomeworkList(s, id, CourseType.STUDENT, {
          details: (options as AllContentsOptions<ContentType.HOMEWORK>).details,
        }) as Promise<ContentTypeMap[T][]>;
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
  const errors: AllContentsResult<T>['errors'] = {};

  await Promise.all(
    courseIDs.map(async (id) => {
      try {
        contents[id] = await fetchContentForCourse(id);
      } catch (err) {
        errors[id] = err;
      }
    }),
  );

  return { contents, errors };
}
