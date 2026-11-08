// Course notifications (课程公告).

import { Base64 } from 'js-base64';

import type { Session } from './request.ts';
import { $, YES } from './request.ts';
import type { INotification, Notification, NotificationListOptions, RemoteFile } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { decodeHTML, isSelected, trimAndDefine } from './utils.ts';

/**
 * Get all notifications （课程公告） of the specified course: current and expired lists.
 * Attachments only for the notices `options.attachments` selects.
 */
export async function getNotificationList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
  options: NotificationListOptions = {},
): Promise<Notification[]> {
  const lists = await Promise.all([
    getNotificationListKind(s, courseID, courseType, false),
    getNotificationListKind(s, courseID, courseType, true),
  ]);
  return Promise.all(
    lists.flat().map(async (n): Promise<Notification> => {
      if (!n.attachmentName || !isSelected(options.attachments, n)) return n;
      return { ...n, attachment: await getNotificationAttachment(s, n, courseType) };
    }),
  );
}

async function getNotificationListKind(
  s: Session,
  courseID: string,
  courseType: CourseType,
  expired: boolean,
): Promise<INotification[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_NOTIFICATION_LIST(courseType, expired), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }

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
      markedImportant: Number(n.sfqd) === 1, // n.sfqd could be string '1' (teacher mode) or number 1 (student mode)
      publishTime: n.fbsj && typeof n.fbsj === 'string' ? n.fbsj : n.fbsjStr,
      expireTime: n.jzsj ?? undefined,
      isFavorite: n.sfsc === YES,
      comment: n.bznr ?? undefined,
      attachmentName: typeof attachmentName === 'string' && attachmentName ? attachmentName : undefined,
    } satisfies INotification;
  });
}

/**
 * Get the attachment of a notice from its detail page (1 request), or `undefined` without a request if
 * `attachmentName` says it has none, or if the page has no attachment link.
 */
export async function getNotificationAttachment(
  s: Session,
  notification: Pick<INotification, 'url' | 'attachmentName'>,
  courseType: CourseType = CourseType.STUDENT,
): Promise<RemoteFile | undefined> {
  if (!notification.attachmentName) return undefined;
  /// from JSON (backup, currently not used)
  // const postParams = new FormData();
  // postParams.append('id', id);
  // postParams.append('wlkcid', courseID);
  // const metadata = await s.fetchJsonWithToken(URL.LEARN_NOTIFICATION_EDIT(courseType), {
  //   'method': 'POST',
  //   'body': postParams,
  // });
  // const attachmentId = metadata.ggfjid as string;
  /// parsed from HTML
  const result = $(await s.fetchTextWithToken(notification.url));
  let path = (courseType === CourseType.STUDENT ? result('.ml-10') : result('#wjid')).attr('href');
  // the page has no attachment link (removed since the list was fetched, or the page changed)
  if (!path) return undefined;
  const size = trimAndDefine(result('div#attachment > div.fl > span[class^="color"]').first().text()) ?? '';
  const params = new URLSearchParams(path.split('?').slice(-1)[0]);
  const attachmentId = params.get('wjid')!;
  if (!path.startsWith(URLS.LEARN_PREFIX)) {
    path = URLS.LEARN_PREFIX + path;
  }
  return {
    name: notification.attachmentName,
    id: attachmentId,
    downloadUrl: path,
    previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.NOTIFICATION, attachmentId, courseType, s.previewFirstPage),
    size,
  };
}
