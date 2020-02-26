import { SemesterType } from "./types";
export declare function parseSemesterType(n: number): SemesterType;
export declare function decodeHTML(html: string): string;
export declare function trimAndDefine(text: string | undefined | null): string | undefined;
export declare function mapGradeToLevel(grade: number | null): string | undefined;
export declare const JSONP_EXTRACTOR_NAME = "thu_learn_lib_jsonp_extractor";
export declare function extractJSONPResult(jsonp: string): any;
