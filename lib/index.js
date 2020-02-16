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
        var _a, _b, _c;
        this.cookieJar = (_b = (_a = config) === null || _a === void 0 ? void 0 : _a.cookieJar, (_b !== null && _b !== void 0 ? _b : new tough_cookie_no_native_1.default.CookieJar()));
        this.provider = (_c = config) === null || _c === void 0 ? void 0 : _c.provider;
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
            const extractData = (raw) => raw.map(i => ({
                location: i.dd,
                status: i.fl,
                startTime: i.kssj,
                endTime: i.jssj,
                date: i.nq,
                courseName: i.nr
            }));
            const response = yield this.myFetch(URL.REGISTRAR_CALENDAR(startDate, endDate, extractData.name));
            if (!response.ok) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            let calendarJSONP = (yield response.text());
            if (!calendarJSONP.startsWith(extractData.name)) {
                return Promise.reject(types_1.FailReason.INVALID_RESPONSE);
            }
            return eval(calendarJSONP);
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
                    teacherName: (_a = c.jsm, (_a !== null && _a !== void 0 ? _a : "")),
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
            const result = (_a = json.object.aaData, (_a !== null && _a !== void 0 ? _a : json.object.resultsList));
            const notifications = [];
            yield Promise.all(result.map((n) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const notification = {
                    id: n.ggid,
                    content: entities_1.decodeHTML(js_base64_1.Base64.decode(n.ggnr)),
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
        var _a, _b;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const json = yield (yield this.myFetch(URL.LEARN_FILE_LIST(courseID, courseType))).json();
            if (json.result !== "success") {
                return [];
            }
            let result;
            if ((_b = (_a = json) === null || _a === void 0 ? void 0 : _a.object) === null || _b === void 0 ? void 0 : _b.resultsList) {
                // teacher
                result = json.object.resultsList;
            }
            else {
                // student
                result = json.object;
            }
            const files = [];
            yield Promise.all(result.map((f) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                var _c, _d;
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
                    visitCount: (_c = f.llcs, (_c !== null && _c !== void 0 ? _c : 0)),
                    downloadCount: (_d = f.xzcs, (_d !== null && _d !== void 0 ? _d : 0)),
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
            visitCount: (_a = d.djs, (_a !== null && _a !== void 0 ? _a : 0)),
            replyCount: d.hfcs
        };
    }
}
exports.Learn2018Helper = Learn2018Helper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0dBQWtEO0FBQ2xELHVDQUFzQztBQUN0Qyx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0FzQmlCO0FBQ2pCLG1DQUE0RTtBQUU1RSwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLE1BQU0sY0FBYyxHQUE0QjtJQUM5QyxjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN6QixPQUFPLHFDQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvRCw0QkFBNEI7QUFDNUIsTUFBYSxlQUFlO0lBTTFCLG1GQUFtRjtJQUNuRixZQUFZLE1BQXFCOztRQUMvQixJQUFJLENBQUMsU0FBUyxlQUFHLE1BQU0sMENBQUUsU0FBUyx1Q0FBSSxJQUFJLGdDQUFLLENBQUMsU0FBUyxFQUFFLEVBQUEsQ0FBQztRQUM1RCxJQUFJLENBQUMsUUFBUSxTQUFHLE1BQU0sMENBQUUsUUFBUSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSwrQkFBZSxDQUFDLHFCQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBUSxDQUFDO1FBQ2xFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVE7WUFDMUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBTyxHQUFHLElBQUksRUFBRSxFQUFFO2dCQUNoQixNQUFNLE1BQU0sR0FBRyxNQUFN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