"use strict";
var _Learn2018Helper_provider, _Learn2018Helper_rawFetch, _Learn2018Helper_myFetch, _Learn2018Helper_myFetchWithToken, _Learn2018Helper_csrfToken, _Learn2018Helper_withReAuth;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Learn2018Helper = exports.addCSRFTokenToUrl = void 0;
const tslib_1 = require("tslib");
const cheerio_without_node_native_1 = (0, tslib_1.__importDefault)(require("cheerio-without-node-native"));
const js_base64_1 = require("js-base64");
const cross_fetch_1 = (0, tslib_1.__importDefault)(require("cross-fetch"));
const URL = (0, tslib_1.__importStar)(require("./urls"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const real_isomorphic_fetch_1 = (0, tslib_1.__importDefault)(require("real-isomorphic-fetch"));
const tough_cookie_no_native_1 = (0, tslib_1.__importDefault)(require("tough-cookie-no-native"));
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
        _Learn2018Helper_myFetchWithToken.set(this, (...args) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if ((0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_csrfToken, "f") == "") {
                yield this.login();
            }
            const [url, ...remaining] = args;
            return (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, (0, exports.addCSRFTokenToUrl)(url, (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_csrfToken, "f")), ...remaining);
        }));
        _Learn2018Helper_csrfToken.set(this, "");
        _Learn2018Helper_withReAuth.set(this, (rawFetch) => {
            const login = this.login.bind(this);
            return function wrappedFetch(...args) {
                return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                    const retryAfterLogin = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
        (0, tslib_1.__classPrivateFieldSet)(this, _Learn2018Helper_provider, config === null || config === void 0 ? void 0 : config.provider, "f");
        (0, tslib_1.__classPrivateFieldSet)(this, _Learn2018Helper_rawFetch, new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar), "f");
        (0, tslib_1.__classPrivateFieldSet)(this, _Learn2018Helper_myFetch, (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_provider, "f")
            ? (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_withReAuth, "f").call(this, (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f"))
            : (...args) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                const result = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f").call(this, ...args);
                if (noLogin(result))
                    return Promise.reject({
                        reason: types_1.FailReason.NOT_LOGGED_IN,
                    });
                return result;
            }), "f");
    }
    getUserInfo(courseType = types_1.CourseType.STUDENT) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const content = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_HOMEPAGE(courseType))).text();
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
        return (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_csrfToken, "f");
    }
    /** login is necessary if you do not provide a `CredentialProvider` */
    login(username, password) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!username || !password) {
                if (!(0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_provider, "f"))
                    return Promise.reject({
                        reason: types_1.FailReason.NO_CREDENTIAL,
                    });
                const credential = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_provider, "f").call(this);
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f").call(this, URL.ID_LOGIN(), {
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
            const loginResponse = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_AUTH_ROAM(ticket));
            if (loginResponse.ok !== true) {
                return Promise.reject({
                    reason: types_1.FailReason.ERROR_ROAMING,
                });
            }
            const courseListPageSource = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_STUDENT_COURSE_LIST_PAGE())).text();
            const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
            const matches = [...courseListPageSource.matchAll(tokenRegex)];
            if (matches.length == 0) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: "cannot fetch CSRF token from source",
                });
            }
            (0, tslib_1.__classPrivateFieldSet)(this, _Learn2018Helper_csrfToken, matches[0][1], "f");
        });
    }
    /**  logout (to make everyone happy) */
    logout() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_rawFetch, "f").call(this, URL.LEARN_LOGOUT(), { method: "POST" });
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const ticketResponse = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.REGISTRAR_TICKET(), {
                method: "POST",
                body: URL.REGISTRAR_TICKET_FORM_DATA(),
            });
            let ticket = (yield ticketResponse.text());
            ticket = ticket.substring(1, ticket.length - 1);
            yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_AUTH(ticket));
            const response = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_CALENDAR(startDate, endDate, graduate, utils_1.JSONP_EXTRACTOR_NAME));
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_SEMESTER_LIST())).json();
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_CURRENT_SEMESTER())).json();
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
            if (json.message !== "success" || !Array.isArray(json.resultList)) {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_a = json.resultList) !== null && _a !== void 0 ? _a : []);
            const courses = [];
            yield Promise.all(result.map((c) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                var _b;
                courses.push({
                    id: c.wlkcid,
                    name: c.kcm,
                    englishName: c.ywkcm,
                    timeAndLocation: yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
            yield Promise.all(courseIDs.map((id) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                contents[id] = yield fetchFunc.bind(this)(id, courseType);
            })));
            return contents;
        });
    }
    /** Get all notifications （课程公告） of the specified course. */
    getNotificationList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a, _b, _c, _d;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_d = (_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.aaData) !== null && _b !== void 0 ? _b : (_c = json.object) === null || _c === void 0 ? void 0 : _c.resultsList) !== null && _d !== void 0 ? _d : []);
            const notifications = [];
            yield Promise.all(result.map((n) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                var _e;
                const notification = {
                    id: n.ggid,
                    content: (0, utils_1.decodeHTML)(js_base64_1.Base64.decode((_e = n.ggnr) !== null && _e !== void 0 ? _e : "")),
                    title: (0, utils_1.decodeHTML)(n.bt),
                    url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                    publisher: n.fbrxm,
                    hasRead: n.sfyd === "是",
                    markedImportant: Number(n.sfqd) === 1,
                    publishTime: n.fbsjStr,
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_FILE_LIST(courseID, courseType))).json();
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
            yield Promise.all(result.map((f) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (courseType === types_1.CourseType.TEACHER) {
                return Promise.reject({
                    reason: types_1.FailReason.NOT_IMPLEMENTED,
                    extra: "currently getting homework list of TA courses is not supported",
                });
            }
            const allHomework = [];
            yield Promise.all(URL.LEARN_HOMEWORK_LIST_SOURCE(courseID).map((s) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                const homeworks = yield this.getHomeworkListAtUrl(s.url, s.status);
                allHomework.push(...homeworks);
            })));
            return allHomework;
        });
    }
    /** Get all discussions （课程讨论） of the specified course. */
    getDiscussionList(courseID, courseType = types_1.CourseType.STUDENT) {
        var _a, _b;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList) !== null && _b !== void 0 ? _b : []);
            const discussions = [];
            yield Promise.all(result.map((d) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList) !== null && _b !== void 0 ? _b : []);
            const questions = [];
            yield Promise.all(result.map((q) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                questions.push(Object.assign(Object.assign({}, this.parseDiscussionBase(q)), { question: js_base64_1.Base64.decode(q.wtnr), url: URL.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType) }));
            })));
            return questions;
        });
    }
    getHomeworkListAtUrl(url, status) {
        var _a, _b;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, url)).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.aaData) !== null && _b !== void 0 ? _b : []);
            const homeworks = [];
            yield Promise.all(result.map((h) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                homeworks.push(Object.assign(Object.assign({ id: h.zyid, studentHomeworkId: h.xszyid, title: (0, utils_1.decodeHTML)(h.bt), url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid), deadline: h.jzsj, submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid), submitTime: h.scsj === null ? undefined : h.scsj, grade: h.cj === null ? undefined : h.cj, gradeLevel: (0, utils_1.mapGradeToLevel)(h.cj), graderName: (0, utils_1.trimAndDefine)(h.jsm), gradeContent: (0, utils_1.trimAndDefine)(h.pynr), gradeTime: h.pysj === null ? undefined : h.pysj, submittedAttachmentUrl: h.zyfjid === ""
                        ? undefined
                        : URL.LEARN_HOMEWORK_DOWNLOAD(h.wlkcid, h.zyfjid) }, status), (yield this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))));
            })));
            return homeworks;
        });
    }
    parseNotificationDetail(courseID, id, courseType) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const response = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
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
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const response = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetchWithToken, "f").call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwyR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLDJFQUFnQztBQUNoQyx5REFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsK0ZBQW9EO0FBQ3BELGlHQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFhLEVBQUUsRUFBRSxDQUNoQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUV6RCxzREFBc0Q7QUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhLEVBQVUsRUFBRTtJQUN0RSxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckIsR0FBRyxJQUFJLFVBQVUsS0FBSyxFQUFFLENBQUM7S0FDMUI7U0FBTTtRQUNMLEdBQUcsSUFBSSxVQUFVLEtBQUssRUFBRSxDQUFDO0tBQzFCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDLENBQUM7QUFQVyxRQUFBLGlCQUFpQixxQkFPNUI7QUFFRiw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBK0MxQixtRkFBbUY7SUFDbkYsWUFBWSxNQUFxQjs7UUEvQ2pDLDRDQUF3QztRQUN4Qyw0Q0FBMEI7UUFDMUIsMkNBQXlCO1FBQ3pCLDRDQUFvQyxDQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFDcEQs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