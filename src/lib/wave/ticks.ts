/**
 * Axis ticks for a window of day numbers, chosen so the labels stay legible
 * from a few minutes wide to tens of billions of years.
 */
import { toJdn } from "../timewave/calendar";
import { DAYS_PER_YEAR, dayToMoment, formatDay, type DateDetail } from "./time";

export interface Tick {
  day: number;
  label: string;
}

interface Step {
  unit: "minute" | "hour" | "day" | "month" | "year";
  n: number;
}

const STEPS: Step[] = [
  { unit: "minute", n: 1 },
  { unit: "minute", n: 5 },
  { unit: "minute", n: 15 },
  { unit: "minute", n: 30 },
  { unit: "hour", n: 1 },
  { unit: "hour", n: 3 },
  { unit: "hour", n: 6 },
  { unit: "hour", n: 12 },
  { unit: "day", n: 1 },
  { unit: "day", n: 2 },
  { unit: "day", n: 7 },
  { unit: "day", n: 14 },
  { unit: "month", n: 1 },
  { unit: "month", n: 3 },
  { unit: "month", n: 6 },
  { unit: "year", n: 1 },
];

function stepDays(s: Step): number {
  switch (s.unit) {
    case "minute":
      return s.n / 1440;
    case "hour":
      return s.n / 24;
    case "day":
      return s.n;
    case "month":
      return (s.n * DAYS_PER_YEAR) / 12;
    case "year":
      return s.n * DAYS_PER_YEAR;
  }
}

/** Pick the step whose spacing gives about `target` ticks across the window. */
function chooseStep(span: number, target: number): Step {
  const want = span / target;
  for (const s of STEPS) if (stepDays(s) >= want * (1 - 1e-6)) return s;
  // Years: 1, 2, 5, 10, 20, 50, ... as far as needed.
  const years = want / DAYS_PER_YEAR;
  const mag = Math.pow(10, Math.floor(Math.log10(years)));
  for (const m of [1, 2, 5, 10]) if (mag * m >= years) return { unit: "year", n: mag * m };
  return { unit: "year", n: mag * 10 };
}

function detailFor(s: Step): DateDetail {
  return s.unit;
}

/** Ticks at calendar-aligned steps between two day numbers. */
export function ticksFor(start: number, end: number, target = 8): Tick[] {
  if (!(end > start)) return [];
  const step = chooseStep(end - start, target);
  const detail = detailFor(step);
  const ticks: Tick[] = [];
  const push = (day: number) => {
    if (day >= start - 1e-9 && day <= end + 1e-9) ticks.push({ day, label: formatDay(day, detail) });
  };
  if (step.unit === "minute" || step.unit === "hour" || step.unit === "day") {
    const size = stepDays(step);
    // Whole day numbers are civil midnight, so multiples of the step measured from zero fall on clock boundaries.
    const first = Math.floor(start / size) * size;
    for (let d = first; d <= end + size; d += size) push(step.unit === "day" ? Math.round(d) : d);
    return ticks;
  }
  const from = dayToMoment(start);
  if (step.unit === "month") {
    let y = from.year;
    let m = Math.floor((from.month - 1) / step.n) * step.n + 1;
    for (let guard = 0; guard < 400; guard++) {
      const day = toJdn({ year: y, month: m, day: 1 }, "gregorian");
      if (day > end) break;
      push(day);
      m += step.n;
      if (m > 12) {
        m -= 12;
        y++;
      }
    }
    return ticks;
  }
  const n = step.n;
  let y = Math.floor(from.year / n) * n;
  for (let guard = 0; guard < 400; guard++) {
    const day = toJdn({ year: y, month: 1, day: 1 }, "gregorian");
    if (day > end) break;
    push(day);
    y += n;
  }
  return ticks;
}

/** The detail level suited to a window, for readouts that should match the axis. */
export function detailForSpan(span: number): DateDetail {
  return detailFor(chooseStep(span, 8));
}
