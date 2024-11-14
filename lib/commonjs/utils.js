"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QNR_TYPE_MAP = exports.JSONP_EXTRACTOR_NAME = exports.GRADE_LEVEL_MAP = exports.CONTENT_TYPE_MAP_REVERSE = exports.CONTENT_TYPE_MAP = void 0;
exports.decodeHTML = decodeHTML;
exports.extractJSONPResult = extractJSONPResult;
exports.formatFileSize = formatFileSize;
exports.getMkFromType = getMkFromType;
exports.parseSemesterType = parseSemesterType;
exports.trimAndDefine = trimAndDefine;
var _entities = require("entities");
var _types = require("./types.js");
function parseSemesterType(n) {
  if (n === 1) {
    return _types.SemesterType.FALL;
  } else if (n === 2) {
    return _types.SemesterType.SPRING;
  } else if (n === 3) {
    return _types.SemesterType.SUMMER;
  } else {
    return _types.SemesterType.UNKNOWN;
  }
}
const CONTENT_TYPE_MK_MAP = {
  [_types.ContentType.NOTIFICATION]: 'kcgg',
  [_types.ContentType.FILE]: 'kcwj',
  [_types.ContentType.HOMEWORK]: 'kczy',
  [_types.ContentType.DISCUSSION]: '',
  [_types.ContentType.QUESTION]: '',
  [_types.ContentType.QUESTIONNAIRE]: ''
};
function getMkFromType(type) {
  return 'mk_' + (CONTENT_TYPE_MK_MAP[type] ?? 'UNKNOWN');
}
function decodeHTML(html) {
  const text = (0, _entities.decodeHTML)(html ?? '');
  // remove strange prefixes returned by web learning
  return text.startsWith('\xC2\x9E\xC3\xA9\x65') ? text.slice(5) : text.startsWith('\x9E\xE9\x65') ? text.slice(3) : text.startsWith('\xE9\x65') ? text.slice(2) : text;
}
function trimAndDefine(text) {
  if (text === undefined || text === null) {
    return undefined;
  }
  const trimmed = text.trim();
  return trimmed === '' ? undefined : decodeHTML(trimmed);
}
const GRADE_LEVEL_MAP = exports.GRADE_LEVEL_MAP = new Map([[-100, _types.HomeworkGradeLevel.CHECKED], [-99, _types.HomeworkGradeLevel.A_PLUS], [-98, _types.HomeworkGradeLevel.A], [-92, _types.HomeworkGradeLevel.A_MINUS], [-87, _types.HomeworkGradeLevel.B_PLUS], [-85, _types.HomeworkGradeLevel.DISTINCTION], [-82, _types.HomeworkGradeLevel.B], [-78, _types.HomeworkGradeLevel.B_MINUS], [-74, _types.HomeworkGradeLevel.C_PLUS], [-71, _types.HomeworkGradeLevel.C], [-68, _types.HomeworkGradeLevel.C_MINUS], [-67, _types.HomeworkGradeLevel.G], [-66, _types.HomeworkGradeLevel.D_PLUS], [-64, _types.HomeworkGradeLevel.D], [-65, _types.HomeworkGradeLevel.EXEMPTED_COURSE], [-63, _types.HomeworkGradeLevel.PASS], [-62, _types.HomeworkGradeLevel.EX], [-61, _types.HomeworkGradeLevel.EXEMPTION], [-60, _types.HomeworkGradeLevel.PASS], [-59, _types.HomeworkGradeLevel.FAILURE], [-55, _types.HomeworkGradeLevel.W], [-51, _types.HomeworkGradeLevel.I], [-50, _types.HomeworkGradeLevel.INCOMPLETE], [-31, _types.HomeworkGradeLevel.NA], [-30, _types.HomeworkGradeLevel.F]]);
const JSONP_EXTRACTOR_NAME = exports.JSONP_EXTRACTOR_NAME = 'thu_learn_lib_jsonp_extractor';
function extractJSONPResult(jsonp) {
  // check jsonp format
  if (!jsonp.startsWith(JSONP_EXTRACTOR_NAME)) {
    throw _types.FailReason.INVALID_RESPONSE;
  }
  // evaluate the result
  return Function(`"use strict";const ${JSONP_EXTRACTOR_NAME}=(s)=>s;return ${jsonp};`)();
}
function formatFileSize(size) {
  // this logic is extracted from `judgeSize` function from Web Learning
  if (size < 1024) return size + 'B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + 'K';
  if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + 'M';
  return (size / 1024 / 1024 / 1024).toFixed(2) + 'G';
}
const CONTENT_TYPE_MAP = exports.CONTENT_TYPE_MAP = new Map([[_types.ContentType.NOTIFICATION, 'KCGG'], [_types.ContentType.FILE, 'KCKJ'], [_types.ContentType.HOMEWORK, 'KCZY'], [_types.ContentType.DISCUSSION, 'KCTL'], [_types.ContentType.QUESTION, 'KCDY'], [_types.ContentType.QUESTIONNAIRE, 'KCWJ']
// omitted: 课表(KCKB)
]);
const CONTENT_TYPE_MAP_REVERSE = exports.CONTENT_TYPE_MAP_REVERSE = new Map([[CONTENT_TYPE_MAP.get(_types.ContentType.NOTIFICATION), _types.ContentType.NOTIFICATION], [CONTENT_TYPE_MAP.get(_types.ContentType.FILE), _types.ContentType.FILE], [CONTENT_TYPE_MAP.get(_types.ContentType.HOMEWORK), _types.ContentType.HOMEWORK], [CONTENT_TYPE_MAP.get(_types.ContentType.DISCUSSION), _types.ContentType.DISCUSSION], [CONTENT_TYPE_MAP.get(_types.ContentType.QUESTION), _types.ContentType.QUESTION], [CONTENT_TYPE_MAP.get(_types.ContentType.QUESTIONNAIRE), _types.ContentType.QUESTIONNAIRE]]);
const QNR_TYPE_MAP = exports.QNR_TYPE_MAP = new Map([['投票', _types.QuestionnaireType.VOTE], ['填表', _types.QuestionnaireType.FORM], ['问卷', _types.QuestionnaireType.SURVEY]]);
//# sourceMappingURL=utils.js.map