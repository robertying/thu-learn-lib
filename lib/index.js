"use strict";
var _provider, _rawFetch, _myFetch;
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
                return yield rawFetch(...args).then(res => (noLogin(res.url) ? retryAfterLogin() : res));
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
                method: 'POST',
            });
            if (!ticketResponse.ok) {
                return Promise.reject(types_1.FailReason.ERROR_FETCH_FROM_ID);
            }
            // check response from id.tsinghua.edu.cn
            const ticketResult = yield ticketResponse.text();
            const body = $(ticketResult);
            const targetURL = body('a').attr('href');
            const ticket = targetURL.split('=').slice(-1)[0];
            if (ticket === 'BAD_CREDENTIALS') {
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
            yield tslib_1.__classPrivateFieldGet(this, _rawFetch).call(this, URL.LEARN_LOGOUT(), { method: 'POST' });
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
                method: 'POST',
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
            return result.map(i => ({
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
            return semesters.filter(s => s != null);
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
                    teacherName: (_a = c.jsm) !== null && _a !== void 0 ? _a : '',
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
            if (json.result !== 'success') {
                return [];
            }
            const result = ((_a = json.object.aaData) !== null && _a !== void 0 ? _a : json.object.resultsList);
            const notifications = [];
            yield Promise.all(result.map((n) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const notification = {
                    id: n.ggid,
                    content: entities_1.decodeHTML(js_base64_1.Base64.decode(n.ggnr)),
                    title: entities_1.decodeHTML(n.bt),
                    url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                    publisher: n.fbrxm,
                    hasRead: n.sfyd === '是',
                    markedImportant: n.sfqd === '1',
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
            if (json.result !== 'success') {
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
            if (json.result !== 'success') {
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
            if (json.result !== 'success') {
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
            const json = yield (yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, url)).json();
            if (json.result !== 'success') {
                return [];
            }
            const result = json.object.aaData;
            const homeworks = [];
            yield Promise.all(result.map((h) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                homeworks.push(Object.assign(Object.assign({ id: h.zyid, studentHomeworkId: h.xszyid, title: entities_1.decodeHTML(h.bt), url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid), deadline: h.jzsj, submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid), submitTime: h.scsj === null ? undefined : h.scsj, grade: h.cj === null ? undefined : h.cj, gradeLevel: utils_1.mapGradeToLevel(h.cj), graderName: utils_1.trimAndDefine(h.jsm), gradeContent: utils_1.trimAndDefine(h.pynr), gradeTime: h.pysj === null ? undefined : h.pysj, submittedAttachmentUrl: h.zyfjid === '' ? undefined : URL.LEARN_HOMEWORK_DOWNLOAD(h.wlkcid, h.zyfjid) }, status), (yield this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid))));
            })));
            return homeworks;
        });
    }
    parseNotificationDetail(courseID, id, courseType) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
            const result = $(yield response.text());
            let path = '';
            if (courseType === types_1.CourseType.STUDENT) {
                path = result('.ml-10').attr('href');
            }
            else {
                path = result('#wjid').attr('href');
            }
            return { attachmentUrl: `${URL.LEARN_PREFIX}${path}` };
        });
    }
    parseHomeworkDetail(courseID, id, studentHomeworkID) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = yield tslib_1.__classPrivateFieldGet(this, _myFetch).call(this, URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
            const result = $(yield response.text());
            const fileDivs = result('div.list.fujian.clearfix');
            return Object.assign(Object.assign(Object.assign(Object.assign({ description: utils_1.trimAndDefine(result('div.list.calendar.clearfix>div.fl.right>div.c55')
                    .slice(0, 1)
                    .html()), answerContent: utils_1.trimAndDefine(result('div.list.calendar.clearfix>div.fl.right>div.c55')
                    .slice(1, 2)
                    .html()), submittedContent: utils_1.trimAndDefine(cheerio_without_node_native_1.default('div.right', result('div.boxbox').slice(1, 2))
                    .slice(2, 3)
                    .html()) }, this.parseHomeworkFile(fileDivs[0], 'attachmentName', 'attachmentUrl')), this.parseHomeworkFile(fileDivs[1], 'answerAttachmentName', 'answerAttachmentUrl')), this.parseHomeworkFile(fileDivs[2], 'submittedAttachmentName', 'submittedAttachmentUrl')), this.parseHomeworkFile(fileDivs[3], 'gradeAttachmentName', 'gradeAttachmentUrl'));
        });
    }
    parseHomeworkFile(fileDiv, nameKey, urlKey) {
        const fileNode = cheerio_without_node_native_1.default('.ftitle', fileDiv).children('a')[0];
        if (fileNode !== undefined) {
            return {
                [nameKey]: fileNode.children[0].data,
                [urlKey]: `${URL.LEARN_PREFIX}${fileNode.attribs.href.split('=').slice(-1)[0]}`,
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
            replyCount: d.hfcs,
        };
    }
}
exports.Learn2018Helper = Learn2018Helper;
_provider = new WeakMap(), _rawFetch = new WeakMap(), _myFetch = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHNHQUFrRDtBQUNsRCx1Q0FBc0M7QUFDdEMseUNBQW1DO0FBRW5DLHNFQUFnQztBQUNoQyxvREFBOEI7QUFDOUIsbUNBc0JpQjtBQUNqQixtQ0FNaUI7QUFFakIsMEZBQW9EO0FBQ3BELDRGQUEyQztBQUUzQyxNQUFNLGNBQWMsR0FBNEI7SUFDOUMsY0FBYyxFQUFFLEtBQUs7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDekIsT0FBTyxxQ0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0QsNEJBQTRCO0FBQzVCLE1BQWEsZUFBZTtJQU0xQixtRkFBbUY7SUFDbkYsWUFBWSxNQUFxQjs7UUFMakMsNEJBQXdDO1FBQ3hDLDRCQUEwQjtRQUMxQiwyQkFBeUI7UUFJdkIsSUFBSSxDQUFDLFNBQVMsU0FBRyxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsU0FBUyxtQ0FBSSxJQUFJLGdDQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUQsK0JBQUEsSUFBSSxhQUFhLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxRQUFRLEVBQUM7UUFDbEMsK0JBQUEsSUFBSSxhQUFhLElBQUksK0JBQWUsQ0FBQyxxQkFBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQVEsRUFBQztRQUNuRSwrQkFBQSxJQUFJLFlBQVksZ0RBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLGlEQUFnQjtZQUNqQyxDQUFDLENBQUMsQ0FBTyxHQUFHLElBQUksRUFBRSxF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