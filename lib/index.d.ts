import { HelperConfig, ContentType, CourseContent, CourseInfo, Discussion, File, Homework, Notification, Question, SemesterInfo, CourseType, CalendarEvent } from "./types";
export declare class Learn2018Helper {
    readonly cookieJar: any;
    private readonly provider?;
    private readonly rawFetch;
    private readonly myFetch;
    constructor(config?: HelperConfig);
    private withReAuth;
    login(username?: string, password?: string): Promise<boolean>;
    logout(): Promise<boolean>;
    getCalendar(startDate: string, endDate: string): Promise<CalendarEvent[]>;
    getSemesterIdList(): Promise<string[]>;
    getCurrentSemester(): Promise<SemesterInfo>;
    getCourseList(semesterID: string, courseType?: CourseType): Promise<CourseInfo[]>;
    getAllContents(courseIDs: string[], type: ContentType, courseType?: CourseType): Promise<CourseContent>;
    getNotificationList(courseID: string, courseType?: CourseType): Promise<Notification[]>;
    getFileList(courseID: string, courseType: CourseType): Promise<File[]>;
    getHomeworkList(courseID: string, courseType?: CourseType): Promise<Homework[]>;
    getDiscussionList(courseID: string, courseType?: CourseType): Promise<Discussion[]>;
    getAnsweredQuestionList(courseID: string, courseType?: CourseType): Promise<Question[]>;
    private getHomeworkListAtUrl;
    private parseNotificationDetail;
    private parseHomeworkDetail;
    private parseHomeworkFile;
    private parseDiscussionBase;
}
