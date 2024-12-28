"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebsiteShowLanguage = exports.REGISTRAR_TICKET_FORM_DATA = exports.REGISTRAR_TICKET = exports.REGISTRAR_PREFIX = exports.REGISTRAR_CALENDAR = exports.REGISTRAR_AUTH = exports.LEARN_WEBSITE_LANGUAGE = exports.LEARN_STUDENT_COURSE_LIST_PAGE = exports.LEARN_SORT_COURSES = exports.LEARN_SEMESTER_LIST = exports.LEARN_QUESTION_LIST_ANSWERED = exports.LEARN_QUESTION_DETAIL = exports.LEARN_QNR_SUBMIT_PAGE = exports.LEARN_QNR_LIST_ONGOING = exports.LEARN_QNR_LIST_ENDED = exports.LEARN_QNR_DETAIL_FORM = exports.LEARN_QNR_DETAIL = exports.LEARN_PREFIX = exports.LEARN_PAGE_LIST_FORM_DATA = exports.LEARN_NOTIFICATION_LIST = exports.LEARN_NOTIFICATION_EDIT = exports.LEARN_NOTIFICATION_DETAIL = exports.LEARN_LOGOUT = exports.LEARN_HOMEWORK_SUBMIT_PAGE = exports.LEARN_HOMEWORK_SUBMIT_FORM_DATA = exports.LEARN_HOMEWORK_SUBMIT = exports.LEARN_HOMEWORK_LIST_TEACHER = exports.LEARN_HOMEWORK_LIST_SUBMITTED = exports.LEARN_HOMEWORK_LIST_SOURCE = exports.LEARN_HOMEWORK_LIST_NEW = exports.LEARN_HOMEWORK_LIST_GRADED = exports.LEARN_HOMEWORK_LIST_EXCELLENT = exports.LEARN_HOMEWORK_DOWNLOAD = exports.LEARN_HOMEWORK_DETAIL_TEACHER = exports.LEARN_HOMEWORK_DETAIL_EXCELLENT = exports.LEARN_HOMEWORK_DETAIL = exports.LEARN_HOMEPAGE = exports.LEARN_FILE_PREVIEW = exports.LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = exports.LEARN_FILE_LIST_BY_CATEGORY_TEACHER = exports.LEARN_FILE_LIST_BY_CATEGORY_STUDENT = exports.LEARN_FILE_LIST = exports.LEARN_FILE_DOWNLOAD = exports.LEARN_FILE_CATEGORY_LIST = exports.LEARN_FAVORITE_UNPIN = exports.LEARN_FAVORITE_REMOVE = exports.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = exports.LEARN_FAVORITE_PIN = exports.LEARN_FAVORITE_LIST = exports.LEARN_FAVORITE_ADD = exports.LEARN_DISCUSSION_LIST = exports.LEARN_DISCUSSION_DETAIL = exports.LEARN_CURRENT_SEMESTER = exports.LEARN_COURSE_TIME_LOCATION = exports.LEARN_COURSE_PAGE = exports.LEARN_COURSE_LIST = exports.LEARN_COMMENT_SET_FORM_DATA = exports.LEARN_COMMENT_SET = exports.LEARN_COMMENT_LIST = exports.LEARN_AUTH_ROAM = exports.ID_LOGIN_FORM_DATA = exports.ID_LOGIN = void 0;
var _nodeFetchNative = require("node-fetch-native");
var _types = require("./types.js");
var _utils = require("./utils.js");
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
const LEARN_FILE_CATEGORY_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjflb/${courseType}/pageList?wlkcid=${courseID}`;
exports.LEARN_FILE_CATEGORY_LIST = LEARN_FILE_CATEGORY_LIST;
const LEARN_FILE_LIST_BY_CATEGORY_STUDENT = (courseID, categoryId) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxb/${courseID}/${categoryId}`;
exports.LEARN_FILE_LIST_BY_CATEGORY_STUDENT = LEARN_FILE_LIST_BY_CATEGORY_STUDENT;
const LEARN_FILE_LIST_BY_CATEGORY_TEACHER = exports.LEARN_FILE_LIST_BY_CATEGORY_TEACHER = `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/pageList`;
const LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = (courseID, categoryId) => {
  const form = new _nodeFetchNative.FormData();
  form.append('aoData', JSON.stringify([{
    name: 'wlkcid',
    value: courseID
  }, {
    name: 'kjflid',
    value: categoryId
  }]));
  return form;
};
exports.LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA;
const LEARN_FILE_DOWNLOAD = (fileID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/${courseType}/downloadFile?sfgk=0&wjid=${fileID}`;
exports.LEARN_FILE_DOWNLOAD = LEARN_FILE_DOWNLOAD;
const LEARN_FILE_PREVIEW = (type, fileID, courseType, firstPageOnly = false) => `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=${(0, _utils.getMkFromType)(type)}&browser=-1&sfgk=0&pageType=${firstPageOnly ? 'first' : 'all'}`;
exports.LEARN_FILE_PREVIEW = LEARN_FILE_PREVIEW;
const LEARN_NOTIFICATION_LIST = (courseType, expired) => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/` + (courseType === _types.CourseType.STUDENT ? 'student/pageListXsby' : 'teacher/pageListby') + (expired ? 'Ygq' : 'Wgq');
exports.LEARN_NOTIFICATION_LIST = LEARN_NOTIFICATION_LIST;
const LEARN_NOTIFICATION_DETAIL = (courseID, notificationID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}` : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;
exports.LEARN_NOTIFICATION_DETAIL = LEARN_NOTIFICATION_DETAIL;
const LEARN_NOTIFICATION_EDIT = courseType => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/${courseType}/editKcgg`;
exports.LEARN_NOTIFICATION_EDIT = LEARN_NOTIFICATION_EDIT;
const LEARN_HOMEWORK_LIST_NEW = exports.LEARN_HOMEWORK_LIST_NEW = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListWj`;
const LEARN_HOMEWORK_LIST_SUBMITTED = exports.LEARN_HOMEWORK_LIST_SUBMITTED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYjwg`;
const LEARN_HOMEWORK_LIST_GRADED = exports.LEARN_HOMEWORK_LIST_GRADED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYpg`;
const LEARN_HOMEWORK_LIST_EXCELLENT = exports.LEARN_HOMEWORK_LIST_EXCELLENT = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/yxzylist`;
const LEARN_HOMEWORK_LIST_SOURCE = exports.LEARN_HOMEWORK_LIST_SOURCE = [{
  url: LEARN_HOMEWORK_LIST_NEW,
  status: {
    submitted: false,
    graded: false
  }
}, {
  url: LEARN_HOMEWORK_LIST_SUBMITTED,
  status: {
    submitted: true,
    graded: false
  }
}, {
  url: LEARN_HOMEWORK_LIST_GRADED,
  status: {
    submitted: true,
    graded: true
  }
}];
const LEARN_HOMEWORK_DETAIL = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&xszyid=${id}`;
exports.LEARN_HOMEWORK_DETAIL = LEARN_HOMEWORK_DETAIL;
const LEARN_HOMEWORK_DETAIL_EXCELLENT = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewYxzy?wlkcid=${courseID}&xszyid=${id}`;
exports.LEARN_HOMEWORK_DETAIL_EXCELLENT = LEARN_HOMEWORK_DETAIL_EXCELLENT;
const LEARN_HOMEWORK_DOWNLOAD = (courseID, attachmentID) => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/downloadFile/${courseID}/${attachmentID}`;
exports.LEARN_HOMEWORK_DOWNLOAD = LEARN_HOMEWORK_DOWNLOAD;
const LEARN_HOMEWORK_SUBMIT_PAGE = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${id}`;
exports.LEARN_HOMEWORK_SUBMIT_PAGE = LEARN_HOMEWORK_SUBMIT_PAGE;
const LEARN_HOMEWORK_SUBMIT = () => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;
exports.LEARN_HOMEWORK_SUBMIT = LEARN_HOMEWORK_SUBMIT;
const LEARN_HOMEWORK_SUBMIT_FORM_DATA = (id, content = '', attachment, removeAttachment = false) => {
  const form = new _nodeFetchNative.FormData();
  form.append('xszyid', id);
  form.append('zynr', content ?? '');
  if (attachment) form.append('fileupload', attachment.content, attachment.filename);else form.append('fileupload', 'undefined');
  if (removeAttachment) form.append('isDeleted', '1');else form.append('isDeleted', '0');
  return form;
};
exports.LEARN_HOMEWORK_SUBMIT_FORM_DATA = LEARN_HOMEWORK_SUBMIT_FORM_DATA;
const LEARN_HOMEWORK_LIST_TEACHER = exports.LEARN_HOMEWORK_LIST_TEACHER = `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/pageList`;
const LEARN_HOMEWORK_DETAIL_TEACHER = (courseID, homeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${homeworkID}&wlkcid=${courseID}`;
exports.LEARN_HOMEWORK_DETAIL_TEACHER = LEARN_HOMEWORK_DETAIL_TEACHER;
const LEARN_DISCUSSION_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_DISCUSSION_LIST = LEARN_DISCUSSION_LIST;
const LEARN_DISCUSSION_DETAIL = (courseID, boardID, discussionID, courseType, tabId = 1) => `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;
exports.LEARN_DISCUSSION_DETAIL = LEARN_DISCUSSION_DETAIL;
const LEARN_QUESTION_LIST_ANSWERED = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;
exports.LEARN_QUESTION_LIST_ANSWERED = LEARN_QUESTION_LIST_ANSWERED;
const LEARN_QUESTION_DETAIL = (courseID, questionID, courseType) => courseType === _types.CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}` : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;
exports.LEARN_QUESTION_DETAIL = LEARN_QUESTION_DETAIL;
const LEARN_QNR_LIST_ONGOING = exports.LEARN_QNR_LIST_ONGOING = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListWks`;
const LEARN_QNR_LIST_ENDED = exports.LEARN_QNR_LIST_ENDED = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListYjs`;
/** Note: This page is accessible even with an invalid `qnrID` as long as you have access to the given `courseID`. */
const LEARN_QNR_SUBMIT_PAGE = (courseID, qnrID, type) => `${LEARN_PREFIX}/f/wlxt/kcwj/wlkc_wjb/student/beforeAdd?wlkcid=${courseID}&wjid=${qnrID}&wjlx=${type}&jswj=no`;
exports.LEARN_QNR_SUBMIT_PAGE = LEARN_QNR_SUBMIT_PAGE;
const LEARN_QNR_DETAIL = exports.LEARN_QNR_DETAIL = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/getWjnr`;
const LEARN_QNR_DETAIL_FORM = (courseID, qnrID) => {
  const form = new _nodeFetchNative.FormData();
  form.append('wlkcid', courseID);
  form.append('wjid', qnrID);
  return form;
};
exports.LEARN_QNR_DETAIL_FORM = LEARN_QNR_DETAIL_FORM;
const WebsiteShowLanguage = exports.WebsiteShowLanguage = {
  [_types.Language.ZH]: 'zh_CN',
  [_types.Language.EN]: 'en_US'
};
const LEARN_WEBSITE_LANGUAGE = lang => `${LEARN_PREFIX}/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;
exports.LEARN_WEBSITE_LANGUAGE = LEARN_WEBSITE_LANGUAGE;
const LEARN_FAVORITE_ADD = (type, id) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/add?ywid=${id}&ywlx=${_utils.CONTENT_TYPE_MAP.get(type)}`;
exports.LEARN_FAVORITE_ADD = LEARN_FAVORITE_ADD;
const LEARN_FAVORITE_REMOVE = id => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delete?ywid=${id}`;
exports.LEARN_FAVORITE_REMOVE = LEARN_FAVORITE_REMOVE;
const LEARN_FAVORITE_LIST = type => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/pageList?ywlx=${type ? _utils.CONTENT_TYPE_MAP.get(type) : 'ALL'}`;
exports.LEARN_FAVORITE_LIST = LEARN_FAVORITE_LIST;
const LEARN_FAVORITE_PIN = exports.LEARN_FAVORITE_PIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/addZd`;
const LEARN_FAVORITE_UNPIN = exports.LEARN_FAVORITE_UNPIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delZd`;
const LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = id => {
  const form = new _nodeFetchNative.FormData();
  form.append('ywid', id);
  return form;
};
exports.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = LEARN_FAVORITE_PIN_UNPIN_FORM_DATA;
const LEARN_COMMENT_SET = exports.LEARN_COMMENT_SET = `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/add`;
const LEARN_COMMENT_SET_FORM_DATA = (type, id, content) => {
  const form = new _nodeFetchNative.FormData();
  form.append('ywlx', _utils.CONTENT_TYPE_MAP.get(type) ?? '');
  form.append('ywid', id);
  form.append('bznr', content);
  return form;
};
exports.LEARN_COMMENT_SET_FORM_DATA = LEARN_COMMENT_SET_FORM_DATA;
const LEARN_COMMENT_LIST = type => `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/student/pageList?ywlx=${type ? _utils.CONTENT_TYPE_MAP.get(type) : 'ALL'}`;
exports.LEARN_COMMENT_LIST = LEARN_COMMENT_LIST;
const LEARN_PAGE_LIST_FORM_DATA = courseID => {
  const form = new _nodeFetchNative.FormData();
  form.append('aoData', JSON.stringify(courseID ? [{
    name: 'wlkcid',
    value: courseID
  }] : []));
  return form;
};
exports.LEARN_PAGE_LIST_FORM_DATA = LEARN_PAGE_LIST_FORM_DATA;
const LEARN_SORT_COURSES = exports.LEARN_SORT_COURSES = `${LEARN_PREFIX}/b/wlxt/kc/wlkc_kcpxb/addorUpdate`;
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
const REGISTRAR_CALENDAR = (startDate, endDate, graduate = false, callbackName = 'unknown') => `${REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? 'yjs' : 'bks'}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
exports.REGISTRAR_CALENDAR = REGISTRAR_CALENDAR;
//# sourceMappingURL=urls.js.map