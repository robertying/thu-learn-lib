// Course calendar from the registrar (academic.tsinghua.edu.cn).

import type { Session } from './request.ts';
import { $, addCSRFTokenToUrl } from './request.ts';
import type { ApiError, CalendarEvent, CalendarOptions, CalendarRange, CalendarResult } from './types.ts';
import { FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { JSONP_EXTRACTOR_NAME, extractJSONPResult } from './utils.ts';

/** The registrar often fails for ranges longer than about a month, so longer ranges are fetched in windows of this many days. */
export const CALENDAR_WINDOW_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;

/** after this many windows in a row time out, `getCalendar` gives up on the rest (they go to `failedRanges`) */
const MAX_CONSECUTIVE_TIMEOUTS = 2;

const isTimeout = (err: unknown) => (err as ApiError | undefined)?.reason === FailReason.REQUEST_TIMEOUT;

const parseDate = (date: string): number => {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(date);
  const time = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
  if (Number.isNaN(time) || formatDate(time) !== date) {
    throw new RangeError(`invalid date ${date}, expected yyyymmdd`);
  }
  return time;
};

const formatDate = (time: number): string => new Date(time).toISOString().slice(0, 10).replaceAll('-', '');

/** Split an inclusive yyyymmdd range into consecutive inclusive windows of at most `days` days. */
export function splitCalendarRange(startDate: string, endDate: string, days = CALENDAR_WINDOW_DAYS): CalendarRange[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const ranges: CalendarRange[] = [];
  for (let from = start; from <= end; from += days * DAY_MS) {
    const to = Math.min(from + (days - 1) * DAY_MS, end);
    ranges.push({ startDate: formatDate(from), endDate: formatDate(to) });
  }
  return ranges;
}

/**
 * Registrar requests skip the Web Learning login check: a 403 or login page from the registrar says nothing about the
 * Web Learning session, and logging in there again wouldn't renew the registrar ticket.
 */
const fetchRegistrar = (s: Session, url: string) => s.rawFetch(addCSRFTokenToUrl(url, s.csrfToken));

const FINGERPRINT_FIELDS = ['fingerPrint', 'fingerGenPrint', 'fingerGenPrint3'] as const;
const isFingerprintField = (name: string): name is (typeof FINGERPRINT_FIELDS)[number] =>
  (FINGERPRINT_FIELDS as readonly string[]).includes(name);

const registrarAuthError = (extra: unknown): ApiError => ({ reason: FailReason.ERROR_REGISTRAR_AUTH, extra });

/** an id.tsinghua.edu.cn login form (`/do/off/ui/auth/login/check`, `.../checkSingle`) */
const isIdLoginPage = (res: Response, page: string) =>
  res.url.startsWith(URLS.ID_PREFIX) || /action="[^"]*\/do\/off\/ui\/auth\/login\//.test(page);

/**
 * The body of a sign-in step, or '' when there is no text. The registrar's own pages are GBK, which React Native's
 * fetch can't decode: its `text()` then gives `undefined` instead of a string. Only id.tsinghua.edu.cn pages (UTF-8)
 * are looked into here, so an undecodable registrar page is as good as an empty one.
 */
const readText = async (res: Response): Promise<string> => {
  const text: unknown = await res.text();
  return typeof text === 'string' ? text : '';
};

/**
 * Sign in to the registrar with a Web Learning ticket.
 *
 * Off campus the registrar is only reachable through WebVPN (webvpn.tsinghua.edu.cn): the auth URL redirects there,
 * and WebVPN signs in through id.tsinghua.edu.cn OAuth. As the id.tsinghua.edu.cn session of the Web Learning login is
 * still there, id.tsinghua.edu.cn answers with a form (`#logined`) that a browser submits right away with its device
 * fingerprints. Submitting it answers with a page that links (by script) to the OAuth callback, which signs in to WebVPN
 * and redirects back to the auth URL, so following the link ends on the registrar.
 */
async function authenticateRegistrar(s: Session, ticket: string): Promise<void> {
  let res = await fetchRegistrar(s, URLS.REGISTRAR_AUTH(ticket));
  let page = await readText(res);

  const form = $(page)('form#logined');
  if (form.length > 0) {
    const fingerprints = s.fingerprints ?? (await s.provider?.());
    const data = new FormData();
    form.find('input[name]').each((_, input) => {
      const name = input.attribs.name;
      const known = isFingerprintField(name) ? fingerprints?.[name] : undefined;
      data.append(name, known ?? input.attribs.value ?? '');
    });
    const action = new URL(form.attr('action') ?? '', res.url || URLS.ID_PREFIX).href;
    const check = await s.rawFetch(action, { method: 'POST', body: data });
    const link = check.ok ? $(await readText(check))('a').attr('href') : undefined;
    if (!link) {
      check.body?.cancel().catch(() => {});
      throw registrarAuthError({ step: 'id.tsinghua.edu.cn', code: check.status });
    }
    res = await s.rawFetch(new URL(link, check.url || action).href);
    page = await readText(res);
  }

  if (!res.ok || isIdLoginPage(res, page)) {
    throw registrarAuthError({ code: res.status, url: res.url.split('?')[0] });
  }
}

async function fetchWindow(s: Session, range: CalendarRange, graduate: boolean): Promise<CalendarEvent[]> {
  const response = await fetchRegistrar(
    s,
    URLS.REGISTRAR_CALENDAR(range.startDate, range.endDate, graduate, JSONP_EXTRACTOR_NAME),
  );

  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: { code: response.status, text: response.statusText },
    });
  }

  const result: unknown = extractJSONPResult(await response.text());
  if (!Array.isArray(result)) {
    throw { reason: FailReason.INVALID_RESPONSE, extra: result } as ApiError;
  }

  return result.map<CalendarEvent>((i) => ({
    location: i.dd,
    status: i.fl,
    startTime: i.kssj,
    endTime: i.jssj,
    date: i.nq,
    courseName: i.nr,
  }));
}

/**
 * Get calendar items during the specified period (in yyyymmdd format, both inclusive).
 *
 * Ranges longer than `CALENDAR_WINDOW_DAYS` are fetched in consecutive windows (one at a time, each retried once
 * unless it timed out) and merged in date order. Windows that still fail are listed in `failedRanges`, so callers can
 * show partial data and retry only those; after two windows in a row time out, the rest are listed there without a
 * request. If every window fails, this rejects with the last error instead (usually `FailReason.INVALID_RESPONSE`).
 * The result might be empty if the period is too far away from now. Throws a `RangeError` for a date that is not a
 * valid yyyymmdd, and rejects with `FailReason.ERROR_REGISTRAR_AUTH` if signing in to the registrar fails (off campus
 * this goes through WebVPN and needs the id.tsinghua.edu.cn session of the last `login`).
 */
export async function getCalendar(
  s: Session,
  startDate: string,
  endDate: string,
  options: CalendarOptions = {},
): Promise<CalendarResult> {
  const graduate = options.graduate ?? false;
  const ranges = splitCalendarRange(startDate, endDate);
  if (ranges.length === 0) return { events: [], failedRanges: [] };

  let ticket = await s.fetchTextWithToken(URLS.REGISTRAR_TICKET(), {
    method: 'POST',
    body: URLS.REGISTRAR_TICKET_FORM_DATA(),
  });
  ticket = ticket.substring(1, ticket.length - 1);

  await authenticateRegistrar(s, ticket);

  const events: CalendarEvent[] = [];
  const failedRanges: CalendarRange[] = [];
  let lastError: unknown;
  let timeouts = 0;
  for (const range of ranges) {
    // after this many timed-out windows in a row the registrar is taken as down, and the rest are not tried
    if (timeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
      failedRanges.push(range);
      continue;
    }
    try {
      // a timed-out window is not retried: the registrar is slow, not flaky, and each try takes `requestTimeout`
      events.push(
        ...(await fetchWindow(s, range, graduate).catch((err: unknown) =>
          isTimeout(err) ? Promise.reject(err) : fetchWindow(s, range, graduate),
        )),
      );
      timeouts = 0;
    } catch (e) {
      lastError = e;
      failedRanges.push(range);
      timeouts = isTimeout(e) ? timeouts + 1 : 0;
    }
  }

  if (failedRanges.length === ranges.length) throw lastError;
  return { events, failedRanges };
}
