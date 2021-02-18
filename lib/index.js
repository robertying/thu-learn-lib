"use strict";
var _provider, _rawFetch, _myFetch, _withReAuth;
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
        _provider.set(this, void 0);
        _rawFetch.set(this, void 0);
        _myFetch.set(this, void 0);
        _withReAuth.set(this, (rawFetch) => {
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
        tslib_1.__classPrivateFieldSet(this, _provider, config === null || config === void 0 ? void 0 : config.provider);
        tslib_1.__classPrivateFieldSet(this, _rawFetch, new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar));
        tslib_1.__classPrivateFieldSet(this, _myFetch, tslib_1.__classPrivateFieldGet(this, _provider) ? tslib_1.__classPrivateFieldGet(this, _withReAuth).call(this, tslib_1.__classPrivateFieldGet(this, _rawFetch))
            : (...args) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const result = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, ...args);
                if (noLogin(result.url))
                    return Promise.reject({
                        reason: types_1.FailReason.NOT_LOGGED_IN,
                    });
                return result;
            }));
    }
    getUserInfo(courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const content = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_HOMEPAGE(courseType))).text();
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
                if (!tslib_1.__classPrivateFieldGet(this, _provider))
                    return Promise.reject({
                        reason: types_1.FailReason.NO_CREDENTIAL,
                    });
                const credential = yield tslib_1.__classPrivateFieldGet(this, _provider).call(this);
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.ID_LOGIN(), {
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
            const loginResponse = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.LEARN_AUTH_ROAM(ticket));
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
            yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.LEARN_LOGOUT(), { method: "POST" });
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
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.REGISTRAR_TICKET(), {
                method: "POST",
                body: URL.REGISTRAR_TICKET_FORM_DATA(),
            });
            let ticket = (yield ticketResponse.text());
            ticket = ticket.substring(1, ticket.length - 1);
            yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.REGISTRAR_AUTH(ticket));
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.REGISTRAR_CALENDAR(startDate, endDate, graduate, utils_1.JSONP_EXTRACTOR_NAME));
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_SEMESTER_LIST())).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_CURRENT_SEMESTER())).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
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
                    timeAndLocation: yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_FILE_LIST(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, url)).json();
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
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
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
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
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
_provider = new WeakMap(), _rawFetch = new WeakMap(), _myFetch = new WeakMap(), _withReAuth = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxzR0FBa0Q7QUFDbEQseUNBQW1DO0FBRW5DLHNFQUFnQztBQUNoQyxvREFBOEI7QUFDOUIsbUNBd0JpQjtBQUNqQixtQ0FPaUI7QUFFakIsMEZBQW9EO0FBQ3BELDRGQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBaUM7SUFDbkQsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0QsNEJBQTRCO0FBQzVCLE1BQWEsZUFBZTtJQXNCMUIsbUZBQW1GO0lBQ25GLFlBQVksTUFBcUI7O1FBdEJqQyw0QkFBd0M7UUFDeEMsNEJBQTBCO1FBQzFCLDJCQUF5QjtRQUV6QixzQkFBdUIsQ0FBQyxRQUFlLEVBQVMsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxPQUFPLFNBQWUsWUFBWSxDQUFDLEdBQUcsSUFBSTs7b0JBQ3hDLE1BQU0sZUFBZSxHQUFHLEdBQVMsRUFBRTt3QkFDakMsTUFBTSxLQUFLLEVBQUUsQ0FBQzt3QkFDZCxPQUFPLE1BQU0sUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxr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