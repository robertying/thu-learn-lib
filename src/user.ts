// User info and website language.

import type { Session } from './request.ts';
import type { ApiError, CourseTypeOptions, Language, UserInfo } from './types.ts';
import { CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { $, apiError } from './utils.ts';

/** what the English homepage shows for a department without an English name (as for the 书院) */
const NO_DEPARTMENT = 'none';

/**
 * get user's name and department (`''` if the page shows none)
 *
 * The homepage's profile card (`.fl.up-img-info`) has two `<p>`: the name and role labels (同学 / Student), then the
 * department label (for undergraduates, their 书院). The name is also in the header's `a.user-log`.
 */
export async function getUserInfo(
  s: Session,
  { courseType = CourseType.STUDENT }: CourseTypeOptions = {},
): Promise<UserInfo> {
  const content = await s.fetchTextWithToken(URLS.LEARN_HOMEPAGE(courseType));

  const dom = $(content);
  const name = dom('a.user-log').text().trim();
  const label = dom('.fl.up-img-info p:nth-child(2) label').text().trim();
  const department = label.toLowerCase() === NO_DEPARTMENT ? '' : label;

  return {
    name,
    department,
  };
}

/**
 * The answer is read like a page (`fetchTextWithToken`), so the 200 login page of an expired session logs in again
 * instead of passing for a switch the server never made.
 */
export async function setLanguage(s: Session, lang: Language): Promise<void> {
  try {
    await s.fetchTextWithToken(URLS.LEARN_WEBSITE_LANGUAGE(lang), { method: 'POST' });
  } catch (err) {
    const { reason, extra } = (err ?? {}) as ApiError;
    throw reason === FailReason.UNEXPECTED_STATUS ? apiError(FailReason.OPERATION_FAILED, extra) : err;
  }
  s.lang = lang;
}
