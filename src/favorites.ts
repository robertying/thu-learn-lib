// Favorites (收藏) and comments (备注).

import type { Session } from './request.ts';
import { YES } from './request.ts';
import type { CommentItem, FavoriteItem } from './types.ts';
import { ContentType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { CONTENT_TYPE_MAP_REVERSE, decodeHTML } from './utils.ts';

/**
 * Add an item to favorites. (收藏)
 */
export async function addToFavorites(s: Session, type: ContentType, id: string): Promise<void> {
  const json = await (await s.fetchWithToken(URLS.LEARN_FAVORITE_ADD(type, id))).json();
  if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}

/**
 * Remove an item from favorites. (取消收藏)
 */
export async function removeFromFavorites(s: Session, id: string): Promise<void> {
  const json = await (await s.fetchWithToken(URLS.LEARN_FAVORITE_REMOVE(id))).json();
  if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}

/**
 * Get favorites. (我的收藏)
 * If `courseID` or `type` is specified, only return favorites of that course or type.
 */
export async function getFavorites(s: Session, courseID?: string, type?: ContentType): Promise<FavoriteItem[]> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_FAVORITE_LIST(type), {
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
  return result
    .map((e): FavoriteItem | undefined => {
      const itemType = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!itemType) return undefined; // ignore unknown type
      return {
        id: e.ywid,
        type: itemType,
        title: decodeHTML(e.ywbt),
        time: itemType === ContentType.DISCUSSION || itemType === ContentType.QUESTION ? e.tlsj : e.ywsj,
        state: e.ywzt,
        extra: e.ywbz ?? undefined,
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        pinned: e.sfzd === YES,
        pinnedTime: e.zdsj === null ? undefined : e.zdsj, // Note: this field is originally unix timestamp instead of string
        comment: e.bznr ?? undefined,
        addedTime: e.scsj,
        itemId: e.id,
      } satisfies FavoriteItem;
    })
    .filter((x) => !!x);
}

/**
 * Pin a favorite item. (置顶)
 */
export async function pinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_FAVORITE_PIN, {
      method: 'POST',
      body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}

/**
 * Unpin a favorite item. (取消置顶)
 */
export async function unpinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_FAVORITE_UNPIN, {
      method: 'POST',
      body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}

/**
 * Set a comment. (备注)
 * Set an empty string to remove the comment.
 */
export async function setComment(s: Session, type: ContentType, id: string, content: string): Promise<void> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_COMMENT_SET, {
      method: 'POST',
      body: URLS.LEARN_COMMENT_SET_FORM_DATA(type, id, content),
    })
  ).json();
  if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}

/**
 * Get comments. (我的备注)
 * If `courseID` or `type` is specified, only return favorites of that course or type.
 */
export async function getComments(s: Session, courseID?: string, type?: ContentType): Promise<CommentItem[]> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_COMMENT_LIST(type), {
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
  return result
    .map((e): CommentItem | undefined => {
      const itemType = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!itemType) return undefined; // ignore unknown type
      return {
        id: e.ywid,
        type: itemType,
        content: e.bt,
        contentHTML: decodeHTML(e.bznrstring),
        title: decodeHTML(e.ywbt),
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        commentTime: e.cjsj,
        itemId: e.id,
      } satisfies CommentItem;
    })
    .filter((x) => !!x);
}
