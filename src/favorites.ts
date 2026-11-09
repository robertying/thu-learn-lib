// Favorites (收藏) and comments (备注).

import type { Session } from './request.ts';
import type { CommentItem, FavoriteItem } from './types.ts';
import { ContentType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { contentTypeOfCode } from './codes.ts';
import { YES, decodeHTML, expectSuccess, toRequiredServerTime, toServerTime } from './utils.ts';

// The public docs are on `Learn2018Helper` (index.ts).

// success is `result: 'success'`; the message is in the website's language ("收藏成功", "Added successfully.")
export async function addToFavorites(s: Session, type: ContentType, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_ADD(type, id));
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

export async function removeFromFavorites(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_REMOVE(id));
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

export async function getFavorites(s: Session, courseID?: string, type?: ContentType): Promise<FavoriteItem[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_LIST(type), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);
  const result = (json.object?.aaData ?? []) as any[];
  return result
    .map((e): FavoriteItem | undefined => {
      const itemType = contentTypeOfCode(e.ywlx);
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

export async function pinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_PIN, {
    method: 'POST',
    body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

export async function unpinFavoriteItem(s: Session, id: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_FAVORITE_UNPIN, {
    method: 'POST',
    body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

export async function setComment(s: Session, type: ContentType, id: string, content: string): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_COMMENT_SET, {
    method: 'POST',
    body: URLS.LEARN_COMMENT_SET_FORM_DATA(type, id, content),
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}

export async function getComments(s: Session, courseID?: string, type?: ContentType): Promise<CommentItem[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_COMMENT_LIST(type), {
    method: 'POST',
    body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID),
  });
  expectSuccess(json, FailReason.INVALID_RESPONSE);
  const result = (json.object?.aaData ?? []) as any[];
  return result
    .map((e): CommentItem | undefined => {
      const itemType = contentTypeOfCode(e.ywlx);
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
