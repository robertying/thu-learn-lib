"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
                graded: false
            }
        },
        {
            url: exports.LEARN_HOMEWORK_LIST_SUBMITTED(courseID),
            status: {
                submitted: true,
                graded: false
            }
        },
        {
            url: exports.LEARN_HOMEWORK_LIST_GRADED(courseID),
            status: {
                submitted: true,
                graded: true
            }
        }
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
exports.REGISTRAR_CALENDAR = (startDate, endDate, callbackName = "unknown") => {
    return `${exports.REGISTRAR_PREFIX}/jxmh_out.do?m=bks_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91cmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtFQUFpQztBQUNqQyxtQ0FBcUM7QUFFeEIsUUFBQSxZQUFZLEdBQUcsK0JBQStCLENBQUM7QUFDL0MsUUFBQSxnQkFBZ0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUVuRSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFFUixRQUFBLFFBQVEsR0FBRyxHQUFHLEVBQUU7SUFDM0IsT0FBTyxtR0FBbUcsQ0FBQztBQUM3RyxDQUFDLENBQUM7QUFFVyxRQUFBLGtCQUFrQixHQUFHLENBQUMsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLEVBQUU7SUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxtQkFBUSxFQUFFLENBQUM7SUFDbEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUMsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsQ0FBQyxNQUFjLEVBQUUsRUFBRTtJQUNoRCxPQUFPLEdBQUcsb0JBQVksb0RBQW9ELE1BQU0sRUFBRSxDQUFDO0FBQ3JGLENBQUMsQ0FBQztBQUVXLFFBQUEsWUFBWSxHQUFHLEdBQUcsRUFBRTtJQUMvQixPQUFPLEdBQUcsb0JBQVksNkJBQTZCLENBQUM7QUFDdEQsQ0FBQyxDQUFDO0FBRVcsUUFBQSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7SUFDdEMsT0FBTyxHQUFHLG9CQUFZLDZDQUE2QyxDQUFDO0FBQ3RFLENBQUMsQ0FBQztBQUVXLFFBQUEsc0JBQXNCLEdBQUcsR0FBRyxFQUFFO0lBQ3pDLE9BQU8s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