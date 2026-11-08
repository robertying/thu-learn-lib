// Course notifications (课程公告).

import { Base64 } from 'js-base64';

import type { Session } from './request.ts';
import { $, YES } from './request.ts';
import type { INotification, INotificationDetail, Notification } from './types.ts';
import { ContentType, CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { decodeHTML, trimAndDefine } from './utils.ts';

/** Get all notifications （课程公告） of the specified course. */
export async function getNotificationList(
  s: Session,
  courseID: string,
  courseType: CourseType = CourseType.STUDENT,
): Promise<Notification[]> {
  return Promise.all([
    getNotificationListKind(s, courseID, courseType, false),
    getNotificationListKind(s, courseID, courseType, true),
  ]).then((r) => r.flat());
}

async function getNotificationListKind(
  s: Session,
  courseID: string,
  courseType: CourseType,
  expired: boolean,
): Promise<Notification[]> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_NOTIFICATION_LIST(courseType, expired), {
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

  const result = (json.object?.aaData ?? json.object?.resultsList ?? []) as any[];

  return Promise.all(
    result.map(async (n) => {
      const notification: INotification = {
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
      };
      let detail: INotificationDetail = {};
      const attachmentName = courseType === CourseType.STUDENT ? n.fjmc : n.fjbt;
      if (attachmentName) {
        detail = await parseNotificationDetail(s, courseID, notification.id, courseType, attachmentName);
      }
      return { ...notification, ...detail } satisfies Notification;
    }),
  );
}

async function parseNotificationDetail(
  s: Session,
  courseID: string,
  id: string,
  courseType: CourseType,
  attachmentName: string,
): Promise<INotificationDetail> {
  /// from JSON (backup, currently not used)
  // const postParams = new FormData();
  // postParams.append('id', id);
  // postParams.append('wlkcid', courseID);
  // const metadata = await (await s.fetchWithToken(URL.LEARN_NOTIFICATION_EDIT(courseType), {
  //   'method': 'POST',
  //   'body': postParams,
  // })).json();
  // const attachmentId = metadata.ggfjid as string;
  /// parsed from HTML
  const response = await s.fetchWithToken(URLS.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
  const result = $(await response.text());
  let path = '';
  if (courseType === CourseType.STUDENT) {
    path = result('.ml-10').attr('href')!;
  } else {
    path = result('#wjid').attr('href')!;
  }
  const size = trimAndDefine(result('div#attachment > div.fl > span[class^="color"]').first().text())!;
  const params = new URLSearchParams(path.split('?').slice(-1)[0]);
  const attachmentId = params.get('wjid')!;
  if (!path.startsWith(URLS.LEARN_PREFIX)) {
    path = URLS.LEARN_PREFIX + path;
  }
  return {
    attachment: {
      name: attachmentName,
      id: attachmentId,
      downloadUrl: path,
      previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.NOTIFICATION, attachmentId, courseType, s.previewFirstPage),
      size,
    },
  };
}
