import type { TestProject } from 'vitest/node';
import { CourseType, Learn2018Helper } from '../../src/index.ts';
import { config } from './config.ts';

/**
 * find suitable semester and course for testing or read from environment variables
 * this also works like a gate for skipping tests if no network connection or `OPENSSL_CONF` not correctly configured
 */
export default async function setup(project: TestProject) {
  const provide = project.provide.bind(project);
  const h = new Learn2018Helper(config);

  await h.login();

  const findCourse = async (semesterId: string, courseType: CourseType) => {
    const courses = await h.getCourseList(semesterId, courseType);
    return courses.length > 0 ? courses[0].id : undefined;
  };

  let semesterTester = process.env.STUDENT_SEMESTER;
  let courseTester = process.env.STUDENT_COURSE;
  let semesterTATester = process.env.TEACHER_SEMESTER;
  let courseTATester = process.env.TEACHER_COURSE;

  if (!semesterTester) {
    const semesters = await h.getSemesterIdList();
    for (const semester of semesters) {
      const course = await findCourse(semester, CourseType.STUDENT);
      if (course) {
        semesterTester = semester;
        courseTester = course;
        break;
      }
    }
    semesterTester = semesterTester || semesters[0];
  }
  if (!courseTester) {
    courseTester = await findCourse(semesterTester, CourseType.STUDENT);
  }
  provide('studentSemester', semesterTester);
  provide('studentCourse', courseTester);

  if (!semesterTATester) {
    const semesters = await h.getSemesterIdList();
    for (const semester of semesters) {
      const course = await findCourse(semester, CourseType.TEACHER);
      if (course) {
        semesterTATester = semester;
        courseTATester = course;
        break;
      }
    }
    semesterTATester = semesterTATester || semesters[0];
  }
  if (!courseTATester) {
    courseTATester = await findCourse(semesterTATester, CourseType.TEACHER);
  }
  provide('teacherSemester', semesterTATester);
  provide('teacherCourse', courseTATester);

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
