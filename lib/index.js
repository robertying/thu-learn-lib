"use strict";
var _Learn2018Helper_provider, _Learn2018Helper_rawFetch, _Learn2018Helper_myFetch, _Learn2018Helper_myFetchWithToken, _Learn2018Helper_csrfToken, _Learn2018Helper_withReAuth;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Learn2018Helper = void 0;
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
            let urlStr = url;
            if (urlStr.includes("?")) {
                urlStr += `&_csrf=${(0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_csrfToken, "f")}`;
            }
            else {
                urlStr += `?_csrf=${(0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_csrfToken, "f")}`;
            }
            return (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, urlStr, ...remaining);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwyR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLDJFQUFnQztBQUNoQyx5REFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsK0ZBQW9EO0FBQ3BELGlHQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFhLEVBQUUsRUFBRSxDQUNoQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUV6RCw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBa0QxQixtRkFBbUY7SUFDbkYsWUFBWSxNQUFxQjs7UUFsRGpDLDRDQUF3QztRQUN4Qyw0Q0FBMEI7UUFDMUIsMkNBQXlCO1FBQ3pCLDRDQUFvQyxDQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFDcEQsSUFBSSxvQ0FBQSxJQUFJLGtDQUFXLElBQUksRUFBRSxFQUFFO2dCQUN6QixNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNwQjtZQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDakMsSUFBSSxNQUFNLEdBQUcsR0FBYSxDQUFDO1lBQzNCLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDeEIsTUFBTSxJQUFJLFVBQVUsb0NBQUEsSUFBSSxrQ0FBVyxFQUFFLENB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