"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cheerio_without_node_native_1 = tslib_1.__importDefault(require("cheerio-without-node-native"));
const entities_1 = require("entities");
const js_base64_1 = require("js-base64");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const URL = tslib_1.__importStar(require("./urls"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const real_isomorphic_fetch_1 = tslib_1.__importDefault(require("real-isomorphic-fetch"));
const tough_cookie_no_native_1 = tslib_1.__importDefault(require("tough-cookie-no-native"));
const CHEERIO_CONFIG = {
    decodeEntities: false
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
        this.cookieJar = (_a = config === null || config === void 0 ? void 0 : config.cookieJar) !== null && _a !== void 0 ? _a : new tough_cookie_no_native_1.default.CookieJar();
        this.provider = config === null || config === void 0 ? void 0 : config.provider;
        this.rawFetch = new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar);
        this.myFetch = this.provider
            ? this.withReAuth(this.rawFetch)
            : (...args) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const result = yield this.rawFetch(...args);
                if (noLogin(result.url))
                    return Promise.reject(types_1.FailReason.NOT_LOGGED_IN);
                return result;
            });
    }
    withReAuth(rawFetch) {
        const login = this.login.bind(this);
        return function wrappedFetch(...args) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const retryAfterLogin = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield login();
                    return yield rawFetch(...args);
                });
                return yield rawFetch(...args).then(res => noLogin(res.url) ? retryAfterLogin() : res);
            });
        };
    }
    /** login is necessary if you do not provide a `CredentialProvider` */
    login(username, password) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!username || !password) {
                if (!this.provider)
                    return Promise.reject(types_1.FailReason.NO_CREDENTIAL);
                const credential = yield this.provider();
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield this.rawFetch(URL.ID_LOGIN(), {
                body: URL.ID_LOGIN_FORM_DATA(username, password),
                method: "POST"
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
            const loginResponse = yield this.rawFetch(URL.LEARN_AUTH_ROAM(ticket));
            if (loginResponse.ok !== true) {
                return Promise.reject(types_1.FailReason.ERROR_ROAMING);
            }
        });
    }
    /**  logout (to make everyone happy) */
    logout() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.rawFetch(URL.LEARN_LOGOUT(), { method: "POST" });
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
    getCalendar(startDate, endDate) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const ticketResponse = yield this.myFetch(URL.REGISTRAR_TICKET(), {
                method: "POST",
                body: URL.REGISTRAR_TICKET_FORM_DATA()
            });
            let ticket = (yield ticketResponse.text());
            ticket = ticket.substring(1, ticket.length - 1);
            yield this.myFetch(URL.REGISTRAR_AUTH(ticket));
            const response = yield this.myFetch(URL.REGISTRAR_CALENDAR(startDate, endDate, utils_1.JSONP_EXTRACTOR_NAME));
            if (!response.ok) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            const result = utils_1.extractJSONPResult(yield response.text());
            return result.map(i => ({
                location: i.dd,
                status: i.fl,
                startTime: i.kssj,
                endTime: i.jssj,
                date: i.nq,
                courseName: i.nr
            }));
        });
    }
    getSemesterIdList() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield this.myFetch(URL.LEARN_SEMESTER_LIST());
            const semesters = (yield response.json());
            // sometimes web learning returns null, so confusing...
            return semesters.filter(s => s != null);
        });
    }
    getCurrentSemester() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield this.myFetch(URL.LEARN_CURRENT_SEMESTER());
            const result = (yield response.json()).result;
            return {
                id: result.id,
                startDate: result.kssj,
                endDate: result.jssj,
                startYear: Number(result.xnxq.slice(0, 4)),
                endYear: Number(result.xnxq.slice(5, 9)),
                type: utils_1.parseSemesterType(Number(result.xnxq.slice(10, 11)))
            };
        });
    }
    /** get all courses in the specified semester */
    getCourseList(semesterID, courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield this.myFetch(URL.LEARN_COURSE_LIST(semesterID, courseType));
            const result = (yield response.json()).resultList;
            const courses = [];
            yield Promise.all(result.map((c) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _a;
                courses.push({
                    id: c.wlkcid,
                    name: c.kcm,
                    englishName: c.ywkcm,
                    timeAndLocation: yield (yield this.myFetch(URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
                    url: URL.LEARN_COURSE_URL(c.wlkcid, courseType),
                    teacherName: (_a = c.jsm) !== null && _a !== void 0 ? _a : "",
                    teacherNumber: c.jsh,
                    courseNumber: c.kch,
                    courseIndex: c.kxh,
                    courseType
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
            const json = yield (yield this.myFetch(URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return [];
            }
            const result = ((_a = json.object.aaData) !== null && _a !== void 0 ? _a : json.object.resultsList);
            const notifications = [];
            yield Promise.all(result.map((n) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const notification = {
                    id: n.ggid,
                    content: utils_1.removeStrangeCharacters(entities_1.decodeHTML(js_base64_1.Base64.decode(n.ggnr))),
                    title: entities_1.decodeHTML(n.bt),
                    url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                    publisher: n.fbrxm,
                    hasRead: n.sfyd === "是",
                    markedImportant: n.sfqd === "1",
                    publishTime: n.fbsjStr
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
            const json = yield (yield this.myFetch(URL.LEARN_FILE_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return [];
            }
            let result;
            if ((_a = json === null || json === void 0 ? void 0 : json.object) === null || _a === void 0 ? void 0 : _a.resultsList) {
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
                    title: entities_1.decodeHTML(f.bt),
                    description: entities_1.decodeHTML(f.ms),
                    rawSize: f.wjdx,
                    size: f.fileSize,
                    uploadTime: f.scsj,
                    downloadUrl: URL.LEARN_FILE_DOWNLOAD(courseType === types_1.CourseType.STUDENT ? f.wjid : f.id, courseType, courseID),
                    isNew: f.isNew,
                    markedImportant: f.sfqd === 1,
                    visitCount: (_b = f.llcs) !== null && _b !== void 0 ? _b : 0,
                    downloadCount: (_c = f.xzcs) !== null && _c !== void 0 ? _c : 0,
                    fileType: f.wjlx
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
            const json = yield (yield this.myFetch(URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return [];
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
            const json = yield (yield this.myFetch(URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
            if (json.result !== "success") {
                return [];
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
            const json = yield (yield this.myFetch(url)).json();
            if (json.result !== "success") {
                return [];
            }
            const result = json.object.aaData;
            const homeworks = [];
            yield Promise.all(result.map((h) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                homeworks.push(Object.assign(Object.assign({ id: h.zyid, studentHomeworkId: h.xszyid, title: entities_1.decodeHTML(h.bt), url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid), deadline: h.jzsj, submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid), submitTime: h.scsj === null ? undefined : h.scsj, grade: h.cj === null ? undefined : h.cj, gradeLevel: utils_1.mapGradeToLevel(h.cj), graderName: utils_1.trimAndDefine(h.jsm), gradeContent: utils_1.trimAndDefine(h.pynr), gradeTime: h.pysj === null ? undefined : h.pysj, submittedAttachmentUrl: h.zyfjid === ""
                        ? undefined
                        : URL.LEARN_HOMEWORK_DOWNLOAD(h.wlkcid, h.zyfjid) }, status), (yield this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))));
            })));
            return homeworks;
        });
    }
    parseNotificationDetail(courseID, id, courseType) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield this.myFetch(URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
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
            const response = yield this.myFetch(URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
            const result = $(yield response.text());
            const fileDivs = result("div.list.fujian.clearfix");
            return Object.assign(Object.assign(Object.assign(Object.assign({ description: utils_1.removeStrangeCharacters(utils_1.trimAndDefine(result("div.list.calendar.clearfix>div.fl.right>div.c55")
                    .slice(0, 1)
                    .html())), answerContent: utils_1.trimAndDefine(result("div.list.calendar.clearfix>div.fl.right>div.c55")
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
                [urlKey]: `${URL.LEARN_PREFIX}${fileNode.attribs.href.split("=").slice(-1)[0]}`
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
            title: entities_1.decodeHTML(d.bt),
            publisherName: d.fbrxm,
            publishTime: d.fbsj,
            lastReplyTime: d.zhhfsj,
            lastReplierName: d.zhhfrxm,
            visitCount: (_a = d.djs) !== null && _a !== void 0 ? _a : 0,
            replyCount: d.hfcs
        };
    }
}
exports.Learn2018Helper = Learn2018Helper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0dBQWtEO0FBQ2xELHVDQUFzQztBQUN0Qyx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0FzQmlCO0FBQ2pCLG1DQU9pQjtBQUVqQiwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLE1BQU0sY0FBYyxHQUE0QjtJQUM5QyxjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN6QixPQUFPLHFDQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvRCw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBTTFCLG1GQUFtRjtJQUNuRixZQUFZLE1BQXFCOztRQUMvQixJQUFJLENBQUMsU0FBUyxTQUFHLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxTQUFTLG1DQUFJLElBQUksZ0NBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxRQUFRLENBQUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLCtCQUFlLENBQUMscUJBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFRLENBQUM7UUFDbEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUTtZQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2hDLENBQUMsQ0FBQyxDQUFPLEdBQUcsSUFBSSxF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