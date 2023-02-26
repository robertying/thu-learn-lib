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
    async getCourseList(semesterID, courseType = types_1.CourseType.STUDENT) {
        const json = await (await this.#myFetchWithToken(URL.LEARN_COURSE_LIST(semesterID, courseType))).json();
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