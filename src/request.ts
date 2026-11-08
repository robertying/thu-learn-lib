import * as cheerio from 'cheerio';
import type { Element } from 'cheerio';
import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';

import type { ApiError, CredentialProvider, Fetch, HelperConfig } from './types.ts';
import { FailReason, Language } from './types.ts';

const CHEERIO_CONFIG: cheerio.CheerioOptions = { xml: true };

export const $ = (html: string | Element | Element[]): cheerio.CheerioAPI => {
  return cheerio.load(html, CHEERIO_CONFIG);
};

export const noLogin = (res: Response) => res.url.includes('login_timeout') || res.status === 403;

export const YES = '是';

/** default for `HelperConfig.maxConcurrentRequests` */
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 6;
/** default for `HelperConfig.requestTimeout`, in milliseconds */
export const DEFAULT_REQUEST_TIMEOUT = 60_000;

/** add CSRF token to any request URL as parameters */
export const addCSRFTokenToUrl = (url: string, token: string): string => {
  const newUrl = new URL(url);
  newUrl.searchParams.set('_csrf', token);
  return newUrl.toString();
};

function makeFetch(jar?: CookieJar): typeof fetch {
  return fetchCookie(fetch, jar);
}

const urlOf = (input: Parameters<Fetch>[0]): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/**
 * Let at most `max` calls of `inner` run at once; the rest wait in FIFO order. A slot is freed when the response
 * headers arrive (or the call fails), so reading a body does not hold one.
 */
export function limitConcurrency(inner: Fetch, max: number): Fetch {
  if (!(max >= 1) || max === Infinity) return inner;
  let active = 0;
  const waiting: (() => void)[] = [];
  const acquire = (): Promise<void> => {
    if (active < max) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  };
  const release = () => {
    const next = waiting.shift();
    // hand the slot straight to the next caller, so `active` stays the same
    if (next) next();
    else active -= 1;
  };
  return async (...args) => {
    await acquire();
    try {
      return await inner(...args);
    } finally {
      release();
    }
  };
}

/**
 * Abort a call of `inner` that has no response headers after `ms` milliseconds and reject it with
 * `FailReason.REQUEST_TIMEOUT`. A caller's own `signal` still works. Uses only `AbortController` and `setTimeout`,
 * which React Native has (unlike `AbortSignal.timeout` / `AbortSignal.any`).
 */
export function withTimeout(inner: Fetch, ms: number): Fetch {
  if (!(ms > 0) || ms === Infinity) return inner;
  return async (input, init) => {
    const controller = new AbortController();
    const outer = init?.signal ?? undefined;
    const forward = () => controller.abort(outer?.reason);
    if (outer?.aborted) forward();
    else outer?.addEventListener('abort', forward, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);
    try {
      return await inner(input, { ...init, signal: controller.signal });
    } catch (err) {
      if (timedOut) {
        throw {
          reason: FailReason.REQUEST_TIMEOUT,
          extra: { url: urlOf(input), timeout: ms },
        } as ApiError;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', forward);
    }
  };
}

/** free the connection of a response we won't read */
const discard = (res: Response) => {
  res.body?.cancel().catch(() => {});
};

/**
 * State shared by every request a `Learn2018Helper` makes: cookies, CSRF token, language and the fetch wrappers.
 * Internal; the helper keeps it in a private field.
 */
export class Session {
  readonly provider?: CredentialProvider;
  readonly cookieJar: CookieJar;
  /** fetch with cookies, the concurrency cap and the timeout, but no login check */
  readonly rawFetch: Fetch;
  #csrfToken = '';
  /** bumped whenever the session changes (login, `csrfToken` set), so late failures from an old session don't log in again */
  #generation = 0;
  #pendingLogin?: Promise<void>;
  lang = Language.ZH;
  previewFirstPage: boolean;

  /** `login` signs in through SSO with the `CredentialProvider`; the session calls it at most once at a time */
  constructor(
    config: HelperConfig | undefined,
    readonly login: () => Promise<void>,
  ) {
    this.previewFirstPage = config?.generatePreviewUrlForFirstPage ?? true;
    this.provider = config?.provider;
    this.cookieJar = config?.cookieJar ?? new CookieJar();
    this.rawFetch = limitConcurrency(
      withTimeout(config?.fetch ?? makeFetch(this.cookieJar), config?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT),
      config?.maxConcurrentRequests ?? DEFAULT_MAX_CONCURRENT_REQUESTS,
    );
  }

  get csrfToken(): string {
    return this.#csrfToken;
  }

  set csrfToken(token: string) {
    this.#csrfToken = token;
    this.#generation += 1;
  }

  /**
   * Log in with the `CredentialProvider`. Concurrent callers share one SSO login instead of starting one each.
   */
  relogin(): Promise<void> {
    this.#pendingLogin ??= this.login().finally(() => {
      this.#pendingLogin = undefined;
    });
    return this.#pendingLogin;
  }

  /**
   * Send a request built by `makeUrl` (called again for the retry, so it can pick up a new CSRF token).
   * When the session has expired, it rejects with `NOT_LOGGED_IN` if there is no `CredentialProvider`; otherwise it
   * logs in again (sharing a login already in progress, or skipping it if another request already renewed the
   * session) and retries once.
   */
  async #send(makeUrl: () => string, init?: RequestInit): Promise<Response> {
    const generation = this.#generation;
    const res = await this.rawFetch(makeUrl(), init);
    if (!noLogin(res)) return res;
    discard(res);
    if (!this.provider) {
      throw { reason: FailReason.NOT_LOGGED_IN } as ApiError;
    }
    if (this.#generation === generation) {
      await this.relogin();
    }
    const retry = await this.rawFetch(makeUrl(), init);
    if (noLogin(retry)) {
      discard(retry);
      throw { reason: FailReason.NOT_LOGGED_IN } as ApiError;
    }
    if (retry.status !== 200) {
      discard(retry);
      throw {
        reason: FailReason.UNEXPECTED_STATUS,
        extra: { code: retry.status, text: retry.statusText },
      } as ApiError;
    }
    return retry;
  }

  /** fetch with a login check (see `#send`) */
  readonly fetch: Fetch = (input, init) => this.#send(() => urlOf(input), init);

  /** like `fetch`, but logs in first if there is no CSRF token yet and adds the current token to the URL */
  readonly fetchWithToken: Fetch = async (input, init) => {
    if (this.#csrfToken === '') {
      await this.relogin();
    }
    const url = urlOf(input);
    return this.#send(() => addCSRFTokenToUrl(url, this.#csrfToken), init);
  };

  /**
   * Make sure the session works: if there is a CSRF token, make one cheap authenticated request (`probeUrl`) and log
   * in only if it fails; otherwise log in.
   */
  async ensureSession(probeUrl: string): Promise<void> {
    if (this.#csrfToken === '') {
      await this.relogin();
      return;
    }
    discard(await this.fetchWithToken(probeUrl));
  }
}
