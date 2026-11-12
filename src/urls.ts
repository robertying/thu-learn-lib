import type { PreviewContentType } from './codes.ts';
import { contentTypeCode, previewModule } from './codes.ts';
import type { ContentType, QuestionnaireType } from './types.ts';
import { CourseType, Language } from './types.ts';

// URLs without parameters are constants; URLs with parameters, and form bodies (a new `FormData` each time), are
// functions. Form bodies use the global `FormData`, which Node (22+) and React Native both have.

export const ID_PREFIX = 'https://id.tsinghua.edu.cn';
export const LEARN_PREFIX = 'https://learn.tsinghua.edu.cn';

/**
 * `href` from a Web Learning page, resolved against the site; `undefined` when it points anywhere else, so a link
 * the session's requests follow never leaves the site
 */
export const learnUrl = (href: string): string | undefined => {
  try {
    const url = new URL(href, LEARN_PREFIX);
    return url.origin === LEARN_PREFIX ? url.href : undefined;
  } catch {
    return undefined;
  }
};
export const REGISTRAR_PREFIX = 'https://zhjw.cic.tsinghua.edu.cn';

const MAX_SIZE = 200;

/** a value in a URL's path or query (ids are hex today; this keeps a `&`, `/` or `#` from changing the URL) */
const enc = encodeURIComponent;

export const ID_LOGIN = `${ID_PREFIX}/do/off/ui/auth/login/form/bb5df85216504820be7bba2b0ae1535b/0`;

export const ID_LOGIN_CHECK = `${ID_PREFIX}/do/off/ui/auth/login/check`;

export const LEARN_AUTH_ROAM = (ticket: string) =>
  `${LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${encodeURIComponent(ticket)}`;

export const LEARN_LOGOUT = `${LEARN_PREFIX}/f/j_spring_security_logout`;

/** the homepage (course list) of a student or a teacher; login reads the CSRF token from the student one */
export const LEARN_HOMEPAGE = (courseType: CourseType) => `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/`;

export const LEARN_SEMESTER_LIST = `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;

export const LEARN_CURRENT_SEMESTER = `${LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;

export const LEARN_COURSE_LIST = (semester: string, courseType: CourseType, lang: Language) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${enc(semester)}/${lang}`
    : `${LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${enc(semester)}/0`;

export const LEARN_COURSE_PAGE = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${enc(courseID)}`;

export const LEARN_COURSE_TIME_LOCATION = (courseID: string) =>
  `${LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${enc(courseID)}`;

export const LEARN_FILE_LIST = (courseID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${enc(courseID)}&size=${MAX_SIZE}`
    : `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${enc(courseID)}&size=${MAX_SIZE}`;

export const LEARN_FILE_CATEGORY_LIST = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjflb/${courseType}/pageList?wlkcid=${enc(courseID)}`;

export const LEARN_FILE_LIST_BY_CATEGORY_STUDENT = (courseID: string, categoryId: string) =>
  `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxb/${enc(courseID)}/${enc(categoryId)}`;

export const LEARN_FILE_LIST_BY_CATEGORY_TEACHER = `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/pageList`;

export const LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = (courseID: string, categoryId: string) => {
  const form = new FormData();
  form.append(
    'aoData',
    JSON.stringify([
      { name: 'wlkcid', value: courseID },
      { name: 'kjflid', value: categoryId },
    ]),
  );
  return form;
};

export const LEARN_FILE_DOWNLOAD = (fileID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/${courseType}/downloadFile?sfgk=0&wjid=${enc(fileID)}`;

export const LEARN_FILE_PREVIEW = (
  type: PreviewContentType,
  fileID: string,
  courseType: CourseType,
  firstPageOnly = false,
) =>
  `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${enc(fileID)}&mk=${previewModule(type)}&browser=-1&sfgk=0&pageType=${firstPageOnly ? 'first' : 'all'}`;

export const LEARN_NOTIFICATION_LIST = (courseType: CourseType, expired: boolean) =>
  `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/` +
  (courseType === CourseType.STUDENT ? 'student/pageListXsby' : 'teacher/pageListby') +
  (expired ? 'Ygq' : 'Wgq');

export const LEARN_NOTIFICATION_DETAIL = (courseID: string, notificationID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${enc(courseID)}&id=${enc(notificationID)}`
    : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${enc(courseID)}&id=${enc(notificationID)}`;

export const LEARN_HOMEWORK_LIST_NEW = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListWj`;
export const LEARN_HOMEWORK_LIST_SUBMITTED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYjwg`;
export const LEARN_HOMEWORK_LIST_GRADED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYpg`;
export const LEARN_HOMEWORK_LIST_EXCELLENT = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/yxzylist`;
export const LEARN_HOMEWORK_PAGE = (courseID: string, id: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${enc(courseID)}&xszyid=${enc(id)}`;

export const LEARN_HOMEWORK_EXCELLENT_PAGE = (courseID: string, id: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewYxzy?wlkcid=${enc(courseID)}&xszyid=${enc(id)}`;

export const LEARN_HOMEWORK_DETAIL = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/detail`;

export const LEARN_HOMEWORK_DETAIL_FORM_DATA = (baseId: string) => {
  const form = new FormData();
  form.append('id', baseId);
  return form;
};

export const LEARN_HOMEWORK_SUBMIT_PAGE = (courseID: string, id: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${enc(courseID)}&xszyid=${enc(id)}`;

export const LEARN_HOMEWORK_SUBMIT = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;

export const LEARN_HOMEWORK_LIST_TEACHER = `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/pageList`;

export const LEARN_HOMEWORK_DETAIL_TEACHER = (courseID: string, homeworkID: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${enc(homeworkID)}&wlkcid=${enc(courseID)}`;

export const LEARN_DISCUSSION_LIST = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${enc(courseID)}&size=${MAX_SIZE}`;

export const LEARN_DISCUSSION_DETAIL = (
  courseID: string,
  boardID: string,
  discussionID: string,
  courseType: CourseType,
  tabId = 1,
) =>
  `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${enc(courseID)}&id=${enc(discussionID)}&tabbh=${tabId}&bqid=${enc(boardID)}`;

export const LEARN_QUESTION_LIST_ANSWERED = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${enc(courseID)}&size=${MAX_SIZE}`;

export const LEARN_QUESTION_DETAIL = (courseID: string, questionID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${enc(courseID)}&id=${enc(questionID)}`
    : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${enc(courseID)}&id=${enc(questionID)}`;

export const LEARN_QNR_LIST_ONGOING = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListWks`;
export const LEARN_QNR_LIST_ENDED = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListYjs`;
/** Note: This page is accessible even with an invalid `qnrID` as long as you have access to the given `courseID`. */
export const LEARN_QNR_SUBMIT_PAGE = (courseID: string, qnrID: string, type: QuestionnaireType) =>
  `${LEARN_PREFIX}/f/wlxt/kcwj/wlkc_wjb/student/beforeAdd?wlkcid=${enc(courseID)}&wjid=${enc(qnrID)}&wjlx=${type}&jswj=no`;
export const LEARN_QNR_DETAIL = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/getWjnr`;

export const LEARN_QNR_DETAIL_FORM = (courseID: string, qnrID: string) => {
  const form = new FormData();
  form.append('wlkcid', courseID);
  form.append('wjid', qnrID);
  return form;
};

export const WebsiteShowLanguage = {
  [Language.ZH]: 'zh_CN',
  [Language.EN]: 'en_US',
};

export const LEARN_WEBSITE_LANGUAGE = (lang: Language) =>
  `${LEARN_PREFIX}/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;

export const LEARN_FAVORITE_ADD = (type: ContentType, id: string) =>
  `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/add?ywid=${enc(id)}&ywlx=${contentTypeCode(type)}`;

export const LEARN_FAVORITE_REMOVE = (id: string) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delete?ywid=${enc(id)}`;

export const LEARN_FAVORITE_LIST = (type?: ContentType) =>
  `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/pageList?ywlx=${type ? contentTypeCode(type) : 'ALL'}`;

export const LEARN_FAVORITE_PIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/addZd`;

export const LEARN_FAVORITE_UNPIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delZd`;

export const LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = (id: string) => {
  const form = new FormData();
  form.append('ywid', id);
  return form;
};

export const LEARN_COMMENT_SET = `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/add`;

export const LEARN_COMMENT_SET_FORM_DATA = (type: ContentType, id: string, content: string) => {
  const form = new FormData();
  form.append('ywlx', contentTypeCode(type));
  form.append('ywid', id);
  form.append('bznr', content);
  return form;
};

export const LEARN_COMMENT_LIST = (type?: ContentType) =>
  `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/student/pageList?ywlx=${type ? contentTypeCode(type) : 'ALL'}`;

export const LEARN_PAGE_LIST_FORM_DATA = (courseID?: string) => {
  const form = new FormData();
  form.append('aoData', JSON.stringify(courseID ? [{ name: 'wlkcid', value: courseID }] : []));
  return form;
};

export const LEARN_SORT_COURSES = `${LEARN_PREFIX}/b/wlxt/kc/wlkc_kcpxb/addorUpdate`;

export const REGISTRAR_TICKET_FORM_DATA = () => {
  const form = new FormData();
  form.append('appId', 'ALL_ZHJW');
  return form;
};

export const REGISTRAR_TICKET = `${LEARN_PREFIX}/b/wlxt/common/auth/gnt`;

export const REGISTRAR_AUTH = (ticket: string) =>
  `${REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${encodeURIComponent(ticket)}`;

export const REGISTRAR_CALENDAR = (startDate: string, endDate: string, graduate = false, callbackName = 'unknown') =>
  `${REGISTRAR_PREFIX}/jxmh_out.do?m=${
    graduate ? 'yjs' : 'bks'
  }_jxrl_all&p_start_date=${enc(startDate)}&p_end_date=${enc(endDate)}&jsoncallback=${enc(callbackName)}`;
