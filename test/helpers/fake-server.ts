import { sm2 } from 'sm-crypto';

import type { Fetch, HelperConfig } from '../../src/index.ts';
import { Learn2018Helper } from '../../src/index.ts';
import * as URLS from '../../src/urls.ts';

export interface Request {
  method: string;
  url: URL;
  /** the URL without query string, which is what routes match on */
  path: string;
  form?: FormData;
  body?: string;
}

type Handler = (req: Request) => Response | Promise<Response>;

export const USERNAME = '2020000000';
export const PASSWORD = 'correct horse battery staple';
export const FINGERPRINT = 'fp';
export const credential = { username: USERNAME, password: PASSWORD, fingerPrint: FINGERPRINT };

export const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
export const html = (text: string) => new Response(text, { headers: { 'Content-Type': 'text/html' } });
export const success = (object: unknown) => json({ result: 'success', msg: '', object });

/** a string field of a form body ('' if missing) */
export const field = (req: Request, name: string): string => {
  const value = req.form?.get(name);
  return typeof value === 'string' ? value : '';
};

/** the `wlkcid` sent in a `LEARN_PAGE_LIST_FORM_DATA` body */
export const courseIdOf = (req: Request): string | undefined => {
  const aoData = req.form?.get('aoData');
  if (typeof aoData !== 'string') return undefined;
  return (JSON.parse(aoData) as { name: string; value: string }[]).find((d) => d.name === 'wlkcid')?.value;
};

const PUBLIC = { public: true };

const stripQuery = (url: URL) => url.origin + url.pathname;

/**
 * An in-memory Web Learning server for `HelperConfig.fetch`. It records every request, so tests can assert how many
 * requests an API makes, and simulates id.tsinghua.edu.cn SSO, CSRF tokens and session expiry.
 */
export class FakeServer {
  readonly requests: Request[] = [];
  readonly #routes = new Map<string, Handler>();
  readonly #keys = sm2.generateKeyPairHex();
  #loggedIn = false;
  #loginCount = 0;
  lang: 'zh' | 'en' = 'zh';
  /** extra HTML in the student homepage (which is also where login reads the CSRF token) */
  homepageBody = '';

  constructor() {
    this.on(
      'GET',
      URLS.ID_LOGIN(),
      () => html(`<html><body><div id="sm2publicKey">${this.#keys.publicKey}</div></body></html>`),
      PUBLIC,
    );
    this.on(
      'POST',
      URLS.ID_LOGIN_CHECK(),
      (req) => {
        const user = field(req, 'i_user');
        const pass = field(req, 'i_pass');
        const decrypted = pass.startsWith('04') ? sm2.doDecrypt(pass.slice(2), this.#keys.privateKey) : '';
        if (user !== USERNAME || decrypted !== PASSWORD) {
          return html('<html><body><div class="error">用户名或密码错误</div></body></html>');
        }
        return html(
          `<html><body><a href="${URLS.LEARN_AUTH_ROAM(`ticket-${this.#loginCount + 1}`)}">go</a></body></html>`,
        );
      },
      PUBLIC,
    );
    this.on(
      'GET',
      URLS.LEARN_AUTH_ROAM(''),
      (req) => {
        if (!req.url.searchParams.get('ticket')?.startsWith('ticket-')) return new Response('', { status: 401 });
        this.#loggedIn = true;
        this.#loginCount += 1;
        return html('');
      },
      PUBLIC,
    );
    this.on(
      'GET',
      URLS.LEARN_STUDENT_COURSE_LIST_PAGE(),
      () =>
        html(
          [
            '<html><head>',
            `<script src="/f/wlxt/common/languagejs?lang=${this.lang}"></script>`,
            '</head><body>',
            `<a href="/f/wlxt/index/course/student/course?wlkcid=x&_csrf=${this.csrfToken}">course</a>`,
            this.homepageBody,
            '</body></html>',
          ].join('\n'),
        ),
      PUBLIC,
    );
    this.on(
      'POST',
      URLS.LEARN_LOGOUT(),
      () => {
        this.#loggedIn = false;
        return html('');
      },
      PUBLIC,
    );
  }

  /** the CSRF token of the current login */
  get csrfToken() {
    return `csrf-${this.#loginCount}`;
  }

  /** how many SSO logins completed */
  get loginCount() {
    return this.#loginCount;
  }

  /** make the next authenticated requests fail with 403 until the client logs in again */
  expireSession() {
    this.#loggedIn = false;
  }

  /**
   * Route `method` + URL (query string ignored) to `handler`. Routes added with `on` require a login unless
   * `{ public: true }`.
   */
  on(method: string, url: string, handler: Handler, options: { public?: boolean } = {}) {
    const key = `${method} ${stripQuery(new URL(url))}`;
    const isPublic = options.public ?? false;
    this.#routes.set(key, (req) => (isPublic || this.#loggedIn ? handler(req) : new Response('', { status: 403 })));
    return this;
  }

  /** number of recorded requests, optionally only those whose URL (without query) equals `url` */
  count(url?: string, method?: string) {
    const path = url === undefined ? undefined : stripQuery(new URL(url));
    return this.requests.filter((r) => (path === undefined || r.path === path) && (!method || r.method === method))
      .length;
  }

  /** forget recorded requests (login state is kept) */
  reset() {
    this.requests.length = 0;
  }

  readonly fetch: Fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const req: Request = {
      method,
      url,
      path: stripQuery(url),
      form: init?.body instanceof FormData ? init.body : undefined,
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    this.requests.push(req);
    const handler = this.#routes.get(`${method} ${req.path}`);
    if (!handler) return new Response(`no route for ${method} ${url.href}`, { status: 404 });
    return handler(req);
  };

  /** a helper that talks to this server */
  helper(config: HelperConfig = {}) {
    return new Learn2018Helper({ fetch: this.fetch, ...config });
  }

  /** a helper with a `CredentialProvider`, already logged in, with the login requests cleared */
  async loggedInHelper(config: HelperConfig = {}) {
    const helper = this.helper({ provider: () => credential, ...config });
    await helper.login();
    this.reset();
    return helper;
  }
}
