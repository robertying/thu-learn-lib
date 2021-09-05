"use strict";
var _Learn2018Helper_provider, _Learn2018Helper_rawFetch, _Learn2018Helper_myFetch, _Learn2018Helper_withReAuth;
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
const noLogin = (url) => url.includes("login_timeout");
/** the main helper class */
class Learn2018Helper {
    /** you can provide a CookieJar and / or CredentialProvider in the configuration */
    constructor(config) {
        var _a;
        _Learn2018Helper_provider.set(this, void 0);
        _Learn2018Helper_rawFetch.set(this, void 0);
        _Learn2018Helper_myFetch.set(this, void 0);
        _Learn2018Helper_withReAuth.set(this, (rawFetch) => {
            const login = this.login.bind(this);
            return function wrappedFetch(...args) {
                return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                    const retryAfterLogin = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                        yield login();
                        return yield rawFetch(...args).then((res) => noLogin(res.url) ? Promise.reject(types_1.FailReason.NOT_LOGGED_IN) : res);
                    });
                    return yield rawFetch(...args).then((res) => noLogin(res.url) ? retryAfterLogin() : res);
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
                if (noLogin(result.url))
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
            const ticketResponse = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_TICKET(), {
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_SEMESTER_LIST())).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_CURRENT_SEMESTER())).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
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
                    timeAndLocation: yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_FILE_LIST(courseID, courseType))).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
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
            const json = yield (yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, url)).json();
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
            const response = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
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
            const response = yield (0, tslib_1.__classPrivateFieldGet)(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
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
_Learn2018Helper_provider = new WeakMap(), _Learn2018Helper_rawFetch = new WeakMap(), _Learn2018Helper_myFetch = new WeakMap(), _Learn2018Helper_withReAuth = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwyR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLDJFQUFnQztBQUNoQyx5REFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsK0ZBQW9EO0FBQ3BELGlHQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0QsNEJBQTRCO0FBQzVCLE1BQWEsZUFBZTtJQXNCMUIsbUZBQW1GO0lBQ25GLFlBQVksTUFBcUI7O1FBdEJqQyw0Q0FBd0M7UUFDeEMsNENBQTBCO1FBQzFCLDJDQUF5QjtRQUV6QixzQ0FBdUIsQ0FBQyxRQUFlLEVBQVMsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxPQUFPLFNBQWUsWUFBWSxDQUFDLEdBQUcsSUFBSTs7b0JBQ3hDLE1BQU0sZUFBZSxHQUFHLEdBQVMsRUFBRTt3QkFDakMsTUFBTSxLQUFLLEVBQUUsQ0FBQzt3QkFDZCxPQUFPLE1BQU0sUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxr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