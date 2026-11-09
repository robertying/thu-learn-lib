import * as cheerio from 'cheerio';
import type { Element } from 'cheerio';
import { decodeHTML as _decodeHTML } from 'entities';

import type { ApiError, DetailSelector, Fetch } from './types.ts';
import { ContentType, FailReason, HomeworkGradeLevel, QuestionnaireType, SemesterType } from './types.ts';

const CHEERIO_CONFIG: cheerio.CheerioOptions = { xml: true };

/**
 * The error every API rejects with: a plain `{ reason, extra }` object (not an `Error`), so callers can compare
 * `reason` with `FailReason`. `extra` is left out when not given.
 */
export const apiError = (reason: FailReason, extra?: unknown): ApiError =>
  extra === undefined ? { reason } : { reason, extra };

/** throw `apiError(reason, json)` unless the server's JSON answer says `result: 'success'` */
export function expectSuccess(json: any, reason: FailReason): void {
  if (json?.result !== 'success') throw apiError(reason, json);
}

/** load an HTML page or fragment for querying */
export const $ = (html: string | Element | Element[]): cheerio.CheerioAPI => cheerio.load(html, CHEERIO_CONFIG);

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

const SEMESTER_TYPES: Record<number, SemesterType> = {
  1: SemesterType.FALL,
  2: SemesterType.SPRING,
  3: SemesterType.SUMMER,
};

/** the semester type from the last digit of a semester id (`2024-2025-1`) */
export const parseSemesterType = (n: number): SemesterType => SEMESTER_TYPES[n] ?? SemesterType.UNKNOWN;

const CONTENT_TYPE_MK_MAP: Record<ContentType, string> = {
  [ContentType.NOTIFICATION]: 'kcgg',
  [ContentType.FILE]: 'kcwj',
  [ContentType.HOMEWORK]: 'kczy',
  [ContentType.DISCUSSION]: '',
  [ContentType.QUESTION]: '',
  [ContentType.QUESTIONNAIRE]: '',
};

export function getMkFromType(type: ContentType): string {
  return 'mk_' + CONTENT_TYPE_MK_MAP[type];
}

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

export const GRADE_LEVEL_MAP = new Map([
  [-100, HomeworkGradeLevel.CHECKED],
  [-99, HomeworkGradeLevel.A_PLUS],
  [-98, HomeworkGradeLevel.A],
  [-92, HomeworkGradeLevel.A_MINUS],
  [-87, HomeworkGradeLevel.B_PLUS],
  [-85, HomeworkGradeLevel.DISTINCTION],
  [-82, HomeworkGradeLevel.B],
  [-78, HomeworkGradeLevel.B_MINUS],
  [-74, HomeworkGradeLevel.C_PLUS],
  [-71, HomeworkGradeLevel.C],
  [-68, HomeworkGradeLevel.C_MINUS],
  [-67, HomeworkGradeLevel.G],
  [-66, HomeworkGradeLevel.D_PLUS],
  [-64, HomeworkGradeLevel.D],
  [-65, HomeworkGradeLevel.EXEMPTED_COURSE],
  [-63, HomeworkGradeLevel.P],
  [-62, HomeworkGradeLevel.EX],
  [-61, HomeworkGradeLevel.EXEMPTION],
  [-60, HomeworkGradeLevel.PASS],
  [-59, HomeworkGradeLevel.FAILURE],
  [-55, HomeworkGradeLevel.W],
  [-51, HomeworkGradeLevel.I],
  [-50, HomeworkGradeLevel.INCOMPLETE],
  [-31, HomeworkGradeLevel.NA],
  [-30, HomeworkGradeLevel.F],
]);

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

export const CONTENT_TYPE_MAP = new Map([
  [ContentType.NOTIFICATION, 'KCGG'],
  [ContentType.FILE, 'KCKJ'],
  [ContentType.HOMEWORK, 'KCZY'],
  [ContentType.DISCUSSION, 'KCTL'],
  [ContentType.QUESTION, 'KCDY'],
  [ContentType.QUESTIONNAIRE, 'KCWJ'],
  // omitted: 课表(KCKB)
]);
export const CONTENT_TYPE_MAP_REVERSE = new Map([...CONTENT_TYPE_MAP].map(([type, code]) => [code, type]));

export const QNR_TYPE_MAP = new Map([
  ['投票', QuestionnaireType.VOTE],
  ['填表', QuestionnaireType.FORM],
  ['问卷', QuestionnaireType.SURVEY],
]);

/** whether `item` is selected by a `DetailSelector` (`undefined` means `'none'`) */
export const isSelected = <T>(selector: DetailSelector<T> | undefined, item: T): boolean =>
  selector === 'all' || (typeof selector === 'function' && selector(item));
