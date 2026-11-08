// Login to Web Learning through id.tsinghua.edu.cn (SSO) and logout.

import { sm2 } from 'sm-crypto';

import type { Session } from './request.ts';
import { $ } from './request.ts';
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
    throw {
      reason: FailReason.ERROR_FETCH_FROM_ID,
      extra: err,
    } as ApiError;
  }

  // id.tsinghua.edu.cn answers with a link to the roaming URL (with the ticket), or with the form and an error
  const body = $(page);
  const redirectUrl = body('a').attr('href');
  if (!redirectUrl) {
    throw {
      reason: FailReason.BAD_CREDENTIAL,
      extra: body.root().text().replace(/\s+/g, ' ').trim().slice(0, 200),
    } as ApiError;
  }
  return redirectUrl.split('=').slice(-1)[0];
}

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

  const loginResponse = await s.rawFetch(URLS.LEARN_AUTH_ROAM(ticket));
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
  const langRegex = /<script src="\/f\/wlxt\/common\/languagejs\?lang=(zh|en)"><\/script>/g;
  const langMatches = [...courseListPageSource.matchAll(langRegex)];
  if (langMatches.length !== 0) s.lang = langMatches[0][1] === 'en' ? Language.EN : Language.ZH;
}

/**  logout (to make everyone happy); the CSRF token is cleared, so the next request logs in again */
export async function logout(s: Session): Promise<void> {
  await s.rawFetch(URLS.LEARN_LOGOUT(), { method: 'POST' });
  s.csrfToken = '';
}
