import { describe, expect, it } from 'vitest';

import { toRequiredServerTime, toServerTime } from '../src/utils.ts';

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
