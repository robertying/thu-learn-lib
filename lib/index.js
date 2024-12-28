var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

// src/index.ts
import * as cheerio from "cheerio";
import { Base64 } from "js-base64";
import makeFetch from "node-fetch-cookie-native";

// src/types.ts
var FailReason = /* @__PURE__ */ ((FailReason2) => {
  FailReason2["NO_CREDENTIAL"] = "no credential provided";
  FailReason2["ERROR_FETCH_FROM_ID"] = "could not fetch ticket from id.tsinghua.edu.cn";
  FailReason2["BAD_CREDENTIAL"] = "bad credential";
  FailReason2["ERROR_ROAMING"] = "could not roam to learn.tsinghua.edu.cn";
  FailReason2["NOT_LOGGED_IN"] = "not logged in or login timeout";
  FailReason2["NOT_IMPLEMENTED"] = "not implemented";
  FailReason2["INVALID_RESPONSE"] = "invalid response";
  FailReason2["UNEXPECTED_STATUS"] = "unexpected status";
  FailReason2["OPERATION_FAILED"] = "operation failed";
  return FailReason2;
})(FailReason || {});
var SemesterType = /* @__PURE__ */ ((SemesterType2) => {
  SemesterType2["FALL"] = "fall";
  SemesterType2["SPRING"] = "spring";
  SemesterType2["SUMMER"] = "summer";
  SemesterType2["UNKNOWN"] = "";
  return SemesterType2;
})(SemesterType || {});
var ContentType = /* @__PURE__ */ ((ContentType3) => {
  ContentType3["NOTIFICATION"] = "notification";
  ContentType3["FILE"] = "file";
  ContentType3["HOMEWORK"] = "homework";
  ContentType3["DISCUSSION"] = "discussion";
  ContentType3["QUESTION"] = "question";
  ContentType3["QUESTIONNAIRE"] = "questionnaire";
  return ContentType3;
})(ContentType || {});
var CourseType = /* @__PURE__ */ ((CourseType2) => {
  CourseType2["STUDENT"] = "student";
  CourseType2["TEACHER"] = "teacher";
  return CourseType2;
})(CourseType || {});
var HomeworkGradeLevel = /* @__PURE__ */ ((HomeworkGradeLevel2) => {
  HomeworkGradeLevel2["CHECKED"] = "checked";
  HomeworkGradeLevel2["A_PLUS"] = "A+";
  HomeworkGradeLevel2["A"] = "A";
  HomeworkGradeLevel2["A_MINUS"] = "A-";
  HomeworkGradeLevel2["B_PLUS"] = "B+";
  HomeworkGradeLevel2["DISTINCTION"] = "distinction";
  HomeworkGradeLevel2["B"] = "B";
  HomeworkGradeLevel2["B_MINUS"] = "B-";
  HomeworkGradeLevel2["C_PLUS"] = "C+";
  HomeworkGradeLevel2["C"] = "C";
  HomeworkGradeLevel2["C_MINUS"] = "C-";
  HomeworkGradeLevel2["G"] = "G";
  HomeworkGradeLevel2["D_PLUS"] = "D+";
  HomeworkGradeLevel2["D"] = "D";
  HomeworkGradeLevel2["EXEMPTED_COURSE"] = "exempted course";
  HomeworkGradeLevel2["P"] = "P";
  HomeworkGradeLevel2["EX"] = "EX";
  HomeworkGradeLevel2["EXEMPTION"] = "exemption";
  HomeworkGradeLevel2["PASS"] = "pass";
  HomeworkGradeLevel2["FAILURE"] = "failure";
  HomeworkGradeLevel2["W"] = "W";
  HomeworkGradeLevel2["I"] = "I";
  HomeworkGradeLevel2["INCOMPLETE"] = "incomplete";
  HomeworkGradeLevel2["NA"] = "NA";
  HomeworkGradeLevel2["F"] = "F";
  return HomeworkGradeLevel2;
})(HomeworkGradeLevel || {});
var HomeworkCompletionType = /* @__PURE__ */ ((HomeworkCompletionType2) => {
  HomeworkCompletionType2[HomeworkCompletionType2["INDIVIDUAL"] = 1] = "INDIVIDUAL";
  HomeworkCompletionType2[HomeworkCompletionType2["GROUP"] = 2] = "GROUP";
  return HomeworkCompletionType2;
})(HomeworkCompletionType || {});
var HomeworkSubmissionType = /* @__PURE__ */ ((HomeworkSubmissionType2) => {
  HomeworkSubmissionType2[HomeworkSubmissionType2["WEB_LEARNING"] = 2] = "WEB_LEARNING";
  HomeworkSubmissionType2[HomeworkSubmissionType2["OFFLINE"] = 0] = "OFFLINE";
  return HomeworkSubmissionType2;
})(HomeworkSubmissionType || {});
var QuestionnaireDetailType = /* @__PURE__ */ ((QuestionnaireDetailType2) => {
  QuestionnaireDetailType2["SINGLE"] = "dnx";
  QuestionnaireDetailType2["MULTI"] = "dox";
  QuestionnaireDetailType2["TEXT"] = "wd";
  return QuestionnaireDetailType2;
})(QuestionnaireDetailType || {});
var QuestionnaireType = /* @__PURE__ */ ((QuestionnaireType3) => {
  QuestionnaireType3["VOTE"] = "tp";
  QuestionnaireType3["FORM"] = "tb";
  QuestionnaireType3["SURVEY"] = "wj";
  return QuestionnaireType3;
})(QuestionnaireType || {});
var Language = /* @__PURE__ */ ((Language2) => {
  Language2["ZH"] = "zh";
  Language2["EN"] = "en";
  return Language2;
})(Language || {});

// src/urls.ts
import { FormData } from "node-fetch-native";

// src/utils.ts
import { decodeHTML as _decodeHTML } from "entities";
function parseSemesterType(n) {
  if (n === 1) {
    return "fall" /* FALL */;
  } else if (n === 2) {
    return "spring" /* SPRING */;
  } else if (n === 3) {
    return "summer" /* SUMMER */;
  } else {
    return "" /* UNKNOWN */;
  }
}
var CONTENT_TYPE_MK_MAP = {
  ["notification" /* NOTIFICATION */]: "kcgg",
  ["file" /* FILE */]: "kcwj",
  ["homework" /* HOMEWORK */]: "kczy",
  ["discussion" /* DISCUSSION */]: "",
  ["question" /* QUESTION */]: "",
  ["questionnaire" /* QUESTIONNAIRE */]: ""
};
function getMkFromType(type) {
  var _a;
  return "mk_" + ((_a = CONTENT_TYPE_MK_MAP[type]) != null ? _a : "UNKNOWN");
}
function decodeHTML(html) {
  const text = _decodeHTML(html != null ? html : "");
  return text.startsWith("\xC2\x9E\xC3\xA9e") ? text.slice(5) : text.startsWith("\x9E\xE9e") ? text.slice(3) : text.startsWith("\xE9e") ? text.slice(2) : text;
}
function trimAndDefine(text) {
  if (text === void 0 || text === null) {
    return void 0;
  }
  const trimmed = text.trim();
  return trimmed === "" ? void 0 : decodeHTML(trimmed);
}
var GRADE_LEVEL_MAP = /* @__PURE__ */ new Map([
  [-100, "checked" /* CHECKED */],
  [-99, "A+" /* A_PLUS */],
  [-98, "A" /* A */],
  [-92, "A-" /* A_MINUS */],
  [-87, "B+" /* B_PLUS */],
  [-85, "distinction" /* DISTINCTION */],
  [-82, "B" /* B */],
  [-78, "B-" /* B_MINUS */],
  [-74, "C+" /* C_PLUS */],
  [-71, "C" /* C */],
  [-68, "C-" /* C_MINUS */],
  [-67, "G" /* G */],
  [-66, "D+" /* D_PLUS */],
  [-64, "D" /* D */],
  [-65, "exempted course" /* EXEMPTED_COURSE */],
  [-63, "pass" /* PASS */],
  [-62, "EX" /* EX */],
  [-61, "exemption" /* EXEMPTION */],
  [-60, "pass" /* PASS */],
  [-59, "failure" /* FAILURE */],
  [-55, "W" /* W */],
  [-51, "I" /* I */],
  [-50, "incomplete" /* INCOMPLETE */],
  [-31, "NA" /* NA */],
  [-30, "F" /* F */]
]);
var JSONP_EXTRACTOR_NAME = "thu_learn_lib_jsonp_extractor";
function extractJSONPResult(jsonp) {
  if (!jsonp.startsWith(JSONP_EXTRACTOR_NAME)) {
    throw "invalid response" /* INVALID_RESPONSE */;
  }
  return Function(`"use strict";const ${JSONP_EXTRACTOR_NAME}=(s)=>s;return ${jsonp};`)();
}
function formatFileSize(size) {
  if (size < 1024) return size + "B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + "K";
  if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + "M";
  return (size / 1024 / 1024 / 1024).toFixed(2) + "G";
}
var CONTENT_TYPE_MAP = /* @__PURE__ */ new Map([
  ["notification" /* NOTIFICATION */, "KCGG"],
  ["file" /* FILE */, "KCKJ"],
  ["homework" /* HOMEWORK */, "KCZY"],
  ["discussion" /* DISCUSSION */, "KCTL"],
  ["question" /* QUESTION */, "KCDY"],
  ["questionnaire" /* QUESTIONNAIRE */, "KCWJ"]
  // omitted: 课表(KCKB)
]);
var CONTENT_TYPE_MAP_REVERSE = /* @__PURE__ */ new Map([
  [CONTENT_TYPE_MAP.get("notification" /* NOTIFICATION */), "notification" /* NOTIFICATION */],
  [CONTENT_TYPE_MAP.get("file" /* FILE */), "file" /* FILE */],
  [CONTENT_TYPE_MAP.get("homework" /* HOMEWORK */), "homework" /* HOMEWORK */],
  [CONTENT_TYPE_MAP.get("discussion" /* DISCUSSION */), "discussion" /* DISCUSSION */],
  [CONTENT_TYPE_MAP.get("question" /* QUESTION */), "question" /* QUESTION */],
  [CONTENT_TYPE_MAP.get("questionnaire" /* QUESTIONNAIRE */), "questionnaire" /* QUESTIONNAIRE */]
]);
var QNR_TYPE_MAP = /* @__PURE__ */ new Map([
  ["\u6295\u7968", "tp" /* VOTE */],
  ["\u586B\u8868", "tb" /* FORM */],
  ["\u95EE\u5377", "wj" /* SURVEY */]
]);

// src/urls.ts
var LEARN_PREFIX = "https://learn.tsinghua.edu.cn";
var REGISTRAR_PREFIX = "https://zhjw.cic.tsinghua.edu.cn";
var MAX_SIZE = 200;
var ID_LOGIN = () => "https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do";
var ID_LOGIN_FORM_DATA = (username, password) => {
  const credential = new FormData();
  credential.append("i_user", username);
  credential.append("i_pass", password);
  credential.append("atOnce", String(true));
  return credential;
};
var LEARN_AUTH_ROAM = (ticket) => `${LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`;
var LEARN_LOGOUT = () => `${LEARN_PREFIX}/f/j_spring_security_logout`;
var LEARN_HOMEPAGE = (courseType) => {
  if (courseType === "student" /* STUDENT */) {
    return `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
  } else {
    return `${LEARN_PREFIX}/f/wlxt/index/course/teacher/`;
  }
};
var LEARN_STUDENT_COURSE_LIST_PAGE = () => `${LEARN_PREFIX}/f/wlxt/index/course/student/`;
var LEARN_SEMESTER_LIST = () => `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;
var LEARN_CURRENT_SEMESTER = () => `${LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;
var LEARN_COURSE_LIST = (semester, courseType, lang) => courseType === "student" /* STUDENT */ ? `${LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}/${lang}` : `${LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${semester}/0`;
var LEARN_COURSE_PAGE = (courseID, courseType) => `${LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${courseID}`;
var LEARN_COURSE_TIME_LOCATION = (courseID) => `${LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${courseID}`;
var LEARN_FILE_LIST = (courseID, courseType) => courseType === "student" /* STUDENT */ ? `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${courseID}&size=${MAX_SIZE}` : `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${courseID}&size=${MAX_SIZE}`;
var LEARN_FILE_CATEGORY_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjflb/${courseType}/pageList?wlkcid=${courseID}`;
var LEARN_FILE_LIST_BY_CATEGORY_STUDENT = (courseID, categoryId) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxb/${courseID}/${categoryId}`;
var LEARN_FILE_LIST_BY_CATEGORY_TEACHER = `${LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/pageList`;
var LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA = (courseID, categoryId) => {
  const form = new FormData();
  form.append(
    "aoData",
    JSON.stringify([
      { name: "wlkcid", value: courseID },
      { name: "kjflid", value: categoryId }
    ])
  );
  return form;
};
var LEARN_FILE_DOWNLOAD = (fileID, courseType) => `${LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/${courseType}/downloadFile?sfgk=0&wjid=${fileID}`;
var LEARN_FILE_PREVIEW = (type, fileID, courseType, firstPageOnly = false) => `${LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=${getMkFromType(
  type
)}&browser=-1&sfgk=0&pageType=${firstPageOnly ? "first" : "all"}`;
var LEARN_NOTIFICATION_LIST = (courseType, expired) => `${LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/` + (courseType === "student" /* STUDENT */ ? "student/pageListXsby" : "teacher/pageListby") + (expired ? "Ygq" : "Wgq");
var LEARN_NOTIFICATION_DETAIL = (courseID, notificationID, courseType) => courseType === "student" /* STUDENT */ ? `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}` : `${LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;
var LEARN_HOMEWORK_LIST_NEW = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListWj`;
var LEARN_HOMEWORK_LIST_SUBMITTED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYjwg`;
var LEARN_HOMEWORK_LIST_GRADED = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/zyListYpg`;
var LEARN_HOMEWORK_LIST_EXCELLENT = `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/yxzylist`;
var LEARN_HOMEWORK_LIST_SOURCE = [
  {
    url: LEARN_HOMEWORK_LIST_NEW,
    status: {
      submitted: false,
      graded: false
    }
  },
  {
    url: LEARN_HOMEWORK_LIST_SUBMITTED,
    status: {
      submitted: true,
      graded: false
    }
  },
  {
    url: LEARN_HOMEWORK_LIST_GRADED,
    status: {
      submitted: true,
      graded: true
    }
  }
];
var LEARN_HOMEWORK_DETAIL = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&xszyid=${id}`;
var LEARN_HOMEWORK_DETAIL_EXCELLENT = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewYxzy?wlkcid=${courseID}&xszyid=${id}`;
var LEARN_HOMEWORK_SUBMIT_PAGE = (courseID, id) => `${LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${id}`;
var LEARN_HOMEWORK_SUBMIT = () => `${LEARN_PREFIX}/b/wlxt/kczy/zy/student/tjzy`;
var LEARN_HOMEWORK_SUBMIT_FORM_DATA = (id, content = "", attachment, removeAttachment = false) => {
  const form = new FormData();
  form.append("xszyid", id);
  form.append("zynr", content != null ? content : "");
  if (attachment) form.append("fileupload", attachment.content, attachment.filename);
  else form.append("fileupload", "undefined");
  if (removeAttachment) form.append("isDeleted", "1");
  else form.append("isDeleted", "0");
  return form;
};
var LEARN_HOMEWORK_LIST_TEACHER = `${LEARN_PREFIX}/b/wlxt/kczy/zy/teacher/pageList`;
var LEARN_HOMEWORK_DETAIL_TEACHER = (courseID, homeworkID) => `${LEARN_PREFIX}/f/wlxt/kczy/xszy/teacher/beforePageList?zyid=${homeworkID}&wlkcid=${courseID}`;
var LEARN_DISCUSSION_LIST = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;
var LEARN_DISCUSSION_DETAIL = (courseID, boardID, discussionID, courseType, tabId = 1) => `${LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;
var LEARN_QUESTION_LIST_ANSWERED = (courseID, courseType) => `${LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;
var LEARN_QUESTION_DETAIL = (courseID, questionID, courseType) => courseType === "student" /* STUDENT */ ? `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}` : `${LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;
var LEARN_QNR_LIST_ONGOING = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListWks`;
var LEARN_QNR_LIST_ENDED = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/pageListYjs`;
var LEARN_QNR_SUBMIT_PAGE = (courseID, qnrID, type) => `${LEARN_PREFIX}/f/wlxt/kcwj/wlkc_wjb/student/beforeAdd?wlkcid=${courseID}&wjid=${qnrID}&wjlx=${type}&jswj=no`;
var LEARN_QNR_DETAIL = `${LEARN_PREFIX}/b/wlxt/kcwj/wlkc_wjb/student/getWjnr`;
var LEARN_QNR_DETAIL_FORM = (courseID, qnrID) => {
  const form = new FormData();
  form.append("wlkcid", courseID);
  form.append("wjid", qnrID);
  return form;
};
var WebsiteShowLanguage = {
  ["zh" /* ZH */]: "zh_CN",
  ["en" /* EN */]: "en_US"
};
var LEARN_WEBSITE_LANGUAGE = (lang) => `${LEARN_PREFIX}/f/wlxt/common/language?websiteShowLanguage=${WebsiteShowLanguage[lang]}`;
var LEARN_FAVORITE_ADD = (type, id) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/add?ywid=${id}&ywlx=${CONTENT_TYPE_MAP.get(type)}`;
var LEARN_FAVORITE_REMOVE = (id) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delete?ywid=${id}`;
var LEARN_FAVORITE_LIST = (type) => `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/pageList?ywlx=${type ? CONTENT_TYPE_MAP.get(type) : "ALL"}`;
var LEARN_FAVORITE_PIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/addZd`;
var LEARN_FAVORITE_UNPIN = `${LEARN_PREFIX}/b/xt/wlkc_xsscb/student/delZd`;
var LEARN_FAVORITE_PIN_UNPIN_FORM_DATA = (id) => {
  const form = new FormData();
  form.append("ywid", id);
  return form;
};
var LEARN_COMMENT_SET = `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/add`;
var LEARN_COMMENT_SET_FORM_DATA = (type, id, content) => {
  var _a;
  const form = new FormData();
  form.append("ywlx", (_a = CONTENT_TYPE_MAP.get(type)) != null ? _a : "");
  form.append("ywid", id);
  form.append("bznr", content);
  return form;
};
var LEARN_COMMENT_LIST = (type) => `${LEARN_PREFIX}/b/wlxt/xt/wlkc_xsbjb/student/pageList?ywlx=${type ? CONTENT_TYPE_MAP.get(type) : "ALL"}`;
var LEARN_PAGE_LIST_FORM_DATA = (courseID) => {
  const form = new FormData();
  form.append("aoData", JSON.stringify(courseID ? [{ name: "wlkcid", value: courseID }] : []));
  return form;
};
var LEARN_SORT_COURSES = `${LEARN_PREFIX}/b/wlxt/kc/wlkc_kcpxb/addorUpdate`;
var REGISTRAR_TICKET_FORM_DATA = () => {
  const form = new FormData();
  form.append("appId", "ALL_ZHJW");
  return form;
};
var REGISTRAR_TICKET = () => `${LEARN_PREFIX}/b/wlxt/common/auth/gnt`;
var REGISTRAR_AUTH = (ticket) => `${REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${ticket}`;
var REGISTRAR_CALENDAR = (startDate, endDate, graduate = false, callbackName = "unknown") => `${REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? "yjs" : "bks"}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;

// src/index.ts
var CHEERIO_CONFIG = { xml: true };
var $ = (html) => {
  return cheerio.load(html, CHEERIO_CONFIG);
};
var noLogin = (res) => res.url.includes("login_timeout") || res.status == 403;
var YES = "\u662F";
var addCSRFTokenToUrl = (url, token) => {
  const newUrl = new URL(url);
  newUrl.searchParams.set("_csrf", token);
  return newUrl.toString();
};
var _provider, _rawFetch, _myFetch, _myFetchWithToken, _csrfToken, _lang, _withReAuth;
var Learn2018Helper = class {
  /** you can provide a CookieJar and / or CredentialProvider in the configuration */
  constructor(config) {
    __privateAdd(this, _provider);
    __privateAdd(this, _rawFetch);
    __privateAdd(this, _myFetch);
    __privateAdd(this, _myFetchWithToken, async (...args) => {
      if (__privateGet(this, _csrfToken) == "") {
        await this.login();
      }
      const [url, ...remaining] = args;
      return __privateGet(this, _myFetch).call(this, addCSRFTokenToUrl(url, __privateGet(this, _csrfToken)), ...remaining);
    });
    __privateAdd(this, _csrfToken, "");
    __privateAdd(this, _lang, "zh" /* ZH */);
    __privateAdd(this, _withReAuth, (rawFetch) => {
      const login = this.login.bind(this);
      return async function wrappedFetch(...args) {
        const retryAfterLogin = async () => {
          await login();
          return await rawFetch(...args).then((res) => {
            if (noLogin(res)) {
              return Promise.reject({
                reason: "not logged in or login timeout" /* NOT_LOGGED_IN */
              });
            } else if (res.status != 200) {
              return Promise.reject({
                reason: "unexpected status" /* UNEXPECTED_STATUS */,
                extra: {
                  code: res.status,
                  text: res.statusText
                }
              });
            } else {
              return res;
            }
          });
        };
        return await rawFetch(...args).then((res) => noLogin(res) ? retryAfterLogin() : res);
      };
    });
    var _a, _b;
    this.previewFirstPage = (_a = config == null ? void 0 : config.generatePreviewUrlForFirstPage) != null ? _a : true;
    __privateSet(this, _provider, config == null ? void 0 : config.provider);
    __privateSet(this, _rawFetch, (_b = config == null ? void 0 : config.fetch) != null ? _b : makeFetch(config == null ? void 0 : config.cookieJar));
    __privateSet(this, _myFetch, __privateGet(this, _provider) ? __privateGet(this, _withReAuth).call(this, __privateGet(this, _rawFetch)) : async (...args) => {
      const result = await __privateGet(this, _rawFetch).call(this, ...args);
      if (noLogin(result))
        return Promise.reject({
          reason: "not logged in or login timeout" /* NOT_LOGGED_IN */
        });
      return result;
    });
  }
  /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
  getCSRFToken() {
    return __privateGet(this, _csrfToken);
  }
  /** manually set CSRF token (useful when you want to reuse previous token) */
  setCSRFToken(csrfToken) {
    __privateSet(this, _csrfToken, csrfToken);
  }
  /** login is necessary if you do not provide a `CredentialProvider` */
  async login(username, password) {
    if (!username || !password) {
      if (!__privateGet(this, _provider))
        return Promise.reject({
          reason: "no credential provided" /* NO_CREDENTIAL */
        });
      const credential = await __privateGet(this, _provider).call(this);
      username = credential.username;
      password = credential.password;
      if (!username || !password) {
        return Promise.reject({
          reason: "no credential provided" /* NO_CREDENTIAL */
        });
      }
    }
    const ticketResponse = await __privateGet(this, _rawFetch).call(this, ID_LOGIN(), {
      body: ID_LOGIN_FORM_DATA(username, password),
      method: "POST"
    });
    if (!ticketResponse.ok) {
      return Promise.reject({
        reason: "could not fetch ticket from id.tsinghua.edu.cn" /* ERROR_FETCH_FROM_ID */
      });
    }
    const ticketResult = await ticketResponse.text();
    const body = $(ticketResult);
    const targetURL = body("a").attr("href");
    const ticket = targetURL.split("=").slice(-1)[0];
    if (ticket === "BAD_CREDENTIALS") {
      return Promise.reject({
        reason: "bad credential" /* BAD_CREDENTIAL */
      });
    }
    const loginResponse = await __privateGet(this, _rawFetch).call(this, LEARN_AUTH_ROAM(ticket));
    if (loginResponse.ok !== true) {
      return Promise.reject({
        reason: "could not roam to learn.tsinghua.edu.cn" /* ERROR_ROAMING */
      });
    }
    const courseListPageSource = await (await __privateGet(this, _rawFetch).call(this, LEARN_STUDENT_COURSE_LIST_PAGE())).text();
    const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
    const tokenMatches = [...courseListPageSource.matchAll(tokenRegex)];
    if (tokenMatches.length == 0) {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: "cannot fetch CSRF token from source"
      });
    }
    __privateSet(this, _csrfToken, tokenMatches[0][1]);
    const langRegex = /<script src="\/f\/wlxt\/common\/languagejs\?lang=(zh|en)"><\/script>/g;
    const langMatches = [...courseListPageSource.matchAll(langRegex)];
    if (langMatches.length !== 0) __privateSet(this, _lang, langMatches[0][1]);
  }
  /**  logout (to make everyone happy) */
  async logout() {
    await __privateGet(this, _rawFetch).call(this, LEARN_LOGOUT(), { method: "POST" });
  }
  /** get user's name and department */
  async getUserInfo(courseType = "student" /* STUDENT */) {
    const content = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_HOMEPAGE(courseType))).text();
    const dom = $(content);
    const name = dom("a.user-log").text().trim();
    const department = dom(".fl.up-img-info p:nth-child(2) label").text().trim();
    return {
      name,
      department
    };
  }
  /**
   * Get calendar items during the specified period (in yyyymmdd format).
   * @param startDate start date (inclusive)
   * @param endDate end date (inclusive)
   * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
   * and we currently observe a limit of no more that 29 days.
   * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
   */
  async getCalendar(startDate, endDate, graduate = false) {
    const ticketResponse = await __privateGet(this, _myFetchWithToken).call(this, REGISTRAR_TICKET(), {
      method: "POST",
      body: REGISTRAR_TICKET_FORM_DATA()
    });
    let ticket = await ticketResponse.text();
    ticket = ticket.substring(1, ticket.length - 1);
    await __privateGet(this, _myFetch).call(this, REGISTRAR_AUTH(ticket));
    const response = await __privateGet(this, _myFetchWithToken).call(this, REGISTRAR_CALENDAR(startDate, endDate, graduate, JSONP_EXTRACTOR_NAME));
    if (!response.ok) {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */
      });
    }
    const result = extractJSONPResult(await response.text());
    return result.map((i) => ({
      location: i.dd,
      status: i.fl,
      startTime: i.kssj,
      endTime: i.jssj,
      date: i.nq,
      courseName: i.nr
    }));
  }
  async getSemesterIdList() {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_SEMESTER_LIST())).json();
    if (!Array.isArray(json)) {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const semesters = json;
    return semesters.filter((s) => s != null);
  }
  async getCurrentSemester() {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_CURRENT_SEMESTER())).json();
    if (json.message !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = json.result;
    return {
      id: result.id,
      startDate: new Date(result.kssj),
      endDate: new Date(result.jssj),
      startYear: Number(result.xnxq.slice(0, 4)),
      endYear: Number(result.xnxq.slice(5, 9)),
      type: parseSemesterType(Number(result.xnxq.slice(10, 11)))
    };
  }
  /** get all courses in the specified semester */
  async getCourseList(semesterID, courseType = "student" /* STUDENT */) {
    var _a;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_COURSE_LIST(semesterID, courseType, __privateGet(this, _lang)))).json();
    if (json.message !== "success" || !Array.isArray(json.resultList)) {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_a = json.resultList) != null ? _a : [];
    return Promise.all(
      result.map(async (c) => {
        var _a2;
        let timeAndLocation = [];
        try {
          timeAndLocation = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json();
        } catch (e) {
        }
        return {
          id: c.wlkcid,
          name: decodeHTML(c.zywkcm),
          chineseName: decodeHTML(c.kcm),
          englishName: decodeHTML(c.ywkcm),
          timeAndLocation,
          url: LEARN_COURSE_PAGE(c.wlkcid, courseType),
          teacherName: (_a2 = c.jsm) != null ? _a2 : "",
          // teacher can not fetch this
          teacherNumber: c.jsh,
          courseNumber: c.kch,
          courseIndex: Number(c.kxh),
          // c.kxh could be string (teacher mode) or number (student mode)
          courseType
        };
      })
    );
  }
  /**
   * Get certain type of content of all specified courses.
   * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
   */
  async getAllContents(courseIDs, type, courseType = "student" /* STUDENT */, allowFailure = false) {
    const fetchContentForCourse = (type2, id, courseType2) => {
      switch (type2) {
        case "notification" /* NOTIFICATION */:
          return this.getNotificationList(id, courseType2);
        case "file" /* FILE */:
          return this.getFileList(id, courseType2);
        case "homework" /* HOMEWORK */:
          return this.getHomeworkList(id);
        case "discussion" /* DISCUSSION */:
          return this.getDiscussionList(id, courseType2);
        case "question" /* QUESTION */:
          return this.getAnsweredQuestionList(id, courseType2);
        case "questionnaire" /* QUESTIONNAIRE */:
          return this.getQuestionnaireList(id);
        default:
          return Promise.reject({
            reason: "not implemented" /* NOT_IMPLEMENTED */,
            extra: "Unknown content type"
          });
      }
    };
    const contents = {};
    const results = await Promise.allSettled(
      courseIDs.map(async (id) => {
        contents[id] = await fetchContentForCourse(type, id, courseType);
      })
    );
    if (!allowFailure) {
      for (const r of results) {
        if (r.status == "rejected") {
          return Promise.reject({
            reason: "invalid response" /* INVALID_RESPONSE */,
            extra: {
              reason: r.reason
            }
          });
        }
      }
    }
    return contents;
  }
  /** Get all notifications （课程公告） of the specified course. */
  async getNotificationList(courseID, courseType = "student" /* STUDENT */) {
    return Promise.all([
      this.getNotificationListKind(courseID, courseType, false),
      this.getNotificationListKind(courseID, courseType, true)
    ]).then((r) => r.flat());
  }
  async getNotificationListKind(courseID, courseType, expired) {
    var _a, _b, _c, _d;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_NOTIFICATION_LIST(courseType, expired), {
      method: "POST",
      body: LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_d = (_c = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _c : (_b = json.object) == null ? void 0 : _b.resultsList) != null ? _d : [];
    return Promise.all(
      result.map(async (n) => {
        var _a2, _b2;
        const notification = {
          id: n.ggid,
          content: decodeHTML(Base64.decode((_a2 = n.ggnr) != null ? _a2 : "")),
          title: decodeHTML(n.bt),
          url: LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
          publisher: n.fbrxm,
          hasRead: n.sfyd === YES,
          markedImportant: Number(n.sfqd) === 1,
          // n.sfqd could be string '1' (teacher mode) or number 1 (student mode)
          publishTime: new Date(n.fbsj && typeof n.fbsj === "string" ? n.fbsj : n.fbsjStr),
          expireTime: n.jzsj ? new Date(n.jzsj) : void 0,
          isFavorite: n.sfsc === YES,
          comment: (_b2 = n.bznr) != null ? _b2 : void 0
        };
        let detail = {};
        const attachmentName = courseType === "student" /* STUDENT */ ? n.fjmc : n.fjbt;
        if (attachmentName) {
          detail = await this.parseNotificationDetail(courseID, notification.id, courseType, attachmentName);
        }
        return { ...notification, ...detail };
      })
    );
  }
  /** Get all files （课程文件） of the specified course. */
  async getFileList(courseID, courseType = "student" /* STUDENT */) {
    var _a;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FILE_LIST(courseID, courseType))).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    let result = [];
    if (Array.isArray((_a = json.object) == null ? void 0 : _a.resultsList)) {
      result = json.object.resultsList;
    } else if (Array.isArray(json.object)) {
      result = json.object;
    }
    const categories = new Map((await this.getFileCategoryList(courseID, courseType)).map((c) => [c.id, c]));
    return result.map((f) => {
      var _a2, _b, _c, _d;
      const title = decodeHTML(f.bt);
      const fileId = f.wjid;
      const uploadTime = new Date(f.scsj);
      const downloadUrl = LEARN_FILE_DOWNLOAD(fileId, courseType);
      const previewUrl = LEARN_FILE_PREVIEW("file" /* FILE */, fileId, courseType, this.previewFirstPage);
      return {
        id: f.kjxxid,
        fileId,
        category: categories.get(f.kjflid),
        title,
        description: decodeHTML(f.ms),
        rawSize: f.wjdx,
        size: f.fileSize,
        uploadTime,
        publishTime: uploadTime,
        downloadUrl,
        previewUrl,
        isNew: (_a2 = f.isNew) != null ? _a2 : false,
        markedImportant: f.sfqd === 1,
        visitCount: (_c = (_b = f.xsllcs) != null ? _b : f.llcs) != null ? _c : 0,
        downloadCount: (_d = f.xzcs) != null ? _d : 0,
        fileType: f.wjlx,
        remoteFile: {
          id: fileId,
          name: title,
          downloadUrl,
          previewUrl,
          size: f.fileSize
        }
      };
    });
  }
  /** Get file categories of the specified course. */
  async getFileCategoryList(courseID, courseType = "student" /* STUDENT */) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FILE_CATEGORY_LIST(courseID, courseType))).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.rows) != null ? _b : [];
    return result.map(
      (c) => ({
        id: c.kjflid,
        title: decodeHTML(c.bt),
        creationTime: new Date(c.czsj)
      })
    );
  }
  /**
   * Get all files of the specified category of the specified course.
   * Note: this cannot get correct `visitCount` and `downloadCount` for student
   */
  async getFileListByCategory(courseID, categoryId, courseType = "student" /* STUDENT */) {
    var _a, _b;
    if (courseType === "student" /* STUDENT */) {
      const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FILE_LIST_BY_CATEGORY_STUDENT(courseID, categoryId))).json();
      if (json.result !== "success") {
        return Promise.reject({
          reason: "invalid response" /* INVALID_RESPONSE */,
          extra: json
        });
      }
      const result = (_a = json.object) != null ? _a : [];
      return result.map((f) => {
        var _a2;
        const fileId = f[7];
        const title = decodeHTML(f[1]);
        const rawSize = f[9];
        const size = formatFileSize(rawSize);
        const downloadUrl = LEARN_FILE_DOWNLOAD(fileId, courseType);
        const previewUrl = LEARN_FILE_PREVIEW("file" /* FILE */, fileId, courseType, this.previewFirstPage);
        return {
          id: f[0],
          fileId,
          title,
          description: decodeHTML(f[5]),
          rawSize,
          size,
          uploadTime: new Date(f[6]),
          publishTime: new Date(f[10]),
          downloadUrl,
          previewUrl,
          isNew: f[8] === 1,
          markedImportant: f[2] === 1,
          visitCount: 0,
          downloadCount: 0,
          fileType: f[13],
          remoteFile: {
            id: fileId,
            name: title,
            downloadUrl,
            previewUrl,
            size
          },
          isFavorite: f[11],
          comment: (_a2 = f[14]) != null ? _a2 : void 0
        };
      });
    } else {
      const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FILE_LIST_BY_CATEGORY_TEACHER, {
        method: "POST",
        body: LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA(courseID, categoryId)
      })).json();
      if (json.result !== "success") {
        return Promise.reject({
          reason: "invalid response" /* INVALID_RESPONSE */,
          extra: json
        });
      }
      const result = (_b = json.object.aaData) != null ? _b : [];
      return result.map((f) => {
        var _a2, _b2, _c, _d;
        const title = decodeHTML(f.bt);
        const fileId = f.wjid;
        const uploadTime = new Date(f.scsj);
        const downloadUrl = LEARN_FILE_DOWNLOAD(fileId, courseType);
        const previewUrl = LEARN_FILE_PREVIEW("file" /* FILE */, fileId, courseType, this.previewFirstPage);
        return {
          id: f.kjxxid,
          fileId,
          title,
          description: decodeHTML(f.ms),
          rawSize: f.wjdx,
          size: f.fileSize,
          uploadTime,
          publishTime: uploadTime,
          downloadUrl,
          previewUrl,
          isNew: (_a2 = f.isNew) != null ? _a2 : false,
          markedImportant: f.sfqd === 1,
          visitCount: (_c = (_b2 = f.xsllcs) != null ? _b2 : f.llcs) != null ? _c : 0,
          downloadCount: (_d = f.xzcs) != null ? _d : 0,
          fileType: f.wjlx,
          remoteFile: {
            id: fileId,
            name: title,
            downloadUrl,
            previewUrl,
            size: f.fileSize
          }
        };
      });
    }
  }
  async getHomeworkList(courseID, courseType = "student" /* STUDENT */) {
    var _a, _b;
    if (courseType === "teacher" /* TEACHER */) {
      const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_HOMEWORK_LIST_TEACHER, {
        method: "POST",
        body: LEARN_PAGE_LIST_FORM_DATA(courseID)
      })).json();
      if (json.result !== "success") {
        return Promise.reject({
          reason: "invalid response" /* INVALID_RESPONSE */,
          extra: json
        });
      }
      const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
      return result.map(
        (d) => ({
          id: d.zyid,
          index: d.wz,
          title: decodeHTML(d.bt),
          description: decodeHTML(Base64.decode(d.nr)),
          publisherId: d.fbr,
          publishTime: new Date(d.fbsj),
          startTime: new Date(d.kssj),
          deadline: new Date(d.jzsj),
          lateSubmissionDeadline: d.bjjzsj ? new Date(d.bjjzsj) : void 0,
          url: LEARN_HOMEWORK_DETAIL_TEACHER(courseID, d.zyid),
          completionType: d.zywcfs,
          submissionType: d.zytjfs,
          gradedCount: d.ypys,
          submittedCount: d.yjs,
          unsubmittedCount: d.wjs
        })
      );
    } else {
      return Promise.all(
        LEARN_HOMEWORK_LIST_SOURCE.map((s) => this.getHomeworkListAtUrl(courseID, s.url, s.status))
      ).then((r) => r.flat());
    }
  }
  /** Get all discussions （课程讨论） of the specified course. */
  async getDiscussionList(courseID, courseType = "student" /* STUDENT */) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_DISCUSSION_LIST(courseID, courseType))).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.resultsList) != null ? _b : [];
    return result.map(
      (d) => ({
        ...this.parseDiscussionBase(d),
        boardId: d.bqid,
        url: LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType)
      })
    );
  }
  /**
   * Get all notifications （课程答疑） of the specified course.
   * The student version supports only answered questions, while the teacher version supports all questions.
   */
  async getAnsweredQuestionList(courseID, courseType = "student" /* STUDENT */) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.resultsList) != null ? _b : [];
    return result.map(
      (q) => ({
        ...this.parseDiscussionBase(q),
        question: Base64.decode(q.wtnr),
        url: LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType)
      })
    );
  }
  /**
   * Get all questionnaires （课程问卷/QNR） of the specified course.
   */
  async getQuestionnaireList(courseID) {
    return Promise.all([
      this.getQuestionnaireListAtUrl(courseID, LEARN_QNR_LIST_ONGOING),
      this.getQuestionnaireListAtUrl(courseID, LEARN_QNR_LIST_ENDED)
    ]).then((r) => r.flat());
  }
  async getQuestionnaireListAtUrl(courseID, url) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, url, { method: "POST", body: LEARN_PAGE_LIST_FORM_DATA(courseID) })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
    return Promise.all(
      result.map(async (e) => {
        var _a2, _b2;
        const type = (_a2 = QNR_TYPE_MAP.get(e.wjlx)) != null ? _a2 : "wj" /* SURVEY */;
        return {
          id: e.wjid,
          type,
          title: decodeHTML(e.wjbt),
          startTime: new Date(e.kssj),
          endTime: new Date(e.jssj),
          uploadTime: new Date(e.scsj),
          uploaderId: e.scr,
          uploaderName: e.scrxm,
          submitTime: e.tjsj ? new Date(e.tjsj) : void 0,
          isFavorite: e.sfsc === YES,
          comment: (_b2 = e.bznr) != null ? _b2 : void 0,
          url: LEARN_QNR_SUBMIT_PAGE(e.wlkcid, e.wjid, type),
          detail: await this.getQuestionnaireDetail(courseID, e.wjid)
        };
      })
    );
  }
  async getQuestionnaireDetail(courseID, qnrID) {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_QNR_DETAIL, {
      method: "POST",
      body: LEARN_QNR_DETAIL_FORM(courseID, qnrID)
    })).json();
    return json.map(
      (e) => {
        var _a;
        return {
          id: e.wtid,
          index: Number(e.wtbh),
          type: e.type,
          required: e.require == YES,
          title: decodeHTML(e.wtbt),
          score: e.wtfz ? Number(e.wtfz) : void 0,
          // unsure about original type
          options: (_a = e.list) == null ? void 0 : _a.map((o) => ({
            id: o.xxid,
            index: Number(o.xxbh),
            title: decodeHTML(o.xxbt)
          }))
        };
      }
    );
  }
  /**
   * Add an item to favorites. (收藏)
   */
  async addToFavorites(type, id) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FAVORITE_ADD(type, id))).json();
    if (json.result !== "success" || !((_b = (_a = json.msg) == null ? void 0 : _a.endsWith) == null ? void 0 : _b.call(_a, "\u6210\u529F"))) {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  /**
   * Remove an item from favorites. (取消收藏)
   */
  async removeFromFavorites(id) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FAVORITE_REMOVE(id))).json();
    if (json.result !== "success" || !((_b = (_a = json.msg) == null ? void 0 : _a.endsWith) == null ? void 0 : _b.call(_a, "\u6210\u529F"))) {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  /**
   * Get favorites. (我的收藏)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  async getFavorites(courseID, type) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FAVORITE_LIST(type), {
      method: "POST",
      body: LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
    return result.map((e) => {
      var _a2, _b2;
      const type2 = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!type2) return;
      return {
        id: e.ywid,
        type: type2,
        title: decodeHTML(e.ywbt),
        time: type2 === "discussion" /* DISCUSSION */ || type2 === "question" /* QUESTION */ ? new Date(e.tlsj) : new Date(e.ywsj),
        state: e.ywzt,
        extra: (_a2 = e.ywbz) != null ? _a2 : void 0,
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        pinned: e.sfzd === YES,
        pinnedTime: e.zdsj === null ? void 0 : new Date(e.zdsj),
        // Note: this field is originally unix timestamp instead of string
        comment: (_b2 = e.bznr) != null ? _b2 : void 0,
        addedTime: new Date(e.scsj),
        itemId: e.id
      };
    }).filter((x) => !!x);
  }
  /**
   * Pin a favorite item. (置顶)
   */
  async pinFavoriteItem(id) {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FAVORITE_PIN, {
      method: "POST",
      body: LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  /**
   * Unpin a favorite item. (取消置顶)
   */
  async unpinFavoriteItem(id) {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_FAVORITE_UNPIN, {
      method: "POST",
      body: LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  /**
   * Set a comment. (备注)
   * Set an empty string to remove the comment.
   */
  async setComment(type, id, content) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_COMMENT_SET, {
      method: "POST",
      body: LEARN_COMMENT_SET_FORM_DATA(type, id, content)
    })).json();
    if (json.result !== "success" || !((_b = (_a = json.msg) == null ? void 0 : _a.endsWith) == null ? void 0 : _b.call(_a, "\u6210\u529F"))) {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  /**
   * Get comments. (我的备注)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  async getComments(courseID, type) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_COMMENT_LIST(type), {
      method: "POST",
      body: LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
    return result.map((e) => {
      const type2 = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!type2) return;
      return {
        id: e.ywid,
        type: type2,
        content: e.bt,
        contentHTML: decodeHTML(e.bznrstring),
        title: decodeHTML(e.ywbt),
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        commentTime: new Date(e.cjsj),
        itemId: e.id
      };
    }).filter((x) => !!x);
  }
  async sortCourses(courseIDs) {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_SORT_COURSES, {
      method: "POST",
      body: JSON.stringify(courseIDs.map((id, index) => ({ wlkcid: id, xh: index + 1 }))),
      headers: {
        "Content-Type": "application/json"
      }
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  async getHomeworkListAtUrl(courseID, url, status) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, url, {
      method: "POST",
      body: LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
    let excellentHomeworkListByHomework = {};
    try {
      excellentHomeworkListByHomework = await this.getExcellentHomeworkListByHomework(courseID);
    } catch (e) {
    }
    return Promise.all(
      result.map(
        (h) => {
          var _a2;
          return {
            id: h.xszyid,
            studentHomeworkId: h.xszyid,
            baseId: h.zyid,
            title: decodeHTML(h.bt),
            url: LEARN_HOMEWORK_DETAIL(h.wlkcid, h.xszyid),
            deadline: new Date(h.jzsj),
            lateSubmissionDeadline: h.bjjzsj ? new Date(h.bjjzsj) : void 0,
            isLateSubmission: h.sfbj === YES,
            completionType: h.zywcfs,
            submissionType: h.zytjfs,
            submitUrl: LEARN_HOMEWORK_SUBMIT_PAGE(h.wlkcid, h.xszyid),
            submitTime: h.scsj === null ? void 0 : new Date(h.scsj),
            grade: h.cj === null ? void 0 : h.cj,
            gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
            graderName: trimAndDefine(h.jsm),
            gradeContent: trimAndDefine(h.pynr),
            gradeTime: h.pysj === null ? void 0 : new Date(h.pysj),
            isFavorite: h.sfsc === YES,
            favoriteTime: h.scsj === null || h.sfsc !== YES ? void 0 : new Date(h.scsj),
            comment: (_a2 = h.bznr) != null ? _a2 : void 0,
            excellentHomeworkList: excellentHomeworkListByHomework[h.zyid],
            ...status
          };
        }
      ).map(
        async (h) => ({
          ...h,
          ...await this.parseHomeworkAtUrl(h.url)
        })
      )
    );
  }
  async getExcellentHomeworkListByHomework(courseID) {
    var _a, _b;
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_HOMEWORK_LIST_EXCELLENT, {
      method: "POST",
      body: LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "invalid response" /* INVALID_RESPONSE */,
        extra: json
      });
    }
    const result = (_b = (_a = json.object) == null ? void 0 : _a.aaData) != null ? _b : [];
    return (await Promise.all(
      result.map(
        (h) => {
          var _a2, _b2, _c, _d;
          return {
            id: h.xszyid,
            baseId: h.zyid,
            title: decodeHTML(h.bt),
            url: LEARN_HOMEWORK_DETAIL_EXCELLENT(h.wlkcid, h.xszyid),
            completionType: h.zywcfs,
            author: {
              id: (_b2 = (_a2 = h.cy) == null ? void 0 : _a2.split(" ")) == null ? void 0 : _b2[0],
              name: (_d = (_c = h.cy) == null ? void 0 : _c.split(" ")) == null ? void 0 : _d[1],
              anonymous: h.sfzm === YES
            }
          };
        }
      ).map(
        async (h) => ({
          ...h,
          ...await this.parseHomeworkAtUrl(h.url)
        })
      )
    )).reduce((acc, cur) => {
      if (!acc[cur.baseId]) {
        acc[cur.baseId] = [];
      }
      acc[cur.baseId].push(cur);
      return acc;
    }, {});
  }
  async parseNotificationDetail(courseID, id, courseType, attachmentName) {
    const response = await __privateGet(this, _myFetchWithToken).call(this, LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
    const result = $(await response.text());
    let path = "";
    if (courseType === "student" /* STUDENT */) {
      path = result(".ml-10").attr("href");
    } else {
      path = result("#wjid").attr("href");
    }
    const size = trimAndDefine(result('div#attachment > div.fl > span[class^="color"]').first().text());
    const params = new URLSearchParams(path.split("?").slice(-1)[0]);
    const attachmentId = params.get("wjid");
    if (!path.startsWith(LEARN_PREFIX)) {
      path = LEARN_PREFIX + path;
    }
    return {
      attachment: {
        name: attachmentName,
        id: attachmentId,
        downloadUrl: path,
        previewUrl: LEARN_FILE_PREVIEW("notification" /* NOTIFICATION */, attachmentId, courseType, this.previewFirstPage),
        size
      }
    };
  }
  async parseHomeworkAtUrl(url) {
    const response = await __privateGet(this, _myFetchWithToken).call(this, url);
    const result = $(await response.text());
    const fileDivs = result("div.list.fujian.clearfix");
    return {
      description: trimAndDefine(result("div.list.calendar.clearfix > div.fl.right > div.c55").slice(0, 1).html()),
      answerContent: trimAndDefine(result("div.list.calendar.clearfix > div.fl.right > div.c55").slice(1, 2).html()),
      submittedContent: trimAndDefine($(result("div.boxbox").slice(1, 2).toArray())("div.right").slice(2, 3).html()),
      attachment: this.parseHomeworkFile(fileDivs[0]),
      answerAttachment: this.parseHomeworkFile(fileDivs[1]),
      submittedAttachment: this.parseHomeworkFile(fileDivs[2]),
      gradeAttachment: this.parseHomeworkFile(fileDivs[3])
    };
  }
  parseHomeworkFile(fileDiv) {
    var _a;
    const fileNode = (_a = $(fileDiv)(".ftitle").children("a")[0]) != null ? _a : $(fileDiv)(".fl").children("a")[0];
    if (fileNode !== void 0) {
      const size = trimAndDefine($(fileDiv)('.fl > span[class^="color"]').first().text());
      const params = new URLSearchParams(fileNode.attribs.href.split("?").slice(-1)[0]);
      const attachmentId = params.get("fileId");
      let downloadUrl = LEARN_PREFIX + fileNode.attribs.href;
      if (params.has("downloadUrl")) {
        downloadUrl = LEARN_PREFIX + params.get("downloadUrl");
      }
      return {
        id: attachmentId,
        name: fileNode.children[0].data,
        downloadUrl,
        previewUrl: LEARN_FILE_PREVIEW(
          "homework" /* HOMEWORK */,
          attachmentId,
          "student" /* STUDENT */,
          this.previewFirstPage
        ),
        size
      };
    } else {
      return void 0;
    }
  }
  parseDiscussionBase(d) {
    var _a, _b;
    return {
      id: d.id,
      title: decodeHTML(d.bt),
      publisherName: d.fbrxm,
      publishTime: new Date(d.fbsj),
      lastReplyTime: new Date(d.zhhfsj),
      lastReplierName: d.zhhfrxm,
      visitCount: (_a = d.djs) != null ? _a : 0,
      // teacher cannot fetch this
      replyCount: d.hfcs,
      isFavorite: d.sfsc === YES,
      comment: (_b = d.bznr) != null ? _b : void 0
    };
  }
  async submitHomework(id, content = "", attachment, removeAttachment = false) {
    const json = await (await __privateGet(this, _myFetchWithToken).call(this, LEARN_HOMEWORK_SUBMIT(), {
      method: "POST",
      body: LEARN_HOMEWORK_SUBMIT_FORM_DATA(id, content, attachment, removeAttachment)
    })).json();
    if (json.result !== "success") {
      return Promise.reject({
        reason: "operation failed" /* OPERATION_FAILED */,
        extra: json
      });
    }
  }
  async setLanguage(lang) {
    await __privateGet(this, _myFetchWithToken).call(this, LEARN_WEBSITE_LANGUAGE(lang), {
      method: "POST"
    });
    __privateSet(this, _lang, lang);
  }
  getCurrentLanguage() {
    return __privateGet(this, _lang);
  }
};
_provider = new WeakMap();
_rawFetch = new WeakMap();
_myFetch = new WeakMap();
_myFetchWithToken = new WeakMap();
_csrfToken = new WeakMap();
_lang = new WeakMap();
_withReAuth = new WeakMap();
export {
  ContentType,
  CourseType,
  FailReason,
  HomeworkCompletionType,
  HomeworkGradeLevel,
  HomeworkSubmissionType,
  Language,
  Learn2018Helper,
  QuestionnaireDetailType,
  QuestionnaireType,
  SemesterType,
  addCSRFTokenToUrl
};
