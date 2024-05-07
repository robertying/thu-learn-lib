import { FormData } from 'node-fetch-native';
import { ContentType, CourseType, IHomeworkSubmitAttachment, Language } from './types';
import { getMkFromType } from './utils';

export const LEARN_PREFIX = 'https://learn.tsinghua.edu.cn';
export const REGISTRAR_PREFIX = 'https://zhjw.cic.tsinghua.edu.cn';

const MAX_SIZE = 200;

export const ID_LOGIN = () =>
  'https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do';

export const ID_LOGIN_FORM_DATA = (username: string, password: string) => {
  const credential = new FormData();
  credential.append('i_user', username);
  credential.append('i_pass', password);
  credential.append('atOnce', String(true));
  return credential;
};

export const LEARN_AUTH_ROAM = (ticket: string) =>
  `${LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`;

export const LEARN_LOGOUT = () => `${LEARN_PREFIX}/f/j_spring_security_logout`;

export const LEARN_HOMEPAGE = (courseType: CourseType) => {
  if (courseType === CourseType.STUDENT) {
    return `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
  } else {
    return `${LEARN_PREFIX}/f/wlxt/index/course/teacher/`;
  }
};

export const LEARN_STUDENT_COURSE_LIST_PAGE = () => `${LEARN_PREFIX}/f/wlxt/index/course/student/`;

export const LEARN_SEMESTER_LIST = () => `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;

export const LEARN_CURRENT_SEMESTER = () => `${LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;

export const LEARN_COURSE_LIST = (semester: string, courseType: CourseType, lang: Language) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}/${lang}`
    : `${LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${semester}/0`;

export const LEARN_COURSE_PAGE = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${courseID}`;

export const LEARN_COURSE_TIME_LOCATION = (courseID: string) =>
  `${LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${courseID}`;

export const LEARN_FILE_LIST = (courseID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${courseID}&size=${MAX_SIZE}`
    : `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_FILE_CATEGORY_LIST = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjflb/${courseType}/pageList?wlkcid=${courseID}`;

export const LEARN_FILE_DOWNLOAD = (fileID: string, courseType: CourseType, courseID: string) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=${fileID}`
    : `${LEARN_PREFIX}/f/wlxt/kj/wlkc_kjxxb/teacher/beforeView?id=${fileID}&wlkcid=${courseID}`;

export const LEARN_FILE_PREVIEW = (type: ContentType, fileID: string, courseType: CourseType, firstPageOnly = false) =>
  `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=${getMkFromType(
    type,
  )}&browser=-1&sfgk=0&pageType=${firstPageOnly ? 'first' : 'all'}`;

export const LEARN_NOTIFICATION_LIST = (courseID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/student/kcggListXs?wlkcid=${courseID}&size=${MAX_SIZE}`
    : `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/teacher/kcggList?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_NOTIFICATION_DETAIL = (courseID: string, notificationID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}`
    : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;

export const LEARN_NOTIFICATION_EDIT = (courseType: CourseType): string =>
  `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/${courseType}/editKcgg`;

export const LEARN_HOMEWORK_LIST_SOURCE = (courseID: string) => [
  {
    url: LEARN_HOMEWORK_LIST_NEW(courseID),
    status: {
      submitted: false,
      graded: false,
    },
  },
  {
    url: LEARN_HOMEWORK_LIST_SUBMITTED(courseID),
    status: {
      submitted: true,
      graded: false,
    },
  },
  {
    url: LEARN_HOMEWORK_LIST_GRADED(courseID),
    status: {
      submitted: true,
      graded: true,
    },
  },
];

export const LEARN_HOMEWORK_LIST_NEW = (courseID: string) =>
  `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListWj?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_HOMEWORK_LIST_SUBMITTED = (courseID: string) =>
  `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYjwg?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_HOMEWORK_LIST_GRADED = (courseID: string) =>
  `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYpg?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_HOMEWORK_DETAIL = (courseID: string, homeworkID: string, studentHomeworkID: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&zyid=${homeworkID}&xszyid=${studentHomeworkID}`;

export const LEARN_HOMEWORK_DOWNLOAD = (courseID: string, attachmentID: string) =>
  `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/downloadFile/${courseID}/${attachmentID}`;

export const LEARN_HOMEWORK_SUBMIT_PAGE = (courseID: string, studentHomeworkID: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${studentHomeworkID}`;

export const LEARN_HOMEWORK_SUBMIT = () => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;

export const LEARN_HOMEWORK_SUBMIT_FORM_DATA = (
  studentHomeworkID: string,
  content = '',
  attachment?: IHomeworkSubmitAttachment,
  removeAttachment = false,
) => {
  const form = new FormData();
  form.append('xszyid', studentHomeworkID);
  form.append('zynr', content ?? '');
  if (attachment) form.append('fileupload', attachment.content, attachment.filename);
  else form.append('fileupload', 'undefined');
  if (removeAttachment) form.append('isDeleted', '1');
  else form.append('isDeleted', '0');
  return form;
};

export const LEARN_HOMEWORK_LIST_TEACHER = (courseID: string) =>
  `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/index/pageList?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_HOMEWORK_DETAIL_TEACHER = (courseID: string, homeworkID: string) =>
  `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${homeworkID}&wlkcid=${courseID}`;

export const LEARN_DISCUSSION_LIST = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_DISCUSSION_DETAIL = (
  courseID: string,
  boardID: string,
  discussionID: string,
  courseType: CourseType,
  tabId = 1,
) =>
  `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;

export const LEARN_QUESTION_LIST_ANSWERED = (courseID: string, courseType: CourseType) =>
  `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;

export const LEARN_QUESTION_DETAIL = (courseID: string, questionID: string, courseType: CourseType) =>
  courseType === CourseType.STUDENT
    ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}`
    : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;

export const WebsiteShowLanguage = {
  [Language.ZH]: 'zh_CN',
  [Language.EN]: 'en_US',
};

export const LEARN_WEBSITE_LANGUAGE = (lang: Language) =>
  `https://learn.tsinghua.edu.cn/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;

export const REGISTRAR_TICKET_FORM_DATA = () => {
  const form = new FormData();
  form.append('appId', 'ALL_ZHJW');
  return form;
};

export const REGISTRAR_TICKET = () => `${LEARN_PREFIX}/b/wlxt/common/auth/gnt`;

export const REGISTRAR_AUTH = (ticket: string) => `${REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${ticket}`;

export const REGISTRAR_CALENDAR = (startDate: string, endDate: string, graduate = false, callbackName = 'unknown') =>
  `${REGISTRAR_PREFIX}/jxmh_out.do?m=${
    graduate ? 'yjs' : 'bks'
  }_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
