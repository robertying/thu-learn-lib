// Favorites (收藏) and comments (备注).

import type { Session } from './request.ts';
import type { CommentItem, FavoriteItem } from './types.ts';
import { ContentType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import {
  CONTENT_TYPE_MAP_REVERSE,
  YES,
  decodeHTML,
  expectSuccess,
  toRequiredServerTime,
  toServerTime,
} from './utils.ts';

/**
 * Add an item to favorites. (收藏)
 * `id` is the item's `id` (for a file, `CourseFile.id`, not `fileId`). Adding a favorite again keeps one; an id the
 * server doesn't know answers HTTP 500 (`UNEXPECTED_STATUS`).
 * Success is `result: 'success'`; the message is in the website's language ("收藏成功", "Added successfully.").
 */
export async function addToFavorites(s: Session, type: ContentType, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_ADD(type, id));
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

/**
 * Remove an item from favorites. (取消收藏)
 * Removing an item that isn't a favorite succeeds.
 */
export async function removeFromFavorites(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_REMOVE(id));
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

/**
 * Get favorites. (我的收藏)
 * If `courseID` or `type` is specified, only return favorites of that course or type.
 */
export async function getFavorites(s: Session, courseID?: string, type?: ContentType): Promise<FavoriteItem[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_LIST(type), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);
  const result = (json.object?.aaData ?? []) as any[];
  return result
    .map((e): FavoriteItem | undefined => {
      const itemType = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!itemType) return undefined; // ignore unknown type
      return {
        id: e.ywid,
        type: itemType,
        title: decodeHTML(e.ywbt),
        time: toRequiredServerTime(
          itemType === ContentType.DISCUSSION || itemType === ContentType.QUESTION ? e.tlsj : e.ywsj,
        ),
        state: e.ywzt,
        extra: e.ywbz ?? undefined,
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        pinned: e.sfzd === YES,
        pinnedTime: toServerTime(e.zdsj),
        comment: e.bznr ?? undefined,
        addedTime: toRequiredServerTime(e.scsj),
        itemId: e.id,
      } satisfies FavoriteItem;
    })
    .filter((x) => !!x);
}

/**
 * Pin a favorite item. (置顶)
 */
export async function pinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_PIN, {
    method: 'POST',
    body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

/**
 * Unpin a favorite item. (取消置顶)
 */
export async function unpinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_UNPIN, {
    method: 'POST',
    body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

/**
 * Set a comment. (备注)
 * Set an empty string to remove the comment.
 */
export async function setComment(s: Session, type: ContentType, id: string, content: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_COMMENT_SET, {
    method: 'POST',
    body: URLS.LEARN_COMMENT_SET_FORM_DATA(type, id, content),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

/**
 * Get comments. (我的备注)
 * If `courseID` or `type` is specified, only return favorites of that course or type.
 */
export async function getComments(s: Session, courseID?: string, type?: ContentType): Promise<CommentItem[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_COMMENT_LIST(type), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);
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
        commentTime: toRequiredServerTime(e.cjsj),
        itemId: e.id,
      } satisfies CommentItem;
    })
    .filter((x) => !!x);
}
