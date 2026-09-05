/**
 * Proleptic Gregorian and Julian calendar arithmetic on Julian Day Numbers.
 *
 * Years use astronomical numbering (year 0 = 1 BC, -1 = 2 BC), which is what
 * the day-number formulas need. Day numbers are plain integers, so spans of
 * billions of years stay exact in a double.
 */

export type CalendarKind = "gregorian" | "julian";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** A calendar date with a time of day. */
export interface Moment extends CalendarDate {
  hour: number;
  minute: number;
}

const floor = Math.floor;

export function isLeapYear(year: number, calendar: CalendarKind): boolean {
  if (year % 4 !== 0) return false;
  if (calendar === "julian") return true;
  if (year % 100 !== 0) return true;
  return year % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(year: number, month: number, calendar: CalendarKind): number {
  if (month === 2 && isLeapYear(year, calendar)) return 29;
  return MONTH_DAYS[month - 1];
}

export function isValidDate({ year, month, day }: CalendarDate, calendar: CalendarKind): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month, calendar);
}

/** Julian Day Number of a calendar date (the integer JDN conventionally assigned to that civil day). */
export function toJdn({ year, month, day }: CalendarDate, calendar: CalendarKind): number {
  const a = floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const common = day + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4);
  if (calendar === "julian") return common - 32083;
  return common - floor(y / 100) + floor(y / 400) - 32045;
}

export function fromJdn(jdn: number, calendar: CalendarKind): CalendarDate {
  let b = 0;
  let c: number;
  if (calendar === "gregorian") {
    const a = jdn + 32044;
    b = floor((4 * a + 3) / 146097);
    c = a - floor((146097 * b) / 4);
  } else {
    c = jdn + 32082;
  }
  const d = floor((4 * c + 3) / 1461);
  const e = c - floor((1461 * d) / 4);
  const m = floor((5 * e + 2) / 153);
  return {
    day: e - floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * floor(m / 10),
    year: 100 * b + d - 4800 + floor(m / 10),
  };
}

/** Continuous day count: the JDN of the date plus the fraction of the day elapsed. */
export function toDayNumber(moment: Moment, calendar: CalendarKind): number {
  return toJdn(moment, calendar) + (moment.hour * 60 + moment.minute) / 1440;
}

export function fromDayNumber(dayNumber: number, calendar: CalendarKind): Moment {
  const jdn = floor(dayNumber);
  const minutes = Math.round((dayNumber - jdn) * 1440);
  if (minutes >= 1440) return fromDayNumber(jdn + 1, calendar);
  return { ...fromJdn(jdn, calendar), hour: floor(minutes / 60), minute: minutes % 60 };
}

/** The zero point of the wave in the original software: 6 AM on December 21, 2012 (Gregorian). */
export const DEFAULT_ZERO_MOMENT: Moment = { year: 2012, month: 12, day: 21, hour: 6, minute: 0 };

/** Days from a target moment to the zero moment; positive before the zero point. */
export function daysToZero(target: Moment, zero: Moment, calendar: CalendarKind): number {
  return toDayNumber(zero, calendar) - toDayNumber(target, calendar);
}

export function momentBeforeZero(days: number, zero: Moment, calendar: CalendarKind): Moment {
  return fromDayNumber(toDayNumber(zero, calendar) - days, calendar);
}

/** Convert a date between calendars by way of its day number. */
export function convertCalendar(date: CalendarDate, from: CalendarKind, to: CalendarKind): CalendarDate {
  return fromJdn(toJdn(date, from), to);
}
