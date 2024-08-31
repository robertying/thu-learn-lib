import { SemesterType, ContentType, HomeworkGradeLevel } from './types';
export declare function parseSemesterType(n: number): SemesterType;
export declare function getMkFromType(type: ContentType): string;
export declare function decodeHTML(html: string): string;
export declare function trimAndDefine(text: string | undefined | null): string | undefined;
export declare const GRADE_LEVEL_MAP: Map<number, HomeworkGradeLevel>;
export declare const JSONP_EXTRACTOR_NAME = "thu_learn_lib_jsonp_extractor";
export declare function extractJSONPResult(jsonp: string): any;
//# sourceMappingURL=utils.d.ts.map