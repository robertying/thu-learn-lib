import { describe, expect, it } from 'vitest';

import { contentTypeCode, contentTypeOfCode, parseSemesterType, previewModule } from '../src/codes.ts';
import { ContentType, SemesterType } from '../src/index.ts';

describe('codes', () => {
  it('reads the semester type from its number', () => {
    expect(parseSemesterType(1)).toBe(SemesterType.FALL);
    expect(parseSemesterType(2)).toBe(SemesterType.SPRING);
    expect(parseSemesterType(3)).toBe(SemesterType.SUMMER);
    expect(parseSemesterType(0)).toBe(SemesterType.UNKNOWN);
    expect(parseSemesterType(NaN)).toBe(SemesterType.UNKNOWN);
  });

  it('maps every content type to its code and back', () => {
    for (const type of Object.values(ContentType)) {
      expect(contentTypeOfCode(contentTypeCode(type))).toBe(type);
    }
    expect(contentTypeOfCode('KCKB')).toBeUndefined();
  });

  it('gives the preview module of a content type with files', () => {
    expect(previewModule(ContentType.FILE)).toBe('mk_kcwj');
    expect(previewModule(ContentType.HOMEWORK)).toBe('mk_kczy');
    expect(previewModule(ContentType.NOTIFICATION)).toBe('mk_kcgg');
  });
});
