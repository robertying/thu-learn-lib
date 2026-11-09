import type { CookieJar } from 'tough-cookie';

export type Fetch = typeof globalThis.fetch;
export type Credential = {
  username?: string;
  password?: string;
  fingerPrint?: string;
  fingerGenPrint?: string;
  fingerGenPrint3?: string;
};
export type CredentialProvider = () => Credential | Promise<Credential>;
export type HelperConfig = {
  provider?: CredentialProvider;
  fetch?: Fetch;
  cookieJar?: CookieJar;
  generatePreviewUrlForFirstPage?: boolean;
  /** at most this many requests in flight at once, including login (default 6; `Infinity` for no limit) */
  maxConcurrentRequests?: number;
  /** milliseconds to wait for a response before rejecting with `FailReason.REQUEST_TIMEOUT` (default 60000; 0 for none) */
  requestTimeout?: number;
};

export enum FailReason {
  NO_CREDENTIAL = 'no credential provided',
  ERROR_FETCH_FROM_ID = 'could not fetch ticket from id.tsinghua.edu.cn',
  BAD_CREDENTIAL = 'bad credential',
  ERROR_ROAMING = 'could not roam to learn.tsinghua.edu.cn',
  NOT_LOGGED_IN = 'not logged in or login timeout',
  NOT_IMPLEMENTED = 'not implemented',
  INVALID_RESPONSE = 'invalid response',
  UNEXPECTED_STATUS = 'unexpected status',
  OPERATION_FAILED = 'operation failed',
  ERROR_SETTING_COOKIES = 'could not set cookies',
  REQUEST_TIMEOUT = 'request timed out',
  ERROR_REGISTRAR_AUTH = 'could not sign in to the registrar (zhjw.cic.tsinghua.edu.cn)',
}

export interface ApiError {
  reason: FailReason;
  extra?: unknown;
}

export enum SemesterType {
  FALL = 'fall',
  SPRING = 'spring',
  SUMMER = 'summer',
  UNKNOWN = '',
}

export enum ContentType {
  NOTIFICATION = 'notification',
  FILE = 'file',
  HOMEWORK = 'homework',
  DISCUSSION = 'discussion',
  QUESTION = 'question',
  QUESTIONNAIRE = 'questionnaire',
}

interface IUserInfo {
  name: string;
  /**
   * The department (for undergraduates, their 书院) as the homepage shows it, in the website language.
   * `''` when there is none, including in English for departments without an English name (the page says `none`).
   */
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

export enum CourseType {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

interface ICourseInfo {
  id: string;
  name: string;
  chineseName: string;
  englishName: string;
  /**
   * only with `getCourseList(..., { timeAndLocation: true })`, and left out for a course whose request failed;
   * see `getCourseTimeAndLocation`
   */
  timeAndLocation?: string[];
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
  expireTime?: string;
  isFavorite: boolean;
  comment?: string;
  /** name of the attachment, if the notice has one; fetch it with `getNotificationAttachment` */
  attachmentName?: string;
}

export interface INotificationDetail {
  attachment?: RemoteFile;
}

export type Notification = INotification & INotificationDetail;

interface IFileCategory {
  id: string;
  title: string;
  creationTime: Date;
}

export type FileCategory = IFileCategory;

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
  uploadTime: string;
  publishTime: string;
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

export type File = IFile;

export interface IHomeworkStatus {
  submitted: boolean;
  graded: boolean;
}

export enum HomeworkGradeLevel {
  /** 已阅 */
  CHECKED = 'checked',
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  /** 优秀 */
  DISTINCTION = 'distinction',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  G = 'G',
  D_PLUS = 'D+',
  D = 'D',
  /** 免课 */
  EXEMPTED_COURSE = 'exempted course',
  P = 'P',
  EX = 'EX',
  /** 免修 */
  EXEMPTION = 'exemption',
  /** 通过 */
  PASS = 'pass',
  /** 不通过 */
  FAILURE = 'failure',
  W = 'W',
  I = 'I',
  /** 缓考 */
  INCOMPLETE = 'incomplete',
  NA = 'NA',
  F = 'F',
}

export interface IHomework extends IHomeworkStatus {
  id: string;
  /** @deprecated use `id` */
  studentHomeworkId: string;
  baseId: string;
  title: string;
  deadline: string;
  lateSubmissionDeadline?: string;
  url: string;
  completionType: HomeworkCompletionType;
  submissionType: HomeworkSubmissionType;
  submitUrl: string;
  submitTime?: string;
  isLateSubmission: boolean;
  grade?: number;
  /** some homework has levels but not grades, like A/B/.../F */
  gradeLevel?: HomeworkGradeLevel;
  gradeTime?: string;
  graderName?: string;
  gradeContent?: string;
  isFavorite: boolean;
  favoriteTime?: string;
  comment?: string;
  excellentHomeworkList?: ExcellentHomework[];
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

export enum HomeworkCompletionType {
  INDIVIDUAL = 1,
  GROUP = 2,
}

export enum HomeworkSubmissionType {
  WEB_LEARNING = 2,
  OFFLINE = 0,
}

export interface IExcellentHomework {
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

export type ExcellentHomework = IExcellentHomework & IHomeworkDetail;

export interface IHomeworkTA {
  id: string;
  index: number;
  title: string;
  description: string;
  publisherId: string;
  publishTime: string;
  startTime: string;
  deadline: string;
  lateSubmissionDeadline?: string;
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

export interface IDiscussionBase {
  id: string;
  title: string;
  publisherName: string;
  publishTime: string;
  lastReplierName: string;
  lastReplyTime: string;
  visitCount: number;
  replyCount: number;
  isFavorite: boolean;
  comment?: string;
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

export enum QuestionnaireDetailType {
  SINGLE = 'dnx',
  MULTI = 'dox',
  TEXT = 'wd',
}

export interface QuestionnaireDetail {
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

export enum QuestionnaireType {
  VOTE = 'tp',
  FORM = 'tb',
  SURVEY = 'wj',
}

export interface IQuestionnaire {
  id: string;
  type: QuestionnaireType;
  title: string;
  startTime: string;
  endTime: string;
  uploadTime: string;
  uploaderId: string;
  uploaderName: string;
  submitTime?: string;
  isFavorite: boolean;
  comment?: string;
  url: string;
  /** the questions; only for the questionnaires `getQuestionnaireList`'s `details` selects (by default all) */
  detail?: QuestionnaireDetail[];
}

export type Questionnaire = IQuestionnaire;

/** which items get their extra per-item requests: none (default), all, or those the predicate accepts */
export type DetailSelector<T> = 'none' | 'all' | ((item: T) => boolean);

export interface CourseListOptions {
  /** fetch each course's time and location (one request per course; default false) */
  timeAndLocation?: boolean;
}

export interface HomeworkListOptions {
  /**
   * Which homework gets its detail (page + description JSON, 2 requests each); default `'none'`.
   * The same as calling `getHomeworkDetail` for those items.
   */
  details?: DetailSelector<IHomework>;
}

export interface NotificationListOptions {
  /**
   * Which notices with an attachment get it (1 request each); default `'none'`.
   * The same as calling `getNotificationAttachment` for those items.
   */
  attachments?: DetailSelector<INotification>;
}

export interface QuestionnaireListOptions {
  /**
   * Which questionnaires get their questions (`detail`, 1 request each); default `'all'` (unlike the other lists, for
   * compatibility). The same as calling `getQuestionnaireDetail` for those items.
   */
  details?: DetailSelector<IQuestionnaire>;
}

export interface AllContentsOptions<T extends ContentType> {
  courseType?: CourseType;
  /** homework or questionnaire `details`, or notification `attachments`, passed to each course's list */
  details?: T extends ContentType.HOMEWORK
    ? DetailSelector<IHomework>
    : T extends ContentType.NOTIFICATION
      ? DetailSelector<INotification>
      : T extends ContentType.QUESTIONNAIRE
        ? DetailSelector<IQuestionnaire>
        : never;
}

export interface AllContentsResult<T extends ContentType> {
  /** content of each course that succeeded */
  contents: CourseContent<T>;
  /** the error of each course that failed */
  errors: { [courseID: string]: unknown };
}

export type ContentTypeMap = {
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

export type CourseContent<T extends ContentType = ContentType> = ICourseContent<T>;

interface IFavoriteItem {
  id: string;
  type: ContentType;
  title: string;
  time: string;
  state: string;
  /** extra message. For homework, this will be deadline (plus score if graded). It's too flexible and hard to parse so we leave it as is. */
  extra?: string;
  semesterId: string;
  courseId: string;
  pinned: boolean;
  pinnedTime?: string;
  comment?: string;
  addedTime: string;
  /** for reference */
  itemId: string;
}

export type FavoriteItem = IFavoriteItem;

interface ICommentItem {
  id: string;
  type: ContentType;
  content: string;
  contentHTML: string;
  title: string;
  semesterId: string;
  courseId: string;
  commentTime: string;
  /** for reference */
  itemId: string;
}

export type CommentItem = ICommentItem;

export interface CalendarEvent {
  location: string;
  status: string;
  startTime: string;
  endTime: string;
  date: string;
  courseName: string;
}

export interface CalendarOptions {
  /** use the graduate calendar instead of the undergraduate one */
  graduate?: boolean;
}

/** an inclusive date range, in yyyymmdd format */
export interface CalendarRange {
  startDate: string;
  endDate: string;
}

export interface CalendarResult {
  /** events of every window that succeeded, in date order */
  events: CalendarEvent[];
  /** windows that failed even after a retry; empty when the whole range was fetched */
  failedRanges: CalendarRange[];
}

export enum Language {
  ZH = 'zh',
  EN = 'en',
}
