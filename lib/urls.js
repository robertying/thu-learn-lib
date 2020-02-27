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
exports.REGISTRAR_CALENDAR = (startDate, endDate, graduate = false, callbackName = "unknown") => {
    return `${exports.REGISTRAR_PREFIX}/jxmh_out.do?m=${graduate ? "yjs" : "bks"}_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}&jsoncallback=${callbackName}`;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91cmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtFQUFpQztBQUNqQyxtQ0FBcUM7QUFFeEIsUUFBQSxZQUFZLEdBQUcsK0JBQStCLENBQUM7QUFDL0MsUUFBQSxnQkFBZ0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUVuRSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFFUixRQUFBLFFBQVEsR0FBRyxHQUFHLEVBQUU7SUFDM0IsT0FBTyxtR0FBbUcsQ0FBQztBQUM3RyxDQUFDLENBQUM7QUFFVyxRQUFBLGtCQUFrQixHQUFHLENBQUMsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLEVBQUU7SUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxtQkFBUSxFQUFFLENBQUM7SUFDbEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDdEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUMsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsQ0FBQyxNQUFjLEVBQUUsRUFBRTtJQUNoRCxPQUFPLEdBQUcsb0JBQVksb0RBQW9ELE1BQU0sRUFBRSxDQUFDO0FBQ3JGLENBQUMsQ0FBQztBQUVXLFFBQUEsWUFBWSxHQUFHLEdBQUcsRUFBRTtJQUMvQixPQUFPLEdBQUcsb0JBQVksNkJBQTZCLENBQUM7QUFDdEQsQ0FBQyxDQUFDO0FBRVcsUUFBQSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7SUFDdEMsT0FBTyxHQUFHLG9CQUFZLDZDQUE2QyxDQUFDO0FBQ3RFLENBQUMsQ0FBQztBQUVXLFFBQUEsc0JBQXNCLEdBQUcsR0FBRyxFQUFFO0lBQ3pDLE9BQU8sR0FBRyxvQkFBWSxrREFBa0QsQ0FBQztBQUMzRSxDQUFDLENBQUM7QUFFVyxRQUFBLGlCQUFpQixHQUFHLENBQUMsUUFBZ0IsRUFBRSxVQUFzQixFQUFFLEVBQUU7SUFDNUUsSUFBSSxVQUFVLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7UUFDckMsT0FBTyxHQUFHLG9CQUFZLHNFQUFzRSxRQUFRLEVBQUUsQ0FBQztLQUN4RztTQUFNO1FBQ0wsT0FBTyxHQUFHLG9CQUFZLDBDQUEwQyxRQUFRLElBQUksQ0FBQztLQUM5RTtBQUNILENBQUMsQ0FBQztBQUVXLFFBQUEsZ0JBQWdCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLFVBQXNCLEVBQUUsRUFBRTtJQUMzRSxPQUFPLEdBQUcsb0JBQVksd0JBQXdCLFVBQVUsa0JBQWtCLFFBQVEsRUFBRSxDQUFDO0FBQ3ZGLENBQUMsQ0FBQztBQUVXLFFBQUEsMEJBQTBCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7SUFDN0QsT0FBTyxHQUFHLG9CQUFZLG1DQUFtQyxRQUFRLEVBQUUsQ0FBQztBQUN0RSxDQUFDLENBQUM7QUFFVyxRQUFBLHdCQUF3QixHQUFHLENBQUMsUUFBZ0IsRUFBRSxFQUFFO0lBQzNELE9BQU8sR0FBRyxvQkFBWSw4Q0FBOEMsUUFBUSxFQUFFLENBQUM7QUFDakYsQ0FBQyxDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsQ0FBQyxRQUFnQixFQUFFLFVBQXNCLEVBQUUsRUFBRTtJQUMxRSxJQUFJLFVBQVUsS0FBSyxrQkFBVSxDQUFDLE9BQU8sRUFBRTtRQUNyQyxPQUFPLEdBQUcsb0JBQVksdUVBQXVFLFFBQVEsU0FBUyxRQUFRLEVBQUUsQ0FBQztLQUMxSDtTQUFNO1FBQ0wsT0FBTyxHQUFHLG9CQUFZLHlEQUF5RCxRQUFRLFNBQVMsUUFBUSxFQUFFLENBQUM7S0FDNUc7QUFDSCxDQUFDLENBQUM7QUFFVyxRQUFBLG1CQUFtQixHQUFHLENBQ2pDLE1BQWMsRUFDZCxVQUFzQixFQUN0QixRQUFnQixFQUNoQixFQUFFO0lBQ0YsSUFBSSxVQUFVLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7UUFDckMsT0FBTyxHQUFHLG9CQUFZLDBEQUEwRCxNQUFNLEVBQUUsQ0FBQztLQUMxRjtTQUFNO1FBQ0wsT0FBTyxHQUFHLG9CQUFZLCtDQUErQyxNQUFNLFdBQVcsUUFBUSxFQUFFLENBQUM7S0FDbEc7QUFDSCxDQUFDLENBQUM7QUFFVyxRQUFBLGtCQUFrQixHQUFHLENBQ2hDLE1BQWMsRUFDZCxVQUFzQixFQUN0QixhQUFzQixFQUN0QixFQUFFO0lBQ0YsT0FBTyxHQUFHLG9CQUFZLHFCQUFxQixVQUFVLG9CQUFvQixNQUFNLDBDQUM3RSxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FDNUIsRUFBRSxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRVcsUUFBQSx1QkFBdUIsR0FBRyxDQUNyQyxRQUFnQixFQUNoQixVQUFzQixFQUN0QixFQUFFO0lBQ0YsSUFBSSxVQUFVLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7UUFDckMsT0FBTyxHQUFHLG9CQUFZLG1EQUFtRCxRQUFRLFNBQVMsUUFBUSxFQUFFLENBQUM7S0FDdEc7U0FBTTtRQUNMLE9BQU8sR0FBRyxvQkFBWSxpREFBaUQsUUFBUSxTQUFTLFFBQVEsRUFBRSxDQUFDO0tBQ3BHO0FBQ0gsQ0FBQyxDQUFDO0FBRVcsUUFBQSx5QkFBeUIsR0FBRyxDQUN2QyxRQUFnQixFQUNoQixjQUFzQixFQUN0QixVQUFzQixFQUN0QixFQUFFO0lBQ0YsSUFBSSxVQUFVLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7UUFDckMsT0FBTyxHQUFHLG9CQUFZLHFEQUFxRCxRQUFRLE9BQU8sY0FBYyxFQUFFLENBQUM7S0FDNUc7U0FBTTtRQUNMLE9BQU8sR0FBRyxvQkFBWSxxREFBcUQsUUFBUSxPQUFPLGNBQWMsRUFBRSxDQUFDO0tBQzVHO0FBQ0gsQ0FBQyxDQUFDO0FBRVcsUUFBQSx1QkFBdUIsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtJQUMxRCxPQUFPLEdBQUcsb0JBQVksaURBQWlELFFBQVEsU0FBUyxRQUFRLEVBQUUsQ0FBQztBQUNyRyxDQUFDLENBQUM7QUFFVyxRQUFBLDZCQUE2QixHQUFHLENBQUMsUUFBZ0IsRUFBRSxFQUFFO0lBQ2hFLE9BQU8sR0FBRyxvQkFBWSxtREFBbUQsUUFBUSxTQUFTLFFBQVEsRUFBRSxDQUFDO0FBQ3ZHLENBQUMsQ0FBQztBQUVXLFFBQUEsMEJBQTBCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7SUFDN0QsT0FBTyxHQUFHLG9CQUFZLGtEQUFrRCxRQUFRLFNBQVMsUUFBUSxFQUFFLENBQUM7QUFDdEcsQ0FBQyxDQUFDO0FBRVcsUUFBQSwwQkFBMEIsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtJQUM3RCxPQUFPO1FBQ0w7WUFDRSxHQUFHLEVBQUUsK0JBQXVCLENBQUMsUUFBUSxDQUFDO1lBQ3RDLE1BQU0sRUFBRTtnQkFDTixTQUFTLEVBQUUsS0FBSztnQkFDaEIsTUFBTSxFQUFFLEtBQUs7YUFDZDtTQUNGO1FBQ0Q7WUFDRSxHQUFHLEVBQUUscUNBQTZCLENBQUMsUUFBUSxDQUFDO1lBQzVDLE1BQU0sRUFBRTtnQkFDTixTQUFTLEVBQUUsSUFBSTtnQkFDZixNQUFNLEVBQUUsS0FBSzthQUNkO1NBQ0Y7UUFDRDtZQUNFLEdBQUcsRUFBRSxrQ0FBMEIsQ0FBQyxRQUFRLENBQUM7WUFDekMsTUFBTSxFQUFFO2dCQUNOLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2FBQ2I7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDLENBQUM7QUFFVyxRQUFBLHFCQUFxQixHQUFHLENBQ25DLFFBQWdCLEVBQ2hCLFVBQWtCLEVBQ2xCLGlCQUF5QixFQUN6QixFQUFFO0lBQ0YsT0FBTyxHQUFHLG9CQUFZLHlDQUF5QyxRQUFRLFNBQVMsVUFBVSxXQUFXLGlCQUFpQixFQUFFLENBQUM7QUFDM0gsQ0FBQyxDQUFDO0FBRVcsUUFBQSx1QkFBdUIsR0FBRyxDQUNyQyxRQUFnQixFQUNoQixZQUFvQixFQUNwQixFQUFFO0lBQ0YsT0FBTyxHQUFHLG9CQUFZLHdDQUF3QyxRQUFRLElBQUksWUFBWSxFQUFFLENBQUM7QUFDM0YsQ0FBQyxDQUFDO0FBRVcsUUFBQSxxQkFBcUIsR0FBRyxDQUNuQyxRQUFnQixFQUNoQixpQkFBeUIsRUFDekIsRUFBRTtJQUNGLE9BQU8sR0FBRyxvQkFBWSx5Q0FBeUMsUUFBUSxXQUFXLGlCQUFpQixFQUFFLENBQUM7QUFDeEcsQ0FBQyxDQUFDO0FBRVcsUUFBQSxxQkFBcUIsR0FBRyxDQUNuQyxRQUFnQixFQUNoQixVQUFzQixFQUN0QixFQUFFO0lBQ0YsT0FBTyxHQUFHLG9CQUFZLHdCQUF3QixVQUFVLG9CQUFvQixRQUFRLFNBQVMsUUFBUSxFQUFFLENBQUM7QUFDMUcsQ0FBQyxDQUFDO0FBRVcsUUFBQSx1QkFBdUIsR0FBRyxDQUNyQyxRQUFnQixFQUNoQixPQUFlLEVBQ2YsWUFBb0IsRUFDcEIsVUFBc0IsRUFDdEIsS0FBSyxHQUFHLENBQUMsRUFDVCxFQUFFO0lBQ0YsT0FBTyxHQUFHLG9CQUFZLHdCQUF3QixVQUFVLHNCQUFzQixRQUFRLE9BQU8sWUFBWSxVQUFVLEtBQUssU0FBUyxPQUFPLEVBQUUsQ0FBQztBQUM3SSxDQUFDLENBQUM7QUFFVyxRQUFBLDRCQUE0QixHQUFHLENBQzFDLFFBQWdCLEVBQ2hCLFVBQXNCLEVBQ3RCLEVBQUU7SUFDRixPQUFPLEdBQUcsb0JBQVksd0JBQXdCLFVBQVUsb0JBQW9CLFFBQVEsU0FBUyxRQUFRLEVBQUUsQ0FBQztBQUMxRyxDQUFDLENBQUM7QUFFVyxRQUFBLHFCQUFxQixHQUFHLENBQ25DLFFBQWdCLEVBQ2hCLFVBQWtCLEVBQ2xCLFVBQXNCLEVBQ3RCLEVBQUU7SUFDRixJQUFJLFVBQVUsS0FBSyxrQkFBVSxDQUFDLE9BQU8sRUFBRTtRQUNyQyxPQUFPLEdBQUcsb0JBQVksa0RBQWtELFFBQVEsT0FBTyxVQUFVLEVBQUUsQ0FBQztLQUNyRztTQUFNO1FBQ0wsT0FBTyxHQUFHLG9CQUFZLG9EQUFvRCxRQUFRLE9BQU8sVUFBVSxFQUFFLENBQUM7S0FDdkc7QUFDSCxDQUFDLENBQUM7QUFFVyxRQUFBLDBCQUEwQixHQUFHLEdBQUcsRUFBRTtJQUM3QyxNQUFNLElBQUksR0FBRyxJQUFJLG1CQUFRLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNqQyxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVXLFFBQUEsZ0JBQWdCLEdBQUcsR0FBRyxFQUFFO0lBQ25DLE9BQU8sR0FBRyxvQkFBWSx5QkFBeUIsQ0FBQztBQUNsRCxDQUFDLENBQUM7QUFFVyxRQUFBLGNBQWMsR0FBRyxDQUFDLE1BQWMsRUFBRSxFQUFFO0lBQy9DLE9BQU8sR0FBRyx3QkFBZ0Isa0NBQWtDLE1BQU0sRUFBRSxDQUFDO0FBQ3ZFLENBQUMsQ0FBQztBQUVXLFFBQUEsa0JBQWtCLEdBQUcsQ0FDaEMsU0FBaUIsRUFDakIsT0FBZSxFQUNmLFFBQVEsR0FBRyxLQUFLLEVBQ2hCLFlBQVksR0FBRyxTQUFTLEVBQ3hCLEVBQUU7SUFDRixPQUFPLEdBQUcsd0JBQWdCLGtCQUN4QixRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FDckIsMEJBQTBCLFNBQVMsZUFBZSxPQUFPLGlCQUFpQixZQUFZLEVBQUUsQ0FBQztBQUMzRixDQUFDLENBQUMifQ==