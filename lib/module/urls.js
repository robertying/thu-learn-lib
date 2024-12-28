"use strict";

import { FormData } from 'node-fetch-native';
import { CourseType, Language } from "./types.js";
import { CONTENT_TYPE_MAP, getMkFromType } from "./utils.js";
export const LEARN_PREFIX = 'https://learn.tsinghua.edu.cn';
export const REGISTRAR_PREFIX = 'https://zhjw.cic.tsinghua.edu.cn';
const MAX_SIZE = 200;
export const ID_LOGIN = () => 'https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do';
export const ID_LOGIN_FORM_DATA = (username, password) => {
  const credential = new FormData();
  credential.append('i_user', username);
  credential.append('i_pass', password);
  credential.append('atOnce', String(true));
  return credential;
};
export const LEARN_AUTH_ROAM = ticket => `${LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`;
export const LEARN_LOGOUT = () => `${LEARN_PREFIX}/f/j_spring_security_logout`;
export const LEARN_HOMEPAGE = courseType => {
  if (courseType === CourseType.STUDENT) {
    return `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
  } else {
    return `${LEARN_PREFIX}/f/wlxt/index/course/teacher/`;
  }
};
export const LEARN_STUDENT_COURSE_LIST_PAGE = () => `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
export const LEARN_SEMESTER_LIST = () => `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;
export const LEARN_CURRENT_SEMESTER = () => `${LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;
export const LEARN_COURSE_LIST = (semester, courseType, lang) => courseType === CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}/${lang}` : `${LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${semester}/0`;
export const LEARN_COURSE_PAGE = (courseID, courseType) => `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${courseID}`;
export const LEARN_COURSE_TIME_LOCATION = courseID => `${LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${courseID}`;
export const LEARN_FILE_LIST = (courseID, courseType) => courseType === CourseType.STUDENT ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${courseID}&size=${MAX_SIZE}` : `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${courseID}&size=${MAX_SIZE}`;
export const LEARN_FILE_CATEGORY_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjflb/${courseType}/pageList?wlkcid=${courseID}`;
export const LEARN_FILE_LIST_BY_CATEGORY_STUDENT = (courseID, categoryId) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxb/${courseID}/${categoryId}`;
export const LEARN_FILE_LIST_BY_CATEGORY_TEACHER = `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/pageList`;
export const LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = (courseID, categoryId) => {
  const form = new FormData();
  form.append('aoData', JSON.stringify([{
    name: 'wlkcid',
    value: courseID
  }, {
    name: 'kjflid',
    value: categoryId
  }]));
  return form;
};
export const LEARN_FILE_DOWNLOAD = (fileID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/${courseType}/downloadFile?sfgk=0&wjid=${fileID}`;
export const LEARN_FILE_PREVIEW = (type, fileID, courseType, firstPageOnly = false) => `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=${getMkFromType(type)}&browser=-1&sfgk=0&pageType=${firstPageOnly ? 'first' : 'all'}`;
export const LEARN_NOTIFICATION_LIST = (courseType, expired) => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/` + (courseType === CourseType.STUDENT ? 'student/pageListXsby' : 'teacher/pageListby') + (expired ? 'Ygq' : 'Wgq');
export const LEARN_NOTIFICATION_DETAIL = (courseID, notificationID, courseType) => courseType === CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}` : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;
export const LEARN_NOTIFICATION_EDIT = courseType => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/${courseType}/editKcgg`;
export const LEARN_HOMEWORK_LIST_NEW = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListWj`;
export const LEARN_HOMEWORK_LIST_SUBMITTED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYjwg`;
export const LEARN_HOMEWORK_LIST_GRADED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYpg`;
export const LEARN_HOMEWORK_LIST_EXCELLENT = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/yxzylist`;
export const LEARN_HOMEWORK_LIST_SOURCE = [{
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
export const LEARN_HOMEWORK_DETAIL = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&xszyid=${id}`;
export const LEARN_HOMEWORK_DETAIL_EXCELLENT = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewYxzy?wlkcid=${courseID}&xszyid=${id}`;
export const LEARN_HOMEWORK_DOWNLOAD = (courseID, attachmentID) => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/downloadFile/${courseID}/${attachmentID}`;
export const LEARN_HOMEWORK_SUBMIT_PAGE = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${id}`;
export const LEARN_HOMEWORK_SUBMIT = () => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;
export const LEARN_HOMEWORK_SUBMIT_FORM_DATA = (id, content = '', attachment, removeAttachment = false) => {
  const form = new FormData();
  form.append('xszyid', id);
  form.append('zynr', content ?? '');
  if (attachment) form.append('fileupload', attachment.content, attachment.filename);else form.append('fileupload', 'undefined');
  if (removeAttachment) form.append('isDeleted', '1');else form.append('isDeleted', '0');
  return form;
};
export const LEARN_HOMEWORK_LIST_TEACHER = `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/pageList`;
export const LEARN_HOMEWORK_DETAIL_TEACHER = (courseID, homeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${homeworkID}&wlkcid=${courseID}`;
export const LEARN_DISCUSSION_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;
export const LEARN_DISCUSSION_DETAIL = (courseID, boardID, discussionID, courseType, tabId = 1) => `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;
export const LEARN_QUESTION_LIST_ANSWERED = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;
export const LEARN_QUESTION_DETAIL = (courseID, questionID, courseType) => courseType === CourseType.STUDENT ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}` : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;
export const LEARN_QNR_LIST_ONGOING = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListWks`;
export const LEARN_QNR_LIST_ENDED = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListYjs`;
/** Note: This page is accessible even with an invalid `qnrID` as long as you have access to the given `courseID`. */
export const LEARN_QNR_SUBMIT_PAGE = (courseID, qnrID, type) => `${LEARN_PREFIX}/f/wlxt/kcwj/wlkc_wjb/student/beforeAdd?wlkcid=${courseID}&wjid=${qnrID}&wjlx=${type}&jswj=no`;
export const LEARN_QNR_DETAIL = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/getWjnr`;
export const LEARN_QNR_DETAIL_FORM = (courseID, qnrID) => {
  const form = new FormData();
  form.append('wlkcid', courseID);
  form.append('wjid', qnrID);
  return form;
};
export const WebsiteShowLanguage = {
  [Language.ZH]: 'zh_CN',
  [Language.EN]: 'en_US'
};
export const LEARN_WEBSITE_LANGUAGE = lang => `${LEARN_PREFIX}/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;
export const LEARN_FAVORITE_ADD = (type, id) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/add?ywid=${id}&ywlx=${CONTENT_TYPE_MAP.get(type)}`;
export const LEARN_FAVORITE_REMOVE = id => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delete?ywid=${id}`;
export const LEARN_FAVORITE_LIST = type => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/pageList?ywlx=${type ? CONTENT_TYPE_MAP.get(type) : 'ALL'}`;
export const LEARN_FAVORITE_PIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/addZd`;
export const LEARN_FAVORITE_UNPIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delZd`;
export const LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = id => {
  const form = new FormData();
  form.append('ywid', id);
  return form;
};
export const LEARN_COMMENT_SET = `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/add`;
export const LEARN_COMMENT_SET_FORM_DATA = (type, id, content) => {
  const form = new FormData();
  form.append('ywlx', CONTENT_TYPE_MAP.get(type) ?? '');
  form.append('ywid', id);
  form.append('bznr', content);
  return form;
};
export const LEARN_COMMENT_LIST = type => `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/student/pageList?ywlx=${type ? CONTENT_TYPE_MAP.get(type) : 'ALL'}`;
export const LEARN_PAGE_LIST_FORM_DATA = courseID => {
  const form = new FormData();
  form.append('aoData', JSON.stringify(courseID ? [{
    name: 'wlkcid',
    value: courseID
  }] : []));
  return form;
};
export const LEARN_SORT_COURSES = `${LEARN_PREFIX}/b/wlxt/kc/wlkc_kcpxb/addorUpdate`;
export const REGISTRAR_TICKET_FORM_DATA = () => {
  const form = new FormData();
  form.append('appId', 'ALL_ZHJW');
  return form;
};
export const REGISTRAR_TICKET = () => `${LEARN_PREFIX}/b/wlxt/common/auth/gnt`;
export const REGISTRAR_AUTH = ticket => `${REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${ticket}`;
export const REGISTRAR_CALENDAR = (startDate, endDate, graduate = false, callbackName = 'unknown') => `${REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? 'yjs' : 'bks'}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
//# sourceMappingURL=urls.js.map