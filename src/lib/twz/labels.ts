/**
 * X-axis tick labels. The original prints one label per tick as a stack of
 * digits, choosing the calendar fields from the tick interval.
 */
import { momentBeforeZero, type CalendarKind, type Moment } from "../timewave/calendar";
import { DAYS_PER_MONTH, DAYS_PER_YEAR, TICK_INTERVALS, type ScreenState } from "./types";
import { leftEdge } from "./screen";

export type LabelField = "minute" | "hour" | "day" | "month" | "year2" | "year";

export interface LabelGroup {
  field: LabelField;
  /** "Minute", "Hour", "Day", "Month", "Year". */
  name: string;
  /** One string of 47 characters per digit row, top row first. */
  rows: string[];
  /** "/10^3" or "/10^6" for scaled year labels. */
  scale?: string;
}

/** Which fields are labelled for a tick interval of `t` days. */
export function labelFields(t: number): LabelField[] {
  if (t < 1 / 24) return ["minute", "hour"];
  if (t < 1) return ["hour", "day"];
  if (t < DAYS_PER_MONTH / 2) return ["day", "month"];
  if (t < DAYS_PER_YEAR) return ["month", "year2"];
  return ["year"];
}

const NAMES: Record<LabelField, string> = { minute: "Minute", hour: "Hour", day: "Day", month: "Month", year2: "Year", year: "Year" };

function twoDigits(n: number): string {
  return String(Math.abs(n) % 100).padStart(2, "0");
}

/** Tick moments, left to right; null after the zero point. */
export function tickMoments(s: ScreenState, zero: Moment, calendar: CalendarKind): (Moment | null)[] {
  const left = leftEdge(s);
  const out: (Moment | null)[] = [];
  for (let k = 0; k <= TICK_INTERVALS; k++) {
    const days = left - (k * s.span) / TICK_INTERVALS;
    out.push(days < 0 ? null : momentBeforeZero(days, zero, calendar));
  }
  return out;
}

export function axisLabels(s: ScreenState, zero: Moment, calendar: CalendarKind): LabelGroup[] {
  const moments = tickMoments(s, zero, calendar);
  const fields = labelFields(s.span / TICK_INTERVALS);
  return fields.map((field) => {
    if (field === "year") {
      const years = moments.map((m) => (m ? Math.abs(m.year) : null));
      const maxAbs = Math.max(0, ...years.filter((y): y is number => y !== null));
      let scale = 1;
      while (Math.round(maxAbs / scale) > 9999) scale *= 1000;
      const texts = years.map((y) => (y === null ? "" : String(Math.round(y / scale))));
      const rowCount = Math.max(1, ...texts.map((t) => t.length));
      const rows: string[] = [];
      for (let r = 0; r < rowCount; r++) rows.push(texts.map((t) => t[r] ?? " ").join(""));
      const group: LabelGroup = { field, name: "Year", rows };
      if (scale > 1) group.scale = `/10^${Math.round(Math.log10(scale))}`;
      return group;
    }
    const texts = moments.map((m) => {
      if (!m) return "  ";
      switch (field) {
        case "minute":
          return twoDigits(m.minute);
        case "hour":
          return twoDigits(m.hour);
        case "day":
          return twoDigits(m.day);
        case "month":
          return twoDigits(m.month);
        case "year2":
          return twoDigits(m.year);
      }
    });
    return { field, name: NAMES[field], rows: [texts.map((t) => t[0]).join(""), texts.map((t) => t[1]).join("")] };
  });
}
