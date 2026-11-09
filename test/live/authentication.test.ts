import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import { FailReason, Learn2018Helper, isConnectionError } from '../../src/index.ts';
import { urlOf } from '../../src/utils.ts';
import { config, credential } from './config.ts';
import { addDays, toYyyymmdd } from './dates.ts';

/** a fetch with cookies that sends requests for `host` to a name that can't resolve, so they really fail */
const unreachable = (host: string, cookieJar = new CookieJar()): Fetch => {
  const inner = fetchCookie(fetch, cookieJar) as unknown as Fetch;
  return (input, init) => {
    return inner(urlOf(input).replace(`//${host}`, '//unreachable.invalid'), init);
  };
};

/** the cookie jar without the cookies of `domain` (and its subdomains) */
const withoutCookiesOf = (cookieJar: CookieJar, domain: string) => {
  const data = cookieJar.serializeSync();
  return CookieJar.deserializeSync({
    ...data,
    cookies: data.cookies.filter((c) => !(c.domain === domain || c.domain?.endsWith(`.${domain}`))),
  });
};

/** a helper whose provider counts its logins */
const counting = (cookieJar = new CookieJar()) => {
  const counter = { logins: 0 };
  const helper = new Learn2018Helper({
    cookieJar,
    provider: () => {
      counter.logins += 1;
      return credential;
    },
  });
  return { helper, counter, cookieJar };
};

describe('helper authentication', () => {
  it('logs in and out with the right credentials', async () => {
    const helper = new Learn2018Helper();
    await helper.login(credential);
    await helper.logout();
  });

  // the wrong password test is in once.test.ts

  it('rejects with NO_CREDENTIAL without credentials or a provider', async () => {
    const helper = new Learn2018Helper();
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
  });

  it('gets data after an explicit login', async () => {
    const helper = new Learn2018Helper();
    await helper.login(credential);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('gets data with a CredentialProvider and no explicit login', async () => {
    const helper = new Learn2018Helper(config);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('logs in again after logout with a CredentialProvider', async () => {
    const helper = new Learn2018Helper(config);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
    await helper.logout();
    const semesters2 = await helper.getSemesterIdList();
    expect(Array.isArray(semesters2)).toEqual(true);
  });
});

describe('expired sessions', () => {
  it('logs in again after the session was logged out elsewhere, for JSON and HTML requests', async () => {
    const { helper, counter, cookieJar } = counting();
    await helper.login();
    const token = helper.getCSRFToken();

    // log the same session out with a second helper on the same cookies
    const other = new Learn2018Helper({ cookieJar });
    other.setCSRFToken(token);
    await other.logout();

    // JSON endpoint
    expect(Array.isArray(await helper.getSemesterIdList())).toBe(true);
    expect(counter.logins).toBe(2);

    await other.logout();
    // HTML page: a login page must not be parsed as a homepage with an empty name
    expect((await helper.getUserInfo()).name).toBeTruthy();
    expect(counter.logins).toBe(3);
  });

  it('rejects with NOT_LOGGED_IN without a provider, for JSON and HTML requests', async () => {
    const helper = new Learn2018Helper();
    await helper.login(credential);
    const token = helper.getCSRFToken();
    await helper.logout();
    helper.setCSRFToken(token);

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    await expect(helper.getUserInfo()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
  });
});

describe('session resume', () => {
  it('ensureSession reuses a saved token and cookies without SSO', async () => {
    const first = counting();
    await first.helper.login();

    const resumed = counting(first.cookieJar);
    resumed.helper.setCSRFToken(first.helper.getCSRFToken());
    await resumed.helper.ensureSession();
    expect(resumed.counter.logins).toBe(0);
  });

  it('ensureSession logs in when the saved session has expired', async () => {
    const first = counting();
    await first.helper.login();
    const token = first.helper.getCSRFToken();
    await first.helper.logout();

    const resumed = counting(first.cookieJar);
    resumed.helper.setCSRFToken(token);
    await resumed.helper.ensureSession();
    expect(resumed.counter.logins).toBe(1);
    expect(Array.isArray(await resumed.helper.getSemesterIdList())).toBe(true);
  });
});

describe('connection errors', () => {
  it('rejects a login whose SSO server is not reached with NETWORK_ERROR, not ERROR_FETCH_FROM_ID', async () => {
    const helper = new Learn2018Helper({ fetch: unreachable('id.tsinghua.edu.cn') });
    const err = await helper.login(credential).catch((e: unknown) => e);
    expect(err).toHaveProperty('reason', FailReason.NETWORK_ERROR);
    // Node's fetch error is kept in extra
    expect((err as { extra?: unknown }).extra).toBeInstanceOf(Error);
    expect(isConnectionError(err)).toBe(true);
  });

  it('rejects a data request that is not answered with NETWORK_ERROR, without logging in again', async () => {
    const first = counting();
    await first.helper.login();

    // the same session, but Web Learning can't be reached
    const counter = { logins: 0 };
    const offline = new Learn2018Helper({
      fetch: unreachable('learn.tsinghua.edu.cn', first.cookieJar),
      provider: () => {
        counter.logins += 1;
        return credential;
      },
    });
    offline.setCSRFToken(first.helper.getCSRFToken());
    await expect(offline.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NETWORK_ERROR);
    expect(counter.logins).toBe(0);
    await first.helper.logout();
  });
});

describe('registrar sign-in', () => {
  it('signs in to the registrar after the id.tsinghua.edu.cn session is gone, logging in again at most once', async () => {
    const first = counting();
    await first.helper.login();
    const semester = await first.helper.getCurrentSemester();

    // a session resumed from saved cookies, whose id.tsinghua.edu.cn session has expired since
    const resumed = counting(withoutCookiesOf(first.cookieJar, 'id.tsinghua.edu.cn'));
    resumed.helper.setCSRFToken(first.helper.getCSRFToken());
    const { events, failedRanges } = await resumed.helper.getCalendar(
      toYyyymmdd(addDays(semester.startDate, 7)),
      toYyyymmdd(addDays(semester.startDate, 13)),
    );
    expect(failedRanges).toEqual([]);
    // off campus (WebVPN) it logs in once for a new id.tsinghua.edu.cn session; on campus it needs none
    expect(resumed.counter.logins).toBeLessThanOrEqual(1);
    console.info(
      `[registrar] ${resumed.counter.logins === 1 ? 'logged in again (WebVPN)' : 'no login needed (on campus?)'}, ${events.length} events`,
    );
    await resumed.helper.logout();
  });
});
