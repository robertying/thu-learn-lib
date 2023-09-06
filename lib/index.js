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