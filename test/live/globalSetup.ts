import type { TestProject } from 'vitest/node';
import { CourseType, Learn2018Helper } from '../../src/index.ts';
import { config } from './config.ts';

/**
 * find suitable semester and course for testing or read from environment variables
 * this also works like a gate for skipping tests if no network connection or `OPENSSL_CONF` not correctly configured
 */
export default async function setup(project: TestProject) {
  const provide = project.provide.bind(project);
  const h = new Learn2018Helper(config());

  await h.login();

  const semesters = await h.getSemesterIdList();
  const firstCourse = async (semester: string, courseType: CourseType) =>
    (await h.getCourseList(semester, { courseType }))[0]?.id;

  /**
   * The semester and course to test `courseType` with. With a semester from the environment: that one, and the
   * course from the environment or else its first course. Without: the first semester the server lists that has a
   * course of that type, and its first course; else the first semester, and the course from the environment.
   */
  const findTester = async (
    courseType: CourseType,
    semester: string | undefined,
    course: string | undefined,
  ): Promise<{ semester: string; course: string | undefined }> => {
    if (semester) return { semester, course: course || (await firstCourse(semester, courseType)) };
    for (const candidate of semesters) {
      const found = await firstCourse(candidate, courseType);
      if (found) return { semester: candidate, course: found };
    }
    return { semester: semesters[0], course };
  };

  const student = await findTester(CourseType.STUDENT, process.env.STUDENT_SEMESTER, process.env.STUDENT_COURSE);
  provide('studentSemester', student.semester);
  provide('studentCourse', student.course);

  const teacher = await findTester(CourseType.TEACHER, process.env.TEACHER_SEMESTER, process.env.TEACHER_COURSE);
  provide('teacherSemester', teacher.semester);
  provide('teacherCourse', teacher.course);

  await h.logout();
}

declare module 'vitest' {
  export interface ProvidedContext {
    studentSemester: string;
    studentCourse: string | undefined;
    teacherSemester: string;
    teacherCourse: string | undefined;
  }
}
