/**
 * Text formats used on the original screens. The rules were read off the
 * DOS program's output; see docs/original-behavior.md.
 */
import type { CalendarDate } from "../timewave/calendar";
import { DAYS_PER_MONTH, DAYS_PER_YEAR, PLOT_WIDTH } from "./types";

export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Insert thousands separators into a string of digits. */
export function withThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Astronomical year as printed: no padding, minus sign, separators from five digits up. */
export function formatYear(year: number): string {
  const abs = Math.abs(year);
  const s = abs >= 10000 ? withThousands(String(abs)) : String(abs);
  return (year < 0 ? "-" : "") + s;
}

export function formatDate(d: CalendarDate): string {
  return `${pad2(d.month)}/${pad2(d.day)}/${formatYear(d.year)}`;
}

export function formatTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** Days to the zero point: separators and four decimals, truncated as the original does ("4,936.4809"). */
export function formatDays(days: number): string {
  const [i, f] = Math.abs(days).toFixed(6).slice(0, -2).split(".");
  return (days < 0 ? "-" : "") + withThousands(i) + "." + f;
}

function integerDigits(v: number): number {
  const a = Math.abs(v);
  return a < 1 ? 1 : Math.floor(Math.log10(a)) + 1;
}

/** Wave value: 14 characters of digits and point, trailing zeros dropped ("0.00814417998"). */
export function formatValue(v: number): string {
  if (v === 0) return "0";
  const decimals = Math.max(0, 13 - integerDigits(v));
  let s = v.toFixed(decimals);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

/** The 14 y-axis labels from max (top) to min (bottom), each right-aligned in 9 characters. */
export function formatYLabels(max: number, min: number): string[] {
  const decimals = Math.max(0, Math.min(7, 8 - integerDigits(max)));
  const labels: string[] = [];
  for (let k = 0; k < 14; k++) {
    // The original forms the row's fraction in single precision; visible in the 7th decimal of large values.
    const v = min + (max - min) * Math.fround((13 - k) / 13);
    labels.push(v.toFixed(decimals).padStart(9));
  }
  return labels;
}

/** Target position as shown under the marker before a graph is drawn ("50.0%"). */
export function formatPercent(targetPx: number): string {
  return ((targetPx / PLOT_WIDTH) * 100).toFixed(1) + "%";
}

const EPS = 1e-9;

/** Split a span in days into whole years, months, days, hours and minutes. */
export function timespanParts(days: number): { years: number; months: number; days: number; hours: number; minutes: number } {
  const years = Math.floor(days / DAYS_PER_YEAR + EPS);
  let rem = days - years * DAYS_PER_YEAR;
  const months = Math.floor(rem / DAYS_PER_MONTH + EPS);
  rem -= months * DAYS_PER_MONTH;
  const wholeDays = Math.floor(rem + EPS);
  rem -= wholeDays;
  const hours = Math.floor(rem * 24 + EPS);
  rem -= hours / 24;
  const minutes = Math.floor(rem * 1440 + EPS);
  return { years, months, days: wholeDays, hours, minutes };
}

/** Up to three lines: "1 year", "and 10 months", "and 24 days". */
export function formatTimespan(days: number): string[] {
  const p = timespanParts(days);
  const units: [number, string][] = [
    [p.years, "year"],
    [p.months, "month"],
    [p.days, "day"],
    [p.hours, "hour"],
    [p.minutes, "minute"],
  ];
  const lines: string[] = [];
  for (const [n, unit] of units) {
    if (n === 0) continue;
    const count = n >= 10000 ? withThousands(String(n)) : String(n);
    let text = `${count} ${unit}${n === 1 ? "" : "s"}`;
    if (unit === "year" && text.length > 17) text = `${count} yrs`;
    lines.push(lines.length === 0 ? text : `and ${text}`);
    if (lines.length === 3) break;
  }
  return lines.length ? lines : ["0 days"];
}

/** Span in days from the whole years, months and days entered at the timespan prompt. */
export function timespanFromParts(years: number, months: number, days: number): number {
  return years * DAYS_PER_YEAR + months * DAYS_PER_MONTH + days;
}
