// Semesters and courses.

import type { Session } from './request.ts';
import type { CourseInfo, SemesterInfo } from './types.ts';
import { CourseType, FailReason } from './types.ts';
import * as URLS from './urls.ts';
import { decodeHTML, parseSemesterType } from './utils.ts';

export async function getSemesterIdList(s: Session): Promise<string[]> {
  const json = await (await s.fetchWithToken(URLS.LEARN_SEMESTER_LIST())).json();
  if (!Array.isArray(json)) {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }
  const semesters = json as string[];
  // sometimes web learning returns null, so confusing...
  return semesters.filter((semester) => semester != null);
}

export async function getCurrentSemester(s: Session): Promise<SemesterInfo> {
  const json = await (await s.fetchWithToken(URLS.LEARN_CURRENT_SEMESTER())).json();
  if (json.message !== 'success') {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
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

/** get all courses in the specified semester */
export async function getCourseList(
  s: Session,
  semesterID: string,
  courseType: CourseType = CourseType.STUDENT,
  lang = s.lang,
): Promise<CourseInfo[]> {
  const json = await (await s.fetchWithToken(URLS.LEARN_COURSE_LIST(semesterID, courseType, lang))).json();
  if (json.message !== 'success' || !Array.isArray(json.resultList)) {
    return Promise.reject({
      reason: FailReason.INVALID_RESPONSE,
      extra: json,
    });
  }
  const result = (json.resultList ?? []) as any[];

  return Promise.all(
    result.map(async (c) => {
      let timeAndLocation: string[] = [];
      try {
        // see https://github.com/Harry-Chen/Learn-Helper/issues/145
        timeAndLocation = await (await s.fetchWithToken(URLS.LEARN_COURSE_TIME_LOCATION(c.wlkcid))).json();
      } catch (e) {}
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

export async function sortCourses(s: Session, courseIDs: string[]): Promise<void> {
  const json = await (
    await s.fetchWithToken(URLS.LEARN_SORT_COURSES, {
      method: 'POST',
      body: JSON.stringify(courseIDs.map((id, index) => ({ wlkcid: id, xh: index + 1 }))),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  ).json();
  if (json.result !== 'success') {
    return Promise.reject({
      reason: FailReason.OPERATION_FAILED,
      extra: json,
    });
  }
}
