import { CookieJar } from 'tough-cookie';

type Fetch = typeof globalThis.fetch;
type Credential = {
    username?: string;
    password?: string;
};
type CredentialProvider = () => Credential | Promise<Credential>;
type HelperConfig = {
    provider?: CredentialProvider;
    fetch?: Fetch;
    cookieJar?: CookieJar;
    generatePreviewUrlForFirstPage?: boolean;
};
declare enum FailReason {
    NO_CREDENTIAL = "no credential provided",
    ERROR_FETCH_FROM_ID = "could not fetch ticket from id.tsinghua.edu.cn",
    BAD_CREDENTIAL = "bad credential",
    ERROR_ROAMING = "could not roam to learn.tsinghua.edu.cn",
    NOT_LOGGED_IN = "not logged in or login timeout",
    NOT_IMPLEMENTED = "not implemented",
    INVALID_RESPONSE = "invalid response",
    UNEXPECTED_STATUS = "unexpected status",
    OPERATION_FAILED = "operation failed"
}
interface ApiError {
    reason: FailReason;
    extra?: unknown;
}
declare enum SemesterType {
    FALL = "fall",
    SPRING = "spring",
    SUMMER = "summer",
    UNKNOWN = ""
}
declare enum ContentType {
    NOTIFICATION = "notification",
    FILE = "file",
    HOMEWORK = "homework",
    DISCUSSION = "discussion",
    QUESTION = "question",
    QUESTIONNAIRE = "questionnaire"
}
interface IUserInfo {
    name: string;
    department: string;
}
type UserInfo = IUserInfo;
interface ISemesterInfo {
    id: string;
    startDate: Date;
    endDate: Date;
    startYear: number;
    endYear: number;
    type: SemesterType;
}
type SemesterInfo = ISemesterInfo;
declare enum CourseType {
    STUDENT = "student",
    TEACHER = "teacher"
}
interface ICourseInfo {
    id: string;
    name: string;
    chineseName: string;
    englishName: string;
    timeAndLocation: string[];
    url: string;
    teacherName: string;
    teacherNumber: string;
    courseNumber: string;
    courseIndex: number;
    courseType: CourseType;
}
type CourseInfo = ICourseInfo;
interface IRemoteFile {
    id: string;
    name: string;
    downloadUrl: string;
    previewUrl: string;
    size: string;
}
type RemoteFile = IRemoteFile;
interface INotification {
    id: string;
    title: string;
    content: string;
    hasRead: boolean;
    url: string;
    markedImportant: boolean;
    publishTime: Date;
    publisher: string;
    expireTime?: Date;
    isFavorite: boolean;
    comment?: string;
}
interface INotificationDetail {
    attachment?: RemoteFile;
}
type Notification = INotification & INotificationDetail;
interface IFileCategory {
    id: string;
    title: string;
    creationTime: Date;
}
type FileCategory = IFileCategory;
interface IFile {
    /** previously `id2` */
    id: string;
    /** previously `id` */
    fileId: string;
    /** note: will be unset when calling `getFileListByCategory` */
    category?: FileCategory;
    /** size in byte */
    rawSize: number;
    /** inaccurate size description (like '1M') */
    size: string;
    title: string;
    description: string;
    uploadTime: Date;
    publishTime: Date;
    downloadUrl: string;
    /** preview is not supported on all types of files, check before use */
    previewUrl: string;
    isNew: boolean;
    markedImportant: boolean;
    visitCount: number;
    downloadCount: number;
    fileType: string;
    /** for compatibility */
    remoteFile: RemoteFile;
    /** could not get favorite or comment info when using `getFileList` or in TA mode */
    isFavorite?: boolean;
    comment?: string;
}
type File = IFile;
interface IHomeworkStatus {
    submitted: boolean;
    graded: boolean;
}
declare enum HomeworkGradeLevel {
    /** 已阅 */
    CHECKED = "checked",
    A_PLUS = "A+",
    A = "A",
    A_MINUS = "A-",
    B_PLUS = "B+",
    /** 优秀 */
    DISTINCTION = "distinction",
    B = "B",
    B_MINUS = "B-",
    C_PLUS = "C+",
    C = "C",
    C_MINUS = "C-",
    G = "G",
    D_PLUS = "D+",
    D = "D",
    /** 免课 */
    EXEMPTED_COURSE = "exempted course",
    P = "P",
    EX = "EX",
    /** 免修 */
    EXEMPTION = "exemption",
    /** 通过 */
    PASS = "pass",
    /** 不通过 */
    FAILURE = "failure",
    W = "W",
    I = "I",
    /** 缓考 */
    INCOMPLETE = "incomplete",
    NA = "NA",
    F = "F"
}
interface IHomework extends IHomeworkStatus {
    id: string;
    /** @deprecated use `id` */
    studentHomeworkId: string;
    baseId: string;
    title: string;
    deadline: Date;
    lateSubmissionDeadline?: Date;
    url: string;
    completionType: HomeworkCompletionType;
    submissionType: HomeworkSubmissionType;
    submitUrl: string;
    submitTime?: Date;
    isLateSubmission: boolean;
    grade?: number;
    /** some homework has levels but not grades, like A/B/.../F */
    gradeLevel?: HomeworkGradeLevel;
    gradeTime?: Date;
    graderName?: string;
    gradeContent?: string;
    isFavorite: boolean;
    favoriteTime?: Date;
    comment?: string;
    excellentHomeworkList?: ExcellentHomework[];
}
interface IHomeworkDetail {
    description?: string;
    /** attachment from teacher */
    attachment?: RemoteFile;
    /** answer from teacher */
    answerContent?: string;
    answerAttachment?: RemoteFile;
    /** submitted content from student */
    submittedContent?: string;
    submittedAttachment?: RemoteFile;
    /** grade from teacher */
    gradeAttachment?: RemoteFile;
}
type Homework = IHomework & IHomeworkDetail;
declare enum HomeworkCompletionType {
    INDIVIDUAL = 1,
    GROUP = 2
}
declare enum HomeworkSubmissionType {
    WEB_LEARNING = 2,
    OFFLINE = 0
}
interface IExcellentHomework {
    id: string;
    baseId: string;
    title: string;
    url: string;
    completionType: HomeworkCompletionType;
    author: {
        id: string;
        name: string;
        anonymous: boolean;
    };
}
type ExcellentHomework = IExcellentHomework & IHomeworkDetail;
interface IHomeworkTA {
    id: string;
    index: number;
    title: string;
    description: string;
    publisherId: string;
    publishTime: Date;
    startTime: Date;
    deadline: Date;
    lateSubmissionDeadline?: Date;
    url: string;
    completionType: HomeworkCompletionType;
    submissionType: HomeworkSubmissionType;
    gradedCount: number;
    submittedCount: number;
    unsubmittedCount: number;
}
type HomeworkTA = IHomeworkTA;
interface IHomeworkSubmitAttachment {
    filename: string;
    content: Blob;
}
interface IDiscussionBase {
    id: string;
    title: string;
    publisherName: string;
    publishTime: Date;
    lastReplierName: string;
    lastReplyTime: Date;
    visitCount: number;
    replyCount: number;
    isFavorite: boolean;
    comment?: string;
}
interface IDiscussion extends IDiscussionBase {
    url: string;
    boardId: string;
}
type Discussion = IDiscussion;
interface IQuestion extends IDiscussionBase {
    url: string;
    question: string;
}
type Question = IQuestion;
declare enum QuestionnaireDetailType {
    SINGLE = "dnx",
    MULTI = "dox",
    TEXT = "wd"
}
interface QuestionnaireDetail {
    id: string;
    index: number;
    type: QuestionnaireDetailType;
    required: boolean;
    title: string;
    score?: number;
    options?: {
        id: string;
        index: number;
        title: string;
    }[];
}
declare enum QuestionnaireType {
    VOTE = "tp",
    FORM = "tb",
    SURVEY = "wj"
}
interface IQuestionnaire {
    id: string;
    type: QuestionnaireType;
    title: string;
    startTime: Date;
    endTime: Date;
    uploadTime: Date;
    uploaderId: string;
    uploaderName: string;
    submitTime?: Date;
    isFavorite: boolean;
    comment?: string;
    url: string;
    detail: QuestionnaireDetail[];
}
type Questionnaire = IQuestionnaire;
type ContentTypeMap = {
    [ContentType.NOTIFICATION]: Notification;
    [ContentType.FILE]: File;
    [ContentType.HOMEWORK]: Homework;
    [ContentType.DISCUSSION]: Discussion;
    [ContentType.QUESTION]: Question;
    [ContentType.QUESTIONNAIRE]: Questionnaire;
};
interface ICourseContent<T extends ContentType> {
    [id: string]: ContentTypeMap[T][];
}
type CourseContent<T extends ContentType = ContentType> = ICourseContent<T>;
interface IFavoriteItem {
    id: string;
    type: ContentType;
    title: string;
    time: Date;
    state: string;
    /** extra message. For homework, this will be deadline (plus score if graded). It's too flexible and hard to parse so we leave it as is. */
    extra?: string;
    semesterId: string;
    courseId: string;
    pinned: boolean;
    pinnedTime?: Date;
    comment?: string;
    addedTime: Date;
    /** for reference */
    itemId: string;
}
type FavoriteItem = IFavoriteItem;
interface ICommentItem {
    id: string;
    type: ContentType;
    content: string;
    contentHTML: string;
    title: string;
    semesterId: string;
    courseId: string;
    commentTime: Date;
    /** for reference */
    itemId: string;
}
type CommentItem = ICommentItem;
interface CalendarEvent {
    location: string;
    status: string;
    startTime: string;
    endTime: string;
    date: string;
    courseName: string;
}
declare enum Language {
    ZH = "zh",
    EN = "en"
}

/** add CSRF token to any request URL as parameters */
declare const addCSRFTokenToUrl: (url: string, token: string) => string;
/** the main helper class */
declare class Learn2018Helper {
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
    getCourseList(semesterID: string, courseType?: CourseType): Promise<CourseInfo[]>;
    /**
     * Get certain type of content of all specified courses.
     * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
     */
    getAllContents<T extends ContentType>(courseIDs: string[], type: T, courseType?: CourseType, allowFailure?: boolean): Promise<CourseContent<T>>;
    /** Get all notifications （课程公告） of the specified course. */
    getNotificationList(courseID: string, courseType?: CourseType): Promise<Notification[]>;
    private getNotificationListKind;
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
    private getExcellentHomeworkListByHomework;
    private parseNotificationDetail;
    private parseHomeworkAtUrl;
    private parseHomeworkFile;
    private parseDiscussionBase;
    submitHomework(id: string, content?: string, attachment?: IHomeworkSubmitAttachment, removeAttachment?: boolean): Promise<undefined>;
    setLanguage(lang: Language): Promise<void>;
    getCurrentLanguage(): Language;
}

export { type ApiError, type CalendarEvent, type CommentItem, ContentType, type ContentTypeMap, type CourseContent, type CourseInfo, CourseType, type Credential, type CredentialProvider, type Discussion, type ExcellentHomework, FailReason, type FavoriteItem, type Fetch, type File, type FileCategory, type HelperConfig, type Homework, HomeworkCompletionType, HomeworkGradeLevel, HomeworkSubmissionType, type HomeworkTA, type IDiscussionBase, type IExcellentHomework, type IHomework, type IHomeworkDetail, type IHomeworkStatus, type IHomeworkSubmitAttachment, type IHomeworkTA, type INotification, type INotificationDetail, type IQuestionnaire, Language, Learn2018Helper, type Notification, type Question, type Questionnaire, type QuestionnaireDetail, QuestionnaireDetailType, QuestionnaireType, type RemoteFile, type SemesterInfo, SemesterType, type UserInfo, addCSRFTokenToUrl };
