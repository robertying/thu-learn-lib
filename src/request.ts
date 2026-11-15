import type {
  ApiError,
  CredentialProvider,
  DownloadRequest,
  DownloadResponse,
  DownloadTransport,
  Fetch,
  HelperConfig,
} from './types.ts';
import { FailReason, Language } from './types.ts';
import { apiError, looksLikeLoginPage, urlOf } from './utils.ts';

export const noLogin = (res: Pick<Response, 'status'> & { url?: string }) =>
  !!res.url?.includes('login_timeout') || res.status === 403;

/** bodies this long or longer are never an expired session's page */
const MAX_SESSION_PAGE_SIZE = 4096;

/**
 * Whether a downloaded body is the tiny page (under 100 characters) that only redirects with a script, which a file
 * download of an expired session gets instead of the file. Only downloads are checked for it.
 */
export const isScriptRedirect = (text: string) =>
  text.length < 100 && /^\s*<script[^>]*>\s*(window\.)?location(\.href)?\s*=/i.test(text);

const isAbort = (err: unknown) => (err as Error | undefined)?.name === 'AbortError';

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

// The global fetch is looked up on each call, so a polyfill installed after this module loads is used too
const globalFetch: Fetch = (input, init) => globalThis.fetch(input, init);

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
export type RequestOptions = RequestInit & {
  timeout?: number;
  /**
   * called as the request body goes out, with the bytes sent and the total (0 when unknown); the request is then sent
   * with `XMLHttpRequest` where there is one (React Native, browsers), since `fetch` can't report upload progress
   */
  onUploadProgress?: (sent: number, total: number) => void;
};

/** a `Fetch` whose `init` can also carry a per-request `timeout` */
export type TimedFetch = (input: Parameters<Fetch>[0], init?: RequestOptions) => Promise<Response>;

/** statuses whose `Response` can't have a body */
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Send one request with `XMLHttpRequest`, reporting upload progress to `init.onUploadProgress`, and resolve with a
 * `Response` (its `url` the final one, after redirects), as `fetch` would. It fails like React Native's fetch: a
 * `TypeError` when no answer comes, and the signal's reason (or an `AbortError`) when it is aborted.
 */
export const xhrFetch = (input: Parameters<Fetch>[0], init: RequestOptions = {}): Promise<Response> =>
  new Promise((resolve, reject) => {
    const { signal } = init;
    // a plain `Error` named `AbortError`, as React Native's own clients reject with: `DOMException` may not exist there
    const aborted = () =>
      signal?.reason ?? Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? 'GET', urlOf(input));
    new Headers(init.headers).forEach((value, name) => xhr.setRequestHeader(name, value));
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (e) => init.onUploadProgress?.(e.loaded, e.lengthComputable ? e.total : 0));
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const settle = () => signal?.removeEventListener('abort', onAbort);
    xhr.addEventListener('load', () => {
      settle();
      const res = new Response(NULL_BODY_STATUSES.has(xhr.status) ? null : xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
      });
      Object.defineProperty(res, 'url', { value: xhr.responseURL });
      resolve(res);
    });
    const failed = () => {
      settle();
      reject(new TypeError('Network request failed'));
    };
    xhr.addEventListener('error', failed);
    xhr.addEventListener('timeout', failed);
    xhr.addEventListener('abort', () => {
      settle();
      reject(aborted());
    });
    xhr.send((init.body ?? null) as XMLHttpRequestBodyInit | null);
  });

/**
 * `inner`, but a request with `onUploadProgress` goes through `xhrFetch` where `XMLHttpRequest` exists (React Native,
 * browsers); elsewhere (Node) it goes through `inner` and reports no progress.
 */
export function withUploadProgress(inner: Fetch): Fetch {
  return (input, init?: RequestOptions) => {
    const { onUploadProgress, ...rest } = init ?? {};
    return onUploadProgress && typeof XMLHttpRequest !== 'undefined'
      ? xhrFetch(input, { ...rest, onUploadProgress })
      : inner(input, rest);
  };
}

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
        throw apiError(FailReason.REQUEST_TIMEOUT, { url: urlOf(input), timeout });
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
      throw apiError(FailReason.NETWORK_ERROR, err);
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

/**
 * Send a download once with `transport` and classify the answer: a transport failure is `NETWORK_ERROR`, a 403, a
 * redirect to the login timeout page or a small login / script-redirect page is an expired session, any other status
 * than 2xx is `UNEXPECTED_STATUS`. Every response it doesn't return is discarded.
 */
const downloadAttempt = async <T extends DownloadResponse>(
  transport: DownloadTransport<T>,
  request: DownloadRequest,
): Promise<T | typeof EXPIRED> => {
  let res: T;
  try {
    res = await transport(request);
  } catch (err) {
    if ((err as ApiError | undefined)?.reason !== undefined || isAbort(err)) throw err;
    throw apiError(FailReason.NETWORK_ERROR, err);
  }
  if (noLogin(res)) {
    res.discard?.();
    return EXPIRED;
  }
  if (res.status < 200 || res.status >= 300) {
    res.discard?.();
    throw apiError(FailReason.UNEXPECTED_STATUS, { code: res.status });
  }
  if (res.size < MAX_SESSION_PAGE_SIZE) {
    const text = await res.text();
    if (looksLikeLoginPage(text) || isScriptRedirect(text)) {
      res.discard?.();
      return EXPIRED;
    }
  }
  return res;
};

/**
 * Send a download once with `transport`, without the helper's session (no login, CSRF token or retry), and check the
 * answer as `download` does; an expired-session answer rejects with `NOT_LOGGED_IN`. For a client that emulates the
 * server, so its downloads fail the same way as real ones.
 */
export const sendDownload = async <T extends DownloadResponse>(
  transport: DownloadTransport<T>,
  request: DownloadRequest,
): Promise<T> => {
  const res = await downloadAttempt(transport, request);
  if (res === EXPIRED) throw apiError(FailReason.NOT_LOGGED_IN);
  return res;
};

/**
 * State shared by every request a `Learn2018Helper` makes: cookies, CSRF token, language and the fetch wrappers.
 * Internal; the helper keeps it in a private field.
 */
export class Session {
  readonly provider?: CredentialProvider;
  /** `HelperConfig.clearLoginCookies` */
  readonly clearLoginCookies?: () => void | Promise<void>;
  /** `HelperConfig.cookieHeader` */
  readonly cookieHeader?: HelperConfig['cookieHeader'];
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
  lang: Language = Language.ZH;
  previewFirstPage: boolean;
  /**
   * The device fingerprints of the last SSO login. id.tsinghua.edu.cn asks for them again when another site (WebVPN,
   * for the registrar) signs in with the same id.tsinghua.edu.cn session.
   */
  fingerprints?: { fingerPrint: string; fingerGenPrint: string; fingerGenPrint3: string };

  /** signs in through SSO with the `CredentialProvider` */
  readonly loginWithProvider: () => Promise<void>;

  constructor(config: HelperConfig | undefined, loginWithProvider: () => Promise<void>) {
    this.loginWithProvider = loginWithProvider;
    this.previewFirstPage = config?.previewFirstPage ?? true;
    this.provider = config?.provider;
    this.clearLoginCookies = config?.clearLoginCookies;
    this.cookieHeader = config?.cookieHeader;
    this.rawFetch = limitConcurrency(
      withNetworkError(
        withTimeout(
          withUploadProgress(config?.fetch ?? globalFetch),
          config?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT,
        ),
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
    return this.#retryExpired(async (retry) => {
      const res = await this.rawFetch(makeUrl(), init);
      if (noLogin(res)) {
        discard(res);
        return EXPIRED;
      }
      return read(res, retry);
    });
  }

  /**
   * Run `attempt`; when it finds the session expired (returns `EXPIRED`), log in again and run it once more, as
   * `#send` describes. Every request that may find the session expired goes through here, downloads sent with another
   * client (`download`) included, so they all renew it the same way.
   */
  async #retryExpired<T>(attempt: (retry: boolean) => Promise<T | typeof EXPIRED>): Promise<T> {
    const generation = this.#generation;
    const first = await attempt(false);
    if (first !== EXPIRED) return first;
    if (!this.provider) {
      throw apiError(FailReason.NOT_LOGGED_IN);
    }
    if (this.#generation === generation) {
      await this.autoRelogin();
    }
    const second = await attempt(true);
    if (second === EXPIRED) {
      throw apiError(FailReason.NOT_LOGGED_IN);
    }
    return second;
  }

  /**
   * Fetch a Web Learning URL with another client (`transport`), with the session handling of the helper's own requests:
   * log in first without a CSRF token, add the token (and `cookieHeader`'s cookies) to the request, and take a 403, a
   * redirect to the login timeout page, or a small body that is a login or script-redirect page as an expired session:
   * then log in again and send it once more. A transport failure rejects with `NETWORK_ERROR`, a status other than
   * 2xx with `UNEXPECTED_STATUS`. Every response it doesn't return is discarded.
   */
  async download<T extends DownloadResponse>(url: string, transport: DownloadTransport<T>): Promise<T> {
    if (this.#csrfToken === '') {
      await this.autoRelogin();
    }
    return this.#retryExpired(async () => {
      const target = addCSRFTokenToUrl(url, this.#csrfToken);
      const cookie = await this.cookieHeader?.(target);
      return downloadAttempt(transport, { url: target, headers: cookie ? { Cookie: cookie } : {} });
    });
  }

  /** the response, but after a re-login only one with status 200 */
  static readonly #response = async (res: Response, retry: boolean): Promise<Response> => {
    if (retry && res.status !== 200) {
      discard(res);
      throw apiError(FailReason.UNEXPECTED_STATUS, { code: res.status, text: res.statusText });
    }
    return res;
  };

  /**
   * The parsed JSON body (after a re-login only from a response with status 200); the login page with status 200
   * instead means the session has expired.
   */
  static readonly #json = async (res: Response, retry: boolean): Promise<any> => {
    await Session.#response(res, retry);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (res.status === 200 && looksLikeLoginPage(text)) return EXPIRED;
      throw apiError(res.status === 200 ? FailReason.INVALID_RESPONSE : FailReason.UNEXPECTED_STATUS, {
        code: res.status,
        text: text.slice(0, 200),
      });
    }
  };

  /**
   * The text body (an HTML page); a short login / redirect page means the session has expired. Any status other than
   * 200 rejects with `UNEXPECTED_STATUS`, so an error page is never read as the page asked for.
   */
  static readonly #text = async (res: Response): Promise<string | typeof EXPIRED> => {
    if (res.status !== 200) {
      discard(res);
      throw apiError(FailReason.UNEXPECTED_STATUS, { code: res.status, text: res.statusText });
    }
    const text = await res.text();
    return looksLikeLoginPage(text) ? EXPIRED : text;
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
   * Like `fetchWithToken`, but returns the text body (an HTML page). A short login or redirect page counts as an
   * expired session (log in again and retry once, as for a 403); any other status than 200 rejects with
   * `UNEXPECTED_STATUS`.
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
      throw apiError(FailReason.INVALID_RESPONSE, json);
    }
  }
}
