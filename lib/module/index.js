import * as cheerio from 'cheerio';
import { Base64 } from 'js-base64';
import makeFetch from 'node-fetch-cookie-native';
import * as URLS from './urls';
import { ContentType, FailReason, CourseType, Language } from './types';
import { decodeHTML, parseSemesterType, trimAndDefine, JSONP_EXTRACTOR_NAME, extractJSONPResult, GRADE_LEVEL_MAP } from './utils';
const CHEERIO_CONFIG = {
  // _useHtmlParser2
  xml: true,
  decodeEntities: false
};
const $ = html => {
  return cheerio.load(html, CHEERIO_CONFIG);
};
const noLogin = res => res.url.includes('login_timeout') || res.status == 403;

/** add CSRF token to any request URL as parameters */
export const addCSRFTokenToUrl = (url, token) => {
  const newUrl = new URL(url);
  newUrl.searchParams.set('_csrf', token);
  return newUrl.toString();
};

/** the main helper class */
export class Learn2018Helper {
  #provider;
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
    this.#rawFetch = config?.fetch ?? makeFetch(config?.cookieJar);
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

  /** login is necessary if you do not provide a `CredentialProvider` */
  async login(username, password) {
    if (!username || !password) {
      if (!this.#provider) return Promise.reject({
        reason: FailReason.NO_CREDENTIAL
      });
      const credential = await this.#provider();
      username = credential.username;
      password = credential.password;
      if (!username || !password) {
        return Promise.reject({
          reason: FailReason.NO_CREDENTIAL
        });
      }
    }
    const ticketResponse = await this.#rawFetch(URLS.ID_LOGIN(), {
      body: URLS.ID_LOGIN_FORM_DATA(username, password),
      method: 'POST'
    });
    if (!ticketResponse.ok) {
      return Promise.reject({
        reason: FailReason.ERROR_FETCH_FROM_ID
      });
    }
    // check response from id.tsinghua.edu.cn
    const ticketResult = await ticketResponse.text();
    const body = $(ticketResult);
    const targetURL = body('a').attr('href');
    const ticket = targetURL.split('=').slice(-1)[0];
    if (ticket === 'BAD_CREDENTIALS') {
      return Promise.reject({
        reason: FailReason.BAD_CREDENTIAL
      });
    }
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
    const courses = [];
    await Promise.all(result.map(async c => {
      let timeAndLocation = [];
      try {
        // see https://github.com/Harry-Chen/Learn-Helper/issues/145
        timeAndLocation = await (await this.#myFetchWithToken(URLS.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json();
      } catch (e) {
        /** ignore */
      }
      courses.push({
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
      });
    }));
    return courses;
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
    const json = await (await this.#myFetchWithToken(URLS.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? json.object?.resultsList ?? [];
    const notifications = [];
    await Promise.all(result.map(async n => {
      const notification = {
        id: n.ggid,
        content: decodeHTML(Base64.decode(n.ggnr ?? '')),
        title: decodeHTML(n.bt),
        url: URLS.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
        publisher: n.fbrxm,
        hasRead: n.sfyd === '是',
        markedImportant: Number(n.sfqd) === 1,
        // n.sfqd could be string '1' (teacher mode) or number 1 (student mode)
        publishTime: n.fbsj && typeof n.fbsj === 'string' ? n.fbsj : n.fbsjStr
      };
      let detail = {};
      const attachmentName = courseType === CourseType.STUDENT ? n.fjmc : n.fjbt;
      if (attachmentName) {
        detail = await this.parseNotificationDetail(courseID, notification.id, courseType, attachmentName);
      }
      notifications.push({
        ...notification,
        ...detail
      });
    }));
    return notifications;
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
    const files = [];
    await Promise.all(result.map(async f => {
      const title = decodeHTML(f.bt);
      const downloadUrl = URLS.LEARN_FILE_DOWNLOAD(courseType === CourseType.STUDENT ? f.wjid : f.id, courseType, courseID);
      const previewUrl = URLS.LEARN_FILE_PREVIEW(ContentType.FILE, f.wjid, courseType, this.previewFirstPage);
      files.push({
        id: f.wjid,
        title: decodeHTML(f.bt),
        description: decodeHTML(f.ms),
        rawSize: f.wjdx,
        size: f.fileSize,
        uploadTime: f.scsj,
        downloadUrl,
        previewUrl,
        isNew: f.isNew,
        markedImportant: f.sfqd === 1,
        visitCount: f.llcs ?? 0,
        downloadCount: f.xzcs ?? 0,
        fileType: f.wjlx,
        remoteFile: {
          id: f.wjid,
          name: title,
          downloadUrl,
          previewUrl,
          size: f.fileSize
        }
      });
    }));
    return files;
  }

  /** Get all homeworks （课程作业） of the specified course. */

  async getHomeworkList(courseID, courseType = CourseType.STUDENT) {
    if (courseType === CourseType.TEACHER) {
      const json = await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_LIST_TEACHER(courseID))).json();
      if (json.result !== 'success') {
        return Promise.reject({
          reason: FailReason.INVALID_RESPONSE,
          extra: json
        });
      }
      const result = json.object?.aaData ?? [];
      const homeworks = [];
      await Promise.all(result.map(async d => {
        homeworks.push({
          id: d.zyid,
          index: d.wz,
          title: decodeHTML(d.bt),
          description: decodeHTML(Base64.decode(d.nr)),
          publisherId: d.fbr,
          publishTime: d.fbsj,
          startTime: d.kssj,
          deadline: d.jzsj,
          url: URLS.LEARN_HOMEWORK_DETAIL_TEACHER(courseID, d.zyid),
          completionType: d.zywcfs,
          submissionType: d.zytjfs,
          gradedCount: d.ypys,
          submittedCount: d.yjs,
          unsubmittedCount: d.wjs
        });
      }));
      return homeworks;
    } else {
      const allHomework = [];
      await Promise.all(URLS.LEARN_HOMEWORK_LIST_SOURCE(courseID).map(async s => {
        const homeworks = await this.getHomeworkListAtUrl(s.url, s.status);
        allHomework.push(...homeworks);
      }));
      return allHomework;
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
    const discussions = [];
    await Promise.all(result.map(async d => {
      discussions.push({
        ...this.parseDiscussionBase(d),
        boardId: d.bqid,
        url: URLS.LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType)
      });
    }));
    return discussions;
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
    const questions = [];
    await Promise.all(result.map(async q => {
      questions.push({
        ...this.parseDiscussionBase(q),
        question: Base64.decode(q.wtnr),
        url: URLS.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType)
      });
    }));
    return questions;
  }
  async getHomeworkListAtUrl(url, status) {
    const json = await (await this.#myFetchWithToken(url)).json();
    if (json.result !== 'success') {
      return Promise.reject({
        reason: FailReason.INVALID_RESPONSE,
        extra: json
      });
    }
    const result = json.object?.aaData ?? [];
    const homeworks = [];
    await Promise.all(result.map(async h => {
      homeworks.push({
        id: h.zyid,
        studentHomeworkId: h.xszyid,
        title: decodeHTML(h.bt),
        url: URLS.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid),
        deadline: h.jzsj,
        submitUrl: URLS.LEARN_HOMEWORK_SUBMIT_PAGE(h.wlkcid, h.xszyid),
        submitTime: h.scsj === null ? undefined : h.scsj,
        grade: h.cj === null ? undefined : h.cj,
        gradeLevel: GRADE_LEVEL_MAP.get(h.cj),
        graderName: trimAndDefine(h.jsm),
        gradeContent: trimAndDefine(h.pynr),
        gradeTime: h.pysj === null ? undefined : h.pysj,
        ...status,
        ...(await this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))
      });
    }));
    return homeworks;
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
  async parseHomeworkDetail(courseID, id, studentHomeworkID) {
    const response = await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
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
      replyCount: d.hfcs
    };
  }
  async submitHomework(studentHomeworkID, content = '', attachment, removeAttachment = false) {
    return await (await this.#myFetchWithToken(URLS.LEARN_HOMEWORK_SUBMIT(), {
      method: 'POST',
      body: URLS.LEARN_HOMEWORK_SUBMIT_FORM_DATA(studentHomeworkID, content, attachment, removeAttachment)
    })).json();
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
export * from './types';
//# sourceMappingURL=index.js.map