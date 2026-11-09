// Login to Web Learning through id.tsinghua.edu.cn (SSO) and logout.

import { sm2 } from 'sm-crypto';

import type { Session } from './request.ts';
import { $, discard, isConnectionError } from './request.ts';
import type { ApiError } from './types.ts';
import { FailReason, Language } from './types.ts';
import * as URLS from './urls.ts';

/**
 * If using alternative cookie management systems,
 * be sure to clear id.tsinghua.edu.cn cookies before calling this function
 */
export async function getRoamingTicket(
  s: Session,
  username: string,
  password: string,
  fingerPrint: string,
  fingerGenPrint: string = '',
  fingerGenPrint3: string = '',
) {
  // Make sure we always start with the form page
  // More code is needed to handle the case where the user is already logged in (i.e. cookies are set)
  // It won't be a problem if it is always the same user,
  // but if the current cookies are from a different user than the one trying to log in,
  // it will cause problems.
  try {
    await s.cookieJar.setCookie('JSESSIONID=; path=/; HttpOnly', URLS.ID_PREFIX);
  } catch (err) {
    throw {
      reason: FailReason.ERROR_SETTING_COOKIES,
      extra: err,
    } as ApiError;
  }

  let page: string;
  try {
    const loginForm = await s.rawFetch(URLS.ID_LOGIN());
    const body = $(await loginForm.text());
    const sm2publicKey = body('#sm2publicKey').text().trim();

    const formData = new FormData();
    formData.append('i_user', username);
    formData.append('i_pass', '04' + sm2.doEncrypt(password, sm2publicKey));
    formData.append('singleLogin', 'on');
    formData.append('fingerPrint', fingerPrint);
    formData.append('fingerGenPrint', fingerGenPrint ?? '');
    formData.append('fingerGenPrint3', fingerGenPrint3 ?? '');
    formData.append('i_captcha', '');
    const checkResponse = await s.rawFetch(URLS.ID_LOGIN_CHECK(), {
      method: 'POST',
      body: formData,
    });

    if (!checkResponse.ok) {
      throw { code: checkResponse.status, text: checkResponse.statusText };
    }
    page = await checkResponse.text();
  } catch (err) {
    // no answer at all: the device is offline or id.tsinghua.edu.cn is unreachable, not a refused login
    if (isConnectionError(err)) throw err;
    throw {
      reason: FailReason.ERROR_FETCH_FROM_ID,
      extra: err,
    } as ApiError;
  }

  // id.tsinghua.edu.cn answers with a page whose only link is the roaming URL (with the ticket), or with the login form
  // again (with its links to the password reset, guides, phone and mail) for a wrong password
  const body = $(page);
  const ticket = ticketOf(body('a[href*="ticket="]').attr('href'));
  if (ticket) return ticket;
  if (body('#theform, form[action*="/auth/login/check"]').length > 0 && body('#i_pass').length > 0) {
    throw {
      reason: FailReason.BAD_CREDENTIAL,
      extra: textOf(body('#msg_note, .alert-danger')) || undefined,
    } as ApiError;
  }
  // something else, e.g. a second factor, a locked account or maintenance: not a wrong password
  throw {
    reason: FailReason.ERROR_FETCH_FROM_ID,
    extra: textOf(body('body').clone().find('script, style').remove().end()).slice(0, 200),
  } as ApiError;
}

const textOf = (el: { text(): string }) => el.text().replace(/\s+/g, ' ').trim();

const ticketOf = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  try {
    return new URL(href, URLS.ID_PREFIX).searchParams.get('ticket') || undefined;
  } catch {
    return undefined;
  }
};

/** login is necessary if you do not provide a `CredentialProvider` */
export async function login(
  s: Session,
  username?: string,
  password?: string,
  fingerPrint?: string,
  fingerGenPrint?: string,
  fingerGenPrint3?: string,
): Promise<void> {
  if (!username || !password || !fingerPrint) {
    if (!s.provider)
      return Promise.reject({
        reason: FailReason.NO_CREDENTIAL,
      });
    const credential = await s.provider();
    username = credential.username;
    password = credential.password;
    fingerPrint = credential.fingerPrint;
    fingerGenPrint = credential.fingerGenPrint;
    fingerGenPrint3 = credential.fingerGenPrint3;
    if (!username || !password || !fingerPrint) {
      return Promise.reject({
        reason: FailReason.NO_CREDENTIAL,
      });
    }
  }

  // check response from id.tsinghua.edu.cn
  const ticket = await getRoamingTicket(s, username, password, fingerPrint, fingerGenPrint, fingerGenPrint3);
  s.fingerprints = { fingerPrint, fingerGenPrint: fingerGenPrint ?? '', fingerGenPrint3: fingerGenPrint3 ?? '' };

  const loginResponse = await s.rawFetch(URLS.LEARN_AUTH_ROAM(ticket));
  // only the status matters
  discard(loginResponse);
  if (!loginResponse.ok) {
    return Promise.reject({
      reason: FailReason.ERROR_ROAMING,
    });
  }
  const courseListPageSource: string = await (await s.rawFetch(URLS.LEARN_STUDENT_COURSE_LIST_PAGE())).text();
  const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
  const tokenMatches = [...courseListPageSource.matchAll(tokenRegex)];
  if (tokenMatches.length === 0) {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: 'cannot fetch CSRF token from source',
    });
  }
  s.csrfToken = tokenMatches[0][1];
  // the homepage loads e.g. `/f/wlxt/common/languagejs?lang=zh_CN&v=845`
  const langRegex = /\/f\/wlxt\/common\/languagejs\?lang=(zh|en)/g;
  const langMatches = [...courseListPageSource.matchAll(langRegex)];
  if (langMatches.length !== 0) s.lang = langMatches[0][1] === 'en' ? Language.EN : Language.ZH;
}

/**  logout (to make everyone happy); the CSRF token is cleared, so the next request logs in again */
export async function logout(s: Session): Promise<void> {
  discard(await s.rawFetch(URLS.LEARN_LOGOUT(), { method: 'POST' }));
  s.csrfToken = '';
}
