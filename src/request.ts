import * as cheerio from 'cheerio';
import type { Element } from 'cheerio';
import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';

import type { CredentialProvider, Fetch, HelperConfig } from './types.ts';
import { FailReason, Language } from './types.ts';

const CHEERIO_CONFIG: cheerio.CheerioOptions = { xml: true };

export const $ = (html: string | Element | Element[]): cheerio.CheerioAPI => {
  return cheerio.load(html, CHEERIO_CONFIG);
};

export const noLogin = (res: Response) => res.url.includes('login_timeout') || res.status === 403;

export const YES = '是';

/** add CSRF token to any request URL as parameters */
export const addCSRFTokenToUrl = (url: string, token: string): string => {
  const newUrl = new URL(url);
  newUrl.searchParams.set('_csrf', token);
  return newUrl.toString();
};

function makeFetch(jar?: CookieJar): typeof fetch {
  return fetchCookie(fetch, jar);
}

function withReAuth(rawFetch: Fetch, login: () => Promise<void>): Fetch {
  return async function wrappedFetch(...args) {
    const retryAfterLogin = async () => {
      await login();
      return await rawFetch(...args).then((res: Response) => {
        if (noLogin(res)) {
          return Promise.reject({
            reason: FailReason.NOT_LOGGED_IN,
          });
        } else if (res.status !== 200) {
          return Promise.reject({
            reason: FailReason.UNEXPECTED_STATUS,
            extra: {
              code: res.status,
              text: res.statusText,
            },
          });
        } else {
          return res;
        }
      });
    };
    return await rawFetch(...args).then((res: Response) => (noLogin(res) ? retryAfterLogin() : res));
  };
}

/**
 * State shared by every request a `Learn2018Helper` makes: cookies, CSRF token, language and the fetch wrappers.
 * Internal; the helper keeps it in a private field.
 */
export class Session {
  readonly provider?: CredentialProvider;
  readonly cookieJar: CookieJar;
  /** plain fetch with cookies, no login check */
  readonly rawFetch: Fetch;
  /** rejects with `NOT_LOGGED_IN`, or logs in again and retries once when a `CredentialProvider` is set */
  readonly fetch: Fetch;
  csrfToken = '';
  lang = Language.ZH;
  previewFirstPage: boolean;

  /** `login` is called with no arguments when a request needs a (new) session */
  constructor(
    config: HelperConfig | undefined,
    readonly login: () => Promise<void>,
  ) {
    this.previewFirstPage = config?.generatePreviewUrlForFirstPage ?? true;
    this.provider = config?.provider;
    this.cookieJar = config?.cookieJar ?? new CookieJar();
    this.rawFetch = config?.fetch ?? makeFetch(this.cookieJar);
    this.fetch = this.provider
      ? withReAuth(this.rawFetch, login)
      : async (...args) => {
          const result = await this.rawFetch(...args);
          if (noLogin(result))
            return Promise.reject({
              reason: FailReason.NOT_LOGGED_IN,
            });
          return result;
        };
  }

  /** like `fetch`, but logs in first if there is no CSRF token yet and adds the token to the URL */
  readonly fetchWithToken: Fetch = async (...args) => {
    if (this.csrfToken === '') {
      await this.login();
    }
    const [url, ...remaining] = args;
    return this.fetch(addCSRFTokenToUrl(url as string, this.csrfToken), ...remaining);
  };
}
