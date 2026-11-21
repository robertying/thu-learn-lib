import { describe, expect, it } from 'vitest';

import { FailReason } from '../src/index.ts';
import {
  $,
  JSONP_EXTRACTOR_NAME,
  apiError,
  decodeBase64,
  decodeUtf8Bytes,
  decodeHTML,
  expectSuccess,
  extractJSONPResult,
  formatFileSize,
  looksLikeLoginPage,
  toRequiredServerTime,
  optionalHtml,
  optionalText,
  toServerTime,
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

describe('decodeBase64', () => {
  it('decodes base64 of UTF-8 text, ignoring whitespace in it', () => {
    const encoded = Buffer.from('<p>内容 ✓ 😀</p>', 'utf8').toString('base64');
    expect(decodeBase64(encoded)).toBe('<p>内容 ✓ 😀</p>');
    expect(decodeBase64(`${encoded.slice(0, 8)}\n${encoded.slice(8)}`)).toBe('<p>内容 ✓ 😀</p>');
  });

  it("gives '' for a missing value or one that isn't base64", () => {
    expect(decodeBase64(undefined)).toBe('');
    expect(decodeBase64(null)).toBe('');
    expect(decodeBase64('')).toBe('');
    expect(decodeBase64('%%%')).toBe('');
  });

  it("gives one character per byte for bytes that aren't UTF-8", () => {
    expect(decodeBase64(Buffer.from([0x61, 0xff]).toString('base64'))).toBe('a\xff');
  });

  it('keeps a leading byte order mark, as text', () => {
    expect(decodeBase64(Buffer.from('\uFEFFa', 'utf8').toString('base64'))).toBe('\uFEFFa');
  });
});

const bytesOf = (values: number[]) => String.fromCharCode(...values);

/** what `decodeURIComponent`, a strict UTF-8 decoder of its own, gives for the bytes; `undefined` when it throws */
const reference = (values: number[]) => {
  try {
    return decodeURIComponent(values.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''));
  } catch {
    return undefined;
  }
};

describe('decodeUtf8Bytes', () => {
  it('reads UTF-8 of every length, past one chunk of code units', () => {
    const text = '<p>内容 ✓ 😀 \u0000 \u07FF \uFFFF \u{10FFFF}</p>'.repeat(2000);
    expect(decodeUtf8Bytes(Buffer.from(text, 'utf8').toString('latin1'))).toBe(text);
    expect(decodeUtf8Bytes('')).toBe('');
  });

  it.each([
    ['a stray continuation byte', [0x80]],
    ['a byte UTF-8 never uses', [0xff, 0x41]],
    ['an overlong form', [0xc0, 0x80]],
    ['an overlong three-byte form', [0xe0, 0x80, 0x80]],
    ['an encoded surrogate', [0xed, 0xa0, 0x80]],
    ['a code point past U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['a cut-off sequence', [0xe4, 0xb8]],
    ['a sequence cut by an ASCII byte', [0xe4, 0x41, 0x80]],
  ])('gives undefined for %s', (_, values) => {
    expect(decodeUtf8Bytes(bytesOf(values))).toBeUndefined();
    expect(reference(values)).toBeUndefined();
  });

  it('agrees with decodeURIComponent and TextDecoder on random bytes', () => {
    const strict = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    let seed = 1;
    const next = () => (seed = (seed * 16807) % 2147483647);
    for (let n = 0; n < 5000; n++) {
      // mostly UTF-8 lead and continuation bytes, so valid and invalid sequences both come up
      const values = Array.from({ length: 1 + (next() % 8) }, () =>
        next() % 3 === 0 ? next() % 0x80 : 0x80 + (next() % 0x80),
      );
      let expected: string | undefined;
      try {
        expected = strict.decode(new Uint8Array(values));
      } catch {
        expected = undefined;
      }
      expect(decodeUtf8Bytes(bytesOf(values))).toBe(expected);
      expect(reference(values)).toBe(expected);
    }
  });
});

describe('optionalText', () => {
  it('trims and decodes a JSON field, including HTML the server sent escaped', () => {
    expect(optionalText('  a &amp; b\n')).toBe('a & b');
    expect(optionalText('&lt;p&gt;x&lt;/p&gt;')).toBe('<p>x</p>');
  });

  it('gives undefined for a missing or blank text', () => {
    expect(optionalText(undefined)).toBeUndefined();
    expect(optionalText(null)).toBeUndefined();
    expect(optionalText('')).toBeUndefined();
    expect(optionalText(' \n\t ')).toBeUndefined();
  });
});

describe('optionalHtml', () => {
  it('trims markup without decoding it again', () => {
    expect(optionalHtml('  <p>use &lt;div&gt; &amp; more</p>\n')).toBe('<p>use &lt;div&gt; &amp; more</p>');
  });

  it('gives undefined for missing or blank markup', () => {
    expect(optionalHtml(undefined)).toBeUndefined();
    expect(optionalHtml(null)).toBeUndefined();
    expect(optionalHtml(' \n ')).toBeUndefined();
  });
});

describe('$', () => {
  it('parses HTML, so void tags stay empty and .html() keeps characters as they are', () => {
    const page = $('<div id="d"><p>a&nbsp;&lt;b&gt; 中文</p><br><input name="x"><span id="s">after</span></div>');
    expect(page('#s').parent().attr('id')).toBe('d');
    expect(page('#d').html()).toBe('<p>a&nbsp;&lt;b&gt; 中文</p><br><input name="x"><span id="s">after</span>');
    expect(page('p').text()).toBe('a\u00a0<b> 中文');
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
