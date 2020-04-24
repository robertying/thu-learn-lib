"use strict";
var _provider, _rawFetch, _myFetch;
Object.defineProperty(exports, "__esModule", { value: true });
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
        this.cookieJar = (_a = config === null || config === void 0 ? void 0 : config.cookieJar) !== null && _a !== void 0 ? _a : new tough_cookie_no_native_1.default.CookieJar();
        tslib_1.__classPrivateFieldSet(this, _provider, config === null || config === void 0 ? void 0 : config.provider);
        tslib_1.__classPrivateFieldSet(this, _rawFetch, new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar));
        tslib_1.__classPrivateFieldSet(this, _myFetch, tslib_1.__classPrivateFieldGet(this, _provider) ? this.withReAuth(tslib_1.__classPrivateFieldGet(this, _rawFetch))
            : (...args) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const result = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, ...args);
                if (noLogin(result.url))
                    return Promise.reject(types_1.FailReason.NOT_LOGGED_IN);
                return result;
            }));
    }
    withReAuth(rawFetch) {
        const login = this.login.bind(this);
        return function wrappedFetch(...args) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const retryAfterLogin = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield login();
                    return yield rawFetch(...args);
                });
                return yield rawFetch(...args).then((res) => noLogin(res.url) ? retryAfterLogin() : res);
            });
        };
    }
    /** login is necessary if you do not provide a `CredentialProvider` */
    login(username, password) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!username || !password) {
                if (!tslib_1.__classPrivateFieldGet(this, _provider))
                    return Promise.reject(types_1.FailReason.NO_CREDENTIAL);
                const credential = yield tslib_1.__classPrivateFieldGet(this, _provider).call(this);
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.ID_LOGIN(), {
                body: URL.ID_LOGIN_FORM_DATA(username, password),
                method: "POST",
            });
            if (!ticketResponse.ok) {
                return Promise.reject(types_1.FailReason.ERROR_FETCH_FROM_ID);
            }
            // check response from id.tsinghua.edu.cn
            const ticketResult = yield ticketResponse.text();
            const body = $(ticketResult);
            const targetURL = body("a").attr("href");
            const ticket = targetURL.split("=").slice(-1)[0];
            if (ticket === "BAD_CREDENTIALS") {
                return Promise.reject(types_1.FailReason.BAD_CREDENTIAL);
            }
            const loginResponse = yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.LEARN_AUTH_ROAM(ticket));
            if (loginResponse.ok !== true) {
                return Promise.reject(types_1.FailReason.ERROR_ROAMING);
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
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
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
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_SEMESTER_LIST());
            const semesters = (yield response.json());
            // sometimes web learning returns null, so confusing...
            return semesters.filter((s) => s != null);
        });
    }
    getCurrentSemester() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_CURRENT_SEMESTER());
            const result = (yield response.json()).result;
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_COURSE_LIST(semesterID, courseType));
            const result = (yield response.json()).resultList;
            const courses = [];
            yield Promise.all(result.map((c) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _a;
                courses.push({
                    id: c.wlkcid,
                    name: c.kcm,
                    englishName: c.ywkcm,
                    timeAndLocation: yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
                    url: URL.LEARN_COURSE_URL(c.wlkcid, courseType),
                    teacherName: (_a = c.jsm) !== null && _a !== void 0 ? _a : "",
                    teacherNumber: c.jsh,
                    courseNumber: c.kch,
                    courseIndex: c.kxh,
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
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
            if (json.result !== "success" || json.msg !== null) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            const result = ((_a = json.object.aaData) !== null && _a !== void 0 ? _a : json.object.resultsList);
            const notifications = [];
            yield Promise.all(result.map((n) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const notification = {
                    id: n.ggid,
                    content: utils_1.decodeHTML(js_base64_1.Base64.decode(n.ggnr)),
                    title: utils_1.decodeHTML(n.bt),
                    url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                    publisher: n.fbrxm,
                    hasRead: n.sfyd === "是",
                    markedImportant: n.sfqd === "1",
                    publishTime: n.fbsjStr,
                };
                let detail = {};
                if (n.fjmc !== null) {
                    notification.attachmentName = n.fjmc;
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
            if (json.result !== "success" || json.msg !== null) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            let result;
            if ((_a = json.object) === null || _a === void 0 ? void 0 : _a.resultsList) {
                // teacher
                result = json.object.resultsList;
            }
            else {
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
                return Promise.reject(types_1.FailReason.NOT_IMPLEMENTED);
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
            if (json.result !== "success" || json.msg !== null) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            const result = json.object.resultsList;
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
            if (json.result !== "success" || json.msg !== null) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            const result = json.object.resultsList;
            const questions = [];
            yield Promise.all(result.map((q) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                questions.push(Object.assign(Object.assign({}, this.parseDiscussionBase(q)), { question: js_base64_1.Base64.decode(q.wtnr), url: URL.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType) }));
            })));
            return questions;
        });
    }
    getHomeworkListAtUrl(url, status) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, url)).json();
            if (json.result !== "success" || json.msg !== null) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            const result = json.object.aaData;
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
_provider = new WeakMap(), _rawFetch = new WeakMap(), _myFetch = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHNHQUFrRDtBQUNsRCx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0FzQmlCO0FBQ2pCLG1DQU9pQjtBQUVqQiwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLE1BQU0sY0FBYyxHQUE0QjtJQUM5QyxjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN6QixPQUFPLHFDQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvRCw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBTTFCLG1GQUFtRjtJQUNuRixZQUFZLE1BQXFCOztRQUxqQyw0QkFBd0M7UUFDeEMsNEJBQTBCO1FBQzFCLDJCQUF5QjtRQUl2QixJQUFJLENBQUMsU0FBUyxTQUFHLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxTQUFTLG1DQUFJLElBQUksZ0NBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM1RCwrQkFBQSxJQUFJLGFBQWEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFFBQVEsRUFBQztRQUNsQywrQkFBQSxJQUFJLGFBQWEsSUFBSSwrQkFBZSxDQUFDLHFCQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBUSxFQUFDO1FBQ25FLCtCQUFBLElBQUksWUFBWSxnREFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsaURBQWdCO1lBQ2pDLENBQUMsQ0FBQyxDQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7Z0JBQ2hCLE1B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