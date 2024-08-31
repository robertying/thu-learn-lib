import { HelperConfig, ContentType, CourseContent, CourseInfo, Discussion, File, Homework, Notification, Question, SemesterInfo, CourseType, CalendarEvent, IHomeworkSubmitAttachment, IHomeworkSubmitResult, Language, HomeworkTA, UserInfo } from './types';
/** add CSRF token to any request URL as parameters */
export declare const addCSRFTokenToUrl: (url: string, token: string) => string;
/** the main helper class */
export declare class Learn2018Helper {
    #private;
    previewFirstPage: boolean;
    /** you can provide a CookieJar and / or CredentialProvider in the configuration */
    constructor(config?: HelperConfig);
    /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
    getCSRFToken(): string;
    /** login is necessary if you do not provide a `CredentialProvider` */
    login(username?: string, password?: string): Promise<void>;
    /**  logout (to make everyone happy) */
    logout(): Promise<void>;
    /** get user's name and department */
    getUserInfo(courseType?: CourseType): Promise<UserInfo>;
    /**
     * Get calendar items during the specified period (in yyyymmdd format).
     * @param startDate start date (inclusive)
     * @param endDate end date (inclusive)
     * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
     * and we currently observe a limit of no more that 29 days.
     * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
     */
    getCalendar(startDate: string, endDate: string, graduate?: boolean): Promise<CalendarEvent[]>;
    getSemesterIdList(): Promise<string[]>;
    getCurrentSemester(): Promise<SemesterInfo>;
    /** get all courses in the specified semester */
    getCourseList(semesterID: string, courseType?: CourseType, lang?: Language): Promise<CourseInfo[]>;
    /**
     * Get certain type of content of all specified courses.
     * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
     */
    getAllContents<T extends ContentType>(courseIDs: string[], type: T, courseType?: CourseType, allowFailure?: boolean): Promise<CourseContent<T>>;
    /** Get all notifications （课程公告） of the specified course. */
    getNotificationList(courseID: string, courseType?: CourseType): Promise<Notification[]>;
    /** Get all files （课程文件） of the specified course. */
    getFileList(courseID: string, courseType?: CourseType): Promise<File[]>;
    /** Get all homeworks （课程作业） of the specified course. */
    getHomeworkList(courseID: string): Promise<Homework[]>;
    getHomeworkList(courseID: string, courseType: CourseType.STUDENT): Promise<Homework[]>;
    getHomeworkList(courseID: string, courseType: CourseType.TEACHER): Promise<HomeworkTA[]>;
    /** Get all discussions （课程讨论） of the specified course. */
    getDiscussionList(courseID: string, courseType?: CourseType): Promise<Discussion[]>;
    /**
     * Get all notifications （课程答疑） of the specified course.
     * The student version supports only answered questions, while the teacher version supports all questions.
     */
    getAnsweredQuestionList(courseID: string, courseType?: CourseType): Promise<Question[]>;
    private getHomeworkListAtUrl;
    private parseNotificationDetail;
    private parseHomeworkDetail;
    private parseHomeworkFile;
    private parseDiscussionBase;
    submitHomework(studentHomeworkID: string, content?: string, attachment?: IHomeworkSubmitAttachment, removeAttachment?: boolean): Promise<IHomeworkSubmitResult>;
    setLanguage(lang: Language): Promise<void>;
    getCurrentLanguage(): Language;
}
export * from './types';
//# sourceMappingURL=index.d.ts.map