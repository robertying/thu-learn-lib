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
class Learn2018Helper {
    constructor(config) {
        var _a, _b, _c;
        this.cookieJar = (_b = (_a = config) === null || _a === void 0 ? void 0 : _a.cookieJar, (_b !== null && _b !== void 0 ? _b : new tough_cookie_no_native_1.default.CookieJar()));
        this.provider = (_c = config) === null || _c === void 0 ? void 0 : _c.provider;
        this.rawFetch = new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar);
        this.myFetch = this.provider
            ? this.withReAuth(this.rawFetch)
            : this.rawFetch;
    }
    withReAuth(rawFetch) {
        const login = this.login.bind(this); // avoid `this` change inside arrow function
        return function wrappedFetch(...args) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const noLogin = (url) => url.includes("login_timeout");
                const retryAfterLogin = () => tslib_1.__awaiter(this, void 0, void 0, function* () { return yield login().then(() => rawFetch(...args)); });
                return yield rawFetch(...args).then(res => noLogin(res.url) ? retryAfterLogin() : res);
            });
        };
    }
    login(username, password) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!username || !password) {
                if (!this.provider)
                    throw new Error("No credential provided");
                const credential = yield this.provider();
                username = credential.username;
                password = credential.password;
            }
            const ticketResponse = yield this.rawFetch(URL.ID_LOGIN(), {
                body: URL.ID_LOGIN_FORM_DATA(username, password),
                method: "POST"
            });
            if (!ticketResponse.ok) {
                throw new Error("Error fetching ticket from id.tsinghua.edu.cn");
            }
            const ticketResult = yield ticketResponse.text();
            const body = $(ticketResult);
            const targetURL = body("a").attr("href");
            const ticket = targetURL.split("=").slice(-1)[0];
            const loginResponse = yield this.rawFetch(URL.LEARN_AUTH_ROAM(ticket));
            return loginResponse.ok;
        });
    }
    logout() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.rawFetch(URL.LEARN_LOGOUT(), { method: "POST" });
            return true;
        });
    }
    getCalendar(startDate, endDate) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const ticketResponse = yield this.myFetch(URL.REGISTRAR_TICKET(), {
                method: "POST",
                body: URL.REGISTRAR_TICKET_FORM_DATA()
            });
            let ticket = (yield ticketResponse.text());
            ticket = ticket.substring(1, ticket.length - 1);
            yield this.myFetch(URL.REGISTRAR_AUTH(ticket));
            const response = yield this.myFetch(URL.REGISTRAR_CALENDAR(startDate, endDate));
            let calendarString = (yield response.text());
            calendarString = calendarString.substring(15, calendarString.length - 1);
            const rawCalendar = JSON.parse(calendarString);
            const calendar = rawCalendar.map(i => ({
                location: i.dd,
                status: i.fl,
                startTime: i.kssj,
                endTime: i.jssj,
                date: i.nq,
                courseName: i.nr
            }));
            return calendar;
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
    getFileList(courseID, courseType) {
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
    getHomeworkList(courseID, courseType = types_1.CourseType.STUDENT) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (courseType === types_1.CourseType.TEACHER) {
                throw Error("not implemented");
            }
            const allHomework = [];
            yield Promise.all(URL.LEARN_HOMEWORK_LIST_SOURCE(courseID).map((s) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const homeworks = yield this.getHomeworkListAtUrl(s.url, s.status);
                allHomework.push(...homeworks);
            })));
            return allHomework;
        });
    }
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
            if (courseType == types_1.CourseType.STUDENT) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0dBQWtEO0FBQ2xELHVDQUFzQztBQUN0Qyx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0FxQmlCO0FBQ2pCLG1DQUE0RTtBQUU1RSwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLE1BQU0sY0FBYyxHQUE0QjtJQUM5QyxjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN6QixPQUFPLHFDQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFRixNQUFhLGVBQWU7SUFNMUIsWUFBWSxNQUFxQjs7UUFDL0IsSUFBSSxDQUFDLFNBQVMsZUFBRyxNQUFNLDBDQUFFLFNBQVMsdUNBQUksSUFBSSxnQ0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFBLENBQUM7UUFDNUQsSUFBSSxDQUFDLFFBQVEsU0FBRyxNQUFNLDBDQUFFLFFBQVEsQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksK0JBQWUsQ0FBQyxxQkFBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQVUsQ0FBQztRQUNwRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRO1lBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDcEIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxRQUFlO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsNENBQTRDO1FBQ2pGLE9BQU8sU0FBZSxZQUFZLENBQUMsR0FB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