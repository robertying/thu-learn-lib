"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FailReason;
(function (FailReason) {
    FailReason["NO_CREDENTIAL"] = "no credential provided";
    FailReason["ERROR_FETCH_FROM_ID"] = "could not fetch ticket from id.tsinghua.edu.cn";
    FailReason["BAD_CREDENTIAL"] = "bad credential";
    FailReason["ERROR_ROAMING"] = "could not roam to learn.tsinghua.edu.cn";
    FailReason["NOT_LOGGED_IN"] = "not logged in or login timeout";
    FailReason["NOT_IMPLEMENTED"] = "not implemented";
    FailReason["INVALID_RESPONSE"] = "invalid response";
})(FailReason = exports.FailReason || (exports.FailReason = {}));
var SemesterType;
(function (SemesterType) {
    SemesterType["FALL"] = "\u79CB\u5B63\u5B66\u671F";
    SemesterType["SPRING"] = "\u6625\u5B63\u5B66\u671F";
    SemesterType["SUMMER"] = "\u590F\u5B63\u5B66\u671F";
    SemesterType["UNKNOWN"] = "";
})(SemesterType = exports.SemesterType || (exports.SemesterType = {}));
var ContentType;
(function (ContentType) {
    ContentType["NOTIFICATION"] = "notification";
    ContentType["FILE"] = "file";
    ContentType["HOMEWORK"] = "homework";
    ContentType["DISCUSSION"] = "discussion";
    ContentType["QUESTION"] = "question";
})(ContentType = exports.ContentType || (exports.ContentType = {}));
var CourseType;
(function (CourseType) {
    CourseType["STUDENT"] = "student";
    CourseType["TEACHER"] = "teacher";
})(CourseType = exports.CourseType || (exports.CourseType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFVQSxJQUFZLFVBUVg7QUFSRCxXQUFZLFVBQVU7SUFDcEIsc0RBQXdDLENBQUE7SUFDeEMsb0ZBQXNFLENBQUE7SUFDdEUsK0NBQWlDLENBQUE7SUFDakMsdUVBQXlELENBQUE7SUFDekQsOERBQWdELENBQUE7SUFDaEQsaURBQW1DLENBQUE7SUFDbkMsbURBQXFDLENBQUE7QUFDdkMsQ0FBQyxFQVJXLFVBQVUsR0FBVixrQkFBVSxLQUFWLGtCQUFVLFFBUXJCO0FBRUQsSUFBWSxZQUtYO0FBTEQsV0FBWSxZQUFZO0lBQ3RCLGlEQUFhLENBQUE7SUFDYixtREFBZSxDQUFBO0lBQ2YsbURBQWUsQ0FBQTtJQUNmLDRCQUFZLENBQUE7QUFDZCxDQUFDLEVBTFcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFLdkI7QUFFRCxJQUFZLFdBTVg7QUFORCxXQUFZLFdBQVc7SUFDckIsNENBQTZCLENBQUE7SUFDN0IsNEJBQWEsQ0FBQTtJQUNiLG9DQUFxQixDQUFBO0lBQ3JCLHdDQUF5QixDQUFBO0lBQ3pCLG9DQUFxQixDQUFBO0FBQ3ZCLENBQUMsRUFOVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQU10QjtBQWFELElBQVksVUFHWDtBQUhELFdBQVksVUFBVTtJQUNwQixpQ0FBbUIsQ0FBQTtJQUNuQixpQ0FBbUIsQ0FBQTtBQUNyQixDQUFDLEVBSFcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFHckIifQ==