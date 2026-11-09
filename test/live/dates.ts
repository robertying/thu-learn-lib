// Date arithmetic for the live tests. The server writes dates as YYYY-MM-DD (sometimes followed by a time); the
// registrar's calendar takes yyyymmdd.

/** milliseconds in a day */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** a YYYY-MM-DD date (anything after it, like a time, is ignored) plus `days`, as YYYY-MM-DD */
export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** a YYYY-MM-DD date (anything after it is ignored) as yyyymmdd */
export const toYyyymmdd = (date: string): string => date.slice(0, 10).replaceAll('-', '');

/** whether two dates are the same day, written as YYYY-MM-DD or yyyymmdd */
export const sameDate = (a: string, b: string): boolean => a.replaceAll('-', '') === b.replaceAll('-', '');
