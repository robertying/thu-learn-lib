// Course notifications (课程公告).

import { Base64 } from 'js-base64';

import { attachmentOf } from './attachments.ts';
import type { Session } from './request.ts';
import type {
  CourseNotification,
  CourseNotificationBase,
  CourseTypeOptions,
  NotificationListOptions,
  RemoteFile,
} from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import {
  $,
  YES,
  decodeHTML,
  expectSuccess,
  favoriteFields,
  isSelected,
  isSet,
  toRequiredServerTime,
  toServerTime,
} from './utils.ts';

/**
 * Get all notifications （课程公告） of the specified course: current and expired lists.
 * Attachments only for the notices `options.attachments` selects.
 */
export async function getNotificationList(
  s: Session,
  courseID: string,
  options: NotificationListOptions = {},
): Promise<CourseNotification[]> {
  const { courseType = CourseType.STUDENT } = options;
  const lists = await Promise.all([
    getNotificationListKind(s, courseID, courseType, false),
    getNotificationListKind(s, courseID, courseType, true),
  ]);
  return Promise.all(
    lists.flat().map(async (n): Promise<CourseNotification> => {
      if (!n.attachmentName || !isSelected(options.attachments, n)) return n;
      return { ...n, attachment: await getNotificationAttachment(s, n, { courseType }) };
    }),
  );
}

async function getNotificationListKind(
  s: Session,
  courseID: string,
  courseType: CourseType,
  expired: boolean,
): Promise<CourseNotificationBase[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_NOTIFICATION_LIST(courseType, expired), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);

  const result = (json.object?.aaData ?? json.object?.resultsList ?? []) as any[];

  return result.map((n) => {
    const attachmentName: unknown = courseType === CourseType.STUDENT ? n.fjmc : n.fjbt;
    return {
      id: n.ggid,
      content: Base64.decode(n.ggnr ?? ''),
      title: decodeHTML(n.bt),
      url: URLS.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
      publisher: n.fbrxm,
      hasRead: n.sfyd === YES,
      markedImportant: isSet(n.sfqd), // string '1' for a teacher, number 1 for a student
      publishTime: toRequiredServerTime(n.fbsj && typeof n.fbsj === 'string' ? n.fbsj : n.fbsjStr),
      expireTime: toServerTime(n.jzsj),
      ...favoriteFields(n),
      attachmentName: typeof attachmentName === 'string' && attachmentName ? attachmentName : undefined,
    } satisfies CourseNotificationBase;
  });
}

/**
 * Mark a notice read (1 request): loads its page, as opening it on the website does. Rejects with `UNEXPECTED_STATUS`
 * for an unknown notice, and logs in again first when the session has expired.
 */
export async function markNotificationRead(
  s: Session,
  notification: Pick<CourseNotificationBase, 'url'>,
): Promise<void> {
  await s.fetchTextWithToken(notification.url);
}

/**
 * Get the attachment of a notice from its detail page (1 request), or `undefined` without a request if
 * `attachmentName` says it has none, or if the page has no attachment link.
 */
export async function getNotificationAttachment(
  s: Session,
  notification: Pick<CourseNotificationBase, 'url' | 'attachmentName'>,
  { courseType = CourseType.STUDENT }: CourseTypeOptions = {},
): Promise<RemoteFile | undefined> {
  if (!notification.attachmentName) return undefined;
  const result = $(await s.fetchTextWithToken(notification.url));
  const path = (courseType === CourseType.STUDENT ? result('.ml-10') : result('#wjid')).attr('href');
  // the page has no attachment link (removed since the list was fetched, or the page changed)
  if (!path) return undefined;
  return attachmentOf(s, {
    href: path,
    idParam: 'wjid',
    name: notification.attachmentName,
    size: result('div#attachment > div.fl > span[class^="color"]').first().text().trim(),
    type: ContentType.NOTIFICATION,
    courseType,
  });
}
