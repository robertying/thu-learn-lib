// The codes Web Learning uses in its answers and URLs, and what they mean.

import { ContentType, HomeworkGradeLevel, QuestionnaireType, SemesterType } from './types.ts';

/** a content type with a preview page (`LEARN_FILE_PREVIEW`): the kinds of items that carry files */
export type PreviewContentType = ContentType.NOTIFICATION | ContentType.FILE | ContentType.HOMEWORK;

/** each content type's code in favorites and comments (`ywlx`), and the preview module (`mk`) of those with files */
const CONTENT_TYPES = {
  [ContentType.NOTIFICATION]: { code: 'KCGG', mk: 'mk_kcgg' },
  [ContentType.FILE]: { code: 'KCKJ', mk: 'mk_kcwj' },
  [ContentType.HOMEWORK]: { code: 'KCZY', mk: 'mk_kczy' },
  [ContentType.DISCUSSION]: { code: 'KCTL' },
  [ContentType.QUESTION]: { code: 'KCDY' },
  [ContentType.QUESTIONNAIRE]: { code: 'KCWJ' },
  // omitted: 课表 (KCKB)
} as const satisfies Record<ContentType, { code: string; mk?: string }>;

/** the favorites / comments code (`ywlx`) of a content type */
export const contentTypeCode = (type: ContentType): string => CONTENT_TYPES[type].code;

const CONTENT_TYPE_BY_CODE = new Map<string, ContentType>(
  Object.values(ContentType).map((type) => [contentTypeCode(type), type]),
);

/** the content type of a favorites / comments code (`ywlx`); `undefined` for one the library doesn't know */
export const contentTypeOfCode = (code: string): ContentType | undefined => CONTENT_TYPE_BY_CODE.get(code);

/** the preview module (`mk`) of a content type with files */
export const previewModule = (type: PreviewContentType): string => CONTENT_TYPES[type].mk;

const SEMESTER_TYPES: Record<number, SemesterType> = {
  1: SemesterType.FALL,
  2: SemesterType.SPRING,
  3: SemesterType.SUMMER,
};

/** the semester type from the last digit of a semester id (`2024-2025-1`) */
export const parseSemesterType = (n: number): SemesterType => SEMESTER_TYPES[n] ?? SemesterType.UNKNOWN;

/** the grade levels, which the server sends as negative grades (`cj`) */
export const GRADE_LEVEL_MAP = new Map([
  [-100, HomeworkGradeLevel.CHECKED],
  [-99, HomeworkGradeLevel.A_PLUS],
  [-98, HomeworkGradeLevel.A],
  [-92, HomeworkGradeLevel.A_MINUS],
  [-87, HomeworkGradeLevel.B_PLUS],
  [-85, HomeworkGradeLevel.DISTINCTION],
  [-82, HomeworkGradeLevel.B],
  [-78, HomeworkGradeLevel.B_MINUS],
  [-74, HomeworkGradeLevel.C_PLUS],
  [-71, HomeworkGradeLevel.C],
  [-68, HomeworkGradeLevel.C_MINUS],
  [-67, HomeworkGradeLevel.G],
  [-66, HomeworkGradeLevel.D_PLUS],
  [-65, HomeworkGradeLevel.EXEMPTED_COURSE],
  [-64, HomeworkGradeLevel.D],
  [-63, HomeworkGradeLevel.P],
  [-62, HomeworkGradeLevel.EX],
  [-61, HomeworkGradeLevel.EXEMPTION],
  [-60, HomeworkGradeLevel.PASS],
  [-59, HomeworkGradeLevel.FAILURE],
  [-55, HomeworkGradeLevel.W],
  [-51, HomeworkGradeLevel.I],
  [-50, HomeworkGradeLevel.INCOMPLETE],
  [-31, HomeworkGradeLevel.NA],
  [-30, HomeworkGradeLevel.F],
]);

/** the questionnaire types by the name the list gives them */
export const QNR_TYPE_MAP = new Map([
  ['投票', QuestionnaireType.VOTE],
  ['填表', QuestionnaireType.FORM],
  ['问卷', QuestionnaireType.SURVEY],
]);
