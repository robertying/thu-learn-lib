import type { CookieJar } from 'tough-cookie';

/**
 * A time as an ISO 8601 string in Beijing time with its offset, e.g. `2026-11-07T18:28:00+08:00`: `new Date(t)` and
 * `dayjs(t)` read it as the right moment in any time zone. (A string the server sent in another shape is passed on as
 * it is.)
 */
export type ServerTime = string;

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

export const FailReason = {
  NO_CREDENTIAL: 'no credential provided',
  ERROR_FETCH_FROM_ID: 'could not fetch ticket from id.tsinghua.edu.cn',
  BAD_CREDENTIAL: 'bad credential',
  ERROR_ROAMING: 'could not roam to learn.tsinghua.edu.cn',
  NOT_LOGGED_IN: 'not logged in or login timeout',
  NOT_IMPLEMENTED: 'not implemented',
  INVALID_RESPONSE: 'invalid response',
  UNEXPECTED_STATUS: 'unexpected status',
  OPERATION_FAILED: 'operation failed',
  ERROR_SETTING_COOKIES: 'could not set cookies',
  REQUEST_TIMEOUT: 'request timed out',
  /** a request got no answer at all (no connection, DNS or TLS failure, connection reset); the error is in `extra` */
  NETWORK_ERROR: 'network error',
  ERROR_REGISTRAR_AUTH: 'could not sign in to the registrar (zhjw.cic.tsinghua.edu.cn)',
} as const;
export type FailReason = (typeof FailReason)[keyof typeof FailReason];
// lets `FailReason.MEMBER` name a member's type, as it did when this was an enum
export declare namespace FailReason {
  type NO_CREDENTIAL = typeof FailReason.NO_CREDENTIAL;
  type ERROR_FETCH_FROM_ID = typeof FailReason.ERROR_FETCH_FROM_ID;
  type BAD_CREDENTIAL = typeof FailReason.BAD_CREDENTIAL;
  type ERROR_ROAMING = typeof FailReason.ERROR_ROAMING;
  type NOT_LOGGED_IN = typeof FailReason.NOT_LOGGED_IN;
  type NOT_IMPLEMENTED = typeof FailReason.NOT_IMPLEMENTED;
  type INVALID_RESPONSE = typeof FailReason.INVALID_RESPONSE;
  type UNEXPECTED_STATUS = typeof FailReason.UNEXPECTED_STATUS;
  type OPERATION_FAILED = typeof FailReason.OPERATION_FAILED;
  type ERROR_SETTING_COOKIES = typeof FailReason.ERROR_SETTING_COOKIES;
  type REQUEST_TIMEOUT = typeof FailReason.REQUEST_TIMEOUT;
  type NETWORK_ERROR = typeof FailReason.NETWORK_ERROR;
  type ERROR_REGISTRAR_AUTH = typeof FailReason.ERROR_REGISTRAR_AUTH;
}

export interface ApiError {
  reason: FailReason;
  extra?: unknown;
}

export const SemesterType = {
  FALL: 'fall',
  SPRING: 'spring',
  SUMMER: 'summer',
  UNKNOWN: '',
} as const;
export type SemesterType = (typeof SemesterType)[keyof typeof SemesterType];
// lets `SemesterType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace SemesterType {
  type FALL = typeof SemesterType.FALL;
  type SPRING = typeof SemesterType.SPRING;
  type SUMMER = typeof SemesterType.SUMMER;
  type UNKNOWN = typeof SemesterType.UNKNOWN;
}

export const ContentType = {
  NOTIFICATION: 'notification',
  FILE: 'file',
  HOMEWORK: 'homework',
  DISCUSSION: 'discussion',
  QUESTION: 'question',
  QUESTIONNAIRE: 'questionnaire',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];
// lets `ContentType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace ContentType {
  type NOTIFICATION = typeof ContentType.NOTIFICATION;
  type FILE = typeof ContentType.FILE;
  type HOMEWORK = typeof ContentType.HOMEWORK;
  type DISCUSSION = typeof ContentType.DISCUSSION;
  type QUESTION = typeof ContentType.QUESTION;
  type QUESTIONNAIRE = typeof ContentType.QUESTIONNAIRE;
}

export interface UserInfo {
  name: string;
  /**
   * The department (for undergraduates, their 书院) as the homepage shows it, in the website language.
   * `''` when there is none, including in English for departments without an English name (the page says `none`).
   */
  department: string;
}

export interface SemesterInfo {
  id: string;
  /** the term's first day, a Beijing date (`YYYY-MM-DD`) */
  startDate: string;
  /** the term's last day, a Beijing date (`YYYY-MM-DD`) */
  endDate: string;
  startYear: number;
  endYear: number;
  type: SemesterType;
}

export const CourseType = {
  STUDENT: 'student',
  TEACHER: 'teacher',
} as const;
export type CourseType = (typeof CourseType)[keyof typeof CourseType];
// lets `CourseType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace CourseType {
  type STUDENT = typeof CourseType.STUDENT;
  type TEACHER = typeof CourseType.TEACHER;
}

export interface CourseInfo {
  id: string;
  name: string;
  chineseName: string;
  englishName: string;
  /**
   * only with `getCourseList(..., { timeAndLocation: true })`, and left out for a course whose request failed;
   * see `getCourseTimeAndLocation`. Read an entry with `parseCourseMeeting`.
   */
  timeAndLocation?: string[];
  url: string;
  teacherName: string;
  teacherNumber: string;
  courseNumber: string;
  courseIndex: number;
  courseType: CourseType;
}

export interface RemoteFile {
  id: string;
  name: string;
  downloadUrl: string;
  previewUrl: string;
  size: string;
}

/** a course notification as the list gives it, without its attachment */
export interface CourseNotificationBase {
  id: string;
  title: string;
  content: string;
  hasRead: boolean;
  url: string;
  markedImportant: boolean;
  publishTime: ServerTime;
  publisher: string;
  expireTime?: ServerTime;
  isFavorite: boolean;
  comment?: string;
  /** name of the attachment, if the notice has one; fetch it with `getNotificationAttachment` */
  attachmentName?: string;
}

export interface CourseNotificationDetail {
  attachment?: RemoteFile;
}

export type CourseNotification = CourseNotificationBase & CourseNotificationDetail;

export interface FileCategory {
  id: string;
  title: string;
  creationTime: ServerTime;
}

export interface CourseFile {
  /** the id of this file entry in the course (`kjxxid`) */
  id: string;
  /** the id of the stored file (`wjid`), which the download and preview URLs use */
  fileId: string;
  /** note: will be unset when calling `getFileListByCategory` */
  category?: FileCategory;
  /** size in byte */
  rawSize: number;
  /** inaccurate size description (like '1M') */
  size: string;
  title: string;
  description: string;
  uploadTime: ServerTime;
  publishTime: ServerTime;
  downloadUrl: string;
  /** preview is not supported on all types of files, check before use */
  previewUrl: string;
  isNew: boolean;
  markedImportant: boolean;
  visitCount: number;
  downloadCount: number;
  fileType: string;
  /** the same file as a `RemoteFile`, the shape attachments have */
  remoteFile: RemoteFile;
  /** could not get favorite or comment info when using `getFileList` or in TA mode */
  isFavorite?: boolean;
  comment?: string;
}

export interface HomeworkStatus {
  submitted: boolean;
  graded: boolean;
}

export const HomeworkGradeLevel = {
  /** 已阅 */
  CHECKED: 'checked',
  A_PLUS: 'A+',
  A: 'A',
  A_MINUS: 'A-',
  B_PLUS: 'B+',
  /** 优秀 */
  DISTINCTION: 'distinction',
  B: 'B',
  B_MINUS: 'B-',
  C_PLUS: 'C+',
  C: 'C',
  C_MINUS: 'C-',
  G: 'G',
  D_PLUS: 'D+',
  D: 'D',
  /** 免课 */
  EXEMPTED_COURSE: 'exempted course',
  P: 'P',
  EX: 'EX',
  /** 免修 */
  EXEMPTION: 'exemption',
  /** 通过 */
  PASS: 'pass',
  /** 不通过 */
  FAILURE: 'failure',
  W: 'W',
  I: 'I',
  /** 缓考 */
  INCOMPLETE: 'incomplete',
  NA: 'NA',
  F: 'F',
} as const;
export type HomeworkGradeLevel = (typeof HomeworkGradeLevel)[keyof typeof HomeworkGradeLevel];
// lets `HomeworkGradeLevel.MEMBER` name a member's type, as it did when this was an enum
export declare namespace HomeworkGradeLevel {
  type CHECKED = typeof HomeworkGradeLevel.CHECKED;
  type A_PLUS = typeof HomeworkGradeLevel.A_PLUS;
  type A = typeof HomeworkGradeLevel.A;
  type A_MINUS = typeof HomeworkGradeLevel.A_MINUS;
  type B_PLUS = typeof HomeworkGradeLevel.B_PLUS;
  type DISTINCTION = typeof HomeworkGradeLevel.DISTINCTION;
  type B = typeof HomeworkGradeLevel.B;
  type B_MINUS = typeof HomeworkGradeLevel.B_MINUS;
  type C_PLUS = typeof HomeworkGradeLevel.C_PLUS;
  type C = typeof HomeworkGradeLevel.C;
  type C_MINUS = typeof HomeworkGradeLevel.C_MINUS;
  type G = typeof HomeworkGradeLevel.G;
  type D_PLUS = typeof HomeworkGradeLevel.D_PLUS;
  type D = typeof HomeworkGradeLevel.D;
  type EXEMPTED_COURSE = typeof HomeworkGradeLevel.EXEMPTED_COURSE;
  type P = typeof HomeworkGradeLevel.P;
  type EX = typeof HomeworkGradeLevel.EX;
  type EXEMPTION = typeof HomeworkGradeLevel.EXEMPTION;
  type PASS = typeof HomeworkGradeLevel.PASS;
  type FAILURE = typeof HomeworkGradeLevel.FAILURE;
  type W = typeof HomeworkGradeLevel.W;
  type I = typeof HomeworkGradeLevel.I;
  type INCOMPLETE = typeof HomeworkGradeLevel.INCOMPLETE;
  type NA = typeof HomeworkGradeLevel.NA;
  type F = typeof HomeworkGradeLevel.F;
}

/** a homework as the lists give it, without its detail */
export interface HomeworkBase extends HomeworkStatus {
  id: string;
  baseId: string;
  title: string;
  deadline: ServerTime;
  lateSubmissionDeadline?: ServerTime;
  url: string;
  completionType: HomeworkCompletionType;
  submissionType: HomeworkSubmissionType;
  submitUrl: string;
  submitTime?: ServerTime;
  isLateSubmission: boolean;
  /** the numeric grade; left out for a grade level (`gradeLevel`) */
  grade?: number;
  /** some homework has levels but not grades, like A/B/.../F */
  gradeLevel?: HomeworkGradeLevel;
  gradeTime?: ServerTime;
  graderName?: string;
  gradeContent?: string;
  isFavorite: boolean;
  comment?: string;
  /** `[]` when there is none; `undefined` when the course's excellent homework list couldn't be fetched */
  excellentHomeworkList?: ExcellentHomework[];
}

export interface HomeworkDetail {
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

export type Homework = HomeworkBase & HomeworkDetail;

export const HomeworkCompletionType = {
  INDIVIDUAL: 1,
  GROUP: 2,
} as const;
export type HomeworkCompletionType = (typeof HomeworkCompletionType)[keyof typeof HomeworkCompletionType];
// lets `HomeworkCompletionType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace HomeworkCompletionType {
  type INDIVIDUAL = typeof HomeworkCompletionType.INDIVIDUAL;
  type GROUP = typeof HomeworkCompletionType.GROUP;
}

export const HomeworkSubmissionType = {
  WEB_LEARNING: 2,
  OFFLINE: 0,
} as const;
export type HomeworkSubmissionType = (typeof HomeworkSubmissionType)[keyof typeof HomeworkSubmissionType];
// lets `HomeworkSubmissionType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace HomeworkSubmissionType {
  type WEB_LEARNING = typeof HomeworkSubmissionType.WEB_LEARNING;
  type OFFLINE = typeof HomeworkSubmissionType.OFFLINE;
}

/** an excellent homework as the list gives it, without its detail */
export interface ExcellentHomeworkBase {
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

export type ExcellentHomework = ExcellentHomeworkBase & HomeworkDetail;

export interface HomeworkTA {
  id: string;
  index: number;
  title: string;
  description: string;
  publisherId: string;
  publishTime: ServerTime;
  startTime: ServerTime;
  deadline: ServerTime;
  lateSubmissionDeadline?: ServerTime;
  url: string;
  completionType: HomeworkCompletionType;
  submissionType: HomeworkSubmissionType;
  gradedCount: number;
  submittedCount: number;
  unsubmittedCount: number;
}

/**
 * A file to upload in React Native, whose `FormData` takes the file's `uri` (and MIME `type`) instead of a `Blob`.
 */
export interface ReactNativeFile {
  uri: string;
  /** MIME type; `application/octet-stream` if left out */
  type?: string;
}

/** The request `submitHomework` sends, from `getHomeworkSubmitRequest`, for sending with another HTTP client */
export interface HomeworkSubmitRequest {
  /** the submit URL, with the CSRF token */
  url: string;
  /** POST it as multipart form data */
  body: FormData;
}

export interface HomeworkSubmitAttachment {
  filename: string;
  content: Blob | ReactNativeFile;
}

export interface DiscussionBase {
  id: string;
  title: string;
  publisherName: string;
  publishTime: ServerTime;
  lastReplierName: string;
  lastReplyTime: ServerTime;
  visitCount: number;
  replyCount: number;
  isFavorite: boolean;
  comment?: string;
}

export interface Discussion extends DiscussionBase {
  url: string;
  boardId: string;
}

export interface Question extends DiscussionBase {
  url: string;
  question: string;
}

export const QuestionnaireDetailType = {
  SINGLE: 'dnx',
  MULTI: 'dox',
  TEXT: 'wd',
} as const;
export type QuestionnaireDetailType = (typeof QuestionnaireDetailType)[keyof typeof QuestionnaireDetailType];
// lets `QuestionnaireDetailType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace QuestionnaireDetailType {
  type SINGLE = typeof QuestionnaireDetailType.SINGLE;
  type MULTI = typeof QuestionnaireDetailType.MULTI;
  type TEXT = typeof QuestionnaireDetailType.TEXT;
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

export const QuestionnaireType = {
  VOTE: 'tp',
  FORM: 'tb',
  SURVEY: 'wj',
} as const;
export type QuestionnaireType = (typeof QuestionnaireType)[keyof typeof QuestionnaireType];
// lets `QuestionnaireType.MEMBER` name a member's type, as it did when this was an enum
export declare namespace QuestionnaireType {
  type VOTE = typeof QuestionnaireType.VOTE;
  type FORM = typeof QuestionnaireType.FORM;
  type SURVEY = typeof QuestionnaireType.SURVEY;
}

export interface Questionnaire {
  id: string;
  type: QuestionnaireType;
  title: string;
  startTime: ServerTime;
  endTime: ServerTime;
  uploadTime: ServerTime;
  uploaderId: string;
  uploaderName: string;
  submitTime?: ServerTime;
  isFavorite: boolean;
  comment?: string;
  url: string;
  /** the questions; only for the questionnaires `getQuestionnaireList`'s `details` selects (by default none) */
  detail?: QuestionnaireDetail[];
}

/** which items get their extra per-item requests: none (default), all, or those the predicate accepts */
export type DetailSelector<T> = 'none' | 'all' | ((item: T) => boolean);

export interface CourseListOptions {
  /** fetch each course's time and location (one request per course; default false) */
  timeAndLocation?: boolean;
}

export interface FileListOptions {
  /**
   * Fill `isFavorite` (student only). The file list has no favorite flag: `true` adds one request for the course's
   * file favorites (`getFavorites(courseID, ContentType.FILE)`), sent in parallel, and the list rejects if it fails.
   * Pass favorites you already have instead (e.g. one `getFavorites(undefined, ContentType.FILE)` for every course)
   * to fill it without a request; only file favorites are used.
   */
  favorites?: boolean | readonly FavoriteItem[];
}

export interface HomeworkListOptions {
  /**
   * Which homework gets its detail (page + description JSON, 2 requests each); default `'none'`.
   * The same as calling `getHomeworkDetail` for those items.
   */
  details?: DetailSelector<HomeworkBase>;
}

export interface NotificationListOptions {
  /**
   * Which notices with an attachment get it (1 request each); default `'none'`.
   * The same as calling `getNotificationAttachment` for those items.
   */
  attachments?: DetailSelector<CourseNotificationBase>;
}

export interface QuestionnaireListOptions {
  /**
   * Which questionnaires get their questions (`detail`, 1 request each); default `'none'`.
   * The same as calling `getQuestionnaireDetail` for those items.
   */
  details?: DetailSelector<Questionnaire>;
}

export interface AllContentsOptions<T extends ContentType> {
  courseType?: CourseType;
  /** homework or questionnaire `details`, or notification `attachments`, passed to each course's list */
  details?: T extends ContentType.HOMEWORK
    ? DetailSelector<HomeworkBase>
    : T extends ContentType.NOTIFICATION
      ? DetailSelector<CourseNotificationBase>
      : T extends ContentType.QUESTIONNAIRE
        ? DetailSelector<Questionnaire>
        : never;
}

export interface AllContentsResult<T extends ContentType> {
  /** content of each course that succeeded */
  contents: CourseContent<T>;
  /** the error of each course that failed */
  errors: { [courseID: string]: unknown };
}

export type ContentTypeMap = {
  [ContentType.NOTIFICATION]: CourseNotification;
  [ContentType.FILE]: CourseFile;
  [ContentType.HOMEWORK]: Homework;
  [ContentType.DISCUSSION]: Discussion;
  [ContentType.QUESTION]: Question;
  [ContentType.QUESTIONNAIRE]: Questionnaire;
};

export interface CourseContent<T extends ContentType = ContentType> {
  [id: string]: ContentTypeMap[T][];
}

export interface FavoriteItem {
  id: string;
  type: ContentType;
  title: string;
  time: ServerTime;
  state: string;
  /** extra message. For homework, this will be deadline (plus score if graded). It's too flexible and hard to parse so we leave it as is. */
  extra?: string;
  semesterId: string;
  courseId: string;
  pinned: boolean;
  pinnedTime?: ServerTime;
  comment?: string;
  addedTime: ServerTime;
  /** for reference */
  itemId: string;
}

export interface CommentItem {
  id: string;
  type: ContentType;
  content: string;
  contentHTML: string;
  title: string;
  semesterId: string;
  courseId: string;
  commentTime: ServerTime;
  /** for reference */
  itemId: string;
}

/** one entry of a course's time and location, read by `parseCourseMeeting` */
export interface CourseMeeting {
  /** 1 (Monday) to 7 (Sunday) */
  weekday: number;
  /** the class period (大节), a key of `CLASS_PERIOD_TIMES` */
  period: number;
  /** the teaching weeks it happens in, from 1; `null` for every week */
  weeks: number[] | null;
  location: string;
}

export interface CalendarEvent {
  location: string;
  status: string;
  /** Beijing wall-clock time, `HH:mm` */
  startTime: string;
  /** Beijing wall-clock time, `HH:mm` */
  endTime: string;
  /** Beijing date, `YYYY-MM-DD` */
  date: string;
  /** `date` and `startTime` as one `ServerTime`; `undefined` if the registrar sent them in another shape */
  start?: ServerTime;
  /** `date` and `endTime` as one `ServerTime`; `undefined` if the registrar sent them in another shape */
  end?: ServerTime;
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
  /**
   * windows that failed (after a retry, unless they timed out) or were skipped after repeated timeouts; empty when the
   * whole range was fetched
   */
  failedRanges: CalendarRange[];
}

export const Language = {
  ZH: 'zh',
  EN: 'en',
} as const;
export type Language = (typeof Language)[keyof typeof Language];
// lets `Language.MEMBER` name a member's type, as it did when this was an enum
export declare namespace Language {
  type ZH = typeof Language.ZH;
  type EN = typeof Language.EN;
}
