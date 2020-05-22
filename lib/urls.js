"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRAR_CALENDAR = exports.REGISTRAR_AUTH = exports.REGISTRAR_TICKET = exports.REGISTRAR_TICKET_FORM_DATA = exports.LEARN_QUESTION_DETAIL = exports.LEARN_QUESTION_LIST_ANSWERED = exports.LEARN_DISCUSSION_DETAIL = exports.LEARN_DISCUSSION_LIST = exports.LEARN_HOMEWORK_SUBMIT = exports.LEARN_HOMEWORK_DOWNLOAD = exports.LEARN_HOMEWORK_DETAIL = exports.LEARN_HOMEWORK_LIST_SOURCE = exports.LEARN_HOMEWORK_LIST_GRADED = exports.LEARN_HOMEWORK_LIST_SUBMITTED = exports.LEARN_HOMEWORK_LIST_NEW = exports.LEARN_NOTIFICATION_DETAIL = exports.LEARN_NOTIFICATION_LIST = exports.LEARN_FILE_PREVIEW = exports.LEARN_FILE_DOWNLOAD = exports.LEARN_FILE_LIST = exports.LEARN_TEACHER_COURSE_URL = exports.LEARN_COURSE_TIME_LOCATION = exports.LEARN_COURSE_URL = exports.LEARN_COURSE_LIST = exports.LEARN_CURRENT_SEMESTER = exports.LEARN_SEMESTER_LIST = exports.LEARN_LOGOUT = exports.LEARN_AUTH_ROAM = exports.ID_LOGIN_FORM_DATA = exports.ID_LOGIN = exports.REGISTRAR_PREFIX = exports.LEARN_PREFIX = void 0;
const tslib_1 = require("tslib");
const form_data_1 = tslib_1.__importDefault(require("form-data"));
const types_1 = require("./types");
exports.LEARN_PREFIX = "https://learn.tsinghua.edu.cn";
exports.REGISTRAR_PREFIX = "https://zhjw.cic.tsinghua.edu.cn";
const MAX_SIZE = 200;
exports.ID_LOGIN = () => {
    return "https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do";
};
exports.ID_LOGIN_FORM_DATA = (username, password) => {
    const credential = new form_data_1.default();
    credential.append("i_user", username);
    credential.append("i_pass", password);
    credential.append("atOnce", String(true));
    return credential;
};
exports.LEARN_AUTH_ROAM = (ticket) => {
    return `${exports.LEARN_PREFIX}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`;
};
exports.LEARN_LOGOUT = () => {
    return `${exports.LEARN_PREFIX}/f/j_spring_security_logout`;
};
exports.LEARN_SEMESTER_LIST = () => {
    return `${exports.LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xktjb_coassb/queryxnxq`;
};
exports.LEARN_CURRENT_SEMESTER = () => {
    return `${exports.LEARN_PREFIX}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`;
};
exports.LEARN_COURSE_LIST = (semester, courseType) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/b/kc/v_wlkc_kcb/queryAsorCoCourseList/${semester}/0`;
    }
};
exports.LEARN_COURSE_URL = (courseID, courseType) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/index/course/${courseType}/course?wlkcid=${courseID}`;
};
exports.LEARN_COURSE_TIME_LOCATION = (courseID) => {
    return `${exports.LEARN_PREFIX}/b/kc/v_wlkc_xk_sjddb/detail?id=${courseID}`;
};
exports.LEARN_TEACHER_COURSE_URL = (courseID) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/index/course/teacher/course?wlkcid=${courseID}`;
};
exports.LEARN_FILE_LIST = (courseID, courseType) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/kjxxbByWlkcidAndSizeForStudent?wlkcid=${courseID}&size=${MAX_SIZE}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/b/wlxt/kj/v_kjxxb_wjwjb/teacher/queryByWlkcid?wlkcid=${courseID}&size=${MAX_SIZE}`;
    }
};
exports.LEARN_FILE_DOWNLOAD = (fileID, courseType, courseID) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=${fileID}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/f/wlxt/kj/wlkc_kjxxb/teacher/beforeView?id=${fileID}&wlkcid=${courseID}`;
    }
};
exports.LEARN_FILE_PREVIEW = (fileID, courseType, firstPageOnly) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/kc/wj_wjb/${courseType}/beforePlay?wjid=${fileID}&mk=mk_kcwj&browser=-1&sfgk=0&pageType=${firstPageOnly ? "first" : "all"}`;
};
exports.LEARN_NOTIFICATION_LIST = (courseID, courseType) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/student/kcggListXs?wlkcid=${courseID}&size=${MAX_SIZE}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/b/wlxt/kcgg/wlkc_ggb/teacher/kcggList?wlkcid=${courseID}&size=${MAX_SIZE}`;
    }
};
exports.LEARN_NOTIFICATION_DETAIL = (courseID, notificationID, courseType) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/student/beforeViewXs?wlkcid=${courseID}&id=${notificationID}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/f/wlxt/kcgg/wlkc_ggb/teacher/beforeViewJs?wlkcid=${courseID}&id=${notificationID}`;
    }
};
exports.LEARN_HOMEWORK_LIST_NEW = (courseID) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListWj?wlkcid=${courseID}&size=${MAX_SIZE}`;
};
exports.LEARN_HOMEWORK_LIST_SUBMITTED = (courseID) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYjwg?wlkcid=${courseID}&size=${MAX_SIZE}`;
};
exports.LEARN_HOMEWORK_LIST_GRADED = (courseID) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/kczy/zy/student/index/zyListYpg?wlkcid=${courseID}&size=${MAX_SIZE}`;
};
exports.LEARN_HOMEWORK_LIST_SOURCE = (courseID) => {
    return [
        {
            url: exports.LEARN_HOMEWORK_LIST_NEW(courseID),
            status: {
                submitted: false,
                graded: false,
            },
        },
        {
            url: exports.LEARN_HOMEWORK_LIST_SUBMITTED(courseID),
            status: {
                submitted: true,
                graded: false,
            },
        },
        {
            url: exports.LEARN_HOMEWORK_LIST_GRADED(courseID),
            status: {
                submitted: true,
                graded: true,
            },
        },
    ];
};
exports.LEARN_HOMEWORK_DETAIL = (courseID, homeworkID, studentHomeworkID) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/kczy/zy/student/viewCj?wlkcid=${courseID}&zyid=${homeworkID}&xszyid=${studentHomeworkID}`;
};
exports.LEARN_HOMEWORK_DOWNLOAD = (courseID, attachmentID) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/kczy/zy/student/downloadFile/${courseID}/${attachmentID}`;
};
exports.LEARN_HOMEWORK_SUBMIT = (courseID, studentHomeworkID) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/kczy/zy/student/tijiao?wlkcid=${courseID}&xszyid=${studentHomeworkID}`;
};
exports.LEARN_DISCUSSION_LIST = (courseID, courseType) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kctlList?wlkcid=${courseID}&size=${MAX_SIZE}`;
};
exports.LEARN_DISCUSSION_DETAIL = (courseID, boardID, discussionID, courseType, tabId = 1) => {
    return `${exports.LEARN_PREFIX}/f/wlxt/bbs/bbs_tltb/${courseType}/viewTlById?wlkcid=${courseID}&id=${discussionID}&tabbh=${tabId}&bqid=${boardID}`;
};
exports.LEARN_QUESTION_LIST_ANSWERED = (courseID, courseType) => {
    return `${exports.LEARN_PREFIX}/b/wlxt/bbs/bbs_tltb/${courseType}/kcdyList?wlkcid=${courseID}&size=${MAX_SIZE}`;
};
exports.LEARN_QUESTION_DETAIL = (courseID, questionID, courseType) => {
    if (courseType === types_1.CourseType.STUDENT) {
        return `${exports.LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/student/viewDyById?wlkcid=${courseID}&id=${questionID}`;
    }
    else {
        return `${exports.LEARN_PREFIX}/f/wlxt/bbs/bbs_kcdy/teacher/beforeEditDy?wlkcid=${courseID}&id=${questionID}`;
    }
};
exports.REGISTRAR_TICKET_FORM_DATA = () => {
    const form = new form_data_1.default();
    form.append("appId", "ALL_ZHJW");
    return form;
};
exports.REGISTRAR_TICKET = () => {
    return `${exports.LEARN_PREFIX}/b/wlxt/common/auth/gnt`;
};
exports.REGISTRAR_AUTH = (ticket) => {
    return `${exports.REGISTRAR_PREFIX}/j_acegi_login.do?url=/&ticket=${ticket}`;
};
exports.REGISTRAR_CALENDAR = (startDate, endDate, graduate = false, callbackName = "unknown") => {
    return `${exports.REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? "yjs" : "bks"}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91cmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxrRUFBaUM7QUFDakMsbUNBQXFDO0FBRXhCLFFBQUEsWUFBWSxHQUFHLCtCQUErQixDQUFDO0FBQy9DLFFBQUEsZ0JBQWdCLEdBQUcsa0NBQWtDLENBQUM7QUFFbkUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO0FBRVIsUUFBQSxRQUFRLEdBQUcsR0FBRyxFQUFFO0lBQzNCLE9BQU8sbUdBQW1HLENBQUM7QUFDN0csQ0FBQyxDQUFDO0FBRVcsUUFBQSxrQkFBa0IsR0FBRyxDQUFDLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO0lBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQVEsRUFBRSxDQUFDO0lBQ2xDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFDLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVXLFFBQUEsZUFBZSxHQUFHLENBQUMsTUFBYyxFQUFFLEVBQUU7SUFDaEQsT0FBTyxHQUFHLG9CQUFZLG9EQUFvRCxNQUFNLEVBQUUsQ0FBQztBQUNyRixDQUFDLENBQUM7QUFFVyxRQUFBLFlBQVksR0FBRyxHQUFHLEVBQUU7SUFDL0IsT0FBTyxHQUFHLG9CQUFZLDZCQUE2QixDQUFDO0FBQ3RELENBQUMsQ0FBQztBQUVXLFFBQUEsbUJBQW1CLEdBQUcsR0FBRyxFQUFFO0lBQ3RDLE9BQU8sR0FBRyxvQkFBWSw2Q0FBNkMsQ0FBQztBQUN0RSxDQUFDLENBQUM7QUFFVyxRQUFBLHNCQUFzQixHQUFHLEdBQUcsRUFBRTtJQUN6QyxPQUFP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