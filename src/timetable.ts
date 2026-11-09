// Reading a course's time and location (`Course.timeAndLocation`) and counting teaching weeks, for working out a
// timetable without the registrar's calendar.

import type { CourseMeeting } from './types.ts';

/**
 * The start and end (Beijing time, HH:mm) of each class period (大节), which is what a course's time and location
 * counts in.
 */
export const CLASS_PERIOD_TIMES: Readonly<Record<number, readonly [string, string]>> = {
  1: ['08:00', '09:35'],
  2: ['09:50', '12:15'],
  3: ['13:30', '15:05'],
  4: ['15:20', '16:55'],
  5: ['17:05', '18:40'],
  6: ['19:20', '21:45'],
};

/** weeks in a regular term, for "every other week", "last eight weeks" and the like */
const TERM_WEEKS = 16;

const range = (from: number, to: number, step = 1): number[] => {
  const weeks: number[] = [];
  for (let w = from; w <= to; w += step) weeks.push(w);
  return weeks;
};

const WEEKDAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

/** English weekdays by their first three letters (the server writes `Mon`, `Tues`, `Thur`, …) */
const ENGLISH_WEEKDAYS: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };

/** week specs that aren't a list of weeks, in Chinese and in English (spaces removed, lower case) */
const NAMED_WEEKS: Record<string, () => number[] | null> = {
  全周: () => null,
  all: () => null,
  every: () => null,
  full: () => null,
  前八周: () => range(1, 8),
  first8: () => range(1, 8),
  firsteight: () => range(1, 8),
  后八周: () => range(9, TERM_WEEKS),
  last8: () => range(9, TERM_WEEKS),
  lasteight: () => range(9, TERM_WEEKS),
  单周: () => range(1, TERM_WEEKS, 2),
  odd: () => range(1, TERM_WEEKS, 2),
  双周: () => range(2, TERM_WEEKS, 2),
  even: () => range(2, TERM_WEEKS, 2),
};

/**
 * The teaching weeks a meeting happens in, from the part of its time and location in parentheses: `全周`, `1-8周`,
 * `9,11周`, `单周`, or in English `Week all`, `Week 1-8`, `Odd weeks`. `null` means every week, also for text it
 * doesn't know.
 */
export function parseWeeks(text: string): number[] | null {
  const spec = text
    .replace(/\s/g, '')
    .toLowerCase()
    .replace(/^(?:第|weeks?|wks?)/, '')
    .replace(/(?:周|weeks?|wks?)$/, '');
  const named = NAMED_WEEKS[spec] ?? NAMED_WEEKS[`${spec}周`];
  if (named) return named();
  const weeks: number[] = [];
  for (const part of spec.split(/[,，、;；]/)) {
    const match = /^(\d+)(?:[-~～–—](\d+))?$/.exec(part);
    if (!match) return null;
    const from = Number(match[1]);
    weeks.push(...range(from, match[2] ? Number(match[2]) : from));
  }
  return weeks;
}

const toMeeting = (weekday: number | undefined, period: number, weeks: string, location: string) =>
  weekday && CLASS_PERIOD_TIMES[period]
    ? { weekday, period, weeks: parseWeeks(weeks), location: location.trim() }
    : null;

/**
 * Read one entry of a course's time and location (`Course.timeAndLocation`): `星期六第1节(9,11周)，六教6A414`, or
 * `Section 1 of Sat (Week 9,11 ), 六教6A414` when the website is in English. Entries without a day or a known period
 * (`星期第0节(全周)，`, `Section 0  (Week all ), `) give `null`.
 */
export function parseCourseMeeting(text: string): CourseMeeting | null {
  const chinese = /星期([一二三四五六日天])第(\d+)节\s*[(（]([^)）]*)[)）]\s*[，,]?\s*(.*)$/.exec(text);
  if (chinese) return toMeeting(WEEKDAYS[chinese[1]], Number(chinese[2]), chinese[3], chinese[4]);
  const english = /section\s*(\d+)\s*(?:of\s*([a-z]+)\.?)?\s*[(（]([^)）]*)[)）]\s*[，,]?\s*(.*)$/i.exec(text);
  if (english) {
    const day = english[2]?.slice(0, 3).toLowerCase();
    return toMeeting(day ? ENGLISH_WEEKDAYS[day] : undefined, Number(english[1]), english[3], english[4]);
  }
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** a YYYY-MM-DD date (anything after it, like a time, is ignored) as days since the epoch */
const dayNumber = (date: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const time = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== date.slice(0, 10)) {
    throw new RangeError(`invalid date ${date}, expected YYYY-MM-DD`);
  }
  return time / DAY_MS;
};

/** days since the epoch of the Monday of the week of `day` (days since the epoch; day 0 was a Thursday) */
const mondayOf = (day: number) => day - ((day + 3) % 7);

/**
 * The teaching week `date` falls in, from 1 (0 or less before the term), for a term whose first day
 * (`SemesterInfo.startDate`) is `semesterStartDate`. Both are YYYY-MM-DD Beijing dates. Week 1 starts on the Monday
 * of the first day, or on the Monday after it when the first day is a weekend (fall 2026 starts on Saturday Sep 12;
 * week 1 is Sep 14–20). Throws a `RangeError` for a date that isn't YYYY-MM-DD.
 */
export function semesterWeek(semesterStartDate: string, date: string): number {
  const start = dayNumber(semesterStartDate);
  const weekday = (start + 3) % 7; // 0 Monday … 6 Sunday
  const firstMonday = weekday >= 5 ? start + 7 - weekday : start - weekday;
  return (mondayOf(dayNumber(date)) - firstMonday) / 7 + 1;
}
