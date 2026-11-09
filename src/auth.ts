// Login to Web Learning through id.tsinghua.edu.cn (SSO) and logout.

import { sm2 } from 'sm-crypto';

import type { Session } from './request.ts';
import { discard, isConnectionError } from './request.ts';
import type { Credential } from './types.ts';
import { CourseType, FailReason, Language } from './types.ts';
import * as URLS from './urls.ts';
import { $, apiError } from './utils.ts';

/** a `Credential` with everything an SSO login needs */
export type CompleteCredential = Credential & { username: string; password: string; fingerPrint: string };

/** whether `credential` has a username, a password and a fingerprint */
export const isComplete = (credential: Credential | undefined): credential is CompleteCredential =>
  !!credential?.username && !!credential.password && !!credential.fingerPrint;

/**
 * If using alternative cookie management systems,
 * be sure to clear id.tsinghua.edu.cn cookies before calling this function
 */
export async function getRoamingTicket(s: Session, credential: CompleteCredential): Promise<string> {
  const { username, password, fingerPrint, fingerGenPrint = '', fingerGenPrint3 = '' } = credential;
  // Make sure we always start with the form page
  // More code is needed to handle the case where the user is already logged in (i.e. cookies are set)
  // It won't be a problem if it is always the same user,
  // but if the current cookies are from a different user than the one trying to log in,
  // it will cause problems.
  try {
    await s.cookieJar.setCookie('JSESSIONID=; path=/; HttpOnly', URLS.ID_PREFIX);
  } catch (err) {
    throw apiError(FailReason.ERROR_SETTING_COOKIES, err);
  }

  let page: string;
  try {
    const loginForm = await s.rawFetch(URLS.ID_LOGIN);
    const body = $(await loginForm.text());
    const sm2publicKey = body('#sm2publicKey').text().trim();

    const formData = new FormData();
    formData.append('i_user', username);
    formData.append('i_pass', '04' + sm2.doEncrypt(password, sm2publicKey));
    formData.append('singleLogin', 'on');
    formData.append('fingerPrint', fingerPrint);
    formData.append('fingerGenPrint', fingerGenPrint);
    formData.append('fingerGenPrint3', fingerGenPrint3);
    formData.append('i_captcha', '');
    const checkResponse = await s.rawFetch(URLS.ID_LOGIN_CHECK, {
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
    throw apiError(FailReason.ERROR_FETCH_FROM_ID, err);
  }

  // id.tsinghua.edu.cn answers with a page whose only link is the roaming URL (with the ticket), or with the login form
  // again (with its links to the password reset, guides, phone and mail) for a wrong password
  const body = $(page);
  const ticket = ticketOf(body('a[href*="ticket="]').attr('href'));
  if (ticket) return ticket;
  if (body('#theform, form[action*="/auth/login/check"]').length > 0 && body('#i_pass').length > 0) {
    throw apiError(FailReason.BAD_CREDENTIAL, textOf(body('#msg_note, .alert-danger')) || undefined);
  }
  // something else, e.g. a second factor, a locked account or maintenance: not a wrong password
  throw apiError(
    FailReason.ERROR_FETCH_FROM_ID,
    textOf(body('body').clone().find('script, style').remove().end()).slice(0, 200),
  );
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

/** log in with the `CredentialProvider`; `NO_CREDENTIAL` without one, or when it gives an incomplete credential */
export async function loginWithProvider(s: Session): Promise<void> {
  const credential = await s.provider?.();
  if (!isComplete(credential)) throw apiError(FailReason.NO_CREDENTIAL);
  return login(s, credential);
}

/** log in through id.tsinghua.edu.cn, then read the CSRF token and the website language from the homepage */
export async function login(s: Session, credential: CompleteCredential): Promise<void> {
  const ticket = await getRoamingTicket(s, credential);
  const { fingerPrint, fingerGenPrint = '', fingerGenPrint3 = '' } = credential;
  s.fingerprints = { fingerPrint, fingerGenPrint, fingerGenPrint3 };

  const loginResponse = await s.rawFetch(URLS.LEARN_AUTH_ROAM(ticket));
  // only the status matters
  discard(loginResponse);
  if (!loginResponse.ok) {
    throw apiError(FailReason.ERROR_ROAMING);
  }
  const courseListPageSource: string = await (await s.rawFetch(URLS.LEARN_HOMEPAGE(CourseType.STUDENT))).text();
  const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
  const tokenMatches = [...courseListPageSource.matchAll(tokenRegex)];
  if (tokenMatches.length === 0) {
    throw apiError(FailReason.INVALID_RESPONSE, 'cannot fetch CSRF token from source');
  }
  s.csrfToken = tokenMatches[0][1];
  // the homepage loads e.g. `/f/wlxt/common/languagejs?lang=zh_CN&v=845`
  const langRegex = /\/f\/wlxt\/common\/languagejs\?lang=(zh|en)/g;
  const langMatches = [...courseListPageSource.matchAll(langRegex)];
  if (langMatches.length !== 0) s.lang = langMatches[0][1] === 'en' ? Language.EN : Language.ZH;
}

/**  logout (to make everyone happy); the CSRF token is cleared, so the next request logs in again */
export async function logout(s: Session): Promise<void> {
  discard(await s.rawFetch(URLS.LEARN_LOGOUT, { method: 'POST' }));
  s.csrfToken = '';
}
