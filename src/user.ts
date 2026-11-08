// User info and website language.

import type { Session } from './request.ts';
import { $ } from './request.ts';
import type { UserInfo, Language } from './types.ts';
import { CourseType } from './types.ts';
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
  await s.fetchWithToken(URLS.LEARN_WEBSITE_LANGUAGE(lang), {
    method: 'POST',
  });
  s.lang = lang;
}
