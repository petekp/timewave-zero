/**
 * Time helpers for the modern view. Time is a continuous Gregorian day number
 * (Julian Day Number plus the fraction of the day), so every date from the
 * 72-billion-year cycle down to a single minute is a plain double.
 */
import { fromDayNumber, toDayNumber, type Moment } from "../timewave/calendar";

export const DAYS_PER_YEAR = 365.2425;

export function momentToDay(m: Moment): number {
  return toDayNumber(m, "gregorian");
}

export function dayToMoment(day: number): Moment {
  return fromDayNumber(day, "gregorian");
}

/** Day number of a JavaScript Date, in the local calendar. */
export function dateToDay(d: Date): number {
  return momentToDay({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad2 = (n: number): string => String(n).padStart(2, "0");

function withThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Astronomical year as people read it: "1999", "12,000", "2300 BC", "17.6 million BC". */
export function formatYear(year: number): string {
  const bc = year <= 0;
  const n = bc ? 1 - year : year;
  let s: string;
  if (n >= 1e9) s = trimFloat(n / 1e9) + " billion";
  else if (n >= 1e6) s = trimFloat(n / 1e6) + " million";
  else s = n >= 10000 ? withThousands(n) : String(n);
  return bc ? `${s} BC` : s;
}

function trimFloat(v: number): string {
  return v.toPrecision(3).replace(/\.?0+$/, "");
}

export type DateDetail = "minute" | "hour" | "day" | "month" | "year";

/** A day number as text, to the given detail. */
export function formatDay(day: number, detail: DateDetail): string {
  const m = dayToMoment(day);
  switch (detail) {
    case "minute":
    case "hour":
      return `${MONTHS[m.month - 1]} ${m.day}, ${pad2(m.hour)}:${pad2(m.minute)}`;
    case "day":
      return `${MONTHS[m.month - 1]} ${m.day}, ${formatYear(m.year)}`;
    case "month":
      return `${MONTHS[m.month - 1]} ${formatYear(m.year)}`;
    case "year":
      return formatYear(m.year);
  }
}

/** Full date and time, for the readout. */
export function formatDayFull(day: number): string {
  const m = dayToMoment(day);
  return `${MONTHS[m.month - 1]} ${m.day}, ${formatYear(m.year)} ${pad2(m.hour)}:${pad2(m.minute)}`;
}

/** A length of time in days as a rounded human unit ("384 days", "67.3 years", "1.13 billion years"). */
export function formatDuration(days: number): string {
  const abs = Math.abs(days);
  if (abs < 1 / 24) return `${Math.round(abs * 1440)} min`;
  if (abs < 2) return `${trimFloat(abs * 24)} hours`;
  if (abs < 400) return `${abs >= 100 ? Math.round(abs) : trimFloat(abs)} days`;
  const years = abs / DAYS_PER_YEAR;
  if (years < 1e4) return `${years >= 1000 ? withThousands(Math.round(years)) : trimFloat(years)} years`;
  if (years < 1e6) return `${withThousands(Math.round(years / 100) * 100)} years`;
  if (years < 1e9) return `${trimFloat(years / 1e6)} million years`;
  return `${trimFloat(years / 1e9)} billion years`;
}

/** Days to the zero point as "4,936.48 days" or "13.7 years before/after". */
export function formatDaysToZero(days: number): string {
  const side = days >= 0 ? "before" : "after";
  const abs = Math.abs(days);
  if (abs < 1000) return `${abs.toFixed(abs < 10 ? 3 : 1)} days ${side}`;
  return `${formatDuration(abs)} ${side}`;
}
