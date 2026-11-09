import * as cheerio from 'cheerio';
import fetchCookie from 'fetch-cookie';
import { fetch } from 'node-fetch-native';
import { CookieJar } from 'tough-cookie';

import type { ApiError, CredentialProvider, Fetch, HelperConfig } from './types.ts';
import { FailReason, Language } from './types.ts';

const CHEERIO_CONFIG: cheerio.CheerioOptions = { xml: true };

/** a DOM element as cheerio's selections hold it (domhandler's `Element`, taken from cheerio's types so it always matches) */
export type Element = ReturnType<ReturnType<cheerio.CheerioAPI['root']>['children']>[number];

export const $ = (html: Parameters<typeof cheerio.load>[0]): cheerio.CheerioAPI => {
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
export function limitConcurrency<F extends (...args: any[]) => Promise<Response>>(inner: F, max: number): F {
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
  return (async (...args: Parameters<F>) => {
    await acquire();
    try {
      return await inner(...args);
    } finally {
      release();
    }
  }) as F;
}

/** `RequestInit` plus a per-request `timeout` (milliseconds; 0 or `Infinity` for none) */
export type RequestOptions = RequestInit & { timeout?: number };

/** a `Fetch` whose `init` can also carry a per-request `timeout` */
export type TimedFetch = (input: Parameters<Fetch>[0], init?: RequestOptions) => Promise<Response>;

/**
 * Abort a call of `inner` that has no response headers after `ms` milliseconds (or `init.timeout`, which overrides it
 * for one request) and reject it with `FailReason.REQUEST_TIMEOUT`. A caller's own `signal` still works, also while
 * the body is read. Uses only `AbortController` and `setTimeout`, which React Native has (unlike
 * `AbortSignal.timeout` / `AbortSignal.any`). Note that React Native's fetch resolves only after the whole body has
 * arrived, so there the timeout covers the download too.
 */
export function withTimeout(inner: Fetch, ms: number): TimedFetch {
  return async (input, options) => {
    const { timeout = ms, ...init } = options ?? {};
    if (!(timeout > 0) || timeout === Infinity) return inner(input, init);
    const controller = new AbortController();
    const outer = init.signal ?? undefined;
    const forward = () => controller.abort(outer?.reason);
    if (outer?.aborted) forward();
    // kept after the headers arrive, so the caller can still cancel reading the body
    else outer?.addEventListener('abort', forward, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    try {
      return await inner(input, { ...init, signal: controller.signal });
    } catch (err) {
      outer?.removeEventListener('abort', forward);
      if (timedOut) {
        throw {
          reason: FailReason.REQUEST_TIMEOUT,
          extra: { url: urlOf(input), timeout },
        } as ApiError;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Reject a call of `inner` that fails without any response (the fetch implementation's own error: `TypeError: fetch
 * failed` in Node, `Network request failed` in React Native) with `FailReason.NETWORK_ERROR`, keeping the error in
 * `extra`. An `ApiError` (such as `REQUEST_TIMEOUT`) and the caller's own abort pass through unchanged.
 */
export function withNetworkError(inner: TimedFetch): TimedFetch {
  return async (input, init) => {
    try {
      return await inner(input, init);
    } catch (err) {
      if ((err as ApiError | undefined)?.reason !== undefined || init?.signal?.aborted) throw err;
      throw { reason: FailReason.NETWORK_ERROR, extra: err } as ApiError;
    }
  };
}

/** whether an error means the server was not reached: `NETWORK_ERROR`, or `REQUEST_TIMEOUT` (no answer in time) */
export const isConnectionError = (err: unknown): boolean => {
  const reason = (err as ApiError | undefined)?.reason;
  return reason === FailReason.NETWORK_ERROR || reason === FailReason.REQUEST_TIMEOUT;
};

/** free the connection of a response we won't read */
export const discard = (res: Response) => {
  res.body?.cancel().catch(() => {});
};

/** returned by a read step when the response turned out to be from an expired session */
const EXPIRED = Symbol('expired');

/** pages longer than this are taken as real pages, never as the short login / redirect page of an expired session */
const MAX_LOGIN_PAGE_LENGTH = 4096;

/**
 * Whether a 200 page is the short login or redirect page of an expired session rather than the page asked for: short,
 * and either Web Learning's "login timeout" page (what the server sends for an HTML page of an expired session, in
 * either website language: title 登录超时, image `log_fail.png`, text 您未登录或登录失效) or a page pointing at the
 * login timeout page or the SSO login.
 */
export const looksLikeLoginPage = (text: string) =>
  text.length < MAX_LOGIN_PAGE_LENGTH &&
  /登录超时|您未登录或登录失效|log_fail\.png|login_timeout|id\.tsinghua\.edu\.cn\/do\/off\/ui\/auth\/login|j_spring_security_thauth_roaming_entry/.test(
    text,
  );

/**
 * State shared by every request a `Learn2018Helper` makes: cookies, CSRF token, language and the fetch wrappers.
 * Internal; the helper keeps it in a private field.
 */
export class Session {
  readonly provider?: CredentialProvider;
  readonly cookieJar: CookieJar;
  /** fetch with cookies, the concurrency cap and the timeout, but no login check */
  readonly rawFetch: TimedFetch;
  #csrfToken = '';
  /** bumped whenever the session changes (login, `csrfToken` set), so late failures from an old session don't log in again */
  #generation = 0;
  #pendingLogin?: Promise<void>;
  /**
   * The `BAD_CREDENTIAL` of the last failed `CredentialProvider` login. Automatic logins (an expired session, no CSRF
   * token yet) reject with it instead of trying the same credentials again, which could lock the account; an explicit
   * `login`, or a new CSRF token, clears it.
   */
  #badCredential?: ApiError;
  lang = Language.ZH;
  previewFirstPage: boolean;
  /**
   * The device fingerprints of the last SSO login. id.tsinghua.edu.cn asks for them again when another site (WebVPN,
   * for the registrar) signs in with the same id.tsinghua.edu.cn session.
   */
  fingerprints?: { fingerPrint: string; fingerGenPrint: string; fingerGenPrint3: string };

  /** `loginWithProvider` signs in through SSO with the `CredentialProvider` */
  constructor(
    config: HelperConfig | undefined,
    readonly loginWithProvider: () => Promise<void>,
  ) {
    this.previewFirstPage = config?.generatePreviewUrlForFirstPage ?? true;
    this.provider = config?.provider;
    this.cookieJar = config?.cookieJar ?? new CookieJar();
    this.rawFetch = limitConcurrency(
      withNetworkError(
        withTimeout(config?.fetch ?? makeFetch(this.cookieJar), config?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT),
      ),
      config?.maxConcurrentRequests ?? DEFAULT_MAX_CONCURRENT_REQUESTS,
    );
  }

  get csrfToken(): string {
    return this.#csrfToken;
  }

  set csrfToken(token: string) {
    this.#csrfToken = token;
    this.#generation += 1;
    this.#badCredential = undefined;
  }

  /**
   * Run one login (`login`) at a time. It starts after a login already in progress has settled, and requests that
   * find the session expired meanwhile wait for it instead of starting their own (two SSO logins at once reset each
   * other's id.tsinghua.edu.cn cookie).
   */
  runLogin(login: () => Promise<void>): Promise<void> {
    const previous = this.#pendingLogin?.catch(() => {}) ?? Promise.resolve();
    const current: Promise<void> = previous.then(login).finally(() => {
      if (this.#pendingLogin === current) this.#pendingLogin = undefined;
    });
    this.#pendingLogin = current;
    return current;
  }

  /**
   * Log in with the `CredentialProvider`, or wait for the login already in progress (also one with explicit
   * credentials) instead of starting another. Called by `login()`, so it tries again after a `BAD_CREDENTIAL`.
   */
  relogin(): Promise<void> {
    this.#badCredential = undefined;
    return this.autoRelogin();
  }

  /**
   * `relogin` for a login nobody asked for (an expired session, no CSRF token yet, the registrar wanting a new
   * id.tsinghua.edu.cn session), unless the last provider login was turned down with `BAD_CREDENTIAL`: then reject with
   * that again
   */
  autoRelogin(): Promise<void> {
    return this.#badCredential
      ? Promise.reject(this.#badCredential)
      : (this.#pendingLogin ?? this.runLogin(this.#providerLogin));
  }

  #providerLogin = async (): Promise<void> => {
    try {
      await this.loginWithProvider();
    } catch (err) {
      if ((err as ApiError | undefined)?.reason === FailReason.BAD_CREDENTIAL) this.#badCredential = err as ApiError;
      throw err;
    }
  };

  /**
   * Send a request built by `makeUrl` (called again for the retry, so it can pick up a new CSRF token) and read it
   * with `read`, which returns `EXPIRED` for a body that shows the session has expired.
   * When the session has expired, it rejects with `NOT_LOGGED_IN` if there is no `CredentialProvider`; otherwise it
   * logs in again (sharing a login already in progress, or skipping it if another request already renewed the
   * session) and retries once. After a provider login failed with `BAD_CREDENTIAL` it rejects with that instead, until
   * the next explicit `login`.
   */
  async #send<T>(
    makeUrl: () => string,
    init: RequestOptions | undefined,
    read: (res: Response, retry: boolean) => Promise<T | typeof EXPIRED>,
  ): Promise<T> {
    const attempt = async (retry: boolean): Promise<T | typeof EXPIRED> => {
      const res = await this.rawFetch(makeUrl(), init);
      if (noLogin(res)) {
        discard(res);
        return EXPIRED;
      }
      return read(res, retry);
    };
    const generation = this.#generation;
    const first = await attempt(false);
    if (first !== EXPIRED) return first;
    if (!this.provider) {
      throw { reason: FailReason.NOT_LOGGED_IN } as ApiError;
    }
    if (this.#generation === generation) {
      await this.autoRelogin();
    }
    const second = await attempt(true);
    if (second === EXPIRED) {
      throw { reason: FailReason.NOT_LOGGED_IN } as ApiError;
    }
    return second;
  }

  /** the response, but after a re-login only one with status 200 */
  static readonly #response = async (res: Response, retry: boolean): Promise<Response> => {
    if (retry && res.status !== 200) {
      discard(res);
      throw {
        reason: FailReason.UNEXPECTED_STATUS,
        extra: { code: res.status, text: res.statusText },
      } as ApiError;
    }
    return res;
  };

  /** the parsed JSON body; the login page with status 200 instead means the session has expired */
  static readonly #json = async (res: Response): Promise<any> => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (res.status === 200 && looksLikeLoginPage(text)) return EXPIRED;
      throw {
        reason: res.status === 200 ? FailReason.INVALID_RESPONSE : FailReason.UNEXPECTED_STATUS,
        extra: { code: res.status, text: text.slice(0, 200) },
      } as ApiError;
    }
  };

  /** the text body; a short login / redirect page with status 200 means the session has expired */
  static readonly #text = async (res: Response, retry: boolean): Promise<string | typeof EXPIRED> => {
    await Session.#response(res, retry);
    const text = await res.text();
    return res.status === 200 && looksLikeLoginPage(text) ? EXPIRED : text;
  };

  #withToken = async (input: Parameters<Fetch>[0]): Promise<() => string> => {
    if (this.#csrfToken === '') {
      await this.autoRelogin();
    }
    const url = urlOf(input);
    return () => addCSRFTokenToUrl(url, this.#csrfToken);
  };

  /** fetch with a login check (see `#send`); logs in first if there is no CSRF token yet and adds it to the URL */
  readonly fetchWithToken: TimedFetch = async (input, init) =>
    this.#send(await this.#withToken(input), init, Session.#response);

  /**
   * Like `fetchWithToken`, but returns the parsed JSON body. The short login page with status 200 instead of JSON
   * counts as an expired session (log in again and retry once, as for a 403); any other page is `INVALID_RESPONSE`.
   */
  readonly fetchJsonWithToken = async (input: Parameters<Fetch>[0], init?: RequestOptions): Promise<any> =>
    this.#send(await this.#withToken(input), init, Session.#json);

  /**
   * Like `fetchWithToken`, but returns the text body (an HTML page). A short login or redirect page with status 200
   * counts as an expired session (log in again and retry once, as for a 403).
   */
  readonly fetchTextWithToken = async (input: Parameters<Fetch>[0], init?: RequestOptions): Promise<string> =>
    this.#send(await this.#withToken(input), init, Session.#text);

  /**
   * Make sure the session works: if there is a CSRF token, fetch the current semester (`probeUrl`) and log in only if
   * the session has expired; otherwise log in.
   */
  async ensureSession(probeUrl: string): Promise<void> {
    if (this.#csrfToken === '') {
      await this.autoRelogin();
      return;
    }
    const json = await this.fetchJsonWithToken(probeUrl);
    if (json?.message !== 'success') {
      throw { reason: FailReason.INVALID_RESPONSE, extra: json } as ApiError;
    }
  }
}
