import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FailReason } from '../src/index.ts';
import type { Fetch } from '../src/index.ts';
import { withUploadProgress, xhrFetch } from '../src/request.ts';
import * as URLS from '../src/urls.ts';
import { FakeServer, html, json } from './helpers/fake-server.ts';
import { FakeXHR } from './helpers/fake-xhr.ts';

const attachment = { filename: 'a.txt', content: new Blob(['hi']) };

const submitServer = () => new FakeServer().on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'success' }));

describe('submitHomework with onProgress', () => {
  let server: FakeServer;

  beforeEach(() => {
    server = submitServer();
    FakeXHR.reset(server.fetch);
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploads with XMLHttpRequest, reporting the share sent', async () => {
    const helper = await server.loggedInHelper();
    FakeXHR.progress = [[1, 4], [4, 4], [5, 4], [3]];
    const progress: number[] = [];
    await helper.submitHomework('s-h1', { content: '<p>a</p>', attachment, onProgress: (p) => progress.push(p) });

    // past the total counts as done; an unknown total as nothing yet
    expect(progress).toEqual([0.25, 1, 1, 0]);
    expect(FakeXHR.sent).toHaveLength(1);
    expect(FakeXHR.sent[0].method).toBe('POST');
    expect(FakeXHR.sent[0].withCredentials).toBe(true);
    expect(new URL(FakeXHR.sent[0].url).searchParams.get('_csrf')).toBe(server.csrfToken);
    expect(server.requests.at(-1)!.form!.get('xszyid')).toBe('s-h1');
  });

  it('logs in again and uploads once more when the session has expired', async () => {
    const helper = await server.loggedInHelper();
    server.expireSession();
    await helper.submitHomework('s-h1', { content: 'text', onProgress: () => {} });
    expect(server.loginCount).toBe(2);
    expect(server.count(URLS.LEARN_HOMEWORK_SUBMIT)).toBe(2);
    expect(new URL(FakeXHR.sent[1].url).searchParams.get('_csrf')).toBe('csrf-2');
  });

  it('logs in again for the 200 login page an expired session can answer with', async () => {
    const helper = await server.loggedInHelper();
    server.expiry = 'html';
    server.expireSession();
    await helper.submitHomework('s-h1', { content: 'text', onProgress: () => {} });
    expect(server.loginCount).toBe(2);
  });

  it('rejects with OPERATION_FAILED when the server turns the submission down', async () => {
    server.on('POST', URLS.LEARN_HOMEWORK_SUBMIT, () => json({ result: 'error', msg: '作业已截止' }));
    const helper = await server.loggedInHelper();
    await expect(helper.submitHomework('s-h1', { onProgress: () => {} })).rejects.toMatchObject({
      reason: FailReason.OPERATION_FAILED,
      extra: { msg: '作业已截止' },
    });
  });

  it.each(['error', 'timeout'] as const)('rejects with NETWORK_ERROR on an XMLHttpRequest %s', async (fail) => {
    const helper = await server.loggedInHelper();
    FakeXHR.fail = fail;
    await expect(helper.submitHomework('s-h1', { onProgress: () => {} })).rejects.toHaveProperty(
      'reason',
      FailReason.NETWORK_ERROR,
    );
    expect(server.loginCount).toBe(1);
  });

  it('sends with fetch without onProgress', async () => {
    const helper = await server.loggedInHelper();
    await helper.submitHomework('s-h1', { content: 'text' });
    expect(FakeXHR.sent).toHaveLength(0);
    expect(server.count(URLS.LEARN_HOMEWORK_SUBMIT)).toBe(1);
  });
});

describe('xhrFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers like fetch: status, text and the final URL, with the headers sent', async () => {
    FakeXHR.reset(async () => {
      const res = html('<p>page</p>', 201);
      Object.defineProperty(res, 'url', { value: 'https://learn.tsinghua.edu.cn/after' });
      return res;
    });
    const res = await xhrFetch('https://learn.tsinghua.edu.cn/a', { headers: { 'X-Test': '1' } });
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('<p>page</p>');
    expect(res.url).toBe('https://learn.tsinghua.edu.cn/after');
    expect(FakeXHR.sent[0]).toMatchObject({ method: 'GET', headers: { 'x-test': '1' } });
  });

  it('has no body for a status that has none', async () => {
    FakeXHR.reset(async () => new Response(null, { status: 204 }));
    const res = await xhrFetch('https://learn.tsinghua.edu.cn/a');
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("rejects with the signal's reason when aborted, before or during the request", async () => {
    FakeXHR.reset(() => new Promise<Response>(() => {}));
    const before = new AbortController();
    before.abort(new Error('before'));
    await expect(xhrFetch('https://x', { signal: before.signal })).rejects.toThrow('before');
    expect(FakeXHR.sent).toHaveLength(0);

    const during = new AbortController();
    const pending = xhrFetch('https://x', { signal: during.signal });
    await Promise.resolve();
    during.abort(new Error('during'));
    await expect(pending).rejects.toThrow('during');
  });

  it('rejects with an AbortError for an abort without a signal', async () => {
    FakeXHR.reset(() => new Promise<Response>(() => {}));
    const xhrs: FakeXHR[] = [];
    vi.stubGlobal(
      'XMLHttpRequest',
      class extends FakeXHR {
        constructor() {
          super();
          xhrs.push(this);
        }
      },
    );
    const pending = xhrFetch('https://x');
    xhrs[0].abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
  });
});

describe('withUploadProgress', () => {
  it('sends through the given fetch, without the callback, where there is no XMLHttpRequest', async () => {
    const inner = vi.fn<Fetch>(async () => new Response('ok'));
    const onUploadProgress = vi.fn<(sent: number, total: number) => void>();
    await withUploadProgress(inner)('https://x', { method: 'POST', onUploadProgress } as RequestInit);
    expect(inner).toHaveBeenCalledWith('https://x', { method: 'POST' });
    expect(onUploadProgress).not.toHaveBeenCalled();
  });
});
