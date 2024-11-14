"use strict";

export let FailReason = /*#__PURE__*/function (FailReason) {
  FailReason["NO_CREDENTIAL"] = "no credential provided";
  FailReason["ERROR_FETCH_FROM_ID"] = "could not fetch ticket from id.tsinghua.edu.cn";
  FailReason["BAD_CREDENTIAL"] = "bad credential";
  FailReason["ERROR_ROAMING"] = "could not roam to learn.tsinghua.edu.cn";
  FailReason["NOT_LOGGED_IN"] = "not logged in or login timeout";
  FailReason["NOT_IMPLEMENTED"] = "not implemented";
  FailReason["INVALID_RESPONSE"] = "invalid response";
  FailReason["UNEXPECTED_STATUS"] = "unexpected status";
  FailReason["OPERATION_FAILED"] = "operation failed";
  return FailReason;
}({});
export let SemesterType = /*#__PURE__*/function (SemesterType) {
  SemesterType["FALL"] = "fall";
  SemesterType["SPRING"] = "spring";
  SemesterType["SUMMER"] = "summer";
  SemesterType["UNKNOWN"] = "";
  return SemesterType;
}({});
export let ContentType = /*#__PURE__*/function (ContentType) {
  ContentType["NOTIFICATION"] = "notification";
  ContentType["FILE"] = "file";
  ContentType["HOMEWORK"] = "homework";
  ContentType["DISCUSSION"] = "discussion";
  ContentType["QUESTION"] = "question";
  ContentType["QUESTIONNAIRE"] = "questionnaire";
  return ContentType;
}({});
export let CourseType = /*#__PURE__*/function (CourseType) {
  CourseType["STUDENT"] = "student";
  CourseType["TEACHER"] = "teacher";
  return CourseType;
}({});
export let HomeworkGradeLevel = /*#__PURE__*/function (HomeworkGradeLevel) {
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
export let HomeworkCompletionType = /*#__PURE__*/function (HomeworkCompletionType) {
  HomeworkCompletionType[HomeworkCompletionType["INDIVIDUA"] = 1] = "INDIVIDUA";
  HomeworkCompletionType[HomeworkCompletionType["GRUOP"] = 2] = "GRUOP";
  return HomeworkCompletionType;
}({});
export let HomeworkSubmissionType = /*#__PURE__*/function (HomeworkSubmissionType) {
  HomeworkSubmissionType[HomeworkSubmissionType["WEB_LEARNING"] = 2] = "WEB_LEARNING";
  HomeworkSubmissionType[HomeworkSubmissionType["OFFLINE"] = 0] = "OFFLINE";
  return HomeworkSubmissionType;
}({});
export let QuestionnaireDetailType = /*#__PURE__*/function (QuestionnaireDetailType) {
  QuestionnaireDetailType["SINGLE"] = "dnx";
  QuestionnaireDetailType["MULTI"] = "dox";
  QuestionnaireDetailType["TEXT"] = "wd";
  return QuestionnaireDetailType;
}({});
export let QuestionnaireType = /*#__PURE__*/function (QuestionnaireType) {
  QuestionnaireType["VOTE"] = "tp";
  QuestionnaireType["FORM"] = "tb";
  QuestionnaireType["SURVEY"] = "wj";
  return QuestionnaireType;
}({});
export let Language = /*#__PURE__*/function (Language) {
  Language["ZH"] = "zh";
  Language["EN"] = "en";
  return Language;
}({});
//# sourceMappingURL=types.js.map