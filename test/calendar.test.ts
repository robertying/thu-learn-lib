import { describe, expect, it } from 'vitest';

import { FailReason } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { JSONP_EXTRACTOR_NAME } from '../src/utils.ts';
import { FakeServer, html } from './helpers/fake-server.ts';

const setup = (calendar: () => Response) =>
  new FakeServer()
    .on('POST', URLS.REGISTRAR_TICKET(), () => html('"registrar-ticket"'))
    .on('GET', URLS.REGISTRAR_AUTH(''), () => html(''))
    .on('GET', URLS.REGISTRAR_CALENDAR('', ''), calendar);

describe('getCalendar', () => {
  it('gets a registrar ticket, authenticates and parses the JSONP calendar', async () => {
    const server = setup(() =>
      html(
        `${JSONP_EXTRACTOR_NAME}([{"dd":"6A101","fl":"上课","kssj":"08:00","jssj":"09:35","nq":"2025-03-03","nr":"Calculus"}])`,
      ),
    );
    const helper = await server.loggedInHelper();
    const events = await helper.getCalendar('20250301', '20250328');

    expect(events).toEqual([
      {
        location: '6A101',
        status: '上课',
        startTime: '08:00',
        endTime: '09:35',
        date: '2025-03-03',
        courseName: 'Calculus',
      },
    ]);
    expect(server.requests).toHaveLength(3);
    expect(server.requests[1].url.searchParams.get('ticket')).toBe('registrar-ticket');
    const calendarUrl = server.requests[2].url;
    expect(calendarUrl.searchParams.get('m')).toBe('bks_jxrl_all');
    expect(calendarUrl.searchParams.get('p_start_date')).toBe('20250301');
    expect(calendarUrl.searchParams.get('p_end_date')).toBe('20250328');
    expect(calendarUrl.searchParams.get('jsoncallback')).toBe(JSONP_EXTRACTOR_NAME);
  });

  it('uses the graduate calendar when asked', async () => {
    const server = setup(() => html(`${JSONP_EXTRACTOR_NAME}([])`));
    const helper = await server.loggedInHelper();
    expect(await helper.getCalendar('20250301', '20250328', true)).toEqual([]);
    expect(server.requests[2].url.searchParams.get('m')).toBe('yjs_jxrl_all');
  });

  it('rejects with INVALID_RESPONSE when the registrar errors', async () => {
    const server = setup(() => new Response('range too long', { status: 500 }));
    const helper = await server.loggedInHelper();
    await expect(helper.getCalendar('20250101', '20250401')).rejects.toHaveProperty(
      'reason',
      FailReason.INVALID_RESPONSE,
    );
  });

  it('throws INVALID_RESPONSE when the body is not the expected JSONP', async () => {
    const server = setup(() => html('alert(1)'));
    const helper = await server.loggedInHelper();
    await expect(helper.getCalendar('20250301', '20250328')).rejects.toBe(FailReason.INVALID_RESPONSE);
  });
});
