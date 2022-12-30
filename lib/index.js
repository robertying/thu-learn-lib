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
                publishTime: n.fbsj && typeof n.fbsj === "string" ? n.fbsj : n.fbsjStr,
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
                uploadTime: f.scsj,
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
                deadline: h.jzsj,
                submitUrl: URL.LEARN_HOMEWORK_SUBMIT(h.wlkcid, h.xszyid),
                submitTime: h.scsj === null ? undefined : h.scsj,
                grade: h.cj === null ? undefined : h.cj,
                gradeLevel: (0, utils_1.mapGradeToLevel)(h.cj),
                graderName: (0, utils_1.trimAndDefine)(h.jsm),
                gradeContent: (0, utils_1.trimAndDefine)(h.pynr),
                gradeTime: h.pysj === null ? undefined : h.pysj,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHNHQUFrRDtBQUNsRCx5Q0FBbUM7QUFFbkMsc0VBQWdDO0FBQ2hDLG9EQUE4QjtBQUM5QixtQ0F5QmlCO0FBQ2pCLG1DQU9pQjtBQUVqQiwwRkFBb0Q7QUFDcEQsNEZBQTJDO0FBRTNDLE1BQU0sY0FBYyxHQUFpQztJQUNuRCxjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUN6QixPQUFPLHFDQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQWEsRUFBRSxFQUFFLENBQ2hDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDO0FBRXpELHNEQUFzRDtBQUMvQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWEsRUFBVSxFQUFFO0lBQ3RFLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNyQixHQUFHLElBQUksVUFBVSxLQUFLLEVBQUUsQ0FBQztLQUMxQjtTQUFNO1FBQ0wsR0FBRyxJQUFJLFVBQVUsS0FBSyxFQUFFLENBQUM7S0FDMUI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQztBQVBXLFFBQUEsaUJBQWlCLHFCQU81QjtBQUVGLDRCQUE0QjtBQUM1QixNQUFhLGVBQWU7SUFDakIsU0FBUyxDQUFzQjtJQUMvQixTQUFTLENBQVE7SUFDakIsUUFBUSxDQUFRO0lBQ2hCLGlCQUFpQixHQUFVLEtBQUssRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFO1FBQ3BELElBQUksSUFBSSxDQUFD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