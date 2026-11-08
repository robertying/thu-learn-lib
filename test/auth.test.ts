import { describe, expect, it } from 'vitest';

import { FailReason, Language } from '../src/index.ts';
import * as URLS from '../src/urls.ts';
import { FINGERPRINT, FakeServer, PASSWORD, USERNAME, credential, json } from './helpers/fake-server.ts';

const semesters = (server: FakeServer) =>
  server.on('GET', URLS.LEARN_SEMESTER_LIST(), () => json(['2024-2025-1', null, '2024-2025-2']));

describe('login', () => {
  it('logs in through SSO and reads the CSRF token and language', async () => {
    const server = new FakeServer();
    server.lang = 'en';
    const helper = server.helper();

    await helper.login(USERNAME, PASSWORD, FINGERPRINT);

    expect(helper.getCSRFToken()).toBe('csrf-1');
    expect(helper.getCurrentLanguage()).toBe(Language.EN);
    expect(server.loginCount).toBe(1);
    // login form, credential check, roaming, course page for the token
    expect(server.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `GET ${URLS.ID_LOGIN()}`,
      `POST ${URLS.ID_LOGIN_CHECK()}`,
      `GET ${URLS.LEARN_AUTH_ROAM('').split('?')[0]}`,
      `GET ${URLS.LEARN_STUDENT_COURSE_LIST_PAGE()}`,
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

  it('rejects with NO_CREDENTIAL when the provider returns no fingerprint', async () => {
    const server = new FakeServer();
    const helper = server.helper({ provider: () => ({ username: USERNAME, password: PASSWORD }) });
    await expect(helper.login()).rejects.toHaveProperty('reason', FailReason.NO_CREDENTIAL);
  });

  it('rejects with ERROR_FETCH_FROM_ID for a wrong password', async () => {
    const server = new FakeServer();
    const helper = server.helper();
    await expect(helper.login(USERNAME, 'wrong', FINGERPRINT)).rejects.toHaveProperty(
      'reason',
      FailReason.ERROR_FETCH_FROM_ID,
    );
    expect(server.loginCount).toBe(0);
  });

  it('logs out with one POST', async () => {
    const server = new FakeServer();
    const helper = await server.loggedInHelper();
    await helper.logout();
    expect(server.count(URLS.LEARN_LOGOUT(), 'POST')).toBe(1);
  });
});

describe('CSRF token', () => {
  it('logs in lazily before the first request and adds the token to the URL', async () => {
    const server = semesters(new FakeServer());
    const helper = server.helper({ provider: () => credential });

    expect(await helper.getSemesterIdList()).toEqual(['2024-2025-1', '2024-2025-2']);
    expect(server.loginCount).toBe(1);
    const request = server.requests.find((r) => r.path === URLS.LEARN_SEMESTER_LIST())!;
    expect(request.url.searchParams.get('_csrf')).toBe('csrf-1');
  });

  it('reuses a token set with setCSRFToken instead of logging in', async () => {
    const server = semesters(new FakeServer());
    const first = await server.loggedInHelper();
    const second = server.helper({ provider: () => credential });
    second.setCSRFToken(first.getCSRFToken());

    await second.getSemesterIdList();
    expect(server.loginCount).toBe(1);
    expect(second.getCSRFToken()).toBe('csrf-1');
  });
});

describe('expired session', () => {
  it('logs in again and retries once when a CredentialProvider is set', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    expect(await helper.getSemesterIdList()).toHaveLength(2);
    expect(server.loginCount).toBe(2);
    expect(server.count(URLS.LEARN_SEMESTER_LIST())).toBe(2);
  });

  it('rejects with NOT_LOGGED_IN without a CredentialProvider', async () => {
    const server = semesters(new FakeServer());
    const helper = server.helper();
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    server.expireSession();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    expect(server.loginCount).toBe(1);
  });

  it('starts one SSO login per in-flight request (no single-flight yet)', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await Promise.all([helper.getSemesterIdList(), helper.getSemesterIdList(), helper.getSemesterIdList()]);
    // 1 initial login + 1 per request. The request-layer change should bring this down to 2.
    expect(server.loginCount).toBe(4);
  });
});
