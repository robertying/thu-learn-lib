"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Learn2018Helper = exports.addCSRFTokenToUrl = void 0;
const tslib_1 = require("tslib");
const cheerio_without_node_native_1 = tslib_1.__importDefault(require("cheerio-without-node-native"));
const js_base64_1 = require("js-base64");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const URL = tslib_1.__importStar(require("./urls"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const real_isomorphic_fetch_1 = tslib_1.__importDefault(require("real-isomorphic-fetch"));
const tough_cookie_no_native_1 = tslib_1.__importDefault(require("tough-cookie-no-native"));
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const utc_1 = tslib_1.__importDefault(require("dayjs/plugin/utc"));
const timezone_1 = tslib_1.__importDefault(require("dayjs/plugin/timezone"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.tz.setDefault("Asia/Shanghai");
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
    #provider;
    #rawFetch;
    #myFetch;
    #myFetchWithToken = async (...args) => {
        if (this.#csrfToken == "") {
            await this.login();
        }
        const [url, ...remaining] = args;
        return this.#myFetch((0, exports.addCSRFTokenToUrl)(url, this.#csrfToken), ...remaining);
    };
    #csrfToken = "";
    #withReAuth = (rawFetch) => {
        const login = this.login.bind(this);
        return async function wrappedFetch(...args) {
            const retryAfterLogin = async () => {
                await login();
                return await rawFetch(...args).then((res) => {
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
            };
            return await rawFetch(...args).then((res) => noLogin(res) ? retryAfterLogin() : res);
        };
    };
    cookieJar;
    /** you can provide a CookieJar and / or CredentialProvider in the configuration */
    constructor(config) {
        this.cookieJar = config?.cookieJar ?? new tough_cookie_no_native_1.default.CookieJar();
        this.#provider = config?.provider;
        this.#rawFetch = new real_isomorphic_fetch_1.default(cross_fetch_1.default, this.cookieJar);
        this.#myFetch = this.#provider
            ? this.#withReAuth(this.#rawFetch)
            : async (...args) => {
                const result = await this.#rawFetch(...args);
                if (noLogin(result))
                    return Promise.reject({
                        reason: types_1.FailReason.NOT_LOGGED_IN,
                    });
                return result;
            };
    }
    async getUserInfo(courseType = types_1.CourseType.STUDENT) {
        const content = await (await this.#myFetch(URL.LEARN_HOMEPAGE(courseType))).text();
        const dom = $(content);
        const name = dom("a.user-log").text().trim();
        const id = dom("#userid").attr("value");
        const department = dom(".fl.up-img-info p:nth-child(2) label")
            .text()
            .trim();
        let avatarUrl;
        const avatarMatch = /"\/b\/wlxt\/xt\/v_jsxsxx\/teacher\/queryTxByZjh\?zjh=(.*)"/.exec(content);
        if (avatarMatch?.[1]) {
            const zjh = avatarMatch?.[1];
            avatarUrl = URL.LEARN_AVATAR(zjh);
        }
        return {
            id,
            name,
            department,
            avatarUrl,
        };
    }
    /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
    getCSRFToken() {
        return this.#csrfToken;
    }
    /** login is necessary if you do not provide a `CredentialProvider` */
    async login(username, password) {
        if (!username || !password) {
            if (!this.#provider)
                return Promise.reject({
                    reason: types_1.FailReason.NO_CREDENTIAL,
                });
            const credential = await this.#provider();
            username = credential.username;
            password = credential.password;
        }
        const ticketResponse = await this.#rawFetch(URL.ID_LOGIN(), {
            body: URL.ID_LOGIN_FORM_DATA(username, password),
            method: "POST",
        });
        if (!ticketResponse.ok) {
            return Promise.reject({
                reason: types_1.FailReason.ERROR_FETCH_FROM_ID,
            });
        }
        // check response from id.tsinghua.edu.cn
        const ticketResult = await ticketResponse.text();
        const body = $(ticketResult);
        const targetURL = body("a").attr("href");
        const ticket = targetURL.split("=").slice(-1)[0];
        if (ticket === "BAD_CREDENTIALS") {
            return Promise.reject({
                reason: types_1.FailReason.BAD_CREDENTIAL,
            });
        }
        const loginResponse = await this.#rawFetch(URL.LEARN_AUTH_ROAM(ticket));
        if (loginResponse.ok !== true) {
            return Promise.reject({
                reason: types_1.FailReason.ERROR_ROAMING,
            });
        }
        const courseListPageSource = await (await this.#rawFetch(URL.LEARN_STUDENT_COURSE_LIST_PAGE())).text();
        const tokenRegex = /^.*&_csrf=(\S*)".*$/gm;
        const matches = [...courseListPageSource.matchAll(tokenRegex)];
        if (matches.length == 0) {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: "cannot fetch CSRF token from source",
            });
        }
        this.#csrfToken = matches[0][1];
    }
    /**  logout (to make everyone happy) */
    async logout() {
        await this.#rawFetch(URL.LEARN_LOGOUT(), { method: "POST" });
    }
    /**
     * Get calendar items during the specified period (in yyyymmdd format).
     * @param startDate start date (inclusive)
     * @param endDate end date (inclusive)
     * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
     * and we currently observe a limit of no more that 29 days.
     * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
     */
    async getCalendar(startDate, endDate, graduate = false) {
        const ticketResponse = await this.#myFetchWithToken(URL.REGISTRAR_TICKET(), {
            method: "POST",
            body: URL.REGISTRAR_TICKET_FORM_DATA(),
        });
        let ticket = (await ticketResponse.text());
        ticket = ticket.substring(1, ticket.length - 1);
        await this.#myFetch(URL.REGISTRAR_AUTH(ticket));
        const response = await this.#myFetch(URL.REGISTRAR_CALENDAR(startDate, endDate, graduate, utils_1.JSONP_EXTRACTOR_NAME));
        if (!response.ok) {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
            });
        }
        const result = (0, utils_1.extractJSONPResult)(await response.text());
        return result.map((i) => ({
            location: i.dd,
            status: i.fl,
            startTime: i.kssj,
            endTime: i.jssj,
            date: i.nq,
            courseName: i.nr,
        }));
    }
    async getSemesterIdList() {
        const json = await (await this.#myFetchWithToken(URL.LEARN_SEMESTER_LIST())).json();
        if (!Array.isArray(json)) {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const semesters = json;
        // sometimes web learning returns null, so confusing...
        return semesters.filter((s) => s != null);
    }
    async getCurrentSemester() {
        const json = await (await this.#myFetchWithToken(URL.LEARN_CURRENT_SEMESTER())).json();
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
    }
    /** get all courses in the specified semester */
    async getCourseList(semesterID, courseType = types_1.CourseType.STUDENT, lang) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_COURSE_LIST(semesterID, courseType, lang))).json();
        if (json.message !== "success" || !Array.isArray(json.resultList)) {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const result = (json.resultList ?? []);
        const courses = [];
        await Promise.all(result.map(async (c) => {
            courses.push({
                id: c.wlkcid,
                name: c.kcm,
                englishName: c.ywkcm,
                timeAndLocation: await (await this.#myFetchWithToken(URL.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json(),
                url: URL.LEARN_COURSE_URL(c.wlkcid, courseType),
                teacherName: c.jsm ?? "",
                teacherNumber: c.jsh,
                courseNumber: c.kch,
                courseIndex: Number(c.kxh),
                courseType,
            });
        }));
        return courses;
    }
    /**
     * Get certain type of content of all specified courses.
     * It actually wraps around other `getXXX` functions
     */
    async getAllContents(courseIDs, type, courseType = types_1.CourseType.STUDENT) {
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
        await Promise.all(courseIDs.map(async (id) => {
            contents[id] = await fetchFunc.bind(this)(id, courseType);
        }));
        return contents;
    }
    /** Get all notifications （课程公告） of the specified course. */
    async getNotificationList(courseID, courseType = types_1.CourseType.STUDENT) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_NOTIFICATION_LIST(courseID, courseType))).json();
        if (json.result !== "success") {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const result = (json.object?.aaData ??
            json.object?.resultsList ??
            []);
        const notifications = [];
        await Promise.all(result.map(async (n) => {
            const notification = {
                id: n.ggid,
                content: (0, utils_1.decodeHTML)(js_base64_1.Base64.decode(n.ggnr ?? "")),
                title: (0, utils_1.decodeHTML)(n.bt),
                url: URL.LEARN_NOTIFICATION_DETAIL(courseID, n.ggid, courseType),
                publisher: n.fbrxm,
                hasRead: n.sfyd === "是",
                markedImportant: Number(n.sfqd) === 1,
                publishTime: dayjs_1.default
                    .tz(n.fbsj && typeof n.fbsj === "string" ? n.fbsj : n.fbsjStr)
                    .toISOString(),
            };
            let detail = {};
            const attachmentName = courseType === types_1.CourseType.STUDENT ? n.fjmc : n.fjbt;
            if (attachmentName) {
                detail = await this.parseNotificationDetail(courseID, notification.id, courseType, attachmentName);
            }
            notifications.push({ ...notification, ...detail });
        }));
        return notifications;
    }
    /** Get all files （课程文件） of the specified course. */
    async getFileList(courseID, courseType = types_1.CourseType.STUDENT) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_FILE_LIST(courseID, courseType))).json();
        if (json.result !== "success") {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        let result = [];
        if (Array.isArray(json.object?.resultsList)) {
            // teacher
            result = json.object.resultsList;
        }
        else if (Array.isArray(json.object)) {
            // student
            result = json.object;
        }
        const files = [];
        await Promise.all(result.map(async (f) => {
            const title = (0, utils_1.decodeHTML)(f.bt);
            const downloadUrl = URL.LEARN_FILE_DOWNLOAD(courseType === types_1.CourseType.STUDENT ? f.wjid : f.id, courseType, courseID);
            const previewUrl = URL.LEARN_FILE_PREVIEW(types_1.ContentType.FILE, f.wjid, courseType, true);
            files.push({
                id: f.wjid,
                title: (0, utils_1.decodeHTML)(f.bt),
                description: (0, utils_1.decodeHTML)(f.ms),
                rawSize: f.wjdx,
                size: f.fileSize,
                uploadTime: dayjs_1.default.tz(f.scsj).toISOString(),
                downloadUrl,
                previewUrl,
                isNew: f.isNew,
                markedImportant: f.sfqd === 1,
                visitCount: f.llcs ?? 0,
                downloadCount: f.xzcs ?? 0,
                fileType: f.wjlx,
                remoteFile: {
                    id: f.wjid,
                    name: title,
                    downloadUrl,
                    previewUrl,
                    size: f.fileSize,
                },
            });
        }));
        return files;
    }
    /** Get all homeworks （课程作业） of the specified course (support student version only). */
    async getHomeworkList(courseID, courseType = types_1.CourseType.STUDENT) {
        if (courseType === types_1.CourseType.TEACHER) {
            return Promise.reject({
                reason: types_1.FailReason.NOT_IMPLEMENTED,
                extra: "currently getting homework list of TA courses is not supported",
            });
        }
        const allHomework = [];
        await Promise.all(URL.LEARN_HOMEWORK_LIST_SOURCE(courseID).map(async (s) => {
            const homeworks = await this.getHomeworkListAtUrl(s.url, s.status);
            allHomework.push(...homeworks);
        }));
        return allHomework;
    }
    /** Get all discussions （课程讨论） of the specified course. */
    async getDiscussionList(courseID, courseType = types_1.CourseType.STUDENT) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_DISCUSSION_LIST(courseID, courseType))).json();
        if (json.result !== "success") {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const result = (json.object?.resultsList ?? []);
        const discussions = [];
        await Promise.all(result.map(async (d) => {
            discussions.push({
                ...this.parseDiscussionBase(d),
                boardId: d.bqid,
                url: URL.LEARN_DISCUSSION_DETAIL(d.wlkcid, d.bqid, d.id, courseType),
            });
        }));
        return discussions;
    }
    /**
     * Get all notifications （课程答疑） of the specified course.
     * The student version supports only answered questions, while the teacher version supports all questions.
     */
    async getAnsweredQuestionList(courseID, courseType = types_1.CourseType.STUDENT) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_QUESTION_LIST_ANSWERED(courseID, courseType))).json();
        if (json.result !== "success") {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const result = (json.object?.resultsList ?? []);
        const questions = [];
        await Promise.all(result.map(async (q) => {
            questions.push({
                ...this.parseDiscussionBase(q),
                question: js_base64_1.Base64.decode(q.wtnr),
                url: URL.LEARN_QUESTION_DETAIL(q.wlkcid, q.id, courseType),
            });
        }));
        return questions;
    }
    async getHomeworkListAtUrl(url, status) {
        const json = await (await this.#myFetchWithToken(url)).json();
        if (json.result !== "success") {
            return Promise.reject({
                reason: types_1.FailReason.INVALID_RESPONSE,
                extra: json,
            });
        }
        const result = (json.object?.aaData ?? []);
        const homeworks = [];
        await Promise.all(result.map(async (h) => {
            homeworks.push({
                id: h.zyid,
                studentHomeworkId: h.xszyid,
                title: (0, utils_1.decodeHTML)(h.bt),
                url: URL.LEARN_HOMEWORK_DETAIL(h.wlkcid, h.zyid, h.xszyid),
                deadline: (0, dayjs_1.default)(h.jzsj).toISOString(),
                publishTime: (0, dayjs_1.default)(h.kssj).toISOString(),
                submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid),
                submitTime: h.scsj === null ? undefined : (0, dayjs_1.default)(h.scsj).toISOString(),
                grade: h.cj === null ? undefined : h.cj,
                gradeLevel: (0, utils_1.mapGradeToLevel)(h.cj),
                graderName: (0, utils_1.trimAndDefine)(h.jsm),
                gradeContent: (0, utils_1.trimAndDefine)(h.pynr),
                gradeTime: h.pysj === null ? undefined : (0, dayjs_1.default)(h.pysj).toISOString(),
                ...status,
                ...(await this.parseHomeworkDetail(h.wlkcid, h.zyid, h.xszyid)),
            });
        }));
        return homeworks;
    }
    async parseNotificationDetail(courseID, id, courseType, attachmentName) {
        const response = await this.#myFetchWithToken(URL.LEARN_NOTIFICATION_DETAIL(courseID, id, courseType));
        const result = $(await response.text());
        let path = "";
        if (courseType === types_1.CourseType.STUDENT) {
            path = result(".ml-10").attr("href");
        }
        else {
            path = result("#wjid").attr("href");
        }
        const size = (0, utils_1.trimAndDefine)(result('div#attachment > div.fl > span[class^="color"]').first().text());
        const params = new URLSearchParams(path.split("?").slice(-1)[0]);
        const attachmentId = params.get("wjid");
        if (!path.startsWith(URL.LEARN_PREFIX)) {
            path = URL.LEARN_PREFIX + path;
        }
        return {
            attachment: {
                name: attachmentName,
                id: attachmentId,
                downloadUrl: path,
                previewUrl: URL.LEARN_FILE_PREVIEW(types_1.ContentType.NOTIFICATION, attachmentId, courseType),
                size,
            },
        };
    }
    async parseHomeworkDetail(courseID, id, studentHomeworkID) {
        const response = await this.#myFetchWithToken(URL.LEARN_HOMEWORK_DETAIL(courseID, id, studentHomeworkID));
        const result = $(await response.text());
        const fileDivs = result("div.list.fujian.clearfix");
        return {
            description: (0, utils_1.trimAndDefine)(result("div.list.calendar.clearfix > div.fl.right > div.c55")
                .slice(0, 1)
                .html()),
            answerContent: (0, utils_1.trimAndDefine)(result("div.list.calendar.clearfix > div.fl.right > div.c55")
                .slice(1, 2)
                .html()),
            submittedContent: (0, utils_1.trimAndDefine)((0, cheerio_without_node_native_1.default)("div.right", result("div.boxbox").slice(1, 2))
                .slice(2, 3)
                .html()),
            attachment: this.parseHomeworkFile(fileDivs[0]),
            answerAttachment: this.parseHomeworkFile(fileDivs[1]),
            submittedAttachment: this.parseHomeworkFile(fileDivs[2]),
            gradeAttachment: this.parseHomeworkFile(fileDivs[3]),
        };
    }
    parseHomeworkFile(fileDiv) {
        const fileNode = ($(fileDiv)(".ftitle").children("a")[0] ??
            $(fileDiv)(".fl").children("a")[0]);
        if (fileNode !== undefined) {
            const size = (0, utils_1.trimAndDefine)($(fileDiv)('.fl > span[class^="color"]').first().text());
            const params = new URLSearchParams(fileNode.attribs.href.split("?").slice(-1)[0]);
            const attachmentId = params.get("fileId");
            // so dirty here...
            let downloadUrl = URL.LEARN_PREFIX + fileNode.attribs.href;
            if (params.has("downloadUrl")) {
                downloadUrl = URL.LEARN_PREFIX + params.get("downloadUrl");
            }
            return {
                id: attachmentId,
                name: fileNode.children[0].data,
                downloadUrl,
                previewUrl: URL.LEARN_FILE_PREVIEW(types_1.ContentType.HOMEWORK, attachmentId, types_1.CourseType.STUDENT),
                size,
            };
        }
        else {
            return undefined;
        }
    }
    parseDiscussionBase(d) {
        return {
            id: d.id,
            title: (0, utils_1.decodeHTML)(d.bt),
            publisherName: d.fbrxm,
            publishTime: d.fbsj,
            lastReplyTime: d.zhhfsj,
            lastReplierName: d.zhhfrxm,
            visitCount: d.djs ?? 0,
            replyCount: d.hfcs,
        };
    }
}
exports.Learn2018Helper = Learn2018Helper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHNHQUFrRDtBQUNsRCx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0F5QmlCO0FBQ2pCLG1DQU9pQjtBQUVqQiwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLDBEQUEwQjtBQUMxQixtRUFBbUM7QUFDbkMsNkVBQTZDO0FBQzdDLGVBQUssQ0FBQyxNQUFNLENBQUMsYUFBRyxDQUFDLENBQUM7QUFDbEIsZUFBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBUSxDQUFDLENBQUM7QUFDdkIsZUFBSyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFckMsTUFBTSxjQUFjLEdBQWlDO0lBQ25ELGNBQWMsRUFBRSxLQUFLO0NBQ3RCLENBQUM7QUFFRixNQUFNLENBQUMsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ3pCLE9BQU8scUNBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQztBQUVGLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBYSxFQUFFLEVBQUUsQ0FDaEMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUM7QUFFekQsc0RBQXNEO0FBQy9DLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBYSxFQUFVLEVBQUU7SUFDdEUsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLEdBQUcsSUFBSSxVQUFVLEtBQUssRUFBRSxDQUFDO0tBQzFCO1NBQU07UUFDTCxHQUFHLElBQUksVUFBVSxLQUFLLEVBQUUsQ0FBQztLQUMxQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxD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