export declare type Fetch = <Args extends any[]>(...args: Args) => Promise<any>;
export declare type Credential = {
    username: string;
    password: string;
};
export declare type CredentialProvider = () => Credential | Promise<Credential>;
export declare type HelperConfig = {
    provider?: CredentialProvider;
    cookieJar?: any;
};
export declare enum FailReason {
    NO_CREDENTIAL = "no credential provided",
    ERROR_FETCH_FROM_ID = "could not fetch ticket from id.tsinghua.edu.cn",
    BAD_CREDENTIAL = "bad credential",
    ERROR_ROAMING = "could not roam to learn.tsinghua.edu.cn",
    NOT_LOGGED_IN = "not logged in or login timeout",
    NOT_IMPLEMENTED = "not implemented",
    INVALID_RESPONSE = "invalid response"
}
export interface ApiError {
    reason: FailReason;
    extra?: any;
}
export declare enum SemesterType {
    FALL = "\u79CB\u5B63\u5B66\u671F",
    SPRING = "\u6625\u5B63\u5B66\u671F",
    SUMMER = "\u590F\u5B63\u5B66\u671F",
    UNKNOWN = ""
}
export declare enum ContentType {
    NOTIFICATION = "notification",
    FILE = "file",
    HOMEWORK = "homework",
    DISCUSSION = "discussion",
    QUESTION = "question"
}
interface ISemesterInfo {
    id: string;
    startDate: string;
    endDate: string;
    startYear: number;
    endYear: number;
    type: SemesterType;
}
export declare type SemesterInfo = ISemesterInfo;
export declare enum CourseType {
    STUDENT = "student",
    TEACHER = "teacher"
}
interface ICourseInfo {
    id: string;
    name: string;
    englishName: string;
    timeAndLocation: string[];
    url: string;
    teacherName: string;
    teacherNumber: string;
    courseNumber: string;
    courseIndex: number;
    courseType: CourseType;
}
export declare type CourseInfo = ICourseInfo;
export interface INotification {
    id: string;
    title: string;
    content: string;
    hasRead: boolean;
    url: string;
    markedImportant: boolean;
    publishTime: string;
    publisher: string;
    attachmentName?: string;
}
export interface INotificationDetail {
    attachmentUrl?: string;
}
export declare type Notification = INotification & INotificationDetail;
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
}
export declare type File = IFile;
export interface IHomeworkStatus {
    submitted: boolean;
    graded: boolean;
}
export interface IHomework extends IHomeworkStatus {
    id: string;
    studentHomeworkId: string;
    title: string;
    deadline: string;
    url: string;
    submitUrl: string;
    submitTime?: string;
    submittedAttachmentUrl?: string;
    grade?: number;
    /** some homework has levels but not grades, like A/B/.../F */
    gradeLevel?: string;
    gradeTime?: string;
    graderName?: string;
    gradeContent?: string;
}
export interface IHomeworkDetail {
    description?: string;
    attachmentName?: string;
    attachmentUrl?: string;
    answerContent?: string;
    answerAttachmentName?: string;
    answerAttachmentUrl?: string;
    submittedContent?: string;
    submittedAttachmentName?: string;
    gradeAttachmentName?: string;
    gradeAttachmentUrl?: string;
}
export declare type Homework = IHomework & IHomeworkDetail;
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
export declare type Discussion = IDiscussion;
interface IQuestion extends IDiscussionBase {
    url: string;
    question: string;
}
export declare type Question = IQuestion;
export declare type Content = Notification | File | Homework | Discussion | Question;
interface ICourseContent {
    [id: string]: Content[];
}
export declare type CourseContent = ICourseContent;
export interface CalendarEvent {
    location: string;
    status: string;
    startTime: string;
    endTime: string;
    date: string;
    courseName: string;
}
export {};
