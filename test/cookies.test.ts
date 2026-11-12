import { afterEach, describe, expect, it, vi } from 'vitest';

import { CookieJar, cookieJarConfig } from '../src/cookies.ts';
import * as URLS from '../src/urls.ts';
import { urlOf } from '../src/utils.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cookieJarConfig', () => {
  it('keeps the cookies the server sets in the jar and sends them back', async () => {
    const sent: (string | null)[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(new Headers(init?.headers).get('cookie'));
      const res = new Response('', { headers: { 'Set-Cookie': 'JSESSIONID=abc; Path=/' } });
      // fetch-cookie reads the cookie's site from the response's URL, which a constructed Response lacks
      Object.defineProperty(res, 'url', { value: urlOf(input) });
      return res;
    });
    const { fetch, cookieJar } = cookieJarConfig();

    await fetch(URLS.ID_LOGIN);
    await fetch(URLS.ID_LOGIN);

    expect(sent).toEqual([null, 'JSESSIONID=abc']);
    expect(await cookieJar.getCookieString(URLS.ID_PREFIX)).toBe('JSESSIONID=abc');
  });

  it('forgets the id.tsinghua.edu.cn session before a login, keeping other sites', async () => {
    const cookieJar = new CookieJar();
    await cookieJar.setCookie('JSESSIONID=abc; Path=/', URLS.ID_PREFIX);
    await cookieJar.setCookie('XSRF=1; Path=/', URLS.LEARN_PREFIX);
    const { clearLoginCookies } = cookieJarConfig(cookieJar);

    await clearLoginCookies();

    expect(await cookieJar.getCookieString(URLS.ID_PREFIX)).toBe('JSESSIONID=');
    expect(await cookieJar.getCookieString(URLS.LEARN_PREFIX)).toBe('XSRF=1');
  });
});
