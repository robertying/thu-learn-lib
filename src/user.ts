// User info and website language.

import type { Session } from './request.ts';
import { $ } from './request.ts';
import type { ApiError, Language, UserInfo } from './types.ts';
import { CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';

/** get user's name and department */
export async function getUserInfo(s: Session, courseType = CourseType.STUDENT): Promise<UserInfo> {
  const content = await s.fetchTextWithToken(URLS.LEARN_HOMEPAGE(courseType));

  const dom = $(content);
  const name = dom('a.user-log').text().trim();
  const department = dom('.fl.up-img-info p:nth-child(2) label').text().trim();

  return {
    name,
    department,
  };
}

export async function setLanguage(s: Session, lang: Language): Promise<void> {
  const response = await s.fetchWithToken(URLS.LEARN_WEBSITE_LANGUAGE(lang), {
    method: 'POST',
  });
  // free the connection; only the status matters
  response.body?.cancel().catch(() => {});
  if (!response.ok) {
    throw {
      reason: FailReason.OPERATION_FAILED,
      extra: { code: response.status, text: response.statusText },
    } as ApiError;
  }
  s.lang = lang;
}
