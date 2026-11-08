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

  it('shares one SSO login between concurrent requests', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await Promise.all([helper.getSemesterIdList(), helper.getSemesterIdList(), helper.getSemesterIdList()]);
    expect(server.loginCount).toBe(2);
    // 3 rejected + 3 retried
    expect(server.count(URLS.LEARN_SEMESTER_LIST())).toBe(6);
  });

  it('does not log in again for a request that failed after another request renewed the session', async () => {
    const server = semesters(new FakeServer());
    let open!: () => void;
    const gate = new Promise<void>((resolve) => (open = resolve));
    let slowCalls = 0;
    // answers its first call with 403 (sent with the old session), but only after the gate opens
    server.on(
      'GET',
      URLS.LEARN_CURRENT_SEMESTER(),
      async () => {
        slowCalls += 1;
        if (slowCalls === 1) {
          await gate;
          return new Response('', { status: 403 });
        }
        return json({ message: 'success', result: { id: 'x', kssj: '', jssj: '', xnxq: '2024-2025-1' } });
      },
      { public: true },
    );
    const helper = await server.loggedInHelper();
    server.expireSession();

    const slow = helper.getCurrentSemester();
    await helper.getSemesterIdList();
    expect(server.loginCount).toBe(2);
    open();
    await slow;
    expect(server.loginCount).toBe(2);
    expect(slowCalls).toBe(2);
  });

  it('retries with the CSRF token of the new login', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await helper.getSemesterIdList();
    const tokens = server.requests
      .filter((r) => r.path === URLS.LEARN_SEMESTER_LIST())
      .map((r) => r.url.searchParams.get('_csrf'));
    expect(tokens).toEqual(['csrf-1', 'csrf-2']);
    expect(helper.getCSRFToken()).toBe('csrf-2');
  });

  it('shares one lazy SSO login between concurrent first requests', async () => {
    const server = semesters(new FakeServer());
    const helper = server.helper({ provider: () => credential });

    await Promise.all([helper.getSemesterIdList(), helper.getSemesterIdList(), helper.login()]);
    expect(server.loginCount).toBe(1);
  });

  it('rejects every waiting request when the shared login fails', async () => {
    const server = semesters(new FakeServer());
    let calls = 0;
    const helper = server.helper({
      provider: () => {
        calls += 1;
        return calls === 1 ? credential : { ...credential, password: 'wrong' };
      },
    });
    await helper.login();
    server.expireSession();

    const results = await Promise.allSettled([helper.getSemesterIdList(), helper.getSemesterIdList()]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(calls).toBe(2);
  });
});

const current = (server: FakeServer) =>
  server.on('GET', URLS.LEARN_CURRENT_SEMESTER(), () =>
    json({ message: 'success', result: { id: '2024-2025-1', kssj: '', jssj: '', xnxq: '2024-2025-1' } }),
  );

describe('ensureSession', () => {
  it('makes one request and no SSO when the session is alive', async () => {
    const server = current(new FakeServer());
    const helper = await server.loggedInHelper();

    await helper.ensureSession();
    expect(server.loginCount).toBe(1);
    expect(server.requests.map((r) => r.path)).toEqual([URLS.LEARN_CURRENT_SEMESTER()]);
  });

  it('reuses a saved CSRF token and cookies without SSO', async () => {
    const server = current(new FakeServer());
    const first = await server.loggedInHelper();
    const resumed = server.helper({ provider: () => credential });
    resumed.setCSRFToken(first.getCSRFToken());

    await resumed.ensureSession();
    expect(server.loginCount).toBe(1);
  });

  it('logs in once when the session has expired', async () => {
    const server = current(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await helper.ensureSession();
    expect(server.loginCount).toBe(2);
    expect(helper.getCSRFToken()).toBe('csrf-2');
  });

  it('logs in when there is no CSRF token', async () => {
    const server = current(new FakeServer());
    const helper = server.helper({ provider: () => credential });

    await helper.ensureSession();
    expect(server.loginCount).toBe(1);
    expect(server.count(URLS.LEARN_CURRENT_SEMESTER())).toBe(0);
  });
});

describe('request limits', () => {
  it('keeps at most maxConcurrentRequests in flight', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper({ maxConcurrentRequests: 3 });
    server.latency = 5;

    await Promise.all(Array.from({ length: 10 }, () => helper.getSemesterIdList()));
    expect(server.count(URLS.LEARN_SEMESTER_LIST())).toBe(10);
    expect(server.maxInFlight).toBe(3);
  });

  it('defaults to 6 in flight', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper();
    server.latency = 5;

    await Promise.all(Array.from({ length: 20 }, () => helper.getSemesterIdList()));
    expect(server.maxInFlight).toBe(6);
  });

  it('counts the shared login against the limit without deadlocking', async () => {
    const server = semesters(new FakeServer());
    const helper = await server.loggedInHelper({ maxConcurrentRequests: 2 });
    server.expireSession();
    server.latency = 2;

    await Promise.all(Array.from({ length: 8 }, () => helper.getSemesterIdList()));
    expect(server.loginCount).toBe(2);
    expect(server.maxInFlight).toBe(2);
  });

  it('rejects with REQUEST_TIMEOUT when the server does not answer in time', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST(), () => new Promise<Response>(() => {}));
    const helper = await server.loggedInHelper({ requestTimeout: 20 });

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.REQUEST_TIMEOUT);
    expect(server.inFlight).toBe(0);
  });
});
