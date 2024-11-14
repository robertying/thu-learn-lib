import { CalendarEvent, CommentItem, ContentType, CourseContent, CourseInfo, CourseType, Discussion, FavoriteItem, File, FileCategory, HelperConfig, Homework, HomeworkTA, IHomeworkSubmitAttachment, Language, Notification, Questionnaire, Question, SemesterInfo, UserInfo } from './types';
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
    /** manually set CSRF token (useful when you want to reuse previous token) */
    setCSRFToken(csrfToken: string): void;
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
    /** Get file categories of the specified course. */
    getFileCategoryList(courseID: string, courseType?: CourseType): Promise<FileCategory[]>;
    /**
     * Get all files of the specified category of the specified course.
     * Note: this cannot get correct `visitCount` and `downloadCount` for student
     */
    getFileListByCategory(courseID: string, categoryId: string, courseType?: CourseType): Promise<File[]>;
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
    /**
     * Get all questionnaires （课程问卷/QNR） of the specified course.
     */
    getQuestionnaireList(courseID: string): Promise<Questionnaire[]>;
    private getQuestionnaireListAtUrl;
    private getQuestionnaireDetail;
    /**
     * Add an item to favorites. (收藏)
     */
    addToFavorites(type: ContentType, id: string): Promise<void>;
    /**
     * Remove an item from favorites. (取消收藏)
     */
    removeFromFavorites(id: string): Promise<void>;
    /**
     * Get favorites. (我的收藏)
     * If `courseID` or `type` is specified, only return favorites of that course or type.
     */
    getFavorites(courseID?: string, type?: ContentType): Promise<FavoriteItem[]>;
    /**
     * Pin a favorite item. (置顶)
     */
    pinFavoriteItem(id: string): Promise<void>;
    /**
     * Unpin a favorite item. (取消置顶)
     */
    unpinFavoriteItem(id: string): Promise<void>;
    /**
     * Set a comment. (备注)
     * Set an empty string to remove the comment.
     */
    setComment(type: ContentType, id: string, content: string): Promise<void>;
    /**
     * Get comments. (我的备注)
     * If `courseID` or `type` is specified, only return favorites of that course or type.
     */
    getComments(courseID?: string, type?: ContentType): Promise<CommentItem[]>;
    sortCourses(courseIDs: string[]): Promise<void>;
    private getHomeworkListAtUrl;
    private parseNotificationDetail;
    private parseHomeworkDetail;
    private parseHomeworkFile;
    private parseDiscussionBase;
    submitHomework(id: string, content?: string, attachment?: IHomeworkSubmitAttachment, removeAttachment?: boolean): Promise<undefined>;
    setLanguage(lang: Language): Promise<void>;
    getCurrentLanguage(): Language;
}
export * from './types';
//# sourceMappingURL=index.d.ts.map