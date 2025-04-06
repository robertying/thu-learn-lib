import * as cheerio from 'cheerio';
import { ContentType, HomeworkGradeLevel, QuestionnaireType, SemesterType } from './types';
export declare function parseSemesterType(n: number): SemesterType;
export declare function getMkFromType(type: ContentType): string;
export declare function decodeHTML(html: string): string;
export declare function replaceLatexWithSource(result: cheerio.CheerioAPI): void;
export declare function trimAndDefine(text: string | undefined | null): string | undefined;
export declare const GRADE_LEVEL_MAP: Map<number, HomeworkGradeLevel>;
export declare const JSONP_EXTRACTOR_NAME = "thu_learn_lib_jsonp_extractor";
export declare function extractJSONPResult(jsonp: string): any;
export declare function formatFileSize(size: number): string;
export declare const CONTENT_TYPE_MAP: Map<ContentType, string>;
export declare const CONTENT_TYPE_MAP_REVERSE: Map<string, ContentType>;
export declare const QNR_TYPE_MAP: Map<string, QuestionnaireType>;
//# sourceMappingURL=utils.d.ts.map