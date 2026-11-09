import { describe, expect, it } from 'vitest';

import { CourseType, FailReason, Language } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import {
  FINGERPRINT,
  FakeServer,
  PASSWORD,
  USERNAME,
  credential,
  html,
  withSemesterList,
} from './helpers/fake-server.ts';

describe('login', () => {
  it('logs in through SSO and reads the CSRF token and language', async () => {
    const server = new FakeServer();
    server.lang = 'en';
    const helper = server.helper();

    await helper.login(credential);

    expect(helper.getCSRFToken()).toBe('csrf-1');
    expect(helper.getCurrentLanguage()).toBe(Language.EN);
    expect(server.loginCount).toBe(1);
    // login form, credential check, roaming, course page for the token
    expect(server.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `GET ${URLS.ID_LOGIN}`,
      `POST ${URLS.ID_LOGIN_CHECK}`,
      `GET ${URLS.LEARN_AUTH_ROAM('').split('?')[0]}`,
      `GET ${URLS.LEARN_HOMEPAGE(CourseType.STUDENT)}`,
    ]);
    // the password is SM2-encrypted, never sent in clear
    const form = server.requests[1].form!;
    expect(form.get('i_user')).toBe(USERNAME);
    expect(form.get('i_pass')).not.toContain(PASSWORD);
    expect(form.get('fingerPrint')).toBe(FINGERPRINT);
  });

  it('uses the CredentialProvider when called without arguments', async () => {
    const server = new FakeServer();
    const helper = server.helper({ provider: () => Promise.resolve(credential) });
    await helper.login();
    expect(server.loginCount).toBe(1);
  });

  it('rejects with NO_CREDENTIAL without credentials or provider', async () => {
    const server = new FakeServer();
    const helper = server.helper();
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
    expect(server.requests).toHaveLength(0);
  });

  it('rejects an incomplete credential with NO_CREDENTIAL, without asking the provider or the SSO server', async () => {
    const server = new FakeServer();
    let asked = 0;
    const helper = server.helper({ provider: () => (asked++, credential) });
    await expect(helper.login({ username: USERNAME, password: PASSWORD })).rejects.toEqual({
      reason: FailReason.NO_CREDENTIAL,
    });
    await expect(helper.getRoamingTicket({ ...credential, password: '' })).rejects.toEqual({
      reason: FailReason.NO_CREDENTIAL,
    });
    expect(asked).toBe(0);
    expect(server.requests).toEqual([]);
  });

  it('gets a roaming ticket without logging in to Web Learning', async () => {
    const server = new FakeServer();
    expect(await server.helper().getRoamingTicket(credential)).toBe('ticket-1');
    expect(server.loginCount).toBe(0);
  });

  it('rejects with NO_CREDENTIAL when the provider returns no fingerprint', async () => {
    const server = new FakeServer();
    const helper = server.helper({ provider: () => ({ username: USERNAME, password: PASSWORD }) });
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
  });

  it('rejects with BAD_CREDENTIAL and the page message for a wrong password', async () => {
    const server = new FakeServer();
    const helper = server.helper();
    await expect(helper.login({ ...credential, password: 'wrong' })).rejects.toEqual({
      reason: FailReason.BAD_CREDENTIAL,
      extra: '您的用户名或密码不正确，请重试！',
    });
    expect(server.loginCount).toBe(0);
  });

  it('takes the ticket from the roaming link, not from the first link on the page', async () => {
    const server = new FakeServer().on(
      'POST',
      URLS.ID_LOGIN_CHECK,
      () =>
        html(
          `<html><body><a href="/f/recovery/password/reset">reset</a><a href="${URLS.LEARN_AUTH_ROAM('ticket-1')}&x=y">go</a></body></html>`,
        ),
      { public: true },
    );
    await server.helper().login(credential);
    expect(server.loginCount).toBe(1);
  });

  it('rejects with ERROR_FETCH_FROM_ID, not BAD_CREDENTIAL, for a page that is neither the ticket nor the login form', async () => {
    const page = '<html><body><p>请完成二次认证</p><a href="/f/help">help</a><script>var x = 1;</script></body></html>';
    const server = new FakeServer().on('POST', URLS.ID_LOGIN_CHECK, () => html(page), { public: true });
    await expect(server.helper().login(credential)).rejects.toEqual({
      reason: FailReason.ERROR_FETCH_FROM_ID,
      extra: '请完成二次认证help',
    });
  });

  it('rejects with ERROR_FETCH_FROM_ID when the SSO server answers with an error', async () => {
    const server = new FakeServer().on('POST', URLS.ID_LOGIN_CHECK, () => new Response('', { status: 502 }), {
      public: true,
    });
    await expect(server.helper().login(credential)).rejects.toHaveProperty('reason', FailReason.ERROR_FETCH_FROM_ID);
  });

  it('rejects with NETWORK_ERROR, not ERROR_FETCH_FROM_ID, when the SSO server is not reached', async () => {
    const error = new TypeError('Network request failed');
    const offline = new FakeServer().helper({ fetch: () => Promise.reject(error) });
    await expect(offline.login(credential)).rejects.toEqual({
      reason: FailReason.NETWORK_ERROR,
      extra: error,
    });
  });

  it('rejects with REQUEST_TIMEOUT, not ERROR_FETCH_FROM_ID, when the SSO server does not answer in time', async () => {
    const server = new FakeServer().on('POST', URLS.ID_LOGIN_CHECK, () => new Promise<Response>(() => {}), {
      public: true,
    });
    await expect(server.helper({ requestTimeout: 20 }).login(credential)).rejects.toHaveProperty(
      'reason',
      FailReason.REQUEST_TIMEOUT,
    );
  });

  it('rejects with NETWORK_ERROR when the connection drops while roaming', async () => {
    const server = new FakeServer();
    const helper = server.helper({
      fetch: (input, init) =>
        typeof input === 'string' && input.startsWith(URLS.LEARN_AUTH_ROAM('').split('?')[0])
          ? Promise.reject(new TypeError('fetch failed'))
          : server.fetch(input, init),
    });
    await expect(helper.login(credential)).rejects.toHaveProperty('reason', FailReason.NETWORK_ERROR);
  });

  it('logs out with one POST and forgets the CSRF token', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    await helper.logout();
    expect(server.count(URLS.LEARN_LOGOUT, 'POST')).toBe(1);
    expect(helper.getCSRFToken()).toBe('');

    // the next request logs in first instead of sending the old token
    await helper.getSemesterIdList();
    expect(server.loginCount).toBe(2);
    expect(server.count(URLS.LEARN_SEMESTER_LIST)).toBe(1);
  });
});
