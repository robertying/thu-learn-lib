import { describe, expect, it, vi } from 'vitest';

import { CourseType, FailReason } from '../src/index.ts';
import type { DownloadRequest } from '../src/index.ts';
import { isScriptRedirect } from '../src/request.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, PASSWORD, credential, html } from './helpers/fake-server.ts';

const FILE_URL = URLS.LEARN_FILE_DOWNLOAD('f1', CourseType.STUDENT);
const CHECK_PATH = FILE_URL.split('?')[0] + 'Before';
const REDIRECT = '<script>location.href="/f/login_timeout";</script>';
const FILE = 'the whole file';

/** a server with a course file and its download check */
const fileServer = (body: () => Response = () => new Response(FILE)) =>
  new FakeServer().on('GET', FILE_URL, body).on('GET', CHECK_PATH, () => html(''));

interface FakeDownload {
  status: number;
  url: string;
  size: number;
  text: () => Promise<string>;
  discard: () => void;
  body: string;
}

/** a transport that downloads with the server's fetch, as another client would, and records what it was asked */
const transportOf = (server: FakeServer) => {
  const requests: DownloadRequest[] = [];
  const discarded: string[] = [];
  const transport = vi.fn<(request: DownloadRequest) => Promise<FakeDownload>>(async (request) => {
    requests.push(request);
    const res = await server.fetch(request.url, { headers: request.headers });
    const body = await res.text();
    return {
      status: res.status,
      url: res.url,
      size: body.length,
      text: vi.fn<() => Promise<string>>(async () => body),
      discard: () => {
        discarded.push(body);
      },
      body,
    };
  });
  return { transport, requests, discarded };
};

describe('download', () => {
  it('calls the course file check, then hands the transport the URL with the CSRF token', async () => {
    const server = fileServer();
    const helper = await server.loggedInHelper();
    const { transport, requests } = transportOf(server);

    const res = await helper.download(FILE_URL, transport);
    expect(res.body).toBe(FILE);
    expect(server.requests.map((r) => r.path)).toEqual([CHECK_PATH, FILE_URL.split('?')[0]]);
    expect(new URL(requests[0].url).searchParams.get('_csrf')).toBe(server.csrfToken);
    expect(requests[0].headers).toEqual({});
  });

  it('skips the check for a URL other than a course file', async () => {
    const url = `${URLS.LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/other?wjid=f1`;
    const server = new FakeServer().on('GET', url, () => new Response(FILE));
    const helper = await server.loggedInHelper();
    await helper.download(url, transportOf(server).transport);
    expect(server.requests).toHaveLength(1);
  });

  it('downloads even when the check fails', async () => {
    const server = new FakeServer().on('GET', FILE_URL, () => new Response(FILE));
    const helper = await server.loggedInHelper();
    await expect(helper.download(FILE_URL, transportOf(server).transport)).resolves.toHaveProperty('body', FILE);
  });

  it('sends the cookies from cookieHeader', async () => {
    const server = fileServer();
    const cookieHeader = vi.fn<(url: string) => string>(() => 'JSESSIONID=1');
    const helper = await server.loggedInHelper({ cookieHeader });
    const { transport, requests } = transportOf(server);
    await helper.download(FILE_URL, transport);
    expect(requests[0].headers).toEqual({ Cookie: 'JSESSIONID=1' });
    expect(cookieHeader).toHaveBeenCalledWith(requests[0].url);
  });

  it('logs in first without a session', async () => {
    const url = `${URLS.LEARN_PREFIX}/b/other?id=1`;
    const server = new FakeServer().on('GET', url, () => new Response(FILE));
    const helper = server.helper({ provider: () => credential });
    const { transport, requests } = transportOf(server);
    await helper.download(url, transport);
    expect(server.loginCount).toBe(1);
    expect(new URL(requests[0].url).searchParams.get('_csrf')).toBe('csrf-1');
  });

  it.each(['status', 'redirect', 'html'] as const)(
    'logs in again and downloads once more for an expired session answering by %s',
    async (expiry) => {
      const server = fileServer();
      const helper = await server.loggedInHelper();
      server.expiry = expiry;
      server.expireSession();
      const { transport, requests, discarded } = transportOf(server);

      await expect(helper.download(FILE_URL, transport)).resolves.toHaveProperty('body', FILE);
      // one login, whichever request found the session expired: the check (403, redirect) or the download (a 200
      // page, which the check's plain response doesn't count)
      expect(server.loginCount).toBe(2);
      expect(new URL(requests.at(-1)!.url).searchParams.get('_csrf')).toBe('csrf-2');
      expect(discarded).toHaveLength(requests.length - 1);
    },
  );

  it("logs in again for a file download's tiny script redirect", async () => {
    let calls = 0;
    const server = fileServer(() => new Response(++calls === 1 ? REDIRECT : FILE));
    const helper = await server.loggedInHelper();
    await expect(helper.download(FILE_URL, transportOf(server).transport)).resolves.toHaveProperty('body', FILE);
    expect(server.loginCount).toBe(2);
  });

  it('rejects with NOT_LOGGED_IN when the new session gets the redirect too', async () => {
    const server = fileServer(() => new Response(REDIRECT));
    const helper = await server.loggedInHelper();
    const { transport, discarded } = transportOf(server);
    await expect(helper.download(FILE_URL, transport)).rejects.toHaveProperty('reason', FailReason.NOT_LOGGED_IN);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(discarded).toHaveLength(2);
  });

  it('does not read a large body', async () => {
    const big = `<script>location.href="/";</script>${'x'.repeat(5000)}`;
    const server = fileServer(() => new Response(big));
    const helper = await server.loggedInHelper();
    const res = await helper.download(FILE_URL, transportOf(server).transport);
    expect(res.text).not.toHaveBeenCalled();
  });

  it('rejects with UNEXPECTED_STATUS for an error status, discarding it', async () => {
    const server = fileServer(() => new Response('oops', { status: 500 }));
    const helper = await server.loggedInHelper();
    const { transport, discarded } = transportOf(server);
    await expect(helper.download(FILE_URL, transport)).rejects.toMatchObject({
      reason: FailReason.UNEXPECTED_STATUS,
      extra: { code: 500 },
    });
    expect(discarded).toEqual(['oops']);
    expect(server.loginCount).toBe(1);
  });

  it('rejects with NETWORK_ERROR when the transport got no answer', async () => {
    const server = fileServer();
    const helper = await server.loggedInHelper();
    const failure = new Error('Unable to download a file');
    await expect(helper.download(FILE_URL, () => Promise.reject(failure))).rejects.toEqual({
      reason: FailReason.NETWORK_ERROR,
      extra: failure,
    });
  });

  it('passes an abort and an ApiError through', async () => {
    const server = fileServer();
    const helper = await server.loggedInHelper();
    const abort = new DOMException('Aborted', 'AbortError');
    await expect(helper.download(FILE_URL, () => Promise.reject(abort))).rejects.toBe(abort);
    const apiError = { reason: FailReason.REQUEST_TIMEOUT };
    await expect(helper.download(FILE_URL, () => Promise.reject(apiError))).rejects.toBe(apiError);
  });

  it('rejects a URL off Web Learning without sending it', async () => {
    const helper = await fileServer().loggedInHelper();
    const transport = vi.fn<() => Promise<never>>();
    for (const url of ['https://example.com/a.pdf', 'not a url']) {
      await expect(helper.download(url, transport)).rejects.toHaveProperty('reason', FailReason.INVALID_RESPONSE);
    }
    expect(transport).not.toHaveBeenCalled();
  });

  it('rejects with NOT_LOGGED_IN without a CredentialProvider', async () => {
    const server = fileServer();
    const helper = server.helper();
    await helper.login(credential);
    server.expireSession();
    await expect(helper.download(FILE_URL, transportOf(server).transport)).rejects.toHaveProperty(
      'reason',
      FailReason.NOT_LOGGED_IN,
    );
  });

  it('does not try a turned-down password again', async () => {
    const server = fileServer();
    let password = PASSWORD;
    const helper = server.helper({ provider: () => ({ ...credential, password }) });
    await helper.login();
    password = 'changed';
    server.expireSession();
    const { transport } = transportOf(server);
    await expect(helper.download(FILE_URL, transport)).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
    await expect(helper.download(FILE_URL, transport)).rejects.toHaveProperty('reason', FailReason.BAD_CREDENTIAL);
    expect(server.count(URLS.ID_LOGIN_CHECK, 'POST')).toBe(2);
  });
});

describe('isScriptRedirect', () => {
  it('takes only a tiny page that starts with a script setting the location', () => {
    expect(isScriptRedirect(REDIRECT)).toBe(true);
    expect(isScriptRedirect("<script type='text/javascript'>window.location = '/';</script>")).toBe(true);
    expect(isScriptRedirect('location.href="/"')).toBe(false);
    expect(isScriptRedirect('a text file: location = 1')).toBe(false);
    expect(isScriptRedirect(`<script>location.href="/${'a'.repeat(100)}"</script>`)).toBe(false);
  });
});
