"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseType = exports.ContentType = exports.SemesterType = exports.FailReason = void 0;
var FailReason;
(function (FailReason) {
    FailReason["NO_CREDENTIAL"] = "no credential provided";
    FailReason["ERROR_FETCH_FROM_ID"] = "could not fetch ticket from id.tsinghua.edu.cn";
    FailReason["BAD_CREDENTIAL"] = "bad credential";
    FailReason["ERROR_ROAMING"] = "could not roam to learn.tsinghua.edu.cn";
    FailReason["NOT_LOGGED_IN"] = "not logged in or login timeout";
    FailReason["NOT_IMPLEMENTED"] = "not implemented";
    FailReason["INVALID_RESPONSE"] = "invalid response";
    FailReason["UNEXPECTED_STATUS"] = "unexpected status";
})(FailReason || (exports.FailReason = FailReason = {}));
var SemesterType;
(function (SemesterType) {
    SemesterType["FALL"] = "\u79CB\u5B63\u5B66\u671F";
    SemesterType["SPRING"] = "\u6625\u5B63\u5B66\u671F";
    SemesterType["SUMMER"] = "\u590F\u5B63\u5B66\u671F";
    SemesterType["UNKNOWN"] = "";
})(SemesterType || (exports.SemesterType = SemesterType = {}));
var ContentType;
(function (ContentType) {
    ContentType["NOTIFICATION"] = "notification";
    ContentType["FILE"] = "file";
    ContentType["HOMEWORK"] = "homework";
    ContentType["DISCUSSION"] = "discussion";
    ContentType["QUESTION"] = "question";
})(ContentType || (exports.ContentType = ContentType = {}));
var CourseType;
(function (CourseType) {
    CourseType["STUDENT"] = "student";
    CourseType["TEACHER"] = "teacher";
})(CourseType || (exports.CourseType = CourseType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBUUEsSUFBWSxVQVNYO0FBVEQsV0FBWSxVQUFVO0lBQ3BCLHNEQUF3QyxDQUFBO0lBQ3hDLG9GQUFzRSxDQUFBO0lBQ3RFLCtDQUFpQyxDQUFBO0lBQ2pDLHVFQUF5RCxDQUFBO0lBQ3pELDhEQUFnRCxDQUFBO0lBQ2hELGlEQUFtQyxDQUFBO0lBQ25DLG1EQUFxQyxDQUFBO0lBQ3JDLHFEQUF1QyxDQUFBO0FBQ3pDLENBQUMsRUFUVyxVQUFVLDBCQUFWLFVBQVUsUUFTckI7QUFPRCxJQUFZLFlBS1g7QUFMRCxXQUFZLFlBQVk7SUFDdEIsaURBQWEsQ0FBQTtJQUNiLG1EQUFlLENBQUE7SUFDZixtREFBZSxDQUFBO0lBQ2YsNEJBQVksQ0FBQTtBQUNkLENBQUMsRUFMVyxZQUFZLDRCQUFaLFlBQVksUUFLdkI7QUFFRCxJQUFZLFdBTVg7QUFORCxXQUFZLFdBQVc7SUFDckIsNENBQTZCLENBQUE7SUFDN0IsNEJBQWEsQ0FBQTtJQUNiLG9DQUFxQixDQUFBO0lBQ3JCLHdDQUF5QixDQUFBO0lBQ3pCLG9DQUFxQixDQUFBO0FBQ3ZCLENBQUMsRUFOVyxXQUFXLDJCQUFYLFdBQVcsUUFNdEI7QUFzQkQsSUFBWSxVQUdYO0FBSEQsV0FBWSxVQUFVO0lBQ3BCLGlDQUFtQixDQUFBO0lBQ25CLGlDQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFIVyxVQUFVLDBCQUFWLFVBQVUsUUFHckIifQ==