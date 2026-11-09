// cheerio's main entry also exports its fetch/stream loaders, which import undici and node:stream and break React Native
// bundlers. `cheerio/slim` is only htmlparser2, which is what `{ xml: true }` parses with anyway.
import * as cheerio from 'cheerio/slim';
import { decodeHTML as _decodeHTML } from 'entities';

import type { ApiError, DetailSelector, Fetch } from './types.ts';
import { FailReason } from './types.ts';

const CHEERIO_CONFIG: cheerio.CheerioOptions = { xml: true };

/**
 * The error every API rejects with: a plain `{ reason, extra }` object (not an `Error`), so callers can compare
 * `reason` with `FailReason`. `extra` is left out when not given.
 */
export const apiError = (reason: FailReason, extra?: unknown): ApiError =>
  extra === undefined ? { reason } : { reason, extra };

/**
 * `promise`, but a `TypeError` it rejects with becomes `INVALID_RESPONSE` (with the error's text in `extra.error`):
 * a parser that reads a field of something the server left out, or sent in another shape, then rejects with an
 * `ApiError` like every other failure. The fetch's own `TypeError` is `NETWORK_ERROR` already.
 */
export const parsed = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((err: unknown) => {
    throw err instanceof TypeError ? apiError(FailReason.INVALID_RESPONSE, { error: String(err) }) : err;
  });

/** throw `apiError(reason, json)` unless the server's JSON answer says `result: 'success'` */
export function expectSuccess(json: any, reason: FailReason): void {
  if (json?.result !== 'success') throw apiError(reason, json);
}

/** a DOM element as cheerio's selections hold it (domhandler's `Element`, taken from cheerio's types so it always matches) */
export type Element = ReturnType<ReturnType<cheerio.CheerioAPI['root']>['children']>[number];

/** load an HTML page or fragment for querying */
export const $ = (html: Parameters<typeof cheerio.load>[0]): cheerio.CheerioAPI => cheerio.load(html, CHEERIO_CONFIG);

/** what the server writes for "yes" in its flags (and 否 for "no") */
export const YES = '是';

/** the URL of a `fetch` input */
export const urlOf = (input: Parameters<Fetch>[0]): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/** pages longer than this are taken as real pages, never as the short login / redirect page of an expired session */
const MAX_LOGIN_PAGE_LENGTH = 4096;

/**
 * Whether a 200 page is the short login or redirect page of an expired session rather than the page asked for: short,
 * and either Web Learning's "login timeout" page (what the server sends for an HTML page of an expired session, in
 * either website language: title 登录超时, image `log_fail.png`, text 您未登录或登录失效) or a page pointing at the
 * login timeout page or the SSO login.
 */
export const looksLikeLoginPage = (text: string) =>
  text.length < MAX_LOGIN_PAGE_LENGTH &&
  /登录超时|您未登录或登录失效|log_fail\.png|login_timeout|id\.tsinghua\.edu\.cn\/do\/off\/ui\/auth\/login|j_spring_security_thauth_roaming_entry/.test(
    text,
  );

export function decodeHTML(html: string): string {
  const text = _decodeHTML(html ?? '');
  // remove strange prefixes returned by web learning
  return text.startsWith('\xC2\x9E\xC3\xA9\x65')
    ? text.slice(5)
    : text.startsWith('\x9E\xE9\x65')
      ? text.slice(3)
      : text.startsWith('\xE9\x65')
        ? text.slice(2)
        : text;
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * A server time as an ISO 8601 string in Beijing time with its offset, e.g. `2026-11-07T18:28:00+08:00`. The server
 * sends either a Unix timestamp (a number or a string of digits; milliseconds, or seconds for a 10-digit value such as
 * a favorite's pin time) or a Beijing wall-clock time without a zone (`2026-11-07 18:28`, `2026-11-07 18:28:00`).
 * `undefined` for a missing or empty value, or a timestamp that is 0, negative or out of range; a string in any other
 * shape is returned as it is, so nothing the server sent is lost.
 */
export function toServerTime(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d{10,}$/.test(value))) {
    const number = Number(value);
    // 0 (or less) is the server's "no time", e.g. a homework without a late submission deadline
    if (!Number.isFinite(number) || number <= 0) return undefined;
    // seconds until the year 5138, milliseconds after 1973
    const date = new Date((number < 1e11 ? number * 1000 : number) + BEIJING_OFFSET_MS);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().replace(/(\.\d{3})?Z$/, '+08:00');
  }
  if (typeof value !== 'string') return undefined;
  const wallClock = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(?:\.\d+)?$/.exec(value.trim());
  return wallClock ? `${wallClock[1]}T${wallClock[2]}${wallClock[3] ?? ':00'}+08:00` : value;
}

/** `toServerTime` for a time every item has; '' when the server left it out */
export const toRequiredServerTime = (value: unknown): string => toServerTime(value) ?? '';

export function trimAndDefine(text: string | undefined | null): string | undefined {
  if (text === undefined || text === null) {
    return undefined;
  }
  const trimmed = text.trim();
  return trimmed === '' ? undefined : decodeHTML(trimmed);
}

export const JSONP_EXTRACTOR_NAME = 'thu_learn_lib_jsonp_extractor';

/**
 * The argument of a `thu_learn_lib_jsonp_extractor(...)` JSONP body, parsed as JSON. The body is never run as code,
 * so whatever the registrar (or anything between) sends can't execute in the app.
 */
export function extractJSONPResult(jsonp: string): unknown {
  const prefix = `${JSONP_EXTRACTOR_NAME}(`;
  const body = jsonp.trim().replace(/;$/, '').trimEnd();
  if (!body.startsWith(prefix) || !body.endsWith(')')) {
    throw apiError(FailReason.INVALID_RESPONSE, jsonp.slice(0, 200));
  }
  try {
    return JSON.parse(body.slice(prefix.length, -1));
  } catch (err) {
    throw apiError(FailReason.INVALID_RESPONSE, { error: String(err), text: jsonp.slice(0, 200) });
  }
}

export function formatFileSize(size: number): string {
  // this logic is extracted from `judgeSize` function from Web Learning
  if (size < 1024) return size + 'B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + 'K';
  if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + 'M';
  return (size / 1024 / 1024 / 1024).toFixed(2) + 'G';
}

/** whether `item` is selected by a `DetailSelector` (`undefined` means `'none'`) */
export const isSelected = <T>(selector: DetailSelector<T> | undefined, item: T): boolean =>
  selector === 'all' || (typeof selector === 'function' && selector(item));

/** a 0 / 1 flag, which the server sends as a number, a string or (in older answers) a boolean */
export const isSet = (flag: unknown): boolean => flag === true || Number(flag) === 1;

/** a count or size, which the server sends as a number or a string */
export const toNumber = (value: unknown): number => Number(value ?? 0) || 0;

/** `isFavorite` (`sfsc`) and `comment` (`bznr`), which every list item carries */
export const favoriteFields = (raw: { sfsc?: unknown; bznr?: unknown }): { isFavorite: boolean; comment?: string } => ({
  isFavorite: raw.sfsc === YES,
  comment: typeof raw.bznr === 'string' ? raw.bznr : undefined,
});
