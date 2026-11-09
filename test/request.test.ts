import { describe, expect, it } from 'vitest';

import { FailReason } from '../src/index.ts';
import { isConnectionError, limitConcurrency, withNetworkError, withTimeout } from '../src/request.ts';
import * as URLS from '../src/urls.ts';
import {
  FINGERPRINT,
  FakeServer,
  PASSWORD,
  USERNAME,
  credential,
  html,
  json,
  withSemesterList,
} from './helpers/fake-server.ts';

describe('CSRF token', () => {
  it('logs in lazily before the first request and adds the token to the URL', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = server.helper({ provider: () => credential });

    expect(await helper.getSemesterIdList()).toEqual(['2024-2025-1', '2024-2025-2']);
    expect(server.loginCount).toBe(1);
    const request = server.requests.find((r) => r.path === URLS.LEARN_SEMESTER_LIST)!;
    expect(request.url.searchParams.get('_csrf')).toBe('csrf-1');
  });

  it('reuses a token set with setCSRFToken instead of logging in', async () => {
    const server = withSemesterList(new FakeServer());
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
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    expect(await helper.getSemesterIdList()).toHaveLength(2);
    expect(server.loginCount).toBe(2);
    expect(server.count(URLS.LEARN_SEMESTER_LIST)).toBe(2);
  });

  it('rejects with NOT_LOGGED_IN without a CredentialProvider', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = server.helper();
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    server.expireSession();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    expect(server.loginCount).toBe(1);
  });

  it('shares one SSO login between concurrent requests', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await Promise.all([helper.getSemesterIdList(), helper.getSemesterIdList(), helper.getSemesterIdList()]);
    expect(server.loginCount).toBe(2);
    // 3 rejected + 3 retried
    expect(server.count(URLS.LEARN_SEMESTER_LIST)).toBe(6);
  });

  it('does not log in again for a request that failed after another request renewed the session', async () => {
    const server = withSemesterList(new FakeServer());
    let open!: () => void;
    const gate = new Promise<void>((resolve) => (open = resolve));
    let slowCalls = 0;
    // answers its first call with 403 (sent with the old session), but only after the gate opens
    server.on(
      'GET',
      URLS.LEARN_CURRENT_SEMESTER,
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
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();

    await helper.getSemesterIdList();
    const tokens = server.requests
      .filter((r) => r.path === URLS.LEARN_SEMESTER_LIST)
      .map((r) => r.url.searchParams.get('_csrf'));
    expect(tokens).toEqual(['csrf-1', 'csrf-2']);
    expect(helper.getCSRFToken()).toBe('csrf-2');
  });

  it('shares one lazy SSO login between concurrent first requests', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = server.helper({ provider: () => credential });

    await Promise.all([helper.getSemesterIdList(), helper.getSemesterIdList(), helper.login()]);
    expect(server.loginCount).toBe(1);
  });

  it('rejects every waiting request when the shared login fails', async () => {
    const server = withSemesterList(new FakeServer());
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
  server.on('GET', URLS.LEARN_CURRENT_SEMESTER, () =>
    json({ message: 'success', result: { id: '2024-2025-1', kssj: '', jssj: '', xnxq: '2024-2025-1' } }),
  );

describe('ensureSession', () => {
  it('makes one request and no SSO when the session is alive', async () => {
    const server = current(new FakeServer());
    const helper = await server.loggedInHelper();

    await helper.ensureSession();
    expect(server.loginCount).toBe(1);
    expect(server.requests.map((r) => r.path)).toEqual([URLS.LEARN_CURRENT_SEMESTER]);
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
    expect(server.count(URLS.LEARN_CURRENT_SEMESTER)).toBe(0);
  });
});

describe('request limits', () => {
  it('keeps at most maxConcurrentRequests in flight', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper({ maxConcurrentRequests: 3 });
    server.latency = 5;

    await Promise.all(Array.from({ length: 10 }, () => helper.getSemesterIdList()));
    expect(server.count(URLS.LEARN_SEMESTER_LIST)).toBe(10);
    expect(server.maxInFlight).toBe(3);
  });

  it('defaults to 6 in flight', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    server.latency = 5;

    await Promise.all(Array.from({ length: 20 }, () => helper.getSemesterIdList()));
    expect(server.maxInFlight).toBe(6);
  });

  it('counts the shared login against the limit without deadlocking', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper({ maxConcurrentRequests: 2 });
    server.expireSession();
    server.latency = 2;

    await Promise.all(Array.from({ length: 8 }, () => helper.getSemesterIdList()));
    expect(server.loginCount).toBe(2);
    expect(server.maxInFlight).toBe(2);
  });

  it('rejects a request that gets no answer with NETWORK_ERROR, without logging in again', async () => {
    const server = withSemesterList(new FakeServer());
    let offline = false;
    const helper = server.helper({
      provider: () => credential,
      fetch: (input, init) => (offline ? Promise.reject(new TypeError('fetch failed')) : server.fetch(input, init)),
    });
    await helper.login();
    offline = true;
    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NETWORK_ERROR);
    expect(server.loginCount).toBe(1);
  });

  it('rejects with REQUEST_TIMEOUT when the server does not answer in time', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST, () => new Promise<Response>(() => {}));
    const helper = await server.loggedInHelper({ requestTimeout: 20 });

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.REQUEST_TIMEOUT);
    expect(server.inFlight).toBe(0);
  });
});

describe('expired sessions that are not a 403', () => {
  for (const expiry of ['redirect', 'html'] as const) {
    it(`logs in again and retries once for a ${expiry} answer`, async () => {
      const server = withSemesterList(new FakeServer());
      const helper = await server.loggedInHelper();
      server.expiry = expiry;
      server.expireSession();

      expect(await helper.getSemesterIdList()).toEqual(['2024-2025-1', '2024-2025-2']);
      expect(server.loginCount).toBe(2);
      expect(server.count(URLS.LEARN_SEMESTER_LIST)).toBe(2);
    });

    it(`ensureSession logs in again for a ${expiry} answer`, async () => {
      const server = new FakeServer();
      server.on('GET', URLS.LEARN_CURRENT_SEMESTER, () => json({ message: 'success', result: {} }));
      const helper = await server.loggedInHelper();
      server.expiry = expiry;
      server.expireSession();

      await helper.ensureSession();
      expect(server.loginCount).toBe(2);
    });
  }

  it('rejects with NOT_LOGGED_IN for a 200 HTML page without a provider', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = server.helper();
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    server.expiry = 'html';
    server.expireSession();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    expect(server.loginCount).toBe(1);
  });

  it('rejects with NOT_LOGGED_IN when the page is still the login page after logging in again', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST, () => html('<html><title>登录超时</title></html>'));
    const helper = await server.loggedInHelper();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    expect(server.loginCount).toBe(2);
  });

  it('rejects with INVALID_RESPONSE and does not log in again for another 200 HTML page', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST, () => html('<html><body>系统维护中</body></html>'));
    const helper = await server.loggedInHelper();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
    expect(server.loginCount).toBe(1);
  });

  describe('after the provider login is turned down with BAD_CREDENTIAL', () => {
    it('does not try the same credentials again for later requests', async () => {
      const { helper, checks } = await turnedDown();
      await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
      await expect(helper.ensureSession()).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
      expect(checks()).toBe(2);
    });

    it('tries again on an explicit login()', async () => {
      const { server, helper, checks, setPassword } = await turnedDown();
      setPassword(PASSWORD);
      await helper.login();
      expect(checks()).toBe(3);
      expect(await helper.getSemesterIdList()).toEqual(['2024-2025-1', '2024-2025-2']);
      expect(server.loginCount).toBe(2);
    });

    it('logs in again automatically after an explicit login with credentials', async () => {
      const { server, helper } = await turnedDown();
      await helper.login(USERNAME, PASSWORD, FINGERPRINT);
      server.expireSession();
      await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
      // the provider still has the old password: one more SSO check for it, then it is remembered again
      expect(server.count(URLS.ID_LOGIN_CHECK, 'POST')).toBe(4);
    });
  });

  it('does not log in again for an error page with another status', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST, () => new Response('<html>oops</html>', { status: 500 }));
    const helper = await server.loggedInHelper();

    await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.UNEXPECTED_STATUS);
    expect(server.loginCount).toBe(1);
  });

  it('rejects JSON with another status than 200 after logging in again with UNEXPECTED_STATUS', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_SEMESTER_LIST, () => new Response('["2024-2025-1"]', { status: 500 }));
    const helper = await server.loggedInHelper();
    server.expireSession();

    await expect(helper.getSemesterIdList()).rejects.toEqual({
      reason: FailReason.UNEXPECTED_STATUS,
      extra: { code: 500, text: '' },
    });
    expect(server.loginCount).toBe(2);
  });

  it('ensureSession rejects with INVALID_RESPONSE when the probe is not a success', async () => {
    const server = new FakeServer();
    server.on('GET', URLS.LEARN_CURRENT_SEMESTER, () => json({ message: 'error' }));
    const helper = await server.loggedInHelper();

    await expect(helper.ensureSession()).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
  });
});

/** a helper whose provider login was turned down with BAD_CREDENTIAL after the password changed */
const turnedDown = async () => {
  const server = withSemesterList(new FakeServer());
  server.on('GET', URLS.LEARN_CURRENT_SEMESTER, () => json({ message: 'success', result: {} }));
  let password = PASSWORD;
  const helper = server.helper({ provider: () => ({ ...credential, password }) });
  await helper.login();
  password = 'changed on the website';
  server.expireSession();
  await expect(helper.getSemesterIdList()).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
  const checks = () => server.count(URLS.ID_LOGIN_CHECK, 'POST');
  expect(checks()).toBe(2);
  return { server, helper, checks, setPassword: (p: string) => (password = p) };
};

describe('logins never overlap', () => {
  it('runs an explicit login after a provider login in progress', async () => {
    const server = new FakeServer();
    server.latency = 3;
    const helper = server.helper({ provider: () => credential });

    await Promise.all([helper.login(), helper.login(USERNAME, PASSWORD, FINGERPRINT)]);
    expect(server.loginCount).toBe(2);
    expect(server.maxConcurrentSso).toBe(1);
  });

  it('makes requests that expire during an explicit login wait for it', async () => {
    const server = withSemesterList(new FakeServer());
    const helper = await server.loggedInHelper();
    server.expireSession();
    server.latency = 3;

    await Promise.all([
      helper.login(USERNAME, PASSWORD, FINGERPRINT),
      ...Array.from({ length: 4 }, () => helper.getSemesterIdList()),
    ]);
    expect(server.maxConcurrentSso).toBe(1);
    expect(server.loginCount).toBe(2);
  });

  it('still runs an explicit login after a failed one', async () => {
    const server = new FakeServer();
    const helper = server.helper();
    await expect(helper.login(USERNAME, 'wrong', FINGERPRINT)).rejects.toHaveProperty(
      'reason',
      FailReason.BAD_CREDENTIAL,
    );
    await helper.login(USERNAME, PASSWORD, FINGERPRINT);
    expect(server.loginCount).toBe(1);
  });
});

describe('withTimeout', () => {
  it('lets the caller cancel reading the body after the headers arrived', async () => {
    let seen: AbortSignal | undefined;
    const fetch = withTimeout(async (_input, init) => {
      seen = init?.signal ?? undefined;
      return new Response('');
    }, 1000);
    const controller = new AbortController();
    await fetch('https://example.com', { signal: controller.signal });
    controller.abort();
    expect(seen?.aborted).toBe(true);
  });

  it('uses a per-request timeout, 0 for none', async () => {
    const slow = withTimeout(
      (_input, init) =>
        new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => resolve(new Response('')), 30);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
          });
        }),
      10,
    );
    await expect(slow('https://example.com')).rejects.toHaveProperty('reason', FailReason.REQUEST_TIMEOUT);
    await expect(slow('https://example.com', { timeout: 0 })).resolves.toBeInstanceOf(Response);
  });
});

describe('withNetworkError', () => {
  it('passes responses through, also error statuses', async () => {
    const res = new Response('', { status: 500 });
    await expect(withNetworkError(async () => res)('https://example.com')).resolves.toBe(res);
  });

  it('turns a failed fetch into NETWORK_ERROR with the error in extra', async () => {
    const error = new TypeError('fetch failed');
    await expect(withNetworkError(() => Promise.reject(error))('https://example.com')).rejects.toEqual({
      reason: FailReason.NETWORK_ERROR,
      extra: error,
    });
  });

  it("leaves ApiErrors and the caller's abort unchanged", async () => {
    const timeout = { reason: FailReason.REQUEST_TIMEOUT };
    await expect(withNetworkError(() => Promise.reject(timeout))('https://example.com')).rejects.toBe(timeout);

    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('aborted', 'AbortError');
    await expect(
      withNetworkError(() => Promise.reject(abort))('https://example.com', { signal: controller.signal }),
    ).rejects.toBe(abort);
  });
});

describe('isConnectionError', () => {
  it('is true for NETWORK_ERROR and REQUEST_TIMEOUT only', () => {
    expect(isConnectionError({ reason: FailReason.NETWORK_ERROR })).toBe(true);
    expect(isConnectionError({ reason: FailReason.REQUEST_TIMEOUT })).toBe(true);
    expect(isConnectionError({ reason: FailReason.ERROR_FETCH_FROM_ID })).toBe(false);
    expect(isConnectionError(new TypeError('fetch failed'))).toBe(false);
    expect(isConnectionError(undefined)).toBe(false);
  });
});

describe('limitConcurrency', () => {
  /** an inner fetch whose calls wait until the test settles them, by their argument */
  const controlled = () => {
    const calls: { id: number; resolve: () => void; reject: (err: unknown) => void }[] = [];
    let running = 0;
    let maxRunning = 0;
    const inner = (id: number) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      return new Promise<Response>((resolve, reject) => {
        const done = () => (running -= 1);
        calls.push({
          id,
          resolve: () => (done(), resolve(new Response(String(id)))),
          reject: (err) => (done(), reject(err)),
        });
      });
    };
    return { inner, calls, started: () => calls.map((c) => c.id), maxRunning: () => maxRunning };
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('runs at most max calls at once and starts the waiting ones in FIFO order', async () => {
    const { inner, calls, started, maxRunning } = controlled();
    const limited = limitConcurrency(inner, 2);
    const results = [1, 2, 3, 4, 5].map((id) => limited(id));
    await tick();
    expect(started()).toEqual([1, 2]);

    calls[1].resolve();
    await tick();
    expect(started()).toEqual([1, 2, 3]);
    calls[0].resolve();
    await tick();
    expect(started()).toEqual([1, 2, 3, 4]);
    calls[2].resolve();
    calls[3].resolve();
    await tick();
    calls[4].resolve();

    expect(await Promise.all(results.map(async (r) => (await r).text()))).toEqual(['1', '2', '3', '4', '5']);
    expect(maxRunning()).toBe(2);
  });

  it('frees the slot of a call that rejects', async () => {
    const { inner, calls, started } = controlled();
    const limited = limitConcurrency(inner, 1);
    const first = limited(1);
    const second = limited(2);
    await tick();
    expect(started()).toEqual([1]);

    calls[0].reject(new Error('boom'));
    await expect(first).rejects.toThrow('boom');
    await tick();
    expect(started()).toEqual([1, 2]);
    calls[1].resolve();
    expect(await (await second).text()).toBe('2');
  });

  it('does not limit for Infinity or a max below 1', () => {
    const inner = async () => new Response('');
    expect(limitConcurrency(inner, Infinity)).toBe(inner);
    expect(limitConcurrency(inner, 0)).toBe(inner);
    expect(limitConcurrency(inner, NaN)).toBe(inner);
  });
});
