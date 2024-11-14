import type { CookieJar } from 'tough-cookie';
export type Fetch = typeof globalThis.fetch;
export type Credential = {
    username?: string;
    password?: string;
};
export type CredentialProvider = () => Credential | Promise<Credential>;
export type HelperConfig = {
    provider?: CredentialProvider;
    fetch?: Fetch;
    cookieJar?: CookieJar;
    generatePreviewUrlForFirstPage?: boolean;
};
export declare enum FailReason {
    NO_CREDENTIAL = "no credential provided",
    ERROR_FETCH_FROM_ID = "could not fetch ticket from id.tsinghua.edu.cn",
    BAD_CREDENTIAL = "bad credential",
    ERROR_ROAMING = "could not roam to learn.tsinghua.edu.cn",
    NOT_LOGGED_IN = "not logged in or login timeout",
    NOT_IMPLEMENTED = "not implemented",
    INVALID_RESPONSE = "invalid response",
    UNEXPECTED_STATUS = "unexpected status"
}
export interface ApiError {
    reason: FailReason;
    extra?: unknown;
}
export declare enum SemesterType {
    FALL = "fall",
    SPRING = "spring",
    SUMMER = "summer",
    UNKNOWN = ""
}
export declare enum ContentType {
    NOTIFICATION = "notification",
    FILE = "file",
    HOMEWORK = "homework",
    DISCUSSION = "discussion",
    QUESTION = "question"
}
interface IUserInfo {
    name: string;
    department: string;
}
export type UserInfo = IUserInfo;
interface ISemesterInfo {
    id: string;
    startDate: string;
    endDate: string;
    startYear: number;
    endYear: number;
    type: SemesterType;
}
export type SemesterInfo = ISemesterInfo;
export declare enum CourseType {
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
export type CourseInfo = ICourseInfo;
interface IRemoteFile {
    id: string;
    name: string;
    downloadUrl: string;
    previewUrl: string;
    size: string;
}
export type RemoteFile = IRemoteFile;
export interface INotification {
    id: string;
    title: string;
    content: string;
    hasRead: boolean;
    url: string;
    markedImportant: boolean;
    publishTime: string;
    publisher: string;
}
export interface INotificationDetail {
    attachment?: RemoteFile;
}
export type Notification = INotification & INotificationDetail;
interface IFile {
    id: string;
    /** size in byte */
    rawSize: number;
    /** inaccurate size description (like '1M') */
    size: string;
    title: string;
    description: string;
    uploadTime: string;
    /** for teachers, this url will not initiate download directly */
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
}
export type File = IFile;
export interface IHomeworkStatus {
    submitted: boolean;
    graded: boolean;
}
export declare enum HomeworkGradeLevel {
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
export interface IHomework extends IHomeworkStatus {
    id: string;
    studentHomeworkId: string;
    title: string;
    deadline: string;
    url: string;
    submitUrl: string;
    submitTime?: string;
    grade?: number;
    /** some homework has levels but not grades, like A/B/.../F */
    gradeLevel?: HomeworkGradeLevel;
    gradeTime?: string;
    graderName?: string;
    gradeContent?: string;
}
export interface IHomeworkDetail {
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
export type Homework = IHomework & IHomeworkDetail;
export declare enum HomeworkCompletionType {
    INDIVIDUA = 1,
    GRUOP = 2
}
export declare enum HomeworkSubmissionType {
    WEB_LEARNING = 2,
    OFFLINE = 0
}
export interface IHomeworkTA {
    id: string;
    index: number;
    title: string;
    description: string;
    publisherId: string;
    publishTime: string;
    startTime: string;
    deadline: string;
    url: string;
    completionType: HomeworkCompletionType;
    submissionType: HomeworkSubmissionType;
    gradedCount: number;
    submittedCount: number;
    unsubmittedCount: number;
}
export type HomeworkTA = IHomeworkTA;
export interface IHomeworkSubmitAttachment {
    filename: string;
    content: Blob;
}
export interface IHomeworkSubmitResult {
    result: 'success' | 'error';
    msg: string;
    object: unknown;
}
export interface IDiscussionBase {
    id: string;
    title: string;
    publisherName: string;
    publishTime: string;
    lastReplierName: string;
    lastReplyTime: string;
    visitCount: number;
    replyCount: number;
}
interface IDiscussion extends IDiscussionBase {
    url: string;
    boardId: string;
}
export type Discussion = IDiscussion;
interface IQuestion extends IDiscussionBase {
    url: string;
    question: string;
}
export type Question = IQuestion;
export type ContentTypeMap = {
    [ContentType.NOTIFICATION]: Notification;
    [ContentType.FILE]: File;
    [ContentType.HOMEWORK]: Homework;
    [ContentType.DISCUSSION]: Discussion;
    [ContentType.QUESTION]: Question;
};
interface ICourseContent<T extends ContentType> {
    [id: string]: ContentTypeMap[T][];
}
export type CourseContent<T extends ContentType> = ICourseContent<T>;
export interface CalendarEvent {
    location: string;
    status: string;
    startTime: string;
    endTime: string;
    date: string;
    courseName: string;
}
export declare enum Language {
    ZH = "zh",
    EN = "en"
}
export {};
//# sourceMappingURL=types.d.ts.map