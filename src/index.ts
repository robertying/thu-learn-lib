import * as auth from './auth.ts';
import * as calendar from './calendar.ts';
import * as contents from './contents.ts';
import * as courses from './courses.ts';
import * as discussions from './discussions.ts';
import * as favorites from './favorites.ts';
import * as files from './files.ts';
import * as homework from './homework.ts';
import * as notices from './notices.ts';
import * as questionnaires from './questionnaires.ts';
import { Session } from './request.ts';
import type {
  AllContentsOptions,
  Credential,
  AllContentsResult,
  CalendarOptions,
  CalendarResult,
  CommentItem,
  ContentType,
  CourseFile,
  CourseInfo,
  CourseListOptions,
  CourseNotification,
  Discussion,
  ExcellentHomework,
  FavoriteItem,
  FileCategory,
  HelperConfig,
  Homework,
  HomeworkDetail,
  HomeworkListOptions,
  HomeworkSubmitAttachment,
  HomeworkSubmitRequest,
  HomeworkTA,
  Language,
  NotificationListOptions,
  Question,
  Questionnaire,
  QuestionnaireDetail,
  FileListOptions,
  QuestionnaireListOptions,
  RemoteFile,
  SemesterInfo,
  UserInfo,
} from './types.ts';
import { CourseType, FailReason } from './types.ts';
import { apiError, parsed } from './utils.ts';
import * as URLS from './urls.ts';
import * as user from './user.ts';

export { addCSRFTokenToUrl, isConnectionError } from './request.ts';
export { checkHomeworkSubmitResponse, homeworkContentHtml } from './homework.ts';
export { CLASS_PERIOD_TIMES, parseCourseMeeting, parseWeeks, semesterWeek } from './timetable.ts';
export * from './types.ts';

/** the main helper class */
export class Learn2018Helper {
  readonly #session: Session;

  /** you can provide a CookieJar and / or CredentialProvider in the configuration */
  constructor(config?: HelperConfig) {
    this.#session = new Session(config, () => auth.loginWithProvider(this.#session));
  }

  /** whether preview URLs open the first page only (`HelperConfig.generatePreviewUrlForFirstPage`) */
  public get previewFirstPage(): boolean {
    return this.#session.previewFirstPage;
  }

  public set previewFirstPage(value: boolean) {
    this.#session.previewFirstPage = value;
  }

  /** fetch CSRF token from helper (invalid after login / re-login), might be '' if not logged in */
  public getCSRFToken(): string {
    return this.#session.csrfToken;
  }

  /** manually set CSRF token (useful when you want to reuse previous token) */
  public setCSRFToken(csrfToken: string): void {
    this.#session.csrfToken = csrfToken;
  }

  /**
   * Sign in to id.tsinghua.edu.cn and return the Web Learning roaming ticket, without logging in to Web Learning.
   * Rejects with `NO_CREDENTIAL` unless `credential` has a username, a password and a fingerprint. If using
   * alternative cookie management systems, be sure to clear id.tsinghua.edu.cn cookies before calling this function.
   */
  public async getRoamingTicket(credential: Credential): Promise<string> {
    if (!auth.isComplete(credential)) throw apiError(FailReason.NO_CREDENTIAL);
    return parsed(auth.getRoamingTicket(this.#session, credential));
  }

  /**
   * Login is necessary if you do not provide a `CredentialProvider`.
   * Without a credential it uses the provider, and concurrent calls share one SSO login; a credential without a
   * username, a password and a fingerprint rejects with `NO_CREDENTIAL`. Logins never overlap: one with a credential
   * waits for a login in progress, and requests that find the session expired meanwhile wait for it.
   */
  public async login(credential?: Credential): Promise<void> {
    if (credential === undefined) return this.#session.relogin();
    if (!auth.isComplete(credential)) throw apiError(FailReason.NO_CREDENTIAL);
    return this.#session.runLogin(() => auth.login(this.#session, credential));
  }

  /**
   * Make sure the session is usable without a full SSO login when possible: with a CSRF token (from an earlier login
   * or `setCSRFToken`), make one cheap request and log in again only if the session has expired; without one, log in.
   * Use it when resuming an app instead of `login()`.
   */
  public async ensureSession(): Promise<void> {
    return parsed(this.#session.ensureSession(URLS.LEARN_CURRENT_SEMESTER));
  }

  /**  logout (to make everyone happy) */
  public async logout(): Promise<void> {
    return parsed(auth.logout(this.#session));
  }

  /** get user's name and department */
  public async getUserInfo(courseType: CourseType = CourseType.STUDENT): Promise<UserInfo> {
    return parsed(user.getUserInfo(this.#session, courseType));
  }

  /**
   * Get calendar items during the specified period (in yyyymmdd format, both inclusive).
   * Ranges longer than 28 days are fetched in windows and merged; windows that still fail are listed in `failedRanges`
   * (a timed-out window is not retried). Rejects when every window fails (usually with `FailReason.INVALID_RESPONSE`),
   * with `FailReason.ERROR_REGISTRAR_AUTH` when signing in to the registrar fails, or with a `RangeError` for a date
   * that is not a valid yyyymmdd. With a `CredentialProvider`, a sign-in that id.tsinghua.edu.cn turns down (its session
   * from the last login expired) logs in again and is tried once more.
   */
  public async getCalendar(startDate: string, endDate: string, options?: CalendarOptions): Promise<CalendarResult> {
    return parsed(calendar.getCalendar(this.#session, startDate, endDate, options));
  }

  public async getSemesterIdList(): Promise<string[]> {
    return parsed(courses.getSemesterIdList(this.#session));
  }

  public async getCurrentSemester(): Promise<SemesterInfo> {
    return parsed(courses.getCurrentSemester(this.#session));
  }

  /**
   * Get all courses in the specified semester.
   * `timeAndLocation` is only fetched (one request per course) with `options.timeAndLocation`, and left out for a
   * course whose request failed.
   */
  public async getCourseList(
    semesterID: string,
    courseType: CourseType = CourseType.STUDENT,
    lang: Language = this.#session.lang,
    options?: CourseListOptions,
  ): Promise<CourseInfo[]> {
    return parsed(courses.getCourseList(this.#session, semesterID, courseType, lang, options));
  }

  /** Get the time and location of one course. */
  public async getCourseTimeAndLocation(courseID: string): Promise<string[]> {
    return parsed(courses.getCourseTimeAndLocation(this.#session, courseID));
  }

  /**
   * Get certain type of content of all specified courses.
   * It wraps around the `getXXX` list functions; a course that fails is reported in `errors` instead of failing
   * the rest. `options.details` is passed on as homework `details` or notification `attachments`.
   */
  public async getAllContents<T extends ContentType>(
    courseIDs: string[],
    type: T,
    options?: AllContentsOptions<T>,
  ): Promise<AllContentsResult<T>> {
    return parsed(contents.getAllContents(this.#session, courseIDs, type, options));
  }

  /**
   * Get all notifications （课程公告） of the specified course.
   * Attachments are only fetched (one request per notice) for the notices `options.attachments` selects;
   * use `getNotificationAttachment` for the others.
   */
  public async getNotificationList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
    options?: NotificationListOptions,
  ): Promise<CourseNotification[]> {
    return parsed(notices.getNotificationList(this.#session, courseID, courseType, options));
  }

  /** Get the attachment of a notice (one request), `undefined` if it has none. */
  public async getNotificationAttachment(
    notification: Pick<CourseNotification, 'url' | 'attachmentName'>,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<RemoteFile | undefined> {
    return parsed(notices.getNotificationAttachment(this.#session, notification, courseType));
  }

  /**
   * Get all files （课程文件） of the specified course. With `options.favorites` (student only), `isFavorite` is filled from
   * the course's file favorites, one more request sent in parallel; the list rejects if it fails.
   */
  public async getFileList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
    options: FileListOptions = {},
  ): Promise<CourseFile[]> {
    return parsed(files.getFileList(this.#session, courseID, courseType, options));
  }

  /** Get file categories of the specified course. */
  public async getFileCategoryList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<FileCategory[]> {
    return parsed(files.getFileCategoryList(this.#session, courseID, courseType));
  }

  /**
   * Get all files of the specified category of the specified course.
   * Note: this cannot get correct `visitCount` and `downloadCount` for student
   */
  public async getFileListByCategory(
    courseID: string,
    categoryId: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<CourseFile[]> {
    return parsed(files.getFileListByCategory(this.#session, courseID, categoryId, courseType));
  }

  /**
   * Get all homeworks （课程作业） of the specified course, with the excellent homework list (without details).
   * Details (page + description, two requests per homework) are only fetched for the homework `options.details`
   * selects; use `getHomeworkDetail` for the others.
   */
  public async getHomeworkList(
    courseID: string,
    courseType?: CourseType.STUDENT,
    options?: HomeworkListOptions,
  ): Promise<Homework[]>;
  public async getHomeworkList(courseID: string, courseType: CourseType.TEACHER): Promise<HomeworkTA[]>;
  public async getHomeworkList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
    options?: HomeworkListOptions,
  ): Promise<Homework[] | HomeworkTA[]> {
    return courseType === CourseType.TEACHER
      ? parsed(homework.getHomeworkList(this.#session, courseID, CourseType.TEACHER))
      : parsed(homework.getHomeworkList(this.#session, courseID, CourseType.STUDENT, options));
  }

  /** Get the detail (page content, attachments and description) of one homework. */
  public async getHomeworkDetail(item: Pick<Homework, 'url' | 'baseId'>): Promise<HomeworkDetail> {
    return parsed(homework.getHomeworkDetail(this.#session, item));
  }

  /** Get the detail (page content, attachments and description) of one excellent homework; the same requests as `getHomeworkDetail`. */
  public async getExcellentHomeworkDetail(item: Pick<ExcellentHomework, 'url' | 'baseId'>): Promise<HomeworkDetail> {
    return parsed(homework.getHomeworkDetail(this.#session, item));
  }

  /** Get all discussions （课程讨论） of the specified course. */
  public async getDiscussionList(courseID: string, courseType: CourseType = CourseType.STUDENT): Promise<Discussion[]> {
    return parsed(discussions.getDiscussionList(this.#session, courseID, courseType));
  }

  /**
   * Get the answered questions （课程答疑） of the specified course.
   * The student version supports only answered questions, while the teacher version supports all questions.
   */
  public async getAnsweredQuestionList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<Question[]> {
    return parsed(discussions.getAnsweredQuestionList(this.#session, courseID, courseType));
  }

  /**
   * Get all questionnaires （课程问卷/QNR） of the specified course.
   * Questions (`detail`, one request per questionnaire) for the questionnaires `options.details` selects, by default
   * all; use `getQuestionnaireDetail` for the others.
   */
  public async getQuestionnaireList(courseID: string, options?: QuestionnaireListOptions): Promise<Questionnaire[]> {
    return parsed(questionnaires.getQuestionnaireList(this.#session, courseID, options));
  }

  /** Get the questions of one questionnaire (one request). */
  public async getQuestionnaireDetail(courseID: string, questionnaireID: string): Promise<QuestionnaireDetail[]> {
    return parsed(questionnaires.getQuestionnaireDetail(this.#session, courseID, questionnaireID));
  }

  /**
   * Add an item to favorites. (收藏)
   * `id` is the item's `id` (for a file, `CourseFile.id`, not `fileId`). Adding a favorite again keeps one; an id the
   * server doesn't know answers HTTP 500 (`UNEXPECTED_STATUS`).
   */
  public async addToFavorites(type: ContentType, id: string): Promise<void> {
    return parsed(favorites.addToFavorites(this.#session, type, id));
  }

  /**
   * Remove an item from favorites. (取消收藏)
   * Removing an item that isn't a favorite succeeds.
   */
  public async removeFromFavorites(id: string): Promise<void> {
    return parsed(favorites.removeFromFavorites(this.#session, id));
  }

  /**
   * Get favorites. (我的收藏)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  public async getFavorites(courseID?: string, type?: ContentType): Promise<FavoriteItem[]> {
    return parsed(favorites.getFavorites(this.#session, courseID, type));
  }

  /**
   * Pin a favorite item. (置顶)
   */
  public async pinFavoriteItem(id: string): Promise<void> {
    return parsed(favorites.pinFavoriteItem(this.#session, id));
  }

  /**
   * Unpin a favorite item. (取消置顶)
   */
  public async unpinFavoriteItem(id: string): Promise<void> {
    return parsed(favorites.unpinFavoriteItem(this.#session, id));
  }

  /**
   * Set a comment. (备注)
   * Set an empty string to remove the comment.
   */
  public async setComment(type: ContentType, id: string, content: string): Promise<void> {
    return parsed(favorites.setComment(this.#session, type, id, content));
  }

  /**
   * Get comments. (我的备注)
   * If `courseID` or `type` is specified, only return comments of that course or type.
   */
  public async getComments(courseID?: string, type?: ContentType): Promise<CommentItem[]> {
    return parsed(favorites.getComments(this.#session, courseID, type));
  }

  public async sortCourses(courseIDs: string[]): Promise<void> {
    return parsed(courses.sortCourses(this.#session, courseIDs));
  }

  /**
   * Submit homework `id` (the `studentHomeworkId`), the way the website's submit page does. `content` is the whole
   * answer as HTML (the website sends its editor's HTML) and replaces the submitted one, so pass the current answer
   * when only changing the attachment (`homeworkContentHtml` turns plain text into the editor's HTML). With no
   * `attachment` the existing one is kept, unless `removeAttachment`: that only deletes the attachment, and `content` is
   * ignored. In React Native, pass the attachment's `content` as `{ uri, type }`.
   */
  public async submitHomework(
    id: string,
    content = '',
    attachment?: HomeworkSubmitAttachment,
    removeAttachment = false,
  ): Promise<void> {
    return parsed(homework.submitHomework(this.#session, id, content, attachment, removeAttachment));
  }

  /**
   * The request `submitHomework` would send, for sending with another HTTP client (e.g. to show upload progress, which
   * `fetch` can't): POST `body` to `url`, then pass the answer (parsed JSON or text) to `checkHomeworkSubmitResponse`.
   * It checks the session first (`ensureSession`), since that request doesn't log in again and retry.
   */
  public async getHomeworkSubmitRequest(
    id: string,
    content = '',
    attachment?: HomeworkSubmitAttachment,
    removeAttachment = false,
  ): Promise<HomeworkSubmitRequest> {
    return parsed(homework.getHomeworkSubmitRequest(this.#session, id, content, attachment, removeAttachment));
  }

  public async setLanguage(lang: Language): Promise<void> {
    return parsed(user.setLanguage(this.#session, lang));
  }

  public getCurrentLanguage(): Language {
    return this.#session.lang;
  }
}
