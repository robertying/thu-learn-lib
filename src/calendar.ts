// Course calendar from the registrar (academic.tsinghua.edu.cn).

import type { Session } from './request.ts';
import type { CalendarEvent } from './types.ts';
import { FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { JSONP_EXTRACTOR_NAME, extractJSONPResult } from './utils.ts';

/**
 * Get calendar items during the specified period (in yyyymmdd format).
 * @param startDate start date (inclusive)
 * @param endDate end date (inclusive)
 * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
 * and we currently observe a limit of no more that 29 days.
 * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
 */
export async function getCalendar(
  s: Session,
  startDate: string,
  endDate: string,
  graduate = false,
): Promise<CalendarEvent[]> {
  const ticketResponse = await s.fetchWithToken(URLS.REGISTRAR_TICKET(), {
    method: 'POST',
    body: URLS.REGISTRAR_TICKET_FORM_DATA(),
  });

  let ticket = await ticketResponse.text();
  ticket = ticket.substring(1, ticket.length - 1);

  await s.fetch(URLS.REGISTRAR_AUTH(ticket));

  const response = await s.fetchWithToken(URLS.REGISTRAR_CALENDAR(startDate, endDate, graduate, JSONP_EXTRACTOR_NAME));

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
