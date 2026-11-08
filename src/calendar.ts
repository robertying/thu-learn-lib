// Course calendar from the registrar (academic.tsinghua.edu.cn).

import type { Session } from './request.ts';
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

async function fetchWindow(s: Session, range: CalendarRange, graduate: boolean): Promise<CalendarEvent[]> {
  const response = await s.fetchWithToken(
    URLS.REGISTRAR_CALENDAR(range.startDate, range.endDate, graduate, JSONP_EXTRACTOR_NAME),
  );

  if (!response.ok) {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
    });
  }

  const result = extractJSONPResult(await response.text()) as any[];

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
 * valid yyyymmdd.
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

  const ticketResponse = await s.fetchWithToken(URLS.REGISTRAR_TICKET(), {
    method: 'POST',
    body: URLS.REGISTRAR_TICKET_FORM_DATA(),
  });

  let ticket = await ticketResponse.text();
  ticket = ticket.substring(1, ticket.length - 1);

  await s.fetch(URLS.REGISTRAR_AUTH(ticket));

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
