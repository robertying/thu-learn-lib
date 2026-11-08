import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import type { Fetch } from '../../src/index.ts';
import { FailReason, Learn2018Helper } from '../../src/index.ts';
import { FINGERPRINT, PASSWORD, USERNAME, config, credential } from './config.ts';

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
  it('should login & logout correctly if account is right', async () => {
    const helper = new Learn2018Helper();
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    await helper.logout();
  });

  it('should failed to login if account is incorrect', async () => {
    const helper = new Learn2018Helper();
    await expect(helper.login('nouser', 'nopass', FINGERPRINT)).rejects.toHaveProperty(
      'reason',
      FailReason.BAD_CREDENTIAL,
    );
  });

  it("should throw error if hasn't login and not provide up config", async () => {
    const helper = new Learn2018Helper();
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
  });

  it('should not throw error if manually invoke login()', async () => {
    const helper = new Learn2018Helper();
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('should not throw error if provide CredentialProvider', async () => {
    const helper = new Learn2018Helper(config);
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
  });

  it('should not throw error if invoke logout() but provide CredentialProvider', async () => {
    const helper = new Learn2018Helper(config);
    // First get
    const semesters = await helper.getSemesterIdList();
    expect(Array.isArray(semesters)).toEqual(true);
    // Logout
    await helper.logout();
    // Second get
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
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    const token = helper.getCSRFToken();
    await helper.logout();
    helper.setCSRFToken(token);

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    await expect(helper.getUserInfo()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
  });

  it('records how the server answers an expired session', async () => {
    const seen: { url: string; status: number; finalUrl: string; type: string | null; start: string }[] = [];
    const jar = new CookieJar();
    const helper = new Learn2018Helper({ cookieJar: jar });
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    const token = helper.getCSRFToken();
    await helper.logout();

    const { fetch } = await import('node-fetch-native');
    const { default: fetchCookie } = await import('fetch-cookie');
    const raw = fetchCookie(fetch, jar) as unknown as Fetch;
    for (const url of [
      'https://learn.tsinghua.edu.cn/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq',
      'https://learn.tsinghua.edu.cn/f/wlxt/index/course/teacher/',
    ]) {
      const res = await raw(`${url}?_csrf=${token}`);
      const text = await res.text();
      seen.push({
        url,
        status: res.status,
        finalUrl: res.url,
        type: res.headers.get('content-type'),
        start: text.slice(0, 300),
      });
    }
    console.info(JSON.stringify(seen, null, 2));
    expect(seen).toHaveLength(2);
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
