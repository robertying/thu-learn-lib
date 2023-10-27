"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebsiteShowLanguage = exports.REGISTRAR_TICKET_FORM_DATA = exports.REGISTRAR_TICKET = exports.REGISTRAR_PREFIX = exports.REGISTRAR_CALENDAR = exports.REGISTRAR_AUTH = exports.LEARN_WEBSITE_LANGUAGE = exports.LEARN_STUDENT_COURSE_LIST_PAGE = exports.LEARN_SEMESTER_LIST = exports.LEARN_QUESTION_LIST_ANSWERED = exports.LEARN_QUESTION_DETAIL = exports.LEARN_PREFIX = exports.LEARN_NOTIFICATION_LIST = exports.LEARN_NOTIFICATION_EDIT = exports.LEARN_NOTIFICATION_DETAIL = exports.LEARN_LOGOUT = exports.LEARN_HOMEWORK_SUBMIT_PAGE = exports.LEARN_HOMEWORK_SUBMIT_FORM_DATA = exports.LEARN_HOMEWORK_SUBMIT = exports.LEARN_HOMEWORK_LIST_TEACHER = exports.LEARN_HOMEWORK_LIST_SUBMITTED = exports.LEARN_HOMEWORK_LIST_SOURCE = exports.LEARN_HOMEWORK_LIST_NEW = exports.LEARN_HOMEWORK_LIST_GRADED = exports.LEARN_HOMEWORK_DOWNLOAD = exports.LEARN_HOMEWORK_DETAIL_TEACHER = exports.LEARN_HOMEWORK_DETAIL = exports.LEARN_HOMEPAGE = exports.LEARN_FILE_PREVIEW = exports.LEARN_FILE_LIST = exports.LEARN_FILE_DOWNLOAD = exports.LEARN_DISCUSSION_LIST = exports.LEARN_DISCUSSION_DETAIL = exports.LEARN_CURRENT_SEMESTER = exports.LEARN_COURSE_TIME_LOCATION = exports.LEARN_COURSE_PAGE = exports.LEARN_COURSE_LIST = exports.LEARN_AUTH_ROAM = exports.ID_LOGIN_FORM_DATA = exports.ID_LOGIN = void 0;
var _nodeFetchNative = require("node-fetch-native");
var _types = require("./types");
var _utils = require("./utils");
const LEARN_PREFIX = exports.LEARN_PREFIX = 'https://learn.tsinghua.edu.cn';
const REGISTRAR_PREFIX = exports.REGISTRAR_PREFIX = 'https://zhjw.cic.tsinghua.edu.cn';
const MAX_SIZE = 200;
const ID_LOGIN = () => 'https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do';
exports.ID_LOGIN = ID_LOGIN;
const ID_LOGIN_FORM_DATA = (username, password) => {
  const credential = new _nodeFetchNative.FormData();
  credential.append('i_user', username);
  credential.append('i_pass', password);
  credential.append('atOnce', String(true));
  return credential;
};
exports.ID_LOGIN_FORM_DATA = ID_LOGIN_FORM_DATA;
const LEARN_AUTH_ROAM = ticket => `${LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`;
exports.LEARN_AUTH_ROAM = LEARN_AUTH_ROAM;
const LEARN_LOGOUT = () => `${LEARN_PREFIX}/f/j_spring_security_logout`;
exports.LEARN_LOGOUT = LEARN_LOGOUT;
const LEARN_HOMEPAGE = courseType => {
  if (courseType === _types.CourseType.STUDENT) {
    return `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
  } else {
    return `${LEARN_PREFIX}/f/wlxt/index/course/teacher/`;
  }
};
exports.LEARN_HOMEPAGE = LEARN_HOMEPAGE;
const LEARN_STUDENT_COURSE_LIST_PAGE = () => `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
exports.LEARN_STUDENT_COURSE_LIST_PAGE = LEARN_STUDENT_COURSE_LIST_PAGE;
const LEARN_SEMESTER_LIST = () => `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;
exports.LEARN_SEMESTER_LIST = LEARN_SEMESTER_LIST;
const LEARN_CURRENT_SEMESTER = () => `${LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;
exports.LEARN_CURRENT_SEMESTER = LEARN_CURRENT_SEMESTER;
const LEARN_COURSE_LIST = (semester, courseType, lang) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}/${lang}` : `${LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${semester}/0`;
exports.LEARN_COURSE_LIST = LEARN_COURSE_LIST;
const LEARN_COURSE_PAGE = (courseID, courseType) => `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${courseID}`;
exports.LEARN_COURSE_PAGE = LEARN_COURSE_PAGE;
const LEARN_COURSE_TIME_LOCATION = courseID => `${LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${courseID}`;
exports.LEARN_COURSE_TIME_LOCATION = LEARN_COURSE_TIME_LOCATION;
const LEARN_FILE_LIST = (courseID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${courseID}&size=${MAX_SIZE}` : `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_FILE_LIST = LEARN_FILE_LIST;
const LEARN_FILE_DOWNLOAD = (fileID, courseType, courseID) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=${fileID}` : `${LEARN_PREFIX}/f/wlxt/kj/wlkc_kjxxb/teacher/beforeView?id=${fileID}&wlkcid=${courseID}`;
exports.LEARN_FILE_DOWNLOAD = LEARN_FILE_DOWNLOAD;
const LEARN_FILE_PREVIEW = function (type, fileID, courseType) {
  let firstPageOnly = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  return `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=${(0, _utils.getMkFromType)(type)}&browser=-1&sfgk=0&pageType=${firstPageOnly ? 'first' : 'all'}`;
};
exports.LEARN_FILE_PREVIEW = LEARN_FILE_PREVIEW;
const LEARN_NOTIFICATION_LIST = (courseID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/student/kcggListXs?wlkcid=${courseID}&size=${MAX_SIZE}` : `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/teacher/kcggList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_NOTIFICATION_LIST = LEARN_NOTIFICATION_LIST;
const LEARN_NOTIFICATION_DETAIL = (courseID, notificationID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}` : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;
exports.LEARN_NOTIFICATION_DETAIL = LEARN_NOTIFICATION_DETAIL;
const LEARN_NOTIFICATION_EDIT = courseType => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/${courseType}/editKcgg`;
exports.LEARN_NOTIFICATION_EDIT = LEARN_NOTIFICATION_EDIT;
const LEARN_HOMEWORK_LIST_SOURCE = courseID => [{
  url: LEARN_HOMEWORK_LIST_NEW(courseID),
  status: {
    submitted: false,
    graded: false
  }
}, {
  url: LEARN_HOMEWORK_LIST_SUBMITTED(courseID),
  status: {
    submitted: true,
    graded: false
  }
}, {
  url: LEARN_HOMEWORK_LIST_GRADED(courseID),
  status: {
    submitted: true,
    graded: true
  }
}];
exports.LEARN_HOMEWORK_LIST_SOURCE = LEARN_HOMEWORK_LIST_SOURCE;
const LEARN_HOMEWORK_LIST_NEW = courseID => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListWj?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_HOMEWORK_LIST_NEW = LEARN_HOMEWORK_LIST_NEW;
const LEARN_HOMEWORK_LIST_SUBMITTED = courseID => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYjwg?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_HOMEWORK_LIST_SUBMITTED = LEARN_HOMEWORK_LIST_SUBMITTED;
const LEARN_HOMEWORK_LIST_GRADED = courseID => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYpg?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_HOMEWORK_LIST_GRADED = LEARN_HOMEWORK_LIST_GRADED;
const LEARN_HOMEWORK_DETAIL = (courseID, homeworkID, studentHomeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&zyid=${homeworkID}&xszyid=${studentHomeworkID}`;
exports.LEARN_HOMEWORK_DETAIL = LEARN_HOMEWORK_DETAIL;
const LEARN_HOMEWORK_DOWNLOAD = (courseID, attachmentID) => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/downloadFile/${courseID}/${attachmentID}`;
exports.LEARN_HOMEWORK_DOWNLOAD = LEARN_HOMEWORK_DOWNLOAD;
const LEARN_HOMEWORK_SUBMIT_PAGE = (courseID, studentHomeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${studentHomeworkID}`;
exports.LEARN_HOMEWORK_SUBMIT_PAGE = LEARN_HOMEWORK_SUBMIT_PAGE;
const LEARN_HOMEWORK_SUBMIT = () => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;
exports.LEARN_HOMEWORK_SUBMIT = LEARN_HOMEWORK_SUBMIT;
const LEARN_HOMEWORK_SUBMIT_FORM_DATA = function (studentHomeworkID) {
  let content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  let attachment = arguments.length > 2 ? arguments[2] : undefined;
  let removeAttachment = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  const form = new _nodeFetchNative.FormData();
  form.append('xszyid', studentHomeworkID);
  form.append('zynr', content ?? '');
  if (attachment) form.append('fileupload', attachment.content, attachment.filename);else form.append('fileupload', 'undefined');
  if (removeAttachment) form.append('isDeleted', '1');else form.append('isDeleted', '0');
  return form;
};
exports.LEARN_HOMEWORK_SUBMIT_FORM_DATA = LEARN_HOMEWORK_SUBMIT_FORM_DATA;
const LEARN_HOMEWORK_LIST_TEACHER = courseID => `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/index/pageList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_HOMEWORK_LIST_TEACHER = LEARN_HOMEWORK_LIST_TEACHER;
const LEARN_HOMEWORK_DETAIL_TEACHER = (courseID, homeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${homeworkID}&wlkcid=${courseID}`;
exports.LEARN_HOMEWORK_DETAIL_TEACHER = LEARN_HOMEWORK_DETAIL_TEACHER;
const LEARN_DISCUSSION_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_DISCUSSION_LIST = LEARN_DISCUSSION_LIST;
const LEARN_DISCUSSION_DETAIL = function (courseID, boardID, discussionID, courseType) {
  let tabId = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;
  return `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;
};
exports.LEARN_DISCUSSION_DETAIL = LEARN_DISCUSSION_DETAIL;
const LEARN_QUESTION_LIST_ANSWERED = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_QUESTION_LIST_ANSWERED = LEARN_QUESTION_LIST_ANSWERED;
const LEARN_QUESTION_DETAIL = (courseID, questionID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}` : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;
exports.LEARN_QUESTION_DETAIL = LEARN_QUESTION_DETAIL;
const WebsiteShowLanguage = exports.WebsiteShowLanguage = {
  [_types.Language.ZH]: 'zh_CN',
  [_types.Language.EN]: 'en_US'
};
const LEARN_WEBSITE_LANGUAGE = lang => `https://learn.tsinghua.edu.cn/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;
exports.LEARN_WEBSITE_LANGUAGE = LEARN_WEBSITE_LANGUAGE;
const REGISTRAR_TICKET_FORM_DATA = () => {
  const form = new _nodeFetchNative.FormData();
  form.append('appId', 'ALL_ZHJW');
  return form;
};
exports.REGISTRAR_TICKET_FORM_DATA = REGISTRAR_TICKET_FORM_DATA;
const REGISTRAR_TICKET = () => `${LEARN_PREFIX}/b/wlxt/common/auth/gnt`;
exports.REGISTRAR_TICKET = REGISTRAR_TICKET;
const REGISTRAR_AUTH = ticket => `${REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${ticket}`;
exports.REGISTRAR_AUTH = REGISTRAR_AUTH;
const REGISTRAR_CALENDAR = function (startDate, endDate) {
  let graduate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  let callbackName = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'unknown';
  return `${REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? 'yjs' : 'bks'}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
};
exports.REGISTRAR_CALENDAR = REGISTRAR_CALENDAR;
//# sourceMappingURL=urls.js.map