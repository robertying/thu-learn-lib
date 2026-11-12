// Cookies for runtimes whose `fetch` keeps none (Node): a separate entry point, so apps whose `fetch` has its own
// cookie store (React Native, browsers) don't bundle fetch-cookie and tough-cookie.

import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

import type { Fetch, HelperConfig } from './types.ts';
import * as URLS from './urls.ts';

export { CookieJar };

// the global fetch is looked up on each call, so a polyfill installed later is used too
const globalFetch: Fetch = (input, init) => globalThis.fetch(input, init);

/**
 * `fetch` and `clearLoginCookies` for `HelperConfig` that keep the session's cookies in `cookieJar` (a new one by
 * default; pass a saved one to resume a session): `new Learn2018Helper({ ...cookieJarConfig(), provider })`.
 */
export function cookieJarConfig(
  cookieJar = new CookieJar(),
): Required<Pick<HelperConfig, 'fetch' | 'clearLoginCookies'>> & { cookieJar: CookieJar } {
  return {
    cookieJar,
    fetch: fetchCookie(globalFetch, cookieJar),
    clearLoginCookies: async () => {
      await cookieJar.setCookie('JSESSIONID=; path=/; HttpOnly', URLS.ID_PREFIX);
    },
  };
}
