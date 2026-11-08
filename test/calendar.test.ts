import { describe, expect, it } from 'vitest';

import { splitCalendarRange } from '../src/calendar.ts';
import { FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { JSONP_EXTRACTOR_NAME } from '../src/utils.ts';
import type { Request } from './helpers/fake-server.ts';
import { FakeServer, html } from './helpers/fake-server.ts';

const setup = (calendar: (req: Request) => Response) =>
  new FakeServer()
    .on('POST', URLS.REGISTRAR_TICKET(), () => html('"registrar-ticket"'))
    .on('GET', URLS.REGISTRAR_AUTH(''), () => html(''))
    .on('GET', URLS.REGISTRAR_CALENDAR('', ''), calendar);

const jsonp = (items: unknown[]) => html(`${JSONP_EXTRACTOR_NAME}(${JSON.stringify(items)})`);

/** one event on the first day of the requested window, named after the window */
const eventPerWindow = (req: Request) => {
  const start = req.url.searchParams.get('p_start_date')!;
  const end = req.url.searchParams.get('p_end_date')!;
  return jsonp([{ dd: 'room', fl: '上课', kssj: '08:00', jssj: '09:35', nq: start, nr: `${start}-${end}` }]);
};

const calendarRequests = (server: FakeServer) =>
  server.requests
    .filter((r) => r.url.searchParams.has('p_start_date'))
    .map((r) => [r.url.searchParams.get('p_start_date'), r.url.searchParams.get('p_end_date')]);

describe('splitCalendarRange', () => {
  it('keeps ranges of up to 28 days whole', () => {
    expect(splitCalendarRange('20250301', '20250301')).toEqual([{ startDate: '20250301', endDate: '20250301' }]);
    expect(splitCalendarRange('20250301', '20250328')).toEqual([{ startDate: '20250301', endDate: '20250328' }]);
  });

  it('splits longer ranges into consecutive 28-day windows across months and years', () => {
    expect(splitCalendarRange('20250301', '20250329')).toEqual([
      { startDate: '20250301', endDate: '20250328' },
      { startDate: '20250329', endDate: '20250329' },
    ]);
    expect(splitCalendarRange('20231215', '20240310')).toEqual([
      { startDate: '20231215', endDate: '20240111' },
      { startDate: '20240112', endDate: '20240208' },
      { startDate: '20240209', endDate: '20240307' },
      { startDate: '20240308', endDate: '20240310' },
    ]);
  });

  it('returns no windows when the range is empty', () => {
    expect(splitCalendarRange('20250302', '20250301')).toEqual([]);
  });

  it('rejects dates that are not valid yyyymmdd', () => {
    for (const bad of ['2025-03-01', '20250230', 'gg', '2025031']) {
      expect(() => splitCalendarRange(bad, '20250301')).toThrow(
        expect.objectContaining({ reason: FailReason.INVALID_RESPONSE }),
      );
    }
  });
});

describe('getCalendar', () => {
  it('gets a registrar ticket, authenticates and parses the JSONP calendar', async () => {
    const server = setup(() =>
      jsonp([{ dd: '6A101', fl: '上课', kssj: '08:00', jssj: '09:35', nq: '2025-03-03', nr: 'Calculus' }]),
    );
    const helper = await server.loggedInHelper();
    const result = await helper.getCalendar('20250301', '20250328');

    expect(result).toEqual({
      events: [
        {
          location: '6A101',
          status: '上课',
          startTime: '08:00',
          endTime: '09:35',
          date: '2025-03-03',
          courseName: 'Calculus',
        },
      ],
      failedRanges: [],
    });
    expect(server.requests).toHaveLength(3);
    expect(server.requests[1].url.searchParams.get('ticket')).toBe('registrar-ticket');
    const calendarUrl = server.requests[2].url;
    expect(calendarUrl.searchParams.get('m')).toBe('bks_jxrl_all');
    expect(calendarUrl.searchParams.get('p_start_date')).toBe('20250301');
    expect(calendarUrl.searchParams.get('p_end_date')).toBe('20250328');
    expect(calendarUrl.searchParams.get('jsoncallback')).toBe(JSONP_EXTRACTOR_NAME);
  });

  it('uses the graduate calendar when asked', async () => {
    const server = setup(() => jsonp([]));
    const helper = await server.loggedInHelper();
    expect(await helper.getCalendar('20250301', '20250328', { graduate: true })).toEqual({
      events: [],
      failedRanges: [],
    });
    expect(server.requests[2].url.searchParams.get('m')).toBe('yjs_jxrl_all');
  });

  it('fetches long ranges in 28-day windows with one ticket and merges events in order', async () => {
    const server = setup(eventPerWindow);
    const helper = await server.loggedInHelper();
    const result = await helper.getCalendar('20250301', '20250509');

    expect(calendarRequests(server)).toEqual([
      ['20250301', '20250328'],
      ['20250329', '20250425'],
      ['20250426', '20250509'],
    ]);
    expect(server.requests.filter((r) => r.method === 'POST')).toHaveLength(1);
    expect(server.requests.filter((r) => r.url.searchParams.has('ticket'))).toHaveLength(1);
    expect(result.events.map((e) => e.courseName)).toEqual([
      '20250301-20250328',
      '20250329-20250425',
      '20250426-20250509',
    ]);
    expect(result.failedRanges).toEqual([]);
  });

  it('retries a failed window once', async () => {
    let calls = 0;
    const server = setup((req) => (++calls === 2 ? new Response('busy', { status: 500 }) : eventPerWindow(req)));
    const helper = await server.loggedInHelper();
    const result = await helper.getCalendar('20250301', '20250405');

    expect(calendarRequests(server)).toEqual([
      ['20250301', '20250328'],
      ['20250329', '20250405'],
      ['20250329', '20250405'],
    ]);
    expect(result.events).toHaveLength(2);
    expect(result.failedRanges).toEqual([]);
  });

  it('returns partial events and the windows that failed twice', async () => {
    const server = setup((req) =>
      req.url.searchParams.get('p_start_date') === '20250329' ? html('alert(1)') : eventPerWindow(req),
    );
    const helper = await server.loggedInHelper();
    const result = await helper.getCalendar('20250301', '20250509');

    expect(calendarRequests(server)).toHaveLength(4);
    expect(result.events.map((e) => e.date)).toEqual(['20250301', '20250426']);
    expect(result.failedRanges).toEqual([{ startDate: '20250329', endDate: '20250425' }]);
  });

  it('rejects with INVALID_RESPONSE when every window fails', async () => {
    const server = setup(() => new Response('range too long', { status: 500 }));
    const helper = await server.loggedInHelper();
    await expect(helper.getCalendar('20250101', '20250401')).rejects.toHaveProperty(
      'reason',
      FailReason.INVALID_RESPONSE,
    );
    expect(calendarRequests(server)).toHaveLength(8);
  });

  it('throws INVALID_RESPONSE when the body is not the expected JSONP', async () => {
    const server = setup(() => html('alert(1)'));
    const helper = await server.loggedInHelper();
    await expect(helper.getCalendar('20250301', '20250328')).rejects.toBe(FailReason.INVALID_RESPONSE);
  });

  it('makes no requests for an empty or invalid range', async () => {
    const server = setup(eventPerWindow);
    const helper = await server.loggedInHelper();
    const before = server.requests.length;
    expect(await helper.getCalendar('20250302', '20250301')).toEqual({ events: [], failedRanges: [] });
    await expect(helper.getCalendar('2025-03-01', '20250328')).rejects.toHaveProperty(
      'reason',
      FailReason.INVALID_RESPONSE,
    );
    expect(server.requests).toHaveLength(before);
  });
});
