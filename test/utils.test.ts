import { describe, expect, it } from 'vitest';

import { ContentType, FailReason, SemesterType } from '../src/index.ts';
import {
  CONTENT_TYPE_MAP,
  CONTENT_TYPE_MAP_REVERSE,
  JSONP_EXTRACTOR_NAME,
  apiError,
  decodeHTML,
  expectSuccess,
  extractJSONPResult,
  formatFileSize,
  getMkFromType,
  looksLikeLoginPage,
  parseSemesterType,
  toRequiredServerTime,
  toServerTime,
  trimAndDefine,
  urlOf,
} from '../src/utils.ts';

describe('toServerTime', () => {
  it('reads millisecond timestamps, as numbers or strings, as Beijing time with its offset', () => {
    expect(toServerTime(1740000000000)).toBe('2025-02-20T05:20:00+08:00');
    expect(toServerTime('1740000000000')).toBe('2025-02-20T05:20:00+08:00');
    expect(new Date(toServerTime(1740000000000)!).getTime()).toBe(1740000000000);
  });

  it('reads 10-digit timestamps as seconds', () => {
    expect(toServerTime(1700000000)).toBe('2023-11-15T06:13:20+08:00');
    expect(toServerTime('1700000000')).toBe('2023-11-15T06:13:20+08:00');
  });

  it('adds the Beijing offset to zone-less wall-clock times, with or without seconds', () => {
    expect(toServerTime('2026-11-07 18:28')).toBe('2026-11-07T18:28:00+08:00');
    expect(toServerTime('2026-11-07 18:28:05')).toBe('2026-11-07T18:28:05+08:00');
    expect(toServerTime('2026-11-07 18:28:05.0')).toBe('2026-11-07T18:28:05+08:00');
    expect(new Date(toServerTime('2026-11-07 18:28')!).toISOString()).toBe('2026-11-07T10:28:00.000Z');
  });

  it('gives undefined for missing values and passes other strings on unchanged', () => {
    expect(toServerTime(null)).toBeUndefined();
    expect(toServerTime(undefined)).toBeUndefined();
    expect(toServerTime('')).toBeUndefined();
    expect(toServerTime('2025-02-20')).toBe('2025-02-20');
    expect(toServerTime('soon')).toBe('soon');
    expect(toRequiredServerTime(null)).toBe('');
  });

  it('gives undefined for a zero or out-of-range timestamp instead of 1970 or a throw', () => {
    expect(toServerTime(0)).toBeUndefined();
    expect(toServerTime(-1)).toBeUndefined();
    expect(toServerTime(1e20)).toBeUndefined();
    expect(toServerTime('99999999999999999999')).toBeUndefined();
  });
});

describe('apiError', () => {
  it('builds a plain { reason, extra } object, without extra when not given', () => {
    const error = apiError(FailReason.INVALID_RESPONSE, { code: 500 });
    expect(error).toStrictEqual({ reason: FailReason.INVALID_RESPONSE, extra: { code: 500 } });
    expect(error).not.toBeInstanceOf(Error);
    expect(apiError(FailReason.NOT_LOGGED_IN)).toStrictEqual({ reason: FailReason.NOT_LOGGED_IN });
  });
});

describe('expectSuccess', () => {
  it('accepts result success', () => {
    expect(() => expectSuccess({ result: 'success', object: [] }, FailReason.INVALID_RESPONSE)).not.toThrow();
  });

  it('throws the given reason with the answer in extra for anything else', () => {
    const answer = { result: 'error', msg: '失败' };
    expect(() => expectSuccess(answer, FailReason.OPERATION_FAILED)).toThrow(
      expect.objectContaining({ reason: FailReason.OPERATION_FAILED, extra: answer }),
    );
    for (const json of [null, undefined, 'success', { message: 'success' }]) {
      expect(() => expectSuccess(json, FailReason.INVALID_RESPONSE)).toThrow(
        expect.objectContaining({ reason: FailReason.INVALID_RESPONSE }),
      );
    }
  });
});

describe('decodeHTML', () => {
  it('decodes entities', () => {
    expect(decodeHTML('a &amp; b &lt;c&gt; &#20320;&quot;')).toBe('a & b <c> 你"');
  });

  it('strips the prefixes Web Learning puts before some texts', () => {
    expect(decodeHTML('\xC2\x9E\xC3\xA9\x65标题')).toBe('标题');
    expect(decodeHTML('\x9E\xE9\x65标题')).toBe('标题');
    expect(decodeHTML('\xE9\x65标题')).toBe('标题');
    expect(decodeHTML('标题\xE9\x65')).toBe('标题\xE9\x65');
  });

  it('gives an empty string for a missing text', () => {
    expect(decodeHTML(null as unknown as string)).toBe('');
    expect(decodeHTML(undefined as unknown as string)).toBe('');
  });
});

describe('trimAndDefine', () => {
  it('trims and decodes the text', () => {
    expect(trimAndDefine('  <p>a &amp; b</p>\n')).toBe('<p>a & b</p>');
  });

  it('gives undefined for a missing or blank text', () => {
    expect(trimAndDefine(undefined)).toBeUndefined();
    expect(trimAndDefine(null)).toBeUndefined();
    expect(trimAndDefine('')).toBeUndefined();
    expect(trimAndDefine(' \n\t ')).toBeUndefined();
  });
});

const call = (body: string) => `${JSONP_EXTRACTOR_NAME}(${body})`;

describe('extractJSONPResult', () => {
  it('parses the argument as JSON', () => {
    expect(extractJSONPResult(call('[{"nr":"课程"}]'))).toEqual([{ nr: '课程' }]);
  });

  it('accepts whitespace around the call and a trailing semicolon', () => {
    expect(extractJSONPResult(`\n  ${call('[1]')} ;\n`)).toEqual([1]);
    expect(extractJSONPResult(`${call('[1]')};`)).toEqual([1]);
  });

  it('rejects a body that is not the call with INVALID_RESPONSE and the start of the body', () => {
    for (const body of ['<html>维护中</html>', 'other_callback([1])', `${JSONP_EXTRACTOR_NAME}([1]`, '']) {
      expect(() => extractJSONPResult(body)).toThrow(
        expect.objectContaining({ reason: FailReason.INVALID_RESPONSE, extra: body.slice(0, 200) }),
      );
    }
  });

  it('rejects an argument that is not JSON with INVALID_RESPONSE, without running it', () => {
    const body = call('alert(1)');
    expect(() => extractJSONPResult(body)).toThrow(
      expect.objectContaining({
        reason: FailReason.INVALID_RESPONSE,
        extra: expect.objectContaining({ text: body }),
      }),
    );
    expect(() => extractJSONPResult(call("[{'single': 'quotes'}]"))).toThrow(
      expect.objectContaining({ reason: FailReason.INVALID_RESPONSE }),
    );
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0B'],
    [1023, '1023B'],
    [1024, '1.00K'],
    [1536, '1.50K'],
    [1024 * 1024 - 1, '1024.00K'],
    [1024 * 1024, '1.00M'],
    [5 * 1024 * 1024 * 1024, '5.00G'],
  ])('formats %d bytes as %s', (size, text) => {
    expect(formatFileSize(size)).toBe(text);
  });
});

describe('looksLikeLoginPage', () => {
  it('recognises the login timeout page and pages pointing at the login', () => {
    expect(looksLikeLoginPage('<html><title>登录超时</title></html>')).toBe(true);
    expect(looksLikeLoginPage('<p>您未登录或登录失效</p>')).toBe(true);
    expect(looksLikeLoginPage('<img src="/res/app/wlxt/img/log_fail.png">')).toBe(true);
    expect(looksLikeLoginPage('<script>location="/f/login_timeout"</script>')).toBe(true);
    expect(looksLikeLoginPage('<a href="https://id.tsinghua.edu.cn/do/off/ui/auth/login/form">')).toBe(true);
    expect(looksLikeLoginPage('<a href="/b/j_spring_security_thauth_roaming_entry?ticket=x">')).toBe(true);
  });

  it('does not take other pages, or long pages that mention the login, for a login page', () => {
    expect(looksLikeLoginPage('<html><body>系统维护中</body></html>')).toBe(false);
    expect(looksLikeLoginPage('')).toBe(false);
    expect(looksLikeLoginPage('<a href="/f/login_timeout">'.padEnd(4096))).toBe(false);
  });
});

describe('urlOf', () => {
  it('reads the URL of a string, a URL or a Request', () => {
    const url = 'https://learn.tsinghua.edu.cn/a?b=1';
    expect(urlOf(url)).toBe(url);
    expect(urlOf(new URL(url))).toBe(url);
    expect(urlOf(new Request(url))).toBe(url);
  });
});

describe('lookup tables', () => {
  it('reads the semester type from its number', () => {
    expect(parseSemesterType(1)).toBe(SemesterType.FALL);
    expect(parseSemesterType(2)).toBe(SemesterType.SPRING);
    expect(parseSemesterType(3)).toBe(SemesterType.SUMMER);
    expect(parseSemesterType(0)).toBe(SemesterType.UNKNOWN);
    expect(parseSemesterType(NaN)).toBe(SemesterType.UNKNOWN);
  });

  it('maps every content type to its code and back', () => {
    for (const type of Object.values(ContentType)) {
      expect(CONTENT_TYPE_MAP_REVERSE.get(CONTENT_TYPE_MAP.get(type)!)).toBe(type);
    }
    expect(CONTENT_TYPE_MAP_REVERSE.get('KCKB')).toBeUndefined();
  });

  it('gives the preview module of a content type', () => {
    expect(getMkFromType(ContentType.FILE)).toBe('mk_kcwj');
    expect(getMkFromType(ContentType.HOMEWORK)).toBe('mk_kczy');
    expect(getMkFromType(ContentType.NOTIFICATION)).toBe('mk_kcgg');
  });
});
