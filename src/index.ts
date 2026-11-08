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
  CalendarEvent,
  CommentItem,
  CourseInfo,
  Discussion,
  FavoriteItem,
  File,
  FileCategory,
  HelperConfig,
  Homework,
  HomeworkTA,
  IHomeworkSubmitAttachment,
  Language,
  Notification,
  Question,
  Questionnaire,
  SemesterInfo,
  UserInfo,
  ContentType,
} from './types.ts';
import { CourseType } from './types.ts';
import * as user from './user.ts';

export { addCSRFTokenToUrl } from './request.ts';
export * from './types.ts';

/** the main helper class */
export class Learn2018Helper {
  readonly #session: Session;

  /** you can provide a CookieJar and / or CredentialProvider in the configuration */
  constructor(config?: HelperConfig) {
    this.#session = new Session(config, () => this.login());
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
   * If using alternative cookie management systems,
   * be sure to clear id.tsinghua.edu.cn cookies before calling this function
   */
  public async getRoamingTicket(
    username: string,
    password: string,
    fingerPrint: string,
    fingerGenPrint: string = '',
    fingerGenPrint3: string = '',
  ): Promise<string> {
    return auth.getRoamingTicket(this.#session, username, password, fingerPrint, fingerGenPrint, fingerGenPrint3);
  }

  /** login is necessary if you do not provide a `CredentialProvider` */
  public async login(
    username?: string,
    password?: string,
    fingerPrint?: string,
    fingerGenPrint?: string,
    fingerGenPrint3?: string,
  ): Promise<void> {
    return auth.login(this.#session, username, password, fingerPrint, fingerGenPrint, fingerGenPrint3);
  }

  /**  logout (to make everyone happy) */
  public async logout(): Promise<void> {
    return auth.logout(this.#session);
  }

  /** get user's name and department */
  public async getUserInfo(courseType = CourseType.STUDENT): Promise<UserInfo> {
    return user.getUserInfo(this.#session, courseType);
  }

  /**
   * Get calendar items during the specified period (in yyyymmdd format).
   * @param startDate start date (inclusive)
   * @param endDate end date (inclusive)
   * If the API returns any error, this function will throw `FailReason.INVALID_RESPONSE`,
   * and we currently observe a limit of no more that 29 days.
   * Otherwise it will return the parsed data (might be empty if the period is too far away from now)
   */
  public async getCalendar(startDate: string, endDate: string, graduate = false): Promise<CalendarEvent[]> {
    return calendar.getCalendar(this.#session, startDate, endDate, graduate);
  }

  public async getSemesterIdList(): Promise<string[]> {
    return courses.getSemesterIdList(this.#session);
  }

  public async getCurrentSemester(): Promise<SemesterInfo> {
    return courses.getCurrentSemester(this.#session);
  }

  /** get all courses in the specified semester */
  public async getCourseList(
    semesterID: string,
    courseType: CourseType = CourseType.STUDENT,
    lang: Language = this.#session.lang,
  ): Promise<CourseInfo[]> {
    return courses.getCourseList(this.#session, semesterID, courseType, lang);
  }

  /**
   * Get certain type of content of all specified courses.
   * It actually wraps around other `getXXX` functions. You can ignore the failure caused by certain courses.
   */
  public async getAllContents<T extends ContentType>(
    courseIDs: string[],
    type: T,
    courseType: CourseType = CourseType.STUDENT,
    allowFailure = false,
  ) {
    return contents.getAllContents(this.#session, courseIDs, type, courseType, allowFailure);
  }

  /** Get all notifications （课程公告） of the specified course. */
  public async getNotificationList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<Notification[]> {
    return notices.getNotificationList(this.#session, courseID, courseType);
  }

  /** Get all files （课程文件） of the specified course. */
  public async getFileList(courseID: string, courseType: CourseType = CourseType.STUDENT): Promise<File[]> {
    return files.getFileList(this.#session, courseID, courseType);
  }

  /** Get file categories of the specified course. */
  public async getFileCategoryList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<FileCategory[]> {
    return files.getFileCategoryList(this.#session, courseID, courseType);
  }

  /**
   * Get all files of the specified category of the specified course.
   * Note: this cannot get correct `visitCount` and `downloadCount` for student
   */
  public async getFileListByCategory(
    courseID: string,
    categoryId: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<File[]> {
    return files.getFileListByCategory(this.#session, courseID, categoryId, courseType);
  }

  /** Get all homeworks （课程作业） of the specified course. */
  public async getHomeworkList(courseID: string): Promise<Homework[]>;
  public async getHomeworkList(courseID: string, courseType: CourseType.STUDENT): Promise<Homework[]>;
  public async getHomeworkList(courseID: string, courseType: CourseType.TEACHER): Promise<HomeworkTA[]>;
  public async getHomeworkList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<Homework[] | HomeworkTA[]> {
    return courseType === CourseType.TEACHER
      ? homework.getHomeworkList(this.#session, courseID, CourseType.TEACHER)
      : homework.getHomeworkList(this.#session, courseID, CourseType.STUDENT);
  }

  /** Get all discussions （课程讨论） of the specified course. */
  public async getDiscussionList(courseID: string, courseType: CourseType = CourseType.STUDENT): Promise<Discussion[]> {
    return discussions.getDiscussionList(this.#session, courseID, courseType);
  }

  /**
   * Get all notifications （课程答疑） of the specified course.
   * The student version supports only answered questions, while the teacher version supports all questions.
   */
  public async getAnsweredQuestionList(
    courseID: string,
    courseType: CourseType = CourseType.STUDENT,
  ): Promise<Question[]> {
    return discussions.getAnsweredQuestionList(this.#session, courseID, courseType);
  }

  /**
   * Get all questionnaires （课程问卷/QNR） of the specified course.
   */
  public async getQuestionnaireList(courseID: string): Promise<Questionnaire[]> {
    return questionnaires.getQuestionnaireList(this.#session, courseID);
  }

  /**
   * Add an item to favorites. (收藏)
   */
  public async addToFavorites(type: ContentType, id: string): Promise<void> {
    return favorites.addToFavorites(this.#session, type, id);
  }

  /**
   * Remove an item from favorites. (取消收藏)
   */
  public async removeFromFavorites(id: string): Promise<void> {
    return favorites.removeFromFavorites(this.#session, id);
  }

  /**
   * Get favorites. (我的收藏)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  public async getFavorites(courseID?: string, type?: ContentType): Promise<FavoriteItem[]> {
    return favorites.getFavorites(this.#session, courseID, type);
  }

  /**
   * Pin a favorite item. (置顶)
   */
  public async pinFavoriteItem(id: string): Promise<void> {
    return favorites.pinFavoriteItem(this.#session, id);
  }

  /**
   * Unpin a favorite item. (取消置顶)
   */
  public async unpinFavoriteItem(id: string): Promise<void> {
    return favorites.unpinFavoriteItem(this.#session, id);
  }

  /**
   * Set a comment. (备注)
   * Set an empty string to remove the comment.
   */
  public async setComment(type: ContentType, id: string, content: string): Promise<void> {
    return favorites.setComment(this.#session, type, id, content);
  }

  /**
   * Get comments. (我的备注)
   * If `courseID` or `type` is specified, only return favorites of that course or type.
   */
  public async getComments(courseID?: string, type?: ContentType): Promise<CommentItem[]> {
    return favorites.getComments(this.#session, courseID, type);
  }

  public async sortCourses(courseIDs: string[]): Promise<void> {
    return courses.sortCourses(this.#session, courseIDs);
  }

  public async submitHomework(
    id: string,
    content = '',
    attachment?: IHomeworkSubmitAttachment,
    removeAttachment = false,
  ): Promise<void> {
    return homework.submitHomework(this.#session, id, content, attachment, removeAttachment);
  }

  public async setLanguage(lang: Language): Promise<void> {
    return user.setLanguage(this.#session, lang);
  }

  public getCurrentLanguage(): Language {
    return this.#session.lang;
  }
}
