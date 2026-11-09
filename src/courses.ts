// Semesters and courses.

import type { Session } from './request.ts';
import type { CourseInfo, CourseListOptions, SemesterInfo } from './types.ts';
import { CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { apiError, decodeHTML, expectSuccess, parseSemesterType } from './utils.ts';

export async function getSemesterIdList(s: Session): Promise<string[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_SEMESTER_LIST);
  if (!Array.isArray(json)) {
    throw apiError(FailReason.INVALID_RESPONSE, json);
  }
  const semesters = json as string[];
  // sometimes web learning returns null, so confusing...
  return semesters.filter((semester) => semester != null);
}

export async function getCurrentSemester(s: Session): Promise<SemesterInfo> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_CURRENT_SEMESTER);
  if (json.message !== 'success') {
    throw apiError(FailReason.INVALID_RESPONSE, json);
  }
  const result = json.result;
  return {
    id: result.id,
    startDate: result.kssj,
    endDate: result.jssj,
    startYear: Number(result.xnxq.slice(0, 4)),
    endYear: Number(result.xnxq.slice(5, 9)),
    type: parseSemesterType(Number(result.xnxq.slice(10, 11))),
  };
}

/** get all courses in the specified semester; time and location only with `options.timeAndLocation` */
export async function getCourseList(
  s: Session,
  semesterID: string,
  courseType: CourseType = CourseType.STUDENT,
  lang = s.lang,
  options: CourseListOptions = {},
): Promise<CourseInfo[]> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_COURSE_LIST(semesterID, courseType, lang));
  if (json.message !== 'success' || !Array.isArray(json.resultList)) {
    throw apiError(FailReason.INVALID_RESPONSE, json);
  }
  const result = json.resultList as any[];

  return Promise.all(
    result.map(async (c) => {
      let timeAndLocation: string[] | undefined;
      if (options.timeAndLocation) {
        try {
          timeAndLocation = await getCourseTimeAndLocation(s, c.wlkcid);
        } catch {
          // left out, so a failure doesn't look like a course without a schedule; see `getCourseTimeAndLocation`
        }
      }
      return {
        id: c.wlkcid,
        name: decodeHTML(c.zywkcm),
        chineseName: decodeHTML(c.kcm),
        englishName: decodeHTML(c.ywkcm),
        timeAndLocation,
        url: URLS.LEARN_COURSE_PAGE(c.wlkcid, courseType),
        teacherName: c.jsm ?? '', // teacher can not fetch this
        teacherNumber: c.jsh,
        courseNumber: c.kch,
        courseIndex: Number(c.kxh), // c.kxh could be string (teacher mode) or number (student mode)
        courseType,
      } satisfies CourseInfo;
    }),
  );
}

/** get the time and location of one course (1 request) */
export async function getCourseTimeAndLocation(s: Session, courseID: string): Promise<string[]> {
  // see https://github.com/Harry-Chen/Learn-Helper/issues/145
  const json = await s.fetchJsonWithToken(URLS.LEARN_COURSE_TIME_LOCATION(courseID));
  if (!Array.isArray(json)) {
    throw apiError(FailReason.INVALID_RESPONSE, json);
  }
  return json as string[];
}

export async function sortCourses(s: Session, courseIDs: string[]): Promise<void> {
  const json = await s.fetchJsonWithToken(URLS.LEARN_SORT_COURSES, {
    method: 'POST',
    body: JSON.stringify(courseIDs.map((id, index) => ({ wlkcid: id, xh: index + 1 }))),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  expectSuccess(json, FailReason.OPERATION_FAILED);
}
