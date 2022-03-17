"use strict";
var _Learn2018Helper_provider, _Learn2018Helper_rawFetch, _Learn2018Helper_myFetch, _Learn2018Helper_myFetchWithToken, _Learn2018Helper_csrfToken, _Learn2018Helper_withReAuth;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Learn2018Helper = exports.addCSRFTokenToUrl = void 0;
const tslib_1 = require("tslib");
const cheerio_without_node_native_1 = tslib_1.__importDefault(require("cheerio-without-node-native"));
const js_base64_1 = require("js-base64");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const URL = tslib_1.__importStar(require("./urls"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const real_isomorphic_fetch_1 = tslib_1.__importDefault(require("real-isomorphic-fetch"));
const tough_cookie_no_native_1 = tslib_1.__importDefault(require("tough-cookie-no-native"));
const CHEERIO_CONFIG = {
    decodeEntities: false,
};
const $ = (html) => {
    return cheerio_without_node_native_1.default.load(html, CHEERIO_CONFIG);
};
const noLogin = (res) => res.url.includes("login_timeout") || res.status == 403;
/** add CSRF token to any request URL as parameters */
const addCSRFTokenToUrl = (url, token) => {
    if (url.includes("?")) {
        url += `&_csrf=${token}`;
    }
    else {
        url += `?_csrf=${token}`;
    }
    return url;
};
exports.addCSRFTokenToUrl = addCSRFTokenToUrl;
/** the main helper class */
class Learn2018Helper {
    /** you can provide a CookieJar and / or CredentialProvider in the configuration */
    constructor(config) {
        var _a;
        _Learn2018Helper_provider.set(this, void 0);
        _Learn2018Helper_rawFetch.set(this, void 0);
        _Learn2018Helper_myFetch.set(this, void 0);
        _Learn2018Helper_myFetchWithToken.set(this, (...args) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_csrfToken, "f") == "") {
                yield this.login();
            }
            const [url, ...remaining] = args;
            return tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, (0, exports.addCSRFTokenToUrl)(url, tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_csrfToken, "f")), ...remaining);
        }));
        _Learn2018Helper_csrfToken.set(this, "");
        _Learn2018Helper_withReAuth.set(this, (rawFetch) => {
            const login = this.login.bind(this);
            return function wrappedFetch(...args) {
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    const retryAfterLogin = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        yield login();
                        return yield rawFetch(...args).then((res) => {
                            if (noLogin(res)) {
                                return Promise.reject({
                                    reason: types_1.FailReason.NOT_LOGGED_IN,
                                });
                            }
                            else if (res.status != 200) {
                                return Promise.reject({
                                    reason: types_1.FailReason.UNEXPECTED_STATUS,
                                    extra: {
                                        code: res.status,
                                        text: res.statusText,
                                    },
                                });
                            }
                            else {
                                return res;
                            }
                        });
                    });
                    return yield rawFetch(...args).then((res) => noLogin(res) ? retryAfterLogin() : res);
                });
            };
        });
        this.cookieJar = (_a = config === null || config === void 0 ? void 0 : config.cookieJar) !== null && _a !== void 0 ? _a : new tough_cookie_no_native_1.default.CookieJar();
        tslib_1.__classPrivateFieldSet(this, _Learn2018Helper_provider, config === null || config === void 0 ? void 0 : config.provider, "f");
        tslib_1.__classPrivateFieldSet(this, _Learn2018Helper_rawFetch, new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar), "f");
        tslib_1.__classPrivateFieldSet(this, _Learn2018Helper_myFetch, tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_provider, "f")
            ? tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_withReAuth, "f").call(this, tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f"))
            : (...args) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const result = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f").call(this, ...args);
                if (noLogin(result))
                    return Promise.reject({
                        reason: types_1.FailReason.NOT_LOGGED_IN,
                    });
                return result;
            }), "f");
    }
    getUserInfo(courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const content = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_HOMEPAGE(courseType))).text();
            const dom = $(content);
            const name = dom("a.user-log").text().trim();
            const id = dom("#userid").attr("value");
            const department = dom(".fl.up-img-info p:nth-child(2) label")
                .text()
                .trim();
            let avatarUrl;
            const avatarMatch = /"\/b\/wlxt\/xt\/v_jsxsxx\/teacher\/queryTxByZjh\?zjh=(.*)"/.exec(content);
            if (avatarMatch === null || avatarMatch === void 0 ? void 0 : avatarMatch[1]) {
                const zjh = avatarMatch === null || avatarMatch === void 0 ? void 0 : avatarMatch[1];
                avatarUrl = URL.LEARN_AVATAR(zjh);
            }
            return {
                id,
                name,
                department,
                avatarUrl,
            };
        });
    }
    /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
    getCSRFToken() {
        return tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_csrfToken, "f");
    }
    /** login is necessary if you do not provide a `CredentialProvider` */
    login(username, password) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!username || !password) {
                if (!tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_provider, "f"))
                    return Promise.reject({
                        reason: types_1.FailReason.NO_CREDENTIAL,
                    });
                const credential = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_provider, "f").call(this);
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f").call(this, URL.ID_LOGIN(), {
                body: URL.ID_LOGIN_FORM_DATA(username, password),
                method: "POST",
            });
            if (!ticketResponse.ok) {
                return Promise.reject({
                    reason: types_1.FailReason.ERROR_FETCH_FROM_ID,
                });
            }
            // check response from id.tsinghua.edu.cn
            const ticketResult = yield ticketResponse.text();
            const body = $(ticketResult);
            const targetURL = body("a").attr("href");
            const ticket = targetURL.split("=").slice(-1)[0];
            if (ticket === "BAD_CREDENTIALS") {
                return Promise.reject({
                    reason: types_1.FailReason.BAD_CREDENTIAL,
                });
            }
            const loginResponse = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_AUTH_ROAM(ticket));
            if (loginResponse.ok !== true) {
                return Promise.reject({
                    reason: types_1.FailReason.ERROR_ROAMING,
                });
            }
            const courseListPageSource = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_STUDENT_COURSE_LIST_PAGE())).text();
            const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
            const matches = [...courseListPageSource.matchAll(tokenRegex)];
            if (matches.length == 0) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: "cannot fetch CSRF token from source",
                });
            }
            tslib_1.__classPrivateFieldSet(this, _Learn2018Helper_csrfToken, matches[0][1], "f");
        });
    }
    /**  logout (to make everyone happy) */
    logout() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_LOGOUT(), { method: "POST" });
        });
    }
    /**
     * Get calendar items during the specified period (in yyyymmdd format).
     * @param startDate start date (inclusive)
     * @param endDate end date (inclusive)
     * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
     * and we currently observe a limit of no more that 29 days.
     * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
     */
    getCalendar(startDate, endDate, graduate = false) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.REGISTRAR_TICKET(), {
                method: "POST",
                body: URL.REGISTRAR_TICKET_FORM_DATA(),
            });
            let ticket = (yield ticketResponse.text());
            ticket = ticket.substring(1, ticket.length - 1);
            yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_AUTH(ticket));
            const response = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_CALENDAR(startDate, endDate, graduate, utils_1.JSONP_EXTRACTOR_NAME));
            if (!response.ok) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                });
            }
            const result = (0, utils_1.extractJSONPResult)(yield response.text());
            return result.map((i) => ({
                location: i.dd,
                status: i.fl,
                startTime: i.kssj,
                endTime: i.jssj,
                date: i.nq,
                courseName: i.nr,
            }));
        });
    }
    getSemesterIdList() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_SEMESTER_LIST())).json();
            if (!Array.isArray(json)) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const semesters = json;
            // sometimes web learning returns null, so confusing...
            return semesters.filter((s) => s != null);
        });
    }
    getCurrentSemester() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_CURRENT_SEMESTER())).json();
            if (json.message !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = json.result;
            return {
                id: result.id,
                startDate: result.kssj,
                endDate: result.jssj,
                startYear: Number(result.xnxq.slice(0, 4)),
                endYear: Number(result.xnxq.slice(5, 9)),
                type: (0, utils_1.parseSemesterType)(Number(result.xnxq.slice(10, 11))),
            };
        });
    }
    /** get all courses in the specified semester */
    getCourseList(semesterID, courseType = types_1.CourseType.STUDENT) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
            if (json.message !== "success" || !Array.isArray(json.resultList)) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_a = json.resultList) !== null && _a !== void 0 ? _a : []);
            const courses = [];
            yield Promise.all(result.map((c) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _b;
                courses.push({
                    id: c.wlkcid,
                    name: c.kcm,
                    englishName: c.ywkcm,
                    timeAndLocation: yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
                    url: URL.LEARN_COURSE_URL(c.wlkcid, courseType),
                    teacherName: (_b = c.jsm) !== null && _b !== void 0 ? _b : "",
                    teacherNumber: c.jsh,
                    courseNumber: c.kch,
                    courseIndex: Number(c.kxh),
                    courseType,
                });
            })));
            return courses;
        });
    }
    /**
     * Get certain type of content of all specified courses.
     * It actually wraps around other `getXXX` functions
     */
    getAllContents(courseIDs, type, courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let fetchFunc;
            switch (type) {
                case types_1.ContentType.NOTIFICATION:
                    fetchFunc = this.getNotificationList;
                    break;
                case types_1.ContentType.FILE:
                    fetchFunc = this.getFileList;
                    break;
                case types_1.ContentType.HOMEWORK:
                    fetchFunc = this.getHomeworkList;
                    break;
                case types_1.ContentType.DISCUSSION:
                    fetchFunc = this.getDiscussionList;
                    break;
                case types_1.ContentType.QUESTION:
                    fetchFunc = this.getAnsweredQuestionList;
                    break;
            }
            const contents = {};
            yield Promise.all(courseIDs.map((id) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                contents[id] = yield fetchFunc.bind(this)(id, courseType);
            })));
            return contents;
        });
    }
    /** Get all notifications （课程公告） of the specified course. */
    getNotificationList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a, _b, _c, _d;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_d = (_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.aaData) !== null && _b !== void 0 ? _b : (_c = json.object) === null || _c === void 0 ? void 0 : _c.resultsList) !== null && _d !== void 0 ? _d : []);
            const notifications = [];
            yield Promise.all(result.map((n) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _e;
                const notification = {
                    id: n.ggid,
                    content: (0, utils_1.decodeHTML)(js_base64_1.Base64.decode((_e = n.ggnr) !== null && _e !== void 0 ? _e : "")),
                    title: (0, utils_1.decodeHTML)(n.bt),
                    url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                    publisher: n.fbrxm,
                    hasRead: n.sfyd === "是",
                    markedImportant: Number(n.sfqd) === 1,
                    publishTime: n.fbsj && typeof n.fbsj === 'string' ? n.fbsj : n.fbsjStr,
                };
                let detail = {};
                const attachmentName = courseType === types_1.CourseType.STUDENT ? n.fjmc : n.fjbt;
                if (attachmentName !== null) {
                    notification.attachmentName = attachmentName;
                    detail = yield this.parseNotificationDetail(courseID, notification.id, courseType);
                }
                notifications.push(Object.assign(Object.assign({}, notification), detail));
            })));
            return notifications;
        });
    }
    /** Get all files （课程文件） of the specified course. */
    getFileList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_FILE_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            let result = [];
            if (Array.isArray((_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList)) {
                // teacher
                result = json.object.resultsList;
            }
            else if (Array.isArray(json.object)) {
                // student
                result = json.object;
            }
            const files = [];
            yield Promise.all(result.map((f) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _b, _c;
                files.push({
                    id: f.wjid,
                    title: (0, utils_1.decodeHTML)(f.bt),
                    description: (0, utils_1.decodeHTML)(f.ms),
                    rawSize: f.wjdx,
                    size: f.fileSize,
                    uploadTime: f.scsj,
                    downloadUrl: URL.LEARN_FILE_DOWNLOAD(courseType === types_1.CourseType.STUDENT ? f.wjid : f.id, courseType, courseID),
                    previewUrl: URL.LEARN_FILE_PREVIEW(f.wjid, courseType, true),
                    isNew: f.isNew,
                    markedImportant: f.sfqd === 1,
                    visitCount: (_b = f.llcs) !== null && _b !== void 0 ? _b : 0,
                    downloadCount: (_c = f.xzcs) !== null && _c !== void 0 ? _c : 0,
                    fileType: f.wjlx,
                });
            })));
            return files;
        });
    }
    /** Get all homeworks （课程作业） of the specified course (support student version only). */
    getHomeworkList(courseID, courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (courseType === types_1.CourseType.TEACHER) {
                return Promise.reject({
                    reason: types_1.FailReason.NOT_IMPLEMENTED,
                    extra: "currently getting homework list of TA courses is not supported",
                });
            }
            const allHomework = [];
            yield Promise.all(URL.LEARN_HOMEWORK_LIST_SOURCE(courseID).map((s) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const homeworks = yield this.getHomeworkListAtUrl(s.url, s.status);
                allHomework.push(...homeworks);
            })));
            return allHomework;
        });
    }
    /** Get all discussions （课程讨论） of the specified course. */
    getDiscussionList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList) !== null && _b !== void 0 ? _b : []);
            const discussions = [];
            yield Promise.all(result.map((d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                discussions.push(Object.assign(Object.assign({}, this.parseDiscussionBase(d)), { boardId: d.bqid, url: URL.LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType) }));
            })));
            return discussions;
        });
    }
    /**
     * Get all notifications （课程答疑） of the specified course.
     * The student version supports only answered questions, while the teacher version supports all questions.
     */
    getAnsweredQuestionList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList) !== null && _b !== void 0 ? _b : []);
            const questions = [];
            yield Promise.all(result.map((q) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                questions.push(Object.assign(Object.assign({}, this.parseDiscussionBase(q)), { question: js_base64_1.Base64.decode(q.wtnr), url: URL.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType) }));
            })));
            return questions;
        });
    }
    getHomeworkListAtUrl(url, status) {
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, url)).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.aaData) !== null && _b !== void 0 ? _b : []);
            const homeworks = [];
            yield Promise.all(result.map((h) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                homeworks.push(Object.assign(Object.assign({ id: h.zyid, studentHomeworkId: h.xszyid, title: (0, utils_1.decodeHTML)(h.bt), url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid), deadline: h.jzsj, submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid), submitTime: h.scsj === null ? undefined : h.scsj, grade: h.cj === null ? undefined : h.cj, gradeLevel: (0, utils_1.mapGradeToLevel)(h.cj), graderName: (0, utils_1.trimAndDefine)(h.jsm), gradeContent: (0, utils_1.trimAndDefine)(h.pynr), gradeTime: h.pysj === null ? undefined : h.pysj, submittedAttachmentUrl: h.zyfjid === ""
                        ? undefined
                        : URL.LEARN_HOMEWORK_DOWNLOAD(h.wlkcid, h.zyfjid) }, status), (yield this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))));
            })));
            return homeworks;
        });
    }
    parseNotificationDetail(courseID, id, courseType) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
            const result = $(yield response.text());
            let path = "";
            if (courseType === types_1.CourseType.STUDENT) {
                path = result(".ml-10").attr("href");
            }
            else {
                path = result("#wjid").attr("href");
            }
            return { attachmentUrl: `${URL.LEARN_PREFIX}${path}` };
        });
    }
    parseHomeworkDetail(courseID, id, studentHomeworkID) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
            const result = $(yield response.text());
            const fileDivs = result("div.list.fujian.clearfix");
            return Object.assign(Object.assign(Object.assign(Object.assign({ description: (0, utils_1.trimAndDefine)(result("div.list.calendar.clearfix>div.fl.right>div.c55")
                    .slice(0, 1)
                    .html()), answerContent: (0, utils_1.trimAndDefine)(result("div.list.calendar.clearfix>div.fl.right>div.c55")
                    .slice(1, 2)
                    .html()), submittedContent: (0, utils_1.trimAndDefine)((0, cheerio_without_node_native_1.default)("div.right", result("div.boxbox").slice(1, 2))
                    .slice(2, 3)
                    .html()) }, this.parseHomeworkFile(fileDivs[0], "attachmentName", "attachmentUrl")), this.parseHomeworkFile(fileDivs[1], "answerAttachmentName", "answerAttachmentUrl")), this.parseHomeworkFile(fileDivs[2], "submittedAttachmentName", "submittedAttachmentUrl")), this.parseHomeworkFile(fileDivs[3], "gradeAttachmentName", "gradeAttachmentUrl"));
        });
    }
    parseHomeworkFile(fileDiv, nameKey, urlKey) {
        const fileNode = (0, cheerio_without_node_native_1.default)(".ftitle", fileDiv).children("a")[0];
        if (fileNode !== undefined) {
            return {
                [nameKey]: fileNode.children[0].data,
                [urlKey]: `${URL.LEARN_PREFIX}${fileNode.attribs.href.split("=").slice(-1)[0]}`,
            };
        }
        else {
            return {};
        }
    }
    parseDiscussionBase(d) {
        var _a;
        return {
            id: d.id,
            title: (0, utils_1.decodeHTML)(d.bt),
            publisherName: d.fbrxm,
            publishTime: d.fbsj,
            lastReplyTime: d.zhhfsj,
            lastReplierName: d.zhhfrxm,
            visitCount: (_a = d.djs) !== null && _a !== void 0 ? _a : 0,
            replyCount: d.hfcs,
        };
    }
}
exports.Learn2018Helper = Learn2018Helper;
_Learn2018Helper_provider = new WeakMap(), _Learn2018Helper_rawFetch = new WeakMap(), _Learn2018Helper_myFetch = new WeakMap(), _Learn2018Helper_myFetchWithToken = new WeakMap(), _Learn2018Helper_csrfToken = new WeakMap(), _Learn2018Helper_withReAuth = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxzR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLHNFQUFnQztBQUNoQyxvREFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsMEZBQW9EO0FBQ3BELDRGQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFhLEVBQUUsRUFBRSxDQUNoQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUV6RCxzREFBc0Q7QUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhLEVBQVUsRUFBRTtJQUN0RSxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckIsR0FBRyxJQUFJLFVBQVUsS0FBSyxFQUFFLENBQUM7S0FDMUI7U0FBTTtRQUNMLEdBQUcsSUFBSSxVQUFVLEtBQUssRUFBRSxDQUFDO0tBQzFCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDLENBQUM7QUFQVyxRQUFBLGlCQUFpQixxQkFPNUI7QUFFRiw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBK0MxQixtRkFBbUY7SUFDbkYsWUFBWSxNQUFxQjs7UUEvQ2pDLDRDQUF3QztRQUN4Qyw0Q0FBMEI7UUFDMUIsMkNBQXlCO1FBQ3pCLDRDQUFvQyxDQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFDcEQs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