"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SemesterType = exports.Language = exports.HomeworkSubmissionType = exports.HomeworkGradeLevel = exports.HomeworkCompletionType = exports.FailReason = exports.CourseType = exports.ContentType = void 0;
let FailReason = exports.FailReason = /*#__PURE__*/function (FailReason) {
  FailReason["NO_CREDENTIAL"] = "no credential provided";
  FailReason["ERROR_FETCH_FROM_ID"] = "could not fetch ticket from id.tsinghua.edu.cn";
  FailReason["BAD_CREDENTIAL"] = "bad credential";
  FailReason["ERROR_ROAMING"] = "could not roam to learn.tsinghua.edu.cn";
  FailReason["NOT_LOGGED_IN"] = "not logged in or login timeout";
  FailReason["NOT_IMPLEMENTED"] = "not implemented";
  FailReason["INVALID_RESPONSE"] = "invalid response";
  FailReason["UNEXPECTED_STATUS"] = "unexpected status";
  return FailReason;
}({});
let SemesterType = exports.SemesterType = /*#__PURE__*/function (SemesterType) {
  SemesterType["FALL"] = "fall";
  SemesterType["SPRING"] = "spring";
  SemesterType["SUMMER"] = "summer";
  SemesterType["UNKNOWN"] = "";
  return SemesterType;
}({});
let ContentType = exports.ContentType = /*#__PURE__*/function (ContentType) {
  ContentType["NOTIFICATION"] = "notification";
  ContentType["FILE"] = "file";
  ContentType["HOMEWORK"] = "homework";
  ContentType["DISCUSSION"] = "discussion";
  ContentType["QUESTION"] = "question";
  return ContentType;
}({});
let CourseType = exports.CourseType = /*#__PURE__*/function (CourseType) {
  CourseType["STUDENT"] = "student";
  CourseType["TEACHER"] = "teacher";
  return CourseType;
}({});
let HomeworkGradeLevel = exports.HomeworkGradeLevel = /*#__PURE__*/function (HomeworkGradeLevel) {
  HomeworkGradeLevel["CHECKED"] = "checked";
  HomeworkGradeLevel["A_PLUS"] = "A+";
  HomeworkGradeLevel["A"] = "A";
  HomeworkGradeLevel["A_MINUS"] = "A-";
  HomeworkGradeLevel["B_PLUS"] = "B+";
  HomeworkGradeLevel["DISTINCTION"] = "distinction";
  HomeworkGradeLevel["B"] = "B";
  HomeworkGradeLevel["B_MINUS"] = "B-";
  HomeworkGradeLevel["C_PLUS"] = "C+";
  HomeworkGradeLevel["C"] = "C";
  HomeworkGradeLevel["C_MINUS"] = "C-";
  HomeworkGradeLevel["G"] = "G";
  HomeworkGradeLevel["D_PLUS"] = "D+";
  HomeworkGradeLevel["D"] = "D";
  HomeworkGradeLevel["EXEMPTED_COURSE"] = "exempted course";
  HomeworkGradeLevel["P"] = "P";
  HomeworkGradeLevel["EX"] = "EX";
  HomeworkGradeLevel["EXEMPTION"] = "exemption";
  HomeworkGradeLevel["PASS"] = "pass";
  HomeworkGradeLevel["FAILURE"] = "failure";
  HomeworkGradeLevel["W"] = "W";
  HomeworkGradeLevel["I"] = "I";
  HomeworkGradeLevel["INCOMPLETE"] = "incomplete";
  HomeworkGradeLevel["NA"] = "NA";
  HomeworkGradeLevel["F"] = "F";
  return HomeworkGradeLevel;
}({});
let HomeworkCompletionType = exports.HomeworkCompletionType = /*#__PURE__*/function (HomeworkCompletionType) {
  HomeworkCompletionType[HomeworkCompletionType["INDIVIDUA"] = 1] = "INDIVIDUA";
  HomeworkCompletionType[HomeworkCompletionType["GRUOP"] = 2] = "GRUOP";
  return HomeworkCompletionType;
}({});
let HomeworkSubmissionType = exports.HomeworkSubmissionType = /*#__PURE__*/function (HomeworkSubmissionType) {
  HomeworkSubmissionType[HomeworkSubmissionType["WEB_LEARNING"] = 2] = "WEB_LEARNING";
  HomeworkSubmissionType[HomeworkSubmissionType["OFFLINE"] = 0] = "OFFLINE";
  return HomeworkSubmissionType;
}({});
let Language = exports.Language = /*#__PURE__*/function (Language) {
  Language["ZH"] = "zh";
  Language["EN"] = "en";
  return Language;
}({});
//# sourceMappingURL=types.js.map