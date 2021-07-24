"use strict";
var _Learn2018Helper_provider, _Learn2018Helper_rawFetch, _Learn2018Helper_myFetch, _Learn2018Helper_withReAuth;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Learn2018Helper = void 0;
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
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    const retryAfterLogin = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        yield login();
                        return yield rawFetch(...args).then((res) => noLogin(res.url) ? Promise.reject(types_1.FailReason.NOT_LOGGED_IN) : res);
                    });
                    return yield rawFetch(...args).then((res) => noLogin(res.url) ? retryAfterLogin() : res);
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
                if (noLogin(result.url))
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
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.REGISTRAR_TICKET(), {
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
            const result = utils_1.extractJSONPResult(yield response.text());
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_SEMESTER_LIST())).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_CURRENT_SEMESTER())).json();
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
                type: utils_1.parseSemesterType(Number(result.xnxq.slice(10, 11))),
            };
        });
    }
    /** get all courses in the specified semester */
    getCourseList(semesterID, courseType = types_1.CourseType.STUDENT) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
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
                    timeAndLocation: yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
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
                    content: utils_1.decodeHTML(js_base64_1.Base64.decode((_e = n.ggnr) !== null && _e !== void 0 ? _e : "")),
                    title: utils_1.decodeHTML(n.bt),
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_FILE_LIST(courseID, courseType))).json();
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
                    title: utils_1.decodeHTML(f.bt),
                    description: utils_1.decodeHTML(f.ms),
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, url)).json();
            if (json.result !== "success") {
                return Promise.reject({
                    reason: types_1.FailReason.INVALID_RESPONSE,
                    extra: json,
                });
            }
            const result = ((_b = (_a = json.object) === null || _a === void 0 ? void 0 : _a.aaData) !== null && _b !== void 0 ? _b : []);
            const homeworks = [];
            yield Promise.all(result.map((h) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                homeworks.push(Object.assign(Object.assign({ id: h.zyid, studentHomeworkId: h.xszyid, title: utils_1.decodeHTML(h.bt), url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid), deadline: h.jzsj, submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid), submitTime: h.scsj === null ? undefined : h.scsj, grade: h.cj === null ? undefined : h.cj, gradeLevel: utils_1.mapGradeToLevel(h.cj), graderName: utils_1.trimAndDefine(h.jsm), gradeContent: utils_1.trimAndDefine(h.pynr), gradeTime: h.pysj === null ? undefined : h.pysj, submittedAttachmentUrl: h.zyfjid === ""
                        ? undefined
                        : URL.LEARN_HOMEWORK_DOWNLOAD(h.wlkcid, h.zyfjid) }, status), (yield this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))));
            })));
            return homeworks;
        });
    }
    parseNotificationDetail(courseID, id, courseType) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
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
            const response = yield tslib_1.__classPrivateFieldGet(this, _Learn2018Helper_myFetch, "f").call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
            const result = $(yield response.text());
            const fileDivs = result("div.list.fujian.clearfix");
            return Object.assign(Object.assign(Object.assign(Object.assign({ description: utils_1.trimAndDefine(result("div.list.calendar.clearfix>div.fl.right>div.c55")
                    .slice(0, 1)
                    .html()), answerContent: utils_1.trimAndDefine(result("div.list.calendar.clearfix>div.fl.right>div.c55")
                    .slice(1, 2)
                    .html()), submittedContent: utils_1.trimAndDefine(cheerio_without_node_native_1.default("div.right", result("div.boxbox").slice(1, 2))
                    .slice(2, 3)
                    .html()) }, this.parseHomeworkFile(fileDivs[0], "attachmentName", "attachmentUrl")), this.parseHomeworkFile(fileDivs[1], "answerAttachmentName", "answerAttachmentUrl")), this.parseHomeworkFile(fileDivs[2], "submittedAttachmentName", "submittedAttachmentUrl")), this.parseHomeworkFile(fileDivs[3], "gradeAttachmentName", "gradeAttachmentUrl"));
        });
    }
    parseHomeworkFile(fileDiv, nameKey, urlKey) {
        const fileNode = cheerio_without_node_native_1.default(".ftitle", fileDiv).children("a")[0];
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
            title: utils_1.decodeHTML(d.bt),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxzR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLHNFQUFnQztBQUNoQyxvREFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsMEZBQW9EO0FBQ3BELDRGQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0QsNEJBQTRCO0FBQzVCLE1BQWEsZUFBZTtJQXNCMUIsbUZBQW1GO0lBQ25GLFlBQVksTUFBcUI7O1FBdEJqQyw0Q0FBd0M7UUFDeEMsNENBQTBCO1FBQzFCLDJDQUF5QjtRQUV6QixzQ0FBdUIsQ0FBQyxRQUFlLEVBQVMsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxPQUFPLFNBQWUsWUFBWSxDQUFDLEdBQUcsSUFBSTs7b0JBQ3hDLE1BQU0sZUFBZSxHQUFHLEdBQVMsRUFBRTt3QkFDakMsTUFBTSxLQUFLLEVBQUUsQ0FBQzt3QkFDZCxPQUFPLE1BQU0sUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxr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