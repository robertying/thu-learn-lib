import { describe, expect, it } from 'vitest';

import { CLASS_PERIOD_TIMES, parseCourseMeeting, parseWeeks, semesterWeek } from '../src/index.ts';

describe('parseWeeks', () => {
  it.each([
    ['全周', null],
    ['1-4周', [1, 2, 3, 4]],
    ['9,11周', [9, 11]],
    ['第1-2,5周', [1, 2, 5]],
    ['1～3周', [1, 2, 3]],
    ['前八周', [1, 2, 3, 4, 5, 6, 7, 8]],
    ['后八周', [9, 10, 11, 12, 13, 14, 15, 16]],
    ['单周', [1, 3, 5, 7, 9, 11, 13, 15]],
    ['双周', [2, 4, 6, 8, 10, 12, 14, 16]],
    ['奇怪', null],
    ['Week all ', null],
    ['Week 1-4', [1, 2, 3, 4]],
    ['Week 9,11 ', [9, 11]],
    ['Weeks 1-2, 5', [1, 2, 5]],
    ['First 8 weeks', [1, 2, 3, 4, 5, 6, 7, 8]],
    ['Last 8 weeks', [9, 10, 11, 12, 13, 14, 15, 16]],
    ['Odd weeks', [1, 3, 5, 7, 9, 11, 13, 15]],
    ['Even weeks', [2, 4, 6, 8, 10, 12, 14, 16]],
    ['Strange', null],
  ])('%s', (text, weeks) => {
    expect(parseWeeks(text)).toEqual(weeks);
  });
});

describe('parseCourseMeeting', () => {
  it('reads the day, period, weeks and place', () => {
    expect(parseCourseMeeting('星期六第1节(9,11周)，六教6A414')).toEqual({
      weekday: 6,
      period: 1,
      weeks: [9, 11],
      location: '六教6A414',
    });
    expect(parseCourseMeeting('星期日第6节（全周），')).toEqual({ weekday: 7, period: 6, weeks: null, location: '' });
  });

  it('skips entries without a day or a known period', () => {
    expect(parseCourseMeeting('星期第0节(全周)，')).toBeNull();
    expect(parseCourseMeeting('星期一第9节(全周)，')).toBeNull();
    expect(parseCourseMeeting('')).toBeNull();
  });

  it('reads the English form', () => {
    expect(parseCourseMeeting('Section 2 of Wed (Week all ), 六教6A414')).toEqual({
      weekday: 3,
      period: 2,
      weeks: null,
      location: '六教6A414',
    });
    expect(parseCourseMeeting('Section 1 of Sat (Week 9,11 ), 六教6A414')).toEqual({
      weekday: 6,
      period: 1,
      weeks: [9, 11],
      location: '六教6A414',
    });
  });

  it.each([
    ['Section 2  of Mon (Week all ), 六教6C101', 1, 2],
    ['Section 6 of Tues (Week all ), 六教6A211', 2, 6],
    ['Section 3 of Tue. (Week all ), 一教101', 2, 3],
    ['Section 6 of Thur (Week all ), 一教101', 4, 6],
    ['Section 4 of Thursday (Week all ), 一教101', 4, 4],
    ['Section 1 of Fri (Week all ), 六教6A414', 5, 1],
    ['section 5 of SAT (Week all ), 一教101', 6, 5],
    ['Section 6 of Sun (Week all ), ', 7, 6],
  ])('reads %s', (text, weekday, period) => {
    expect(parseCourseMeeting(text)).toMatchObject({ weekday, period });
  });

  it('skips English entries without a day or a known period', () => {
    expect(parseCourseMeeting('Section 0  (Week all ), ')).toBeNull();
    expect(parseCourseMeeting('Section 9 of Mon (Week all ), ')).toBeNull();
    expect(parseCourseMeeting('Section 2 of Xyz (Week all ), ')).toBeNull();
  });

  it('only gives periods that have times', () => {
    for (let period = 0; period <= 7; period++) {
      const meeting = parseCourseMeeting(`星期一第${period}节(全周)，`);
      expect(meeting === null).toBe(CLASS_PERIOD_TIMES[period] === undefined);
    }
  });
});

describe('semesterWeek', () => {
  it('counts teaching weeks from a Monday start', () => {
    expect(semesterWeek('2026-09-14', '2026-09-14')).toBe(1);
    expect(semesterWeek('2026-09-14', '2026-09-20')).toBe(1);
    expect(semesterWeek('2026-09-14', '2026-09-21')).toBe(2);
    expect(semesterWeek('2026-09-14', '2026-11-09')).toBe(9);
    expect(semesterWeek('2026-09-14', '2026-09-13')).toBe(0);
    expect(semesterWeek('2026-09-14', '2026-09-06')).toBe(-1);
  });

  it('starts a weekend start on the Monday after it', () => {
    // fall 2026 starts on Saturday Sep 12; teachers count Nov 4 as week 8
    expect(semesterWeek('2026-09-12', '2026-09-14')).toBe(1);
    expect(semesterWeek('2026-09-12', '2026-09-13')).toBe(0);
    expect(semesterWeek('2026-09-12', '2026-11-04')).toBe(8);
    expect(semesterWeek('2026-09-12', '2026-11-13')).toBe(9);
    expect(semesterWeek('2026-09-13', '2026-11-04')).toBe(8);
  });

  it('keeps a weekday start in its own week', () => {
    expect(semesterWeek('2026-09-16', '2026-09-14')).toBe(1);
    expect(semesterWeek('2026-09-16', '2026-11-04')).toBe(8);
  });

  it('counts across a year end', () => {
    expect(semesterWeek('2026-09-14', '2027-01-04')).toBe(17);
  });

  it('ignores a time after the date', () => {
    expect(semesterWeek('2026-09-12 00:00:00', '2026-11-04')).toBe(8);
  });

  it('throws a RangeError for a date that is not YYYY-MM-DD', () => {
    expect(() => semesterWeek('', '2026-11-04')).toThrow(RangeError);
    expect(() => semesterWeek('2026-09-14', '2026-02-30')).toThrow(RangeError);
    expect(() => semesterWeek('20260914', '2026-11-04')).toThrow(RangeError);
  });
});
