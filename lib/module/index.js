"use strict";

import * as cheerio from 'cheerio';
import { Base64 } from 'js-base64';
import { fetch } from 'node-fetch-native';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { ContentType, CourseType, FailReason, Language, QuestionnaireType } from "./types.js";
import * as URLS from "./urls.js";
import { CONTENT_TYPE_MAP_REVERSE, GRADE_LEVEL_MAP, JSONP_EXTRACTOR_NAME, QNR_TYPE_MAP, decodeHTML, extractJSONPResult, formatFileSize, parseSemesterType, trimAndDefine } from "./utils.js";
import { sm2 } from 'sm-crypto';
function makeFetch(jar) {
  return fetchCookie(fetch, jar);
}
const CHEERIO_CONFIG = {
  xml: true
};
const $ = html => {
  return cheerio.load(html, CHEERIO_CONFIG);
};
const noLogin = res => res.url.includes('login_timeout') || res.status == 403;
const YES = '是';

/** add CSRF token to any request URL as parameters */
export const addCSRFTokenToUrl = (url, token) => {
  const newUrl = new URL(url);
  newUrl.searchParams.set('_csrf', token);
  return newUrl.toString();
};

/** the main helper class */
export class Learn2018Helper {
  #provider;
  #cookieJar;
  #rawFetch;
  #myFetch;
  #myFetchWithToken = async (...args) => {
    if (this.#csrfToken == '') {
      await this.login();
    }
    const [url, ...remaining] = args;
    return this.#myFetch(addCSRFTokenToUrl(url, this.#csrfToken), ...remaining);
  };
  #csrfToken = '';
  #lang = Language.ZH;
  #withReAuth = rawFetch => {
    const login = this.login.bind(this);
    return async function wrappedFetch(...args) {
      const retryAfterLogin = async () => {
        await login();
        return await rawFetch(...args).then(res => {
          if (noLogin(res)) {
            return Promise.reject({
              reason: FailReason.NOT_LOGGED_IN
            });
          } else if (res.status != 200) {
            return Promise.reject({
              reason: FailReason.UNEXPECTED_STATUS,
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
      return await rawFetch(...args).then(res => noLogin(res) ? retryAfterLogin() : res);
    };
  };
  /** you can provide a CookieJar and / or CredentialProvider in the configuration */
  constructor(config) {
    this.previewFirstPage = config?.generatePreviewUrlForFirstPage ?? true;
    this.#provider = config?.provider;
    this.#cookieJar = config?.cookieJar ?? new CookieJar();
    this.#rawFetch = config?.fetch ?? makeFetch(this.#cookieJar);
    this.#myFetch = this.#provider ? this.#withReAuth(this.#rawFetch) : async (...args) => {
      const result = await this.#rawFetch(...args);
      if (noLogin(result)) return Promise.reject({
        reason: FailReason.NOT_LOGGED_IN
      });
      return result;
    };
  }

  /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
  getCSRFToken() {
    return this.#csrfToken;
  }

  /** manually set CSRF token (useful when you want to reuse previous token) */
  setCSRFToken(csrfToken) {
    this.#csrfToken = csrfToken;
  }

  /**
   * If using alternative cookie management systems,
   * be sure to clear id.tsinghua.edu.cn cookies before calling this function
   */
  async getRoamingTicket(username, password, fingerPrint, fingerGenPrint = '', fingerGenPrint3 = '') {
    // Make sure we always start with the form page
    // More code is needed to handle the case where the user is already logged in (i.e. cookies are set)
    // It won't be a problem if it is always the same user,
    // but if the current cookies are from a different user than the one trying to log in,
    // it will cause problems.
    try {
      await this.#cookieJar.setCookie('JSESSIONID=; path=/; HttpOnly', URLS.ID_PREFIX);
    } catch (err) {
      throw {
        reason: FailReason.ERROR_SETTING_COOKIES,
        extra: err
      };
    }
    try {
      const loginForm = await this.#rawFetch(URLS.ID_LOGIN());
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
      const checkResponse = await this.#rawFetch(URLS.ID_LOGIN_CHECK(), {
        method: 'POST',
        body: formData
      });
      const anchor = $(await checkResponse.text())('a');
      const redirectUrl = anchor.attr('href');
      const ticket = redirectUrl.split('=').slice(-1)[0];
      return ticket;
    } catch (err) {
      throw {
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: err
      };
    }
  }

  /** login is necessary if you do not provide a `CredentialProvider` */
  async login(username, password, fingerPrint, fingerGenPrint, fingerGenPrint3) {
    if (!username || !password || !fingerPrint) {
      if (!this.#provider) return Promise.reject({
        reason: FailReason.NO_CREDENTIAL
      });
      const credential = await this.#provider();
      username = credential.username;
      password = credential.password;
      fingerPrint = credential.fingerPrint;
      fingerGenPrint = credential.fingerGenPrint;
      fingerGenPrint3 = credential.fingerGenPrint3;
      if (!username || !password || !fingerPrint) {
        return Promise.reject({
          reason: FailReason.NO_CREDENTIAL
        });
      }
    }

    // check response from id.tsinghua.edu.cn
    const ticket = await this.getRoamingTicket(username, password, fingerPrint, fingerGenPrint, fingerGenPrint3);
    const loginResponse = await this.#rawFetch(URLS.LEARN_AUTH_ROAM(ticket));
    if (loginResponse.ok !== true) {
      return Promise.reject({
        reason: FailReason.ERROR_ROAMING
      });
    }
    const courseListPageSource = await (await this.#rawFetch(URLS.LEARN_STUDENT_COURSE_LIST_PAGE())).text();
    const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
    const tokenMatches = [...courseListPageSource.matchAll(tokenRegex)];
    if (tokenMatches.length == 0) {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: 'cannot fetch CSRF token from source'
      });
    }
    this.#csrfToken = tokenMatches[0][1];
    const langRegex = /<script src="\/f\/wlxt\/common\/languagejs\?lang=(zh|en)"><\/script>/g;
    const langMatches = [...courseListPageSource.matchAll(langRegex)];
    if (langMatches.length !== 0) this.#lang = langMatches[0][1];
  }

  /**  logout (to make everyone happy) */
  async logout() {
    await this.#rawFetch(URLS.LEARN_LOGOUT(), {
      method: 'POST'
    });
  }

  /** get user's name and department */
  async getUserInfo(courseType = CourseType.STUDENT) {
    const content = await (await this.#myFetchWithToken(URLS.LEARN_HOMEPAGE(courseType))).text();
    const dom = $(content);
    const name = dom('a.user-log').text().trim();
    const department = dom('.fl.up-img-info p:nth-child(2) label').text().trim();
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
    const ticketResponse = await this.#myFetchWithToken(URLS.REGISTRAR_TICKET(), {
      method: 'POST',
      body: URLS.REGISTRAR_TICKET_FORM_DATA()
    });
    let ticket = await ticketResponse.text();
    ticket = ticket.substring(1, ticket.length - 1);
    await this.#myFetch(URLS.REGISTRAR_AUTH(ticket));
    const response = await this.#myFetchWithToken(URLS.REGISTRAR_CALENDAR(startDate, endDate, graduate, JSONP_EXTRACTOR_NAME));
    if (!response.ok) {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE
      });
    }
    const result = extractJSONPResult(await response.text());
    return result.map(i => ({
      location: i.dd,
      status: i.fl,
      startTime: i.kssj,
      endTime: i.jssj,
      date: i.nq,
      courseName: i.nr
    }));
  }
  async getSemesterIdList() {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_SEMESTER_LIST())).json();
    if (!Array.isArray(json)) {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const semesters = json;
    // sometimes web learning returns null, so confusing...
    return semesters.filter(s => s != null);
  }
  async getCurrentSemester() {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_CURRENT_SEMESTER())).json();
    if (json.message !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.result;
    return {
      id: result.id,
      startDate: result.kssj,
      endDate: result.jssj,
      startYear: Number(result.xnxq.slice(0, 4)),
      endYear: Number(result.xnxq.slice(5, 9)),
      type: parseSemesterType(Number(result.xnxq.slice(10, 11)))
    };
  }

  /** get all courses in the specified semester */
  async getCourseList(semesterID, courseType = CourseType.STUDENT, lang = this.#lang) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_COURSE_LIST(semesterID, courseType, lang))).json();
    if (json.message !== 'success' || !Array.isArray(json.resultList)) {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.resultList ?? [];
    return Promise.all(result.map(async c => {
      let timeAndLocation = [];
      try {
        // see https://github.com/Harry-Chen/Learn-Helper/issues/145
        timeAndLocation = await (await this.#myFetchWithToken(URLS.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json();
      } catch (e) {}
      return {
        id: c.wlkcid,
        name: decodeHTML(c.zywkcm),
        chineseName: decodeHTML(c.kcm),
        englishName: decodeHTML(c.ywkcm),
        timeAndLocation,
        url: URLS.LEARN_COURSE_PAGE(c.wlkcid, courseType),
        teacherName: c.jsm ?? '',
        // teacher can not fetch this
        teacherNumber: c.jsh,
        courseNumber: c.kch,
        courseIndex: Number(c.kxh),
        // c.kxh could be string (teacher mode) or number (student mode)
        courseType
      };
    }));
  }

  /**
   * Get certain type of content of all specified courses.
   * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
   */
  async getAllContents(courseIDs, type, courseType = CourseType.STUDENT, allowFailure = false) {
    const fetchContentForCourse = (type, id, courseType) => {
      switch (type) {
        case ContentType.NOTIFICATION:
          return this.getNotificationList(id, courseType);
        case ContentType.FILE:
          return this.getFileList(id, courseType);
        case ContentType.HOMEWORK:
          return this.getHomeworkList(id);
        case ContentType.DISCUSSION:
          return this.getDiscussionList(id, courseType);
        case ContentType.QUESTION:
          return this.getAnsweredQuestionList(id, courseType);
        case ContentType.QUESTIONNAIRE:
          return this.getQuestionnaireList(id);
        default:
          return Promise.reject({
            reason: FailReason.NOT_IMPLEMENTED,
            extra: 'Unknown content type'
          });
      }
    };
    const contents = {};
    const results = await Promise.allSettled(courseIDs.map(async id => {
      contents[id] = await fetchContentForCourse(type, id, courseType);
    }));
    if (!allowFailure) {
      for (const r of results) {
        if (r.status == 'rejected') {
          return Promise.reject({
            reason: FailReason.INVALID_RESPONSE,
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
  async getNotificationList(courseID, courseType = CourseType.STUDENT) {
    return Promise.all([this.getNotificationListKind(courseID, courseType, false), this.getNotificationListKind(courseID, courseType, true)]).then(r => r.flat());
  }
  async getNotificationListKind(courseID, courseType, expired) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_NOTIFICATION_LIST(courseType, expired), {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? json.object?.resultsList ?? [];
    return Promise.all(result.map(async n => {
      const notification = {
        id: n.ggid,
        content: decodeHTML(Base64.decode(n.ggnr ?? '')),
        title: decodeHTML(n.bt),
        url: URLS.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
        publisher: n.fbrxm,
        hasRead: n.sfyd === YES,
        markedImportant: Number(n.sfqd) === 1,
        // n.sfqd could be string '1' (teacher mode) or number 1 (student mode)
        publishTime: n.fbsj && typeof n.fbsj === 'string' ? n.fbsj : n.fbsjStr,
        expireTime: n.jzsj ?? undefined,
        isFavorite: n.sfsc === YES,
        comment: n.bznr ?? undefined
      };
      let detail = {};
      const attachmentName = courseType === CourseType.STUDENT ? n.fjmc : n.fjbt;
      if (attachmentName) {
        detail = await this.parseNotificationDetail(courseID, notification.id, courseType, attachmentName);
      }
      return {
        ...notification,
        ...detail
      };
    }));
  }

  /** Get all files （课程文件） of the specified course. */
  async getFileList(courseID, courseType = CourseType.STUDENT) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FILE_LIST(courseID, courseType))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    let result = [];
    if (Array.isArray(json.object?.resultsList)) {
      // teacher
      result = json.object.resultsList;
    } else if (Array.isArray(json.object)) {
      // student
      result = json.object;
    }
    const categories = new Map((await this.getFileCategoryList(courseID, courseType)).map(c => [c.id, c]));
    return result.map(f => {
      const title = decodeHTML(f.bt);
      const fileId = f.wjid;
      const uploadTime = f.scsj;
      const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
      const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, this.previewFirstPage);
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
        isNew: f.isNew ?? false,
        markedImportant: f.sfqd === 1,
        visitCount: f.xsllcs ?? f.llcs ?? 0,
        downloadCount: f.xzcs ?? 0,
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
  async getFileCategoryList(courseID, courseType = CourseType.STUDENT) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FILE_CATEGORY_LIST(courseID, courseType))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.rows ?? [];
    return result.map(c => ({
      id: c.kjflid,
      title: decodeHTML(c.bt),
      creationTime: c.czsj
    }));
  }

  /**
   * Get all files of the specified category of the specified course.
   * Note: this cannot get correct `visitCount` and `downloadCount` for student
   */
  async getFileListByCategory(courseID, categoryId, courseType = CourseType.STUDENT) {
    if (courseType === CourseType.STUDENT) {
      const json = await (await this.#myFetchWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_STUDENT(courseID, categoryId))).json();
      if (json.result !== 'success') {
        return Promise.reject({
          reason: FailReason.INVALID_RESPONSE,
          extra: json
        });
      }
      const result = json.object ?? [];
      return result.map(f => {
        const fileId = f[7];
        const title = decodeHTML(f[1]);
        const rawSize = f[9];
        const size = formatFileSize(rawSize);
        const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
        const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, this.previewFirstPage);
        return {
          id: f[0],
          fileId,
          title,
          description: decodeHTML(f[5]),
          rawSize,
          size,
          uploadTime: f[6],
          publishTime: f[10],
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
          comment: f[14] ?? undefined
        };
      });
    } else {
      const json = await (await this.#myFetchWithToken(URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER, {
        method: 'POST',
        body: URLS.LEARN_FILE_LIST_BY_CATEGORY_TEACHER_FORM_DATA(courseID, categoryId)
      })).json();
      if (json.result !== 'success') {
        return Promise.reject({
          reason: FailReason.INVALID_RESPONSE,
          extra: json
        });
      }
      const result = json.object.aaData ?? [];
      return result.map(f => {
        const title = decodeHTML(f.bt);
        const fileId = f.wjid;
        const uploadTime = f.scsj;
        const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(fileId, courseType);
        const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, fileId, courseType, this.previewFirstPage);
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
          isNew: f.isNew ?? false,
          markedImportant: f.sfqd === 1,
          visitCount: f.xsllcs ?? f.llcs ?? 0,
          downloadCount: f.xzcs ?? 0,
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

  /** Get all homeworks （课程作业） of the specified course. */

  async getHomeworkList(courseID, courseType = CourseType.STUDENT) {
    if (courseType === CourseType.TEACHER) {
      const json = await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_LIST_TEACHER, {
        method: 'POST',
        body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
      })).json();
      if (json.result !== 'success') {
        return Promise.reject({
          reason: FailReason.INVALID_RESPONSE,
          extra: json
        });
      }
      const result = json.object?.aaData ?? [];
      return result.map(d => ({
        id: d.zyid,
        index: d.wz,
        title: decodeHTML(d.bt),
        description: decodeHTML(Base64.decode(d.nr)),
        publisherId: d.fbr,
        publishTime: d.fbsj,
        startTime: d.kssj,
        deadline: d.jzsj,
        lateSubmissionDeadline: d.bjjzsj ?? undefined,
        url: URLS.LEARN_HOMEWORK_DETAIL_TEACHER(courseID, d.zyid),
        completionType: d.zywcfs,
        submissionType: d.zytjfs,
        gradedCount: d.ypys,
        submittedCount: d.yjs,
        unsubmittedCount: d.wjs
      }));
    } else {
      return Promise.all(URLS.LEARN_HOMEWORK_LIST_SOURCE.map(s => this.getHomeworkListAtUrl(courseID, s.url, s.status))).then(r => r.flat());
    }
  }

  /** Get all discussions （课程讨论） of the specified course. */
  async getDiscussionList(courseID, courseType = CourseType.STUDENT) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.resultsList ?? [];
    return result.map(d => ({
      ...this.parseDiscussionBase(d),
      boardId: d.bqid,
      url: URLS.LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType)
    }));
  }

  /**
   * Get all notifications （课程答疑） of the specified course.
   * The student version supports only answered questions, while the teacher version supports all questions.
   */
  async getAnsweredQuestionList(courseID, courseType = CourseType.STUDENT) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.resultsList ?? [];
    return result.map(q => ({
      ...this.parseDiscussionBase(q),
      question: Base64.decode(q.wtnr),
      url: URLS.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType)
    }));
  }

  /**
   * Get all questionnaires （课程问卷/QNR） of the specified course.
   */
  async getQuestionnaireList(courseID) {
    return Promise.all([this.getQuestionnaireListAtUrl(courseID, URLS.LEARN_QNR_LIST_ONGOING), this.getQuestionnaireListAtUrl(courseID, URLS.LEARN_QNR_LIST_ENDED)]).then(r => r.flat());
  }
  async getQuestionnaireListAtUrl(courseID, url) {
    const json = await (await this.#myFetchWithToken(url, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    return Promise.all(result.map(async e => {
      const type = QNR_TYPE_MAP.get(e.wjlx) ?? QuestionnaireType.SURVEY;
      return {
        id: e.wjid,
        type,
        title: decodeHTML(e.wjbt),
        startTime: e.kssj,
        endTime: e.jssj,
        uploadTime: e.scsj,
        uploaderId: e.scr,
        uploaderName: e.scrxm,
        submitTime: e.tjsj ? e.tjsj : undefined,
        isFavorite: e.sfsc === YES,
        comment: e.bznr ?? undefined,
        url: URLS.LEARN_QNR_SUBMIT_PAGE(e.wlkcid, e.wjid, type),
        detail: await this.getQuestionnaireDetail(courseID, e.wjid)
      };
    }));
  }
  async getQuestionnaireDetail(courseID, qnrID) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_QNR_DETAIL, {
      method: 'POST',
      body: URLS.LEARN_QNR_DETAIL_FORM(courseID, qnrID)
    })).json();
    return json.map(e => ({
      id: e.wtid,
      index: Number(e.wtbh),
      type: e.type,
      required: e.require == YES,
      title: decodeHTML(e.wtbt),
      score: e.wtfz ? Number(e.wtfz) : undefined,
      // unsure about original type
      options: e.list?.map(o => ({
        id: o.xxid,
        index: Number(o.xxbh),
        title: decodeHTML(o.xxbt)
      }))
    }));
  }

  /**
   * Add an item to favorites. (收藏)
   */
  async addToFavorites(type, id) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FAVORITE_ADD(type, id))).json();
    if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }

  /**
   * Remove an item from favorites. (取消收藏)
   */
  async removeFromFavorites(id) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FAVORITE_REMOVE(id))).json();
    if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }

  /**
   * Get favorites. (我的收藏)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  async getFavorites(courseID, type) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FAVORITE_LIST(type), {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    return result.map(e => {
      const type = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!type) return; // ignore unknown type
      return {
        id: e.ywid,
        type,
        title: decodeHTML(e.ywbt),
        time: type === ContentType.DISCUSSION || type === ContentType.QUESTION ? e.tlsj : e.ywsj,
        state: e.ywzt,
        extra: e.ywbz ?? undefined,
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        pinned: e.sfzd === YES,
        pinnedTime: e.zdsj === null ? undefined : e.zdsj,
        // Note: this field is originally unix timestamp instead of string
        comment: e.bznr ?? undefined,
        addedTime: e.scsj,
        itemId: e.id
      };
    }).filter(x => !!x);
  }

  /**
   * Pin a favorite item. (置顶)
   */
  async pinFavoriteItem(id) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FAVORITE_PIN, {
      method: 'POST',
      body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }

  /**
   * Unpin a favorite item. (取消置顶)
   */
  async unpinFavoriteItem(id) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_FAVORITE_UNPIN, {
      method: 'POST',
      body: URLS.LEARN_FAVORITE_PIN_UNPIN_FORM_DATA(id)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }

  /**
   * Set a comment. (备注)
   * Set an empty string to remove the comment.
   */
  async setComment(type, id, content) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_COMMENT_SET, {
      method: 'POST',
      body: URLS.LEARN_COMMENT_SET_FORM_DATA(type, id, content)
    })).json();
    if (json.result !== 'success' || !json.msg?.endsWith?.('成功')) {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }

  /**
   * Get comments. (我的备注)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  async getComments(courseID, type) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_COMMENT_LIST(type), {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    return result.map(e => {
      const type = CONTENT_TYPE_MAP_REVERSE.get(e.ywlx);
      if (!type) return; // ignore unknown type
      return {
        id: e.ywid,
        type,
        content: e.bt,
        contentHTML: decodeHTML(e.bznrstring),
        title: decodeHTML(e.ywbt),
        semesterId: e.xnxq,
        courseId: e.wlkcid,
        commentTime: e.cjsj,
        itemId: e.id
      };
    }).filter(x => !!x);
  }
  async sortCourses(courseIDs) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_SORT_COURSES, {
      method: 'POST',
      body: JSON.stringify(courseIDs.map((id, index) => ({
        wlkcid: id,
        xh: index + 1
      }))),
      headers: {
        'Content-Type': 'application/json'
      }
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }
  async getHomeworkListAtUrl(courseID, url, status) {
    const json = await (await this.#myFetchWithToken(url, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    let excellentHomeworkListByHomework = {};
    try {
      excellentHomeworkListByHomework = await this.getExcellentHomeworkListByHomework(courseID);
    } catch (e) {
      // Don't block the whole process if excellent homework list cannot be fetched
    }
    return Promise.all(result.map(h => ({
      id: h.xszyid,
      studentHomeworkId: h.xszyid,
      baseId: h.zyid,
      title: decodeHTML(h.bt),
      url: URLS.LEARN_HOMEWORK_PAGE(h.wlkcid, h.xszyid),
      deadline: h.jzsj,
      lateSubmissionDeadline: h.bjjzsj ? h.bjjzsj : undefined,
      isLateSubmission: h.sfbj === YES,
      completionType: h.zywcfs,
      submissionType: h.zytjfs,
      submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE(h.wlkcid, h.xszyid),
      submitTime: h.scsj === null ? undefined : h.scsj,
      grade: h.cj === null ? undefined : h.cj,
      gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
      graderName: trimAndDefine(h.jsm),
      gradeContent: trimAndDefine(h.pynr),
      gradeTime: h.pysj === null ? undefined : h.pysj,
      isFavorite: h.sfsc === YES,
      favoriteTime: h.scsj === null || h.sfsc !== YES ? undefined : h.scsj,
      comment: h.bznr ?? undefined,
      excellentHomeworkList: excellentHomeworkListByHomework[h.zyid],
      ...status
    })).map(async h => ({
      ...h,
      ...(await this.parseHomeworkAtUrl(h.url)),
      ...(await this.getHomeworkDetail(h.baseId))
    })));
  }
  async getExcellentHomeworkListByHomework(courseID) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_LIST_EXCELLENT, {
      method: 'POST',
      body: URLS.LEARN_PAGE_LIST_FORM_DATA(courseID)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    return (await Promise.all(result.map(h => ({
      id: h.xszyid,
      baseId: h.zyid,
      title: decodeHTML(h.bt),
      url: URLS.LEARN_HOMEWORK_EXCELLENT_PAGE(h.wlkcid, h.xszyid),
      completionType: h.zywcfs,
      author: {
        id: h.cy?.split(' ')?.[0],
        name: h.cy?.split(' ')?.[1],
        anonymous: h.sfzm === YES
      }
    })).map(async h => ({
      ...h,
      ...(await this.parseHomeworkAtUrl(h.url)),
      ...(await this.getHomeworkDetail(h.baseId))
    })))).reduce((acc, cur) => {
      if (!acc[cur.baseId]) {
        acc[cur.baseId] = [];
      }
      acc[cur.baseId].push(cur);
      return acc;
    }, {});
  }
  async parseNotificationDetail(courseID, id, courseType, attachmentName) {
    /// from JSON (backup, currently not used)
    // const postParams = new FormData();
    // postParams.append('id', id);
    // postParams.append('wlkcid', courseID);
    // const metadata = await (await this.#myFetchWithToken(URL.LEARN_NOTIFICATION_EDIT(courseType), {
    //   'method': 'POST',
    //   'body': postParams,
    // })).json();
    // const attachmentId = metadata.ggfjid as string;
    /// parsed from HTML
    const response = await this.#myFetchWithToken(URLS.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
    const result = $(await response.text());
    let path = '';
    if (courseType === CourseType.STUDENT) {
      path = result('.ml-10').attr('href');
    } else {
      path = result('#wjid').attr('href');
    }
    const size = trimAndDefine(result('div#attachment > div.fl > span[class^="color"]').first().text());
    const params = new URLSearchParams(path.split('?').slice(-1)[0]);
    const attachmentId = params.get('wjid');
    if (!path.startsWith(URLS.LEARN_PREFIX)) {
      path = URLS.LEARN_PREFIX + path;
    }
    return {
      attachment: {
        name: attachmentName,
        id: attachmentId,
        downloadUrl: path,
        previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.NOTIFICATION, attachmentId, courseType, this.previewFirstPage),
        size
      }
    };
  }
  async parseHomeworkAtUrl(url) {
    const response = await this.#myFetchWithToken(url);
    const result = $(await response.text());
    const fileDivs = result('div.list.fujian.clearfix');
    return {
      description: trimAndDefine(result('div.list.calendar.clearfix > div.fl.right > div.c55').slice(0, 1).html()),
      answerContent: trimAndDefine(result('div.list.calendar.clearfix > div.fl.right > div.c55').slice(1, 2).html()),
      submittedContent: trimAndDefine($(result('div.boxbox').slice(1, 2).toArray())('div.right').slice(2, 3).html()),
      attachment: this.parseHomeworkFile(fileDivs[0]),
      answerAttachment: this.parseHomeworkFile(fileDivs[1]),
      submittedAttachment: this.parseHomeworkFile(fileDivs[2]),
      gradeAttachment: this.parseHomeworkFile(fileDivs[3])
    };
  }
  async getHomeworkDetail(baseId) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_DETAIL, {
      method: 'POST',
      body: URLS.LEARN_HOMEWORK_DETAIL_FORM_DATA(baseId)
    })).json();
    if (json.result !== 'success') {
      throw {
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      };
    }
    return {
      description: trimAndDefine(json.msg)
    };
  }
  parseHomeworkFile(fileDiv) {
    const fileNode = $(fileDiv)('.ftitle').children('a')[0] ?? $(fileDiv)('.fl').children('a')[0];
    if (fileNode !== undefined) {
      const size = trimAndDefine($(fileDiv)('.fl > span[class^="color"]').first().text());
      const params = new URLSearchParams(fileNode.attribs.href.split('?').slice(-1)[0]);
      const attachmentId = params.get('fileId');
      // so dirty here...
      let downloadUrl = URLS.LEARN_PREFIX + fileNode.attribs.href;
      if (params.has('downloadUrl')) {
        downloadUrl = URLS.LEARN_PREFIX + params.get('downloadUrl');
      }
      return {
        id: attachmentId,
        name: fileNode.children[0].data,
        downloadUrl,
        previewUrl: URLS.LEARN_FILE_PREVIEW(ContentType.HOMEWORK, attachmentId, CourseType.STUDENT, this.previewFirstPage),
        size
      };
    } else {
      return undefined;
    }
  }
  parseDiscussionBase(d) {
    return {
      id: d.id,
      title: decodeHTML(d.bt),
      publisherName: d.fbrxm,
      publishTime: d.fbsj,
      lastReplyTime: d.zhhfsj,
      lastReplierName: d.zhhfrxm,
      visitCount: d.djs ?? 0,
      // teacher cannot fetch this
      replyCount: d.hfcs,
      isFavorite: d.sfsc === YES,
      comment: d.bznr ?? undefined
    };
  }
  async submitHomework(id, content = '', attachment, removeAttachment = false) {
    const json = await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_SUBMIT(), {
      method: 'POST',
      body: URLS.LEARN_HOMEWORK_SUBMIT_FORM_DATA(id, content, attachment, removeAttachment)
    })).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.OPERATION_FAILED,
        extra: json
      });
    }
  }
  async setLanguage(lang) {
    await this.#myFetchWithToken(URLS.LEARN_WEBSITE_LANGUAGE(lang), {
      method: 'POST'
    });
    this.#lang = lang;
  }
  getCurrentLanguage() {
    return this.#lang;
  }
}
export * from "./types.js";
//# sourceMappingURL=index.js.map