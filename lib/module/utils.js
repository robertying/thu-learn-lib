"use strict";

import { decodeHTML as _decodeHTML } from 'entities';
import { SemesterType, FailReason, ContentType, HomeworkGradeLevel } from "./types.js";
export function parseSemesterType(n) {
  if (n === 1) {
    return SemesterType.FALL;
  } else if (n === 2) {
    return SemesterType.SPRING;
  } else if (n === 3) {
    return SemesterType.SUMMER;
  } else {
    return SemesterType.UNKNOWN;
  }
}
const CONTENT_TYPE_MK_MAP = new Map([[ContentType.NOTIFICATION, 'kcgg'], [ContentType.FILE, 'kcwj'], [ContentType.HOMEWORK, 'kczy'], [ContentType.DISCUSSION, ''], [ContentType.QUESTION, '']]);
export function getMkFromType(type) {
  return 'mk_' + (CONTENT_TYPE_MK_MAP.get(type) ?? 'UNKNOWN');
}
export function decodeHTML(html) {
  const text = _decodeHTML(html ?? '');
  // remove strange prefixes returned by web learning
  return text.startsWith('\xC2\x9E\xC3\xA9\x65') ? text.slice(5) : text.startsWith('\x9E\xE9\x65') ? text.slice(3) : text.startsWith('\xE9\x65') ? text.slice(2) : text;
}
export function trimAndDefine(text) {
  if (text === undefined || text === null) {
    return undefined;
  }
  const trimmed = text.trim();
  return trimmed === '' ? undefined : decodeHTML(trimmed);
}
export const GRADE_LEVEL_MAP = new Map([[-100, HomeworkGradeLevel.CHECKED], [-99, HomeworkGradeLevel.A_PLUS], [-98, HomeworkGradeLevel.A], [-92, HomeworkGradeLevel.A_MINUS], [-87, HomeworkGradeLevel.B_PLUS], [-85, HomeworkGradeLevel.DISTINCTION], [-82, HomeworkGradeLevel.B], [-78, HomeworkGradeLevel.B_MINUS], [-74, HomeworkGradeLevel.C_PLUS], [-71, HomeworkGradeLevel.C], [-68, HomeworkGradeLevel.C_MINUS], [-67, HomeworkGradeLevel.G], [-66, HomeworkGradeLevel.D_PLUS], [-64, HomeworkGradeLevel.D], [-65, HomeworkGradeLevel.EXEMPTED_COURSE], [-63, HomeworkGradeLevel.PASS], [-62, HomeworkGradeLevel.EX], [-61, HomeworkGradeLevel.EXEMPTION], [-60, HomeworkGradeLevel.PASS], [-59, HomeworkGradeLevel.FAILURE], [-55, HomeworkGradeLevel.W], [-51, HomeworkGradeLevel.I], [-50, HomeworkGradeLevel.INCOMPLETE], [-31, HomeworkGradeLevel.NA], [-30, HomeworkGradeLevel.F]]);
export const JSONP_EXTRACTOR_NAME = 'thu_learn_lib_jsonp_extractor';
export function extractJSONPResult(jsonp) {
  // check jsonp format
  if (!jsonp.startsWith(JSONP_EXTRACTOR_NAME)) {
    throw FailReason.INVALID_RESPONSE;
  }
  // evaluate the result
  return Function(`"use strict";const ${JSONP_EXTRACTOR_NAME}=(s)=>s;return ${jsonp};`)();
}
//# sourceMappingURL=utils.js.map