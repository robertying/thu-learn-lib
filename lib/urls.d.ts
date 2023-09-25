import FormData from "form-data";
import { ContentType, CourseType } from "./types";
export declare const LEARN_PREFIX = "https://learn.tsinghua.edu.cn";
export declare const REGISTRAR_PREFIX = "https://zhjw.cic.tsinghua.edu.cn";
export declare const ID_LOGIN: () => string;
export declare const ID_LOGIN_FORM_DATA: (username: string, password: string) => FormData;
export declare const LEARN_AUTH_ROAM: (ticket: string) => string;
export declare const LEARN_LOGOUT: () => string;
export declare const LEARN_HOMEPAGE: (courseType: CourseType) => "https://learn.tsinghua.edu.cn/f/wlxt/index/course/student/" | "https://learn.tsinghua.edu.cn/f/wlxt/index/course/teacher/";
export declare const LEARN_AVATAR: (zjh: string) => string;
export declare const LEARN_STUDENT_COURSE_LIST_PAGE: () => string;
export declare const LEARN_SEMESTER_LIST: () => string;
export declare const LEARN_CURRENT_SEMESTER: () => string;
export declare const LEARN_COURSE_LIST: (semester: string, courseType: CourseType, lang: "en" | "zh") => string;
export declare const LEARN_COURSE_URL: (courseID: string, courseType: CourseType) => string;
export declare const LEARN_COURSE_TIME_LOCATION: (courseID: string) => string;
export declare const LEARN_TEACHER_COURSE_URL: (courseID: string) => string;
export declare const LEARN_FILE_LIST: (courseID: string, courseType: CourseType) => string;
export declare const LEARN_FILE_DOWNLOAD: (fileID: string, courseType: CourseType, courseID: string) => string;
export declare const LEARN_FILE_PREVIEW: (type: ContentType, fileID: string, courseType: CourseType, firstPageOnly?: boolean) => string;
export declare const LEARN_NOTIFICATION_LIST: (courseID: string, courseType: CourseType) => string;
export declare const LEARN_NOTIFICATION_DETAIL: (courseID: string, notificationID: string, courseType: CourseType) => string;
export declare const LEARN_HOMEWORK_LIST_NEW: (courseID: string) => string;
export declare const LEARN_HOMEWORK_LIST_SUBMITTED: (courseID: string) => string;
export declare const LEARN_HOMEWORK_LIST_GRADED: (courseID: string) => string;
export declare const LEARN_NOTIFICATION_EDIT: (courseType: CourseType) => string;
export declare const LEARN_HOMEWORK_LIST_SOURCE: (courseID: string) => {
    url: string;
    status: {
        submitted: boolean;
        graded: boolean;
    };
}[];
export declare const LEARN_HOMEWORK_DETAIL: (courseID: string, homeworkID: string, studentHomeworkID: string) => string;
export declare const LEARN_HOMEWORK_DOWNLOAD: (courseID: string, attachmentID: string) => string;
export declare const LEARN_HOMEWORK_SUBMIT: (courseID: string, studentHomeworkID: string) => string;
export declare const LEARN_DISCUSSION_LIST: (courseID: string, courseType: CourseType) => string;
export declare const LEARN_DISCUSSION_DETAIL: (courseID: string, boardID: string, discussionID: string, courseType: CourseType, tabId?: number) => string;
export declare const LEARN_QUESTION_LIST_ANSWERED: (courseID: string, courseType: CourseType) => string;
export declare const LEARN_QUESTION_DETAIL: (courseID: string, questionID: string, courseType: CourseType) => string;
export declare const REGISTRAR_TICKET_FORM_DATA: () => FormData;
export declare const REGISTRAR_TICKET: () => string;
export declare const REGISTRAR_AUTH: (ticket: string) => string;
export declare const REGISTRAR_CALENDAR: (startDate: string, endDate: string, graduate?: boolean, callbackName?: string) => string;
