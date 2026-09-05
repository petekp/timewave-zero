/** Text produced by the "print" commands, in the spirit of the DOS program's printer output. */
import { momentBeforeZero, type CalendarKind, type Moment } from "../timewave/calendar";
import type { Wave } from "../timewave/wave";
import { formatDate, formatDays, formatTime, formatTimespan, formatValue } from "./format";
import { cycleDays } from "./resonance";
import { daysAtColumn, leftEdge, rightEdge, type GraphSamples } from "./screen";
import { PLOT_LEFT, type ScreenState } from "./types";

export interface PrintContext {
  zero: Moment;
  calendar: CalendarKind;
  wave: Wave;
}

const CALENDAR_NAME: Record<CalendarKind, string> = { gregorian: "Gregorian", julian: "Julian" };

function header(title: string, screenNo: number, s: ScreenState, ctx: PrintContext): string[] {
  return [
    `Timewave Zero (Version 4.22 US)   ${title}   Screen no. ${screenNo}`,
    `Zero date: ${formatDate(ctx.zero)} ${formatTime(ctx.zero.hour, ctx.zero.minute)}   Calendar: ${CALENDAR_NAME[ctx.calendar]}   Wave factor: ${s.waveFactor}`,
    `Timespan: ${formatTimespan(s.span).join(" ")}`,
    "",
  ];
}

function pointLine(days: number, ctx: PrintContext, value?: number): string {
  if (days < 0) return `${"".padEnd(10)} ${"".padEnd(5)} ${"after the zero date".padStart(18)}`;
  const m = momentBeforeZero(days, ctx.zero, ctx.calendar);
  const v = value ?? ctx.wave.value(days);
  return `${formatDate(m).padEnd(16)} ${formatTime(m.hour, m.minute)} ${formatDays(days).padStart(20)} ${formatValue(v).padStart(16)}`;
}

const TABLE_HEAD = `${"Date".padEnd(16)} ${"Time".padEnd(5)} ${"Days to zero date".padStart(20)} ${"Value".padStart(16)}`;

export interface WaveValuesOptions {
  extremaOnly: boolean;
  vicinityOnly: boolean;
}

/** One line per plot column, optionally only local extrema or the columns near the target. */
export function waveValuesText(screenNo: number, s: ScreenState, g: GraphSamples, ctx: PrintContext, o: WaveValuesOptions): string {
  const lines = header("Wave values", screenNo, s, ctx);
  lines.push(TABLE_HEAD);
  const n = g.values.length;
  for (let i = 0; i < n; i++) {
    const v = g.values[i];
    if (v === null) continue;
    if (o.vicinityOnly && Math.abs(i - s.targetPx) > 20) continue;
    if (o.extremaOnly) {
      const prev = i > 0 ? g.values[i - 1] : null;
      const next = i < n - 1 ? g.values[i + 1] : null;
      if (prev === null || next === null) continue;
      const isMax = v > prev && v >= next;
      const isMin = v < prev && v <= next;
      if (!isMax && !isMin) continue;
      lines.push(pointLine(daysAtColumn(s, PLOT_LEFT + i), ctx, v) + (isMax ? "  max" : "  min"));
      continue;
    }
    lines.push(pointLine(daysAtColumn(s, PLOT_LEFT + i), ctx, v) + (i === s.targetPx ? "  <- target" : ""));
  }
  return lines.join("\n") + "\n";
}

/** Major and trigrammatic resonance points of the target date. */
export function resonancePointsText(screenNo: number, s: ScreenState, ctx: PrintContext, trigrammaticOnly: boolean): string {
  const lines = header("Resonance points", screenNo, s, ctx);
  lines.push("Target:");
  lines.push(TABLE_HEAD);
  lines.push(pointLine(s.target, ctx));
  lines.push("");
  const limit = 7e9 * 365.2425;
  if (!trigrammaticOnly) {
    lines.push("Major resonances (higher):");
    for (let k = 1; ; k++) {
      const d = s.target * Math.pow(s.waveFactor, k);
      if (d > limit || d === 0) break;
      lines.push(`${String(k).padStart(2)}. ` + pointLine(d, ctx));
    }
    lines.push("");
    lines.push("Major resonances (lower):");
    for (let k = 1; k <= 6; k++) {
      const d = s.target / Math.pow(s.waveFactor, k);
      if (d < 1 / 1440) break;
      lines.push(`${String(k).padStart(2)}. ` + pointLine(d, ctx));
    }
    lines.push("");
  }
  lines.push("Trigrammatic resonances (half-cycle points):");
  for (let cycle = 1; cycle <= 4; cycle++) {
    const half = cycleDays(s, cycle) / 2;
    lines.push(`Cycle ${cycle} (${formatDays(cycleDays(s, cycle))} days):`);
    for (const k of [3, 2, 1]) lines.push(`  ${k} earlier ` + pointLine(s.target + k * half, ctx));
    for (const k of [1, 2, 3]) lines.push(`  ${k} later   ` + pointLine(s.target - k * half, ctx));
  }
  return lines.join("\n") + "\n";
}

/** Summary of every screen that has a target date. */
export function allScreensText(screens: (ScreenState | null)[], ctx: PrintContext): string {
  const lines: string[] = ["Timewave Zero (Version 4.22 US)   All screens", ""];
  screens.forEach((s, i) => {
    if (!s) {
      lines.push(`Screen no. ${i + 1}: (empty)`, "");
      return;
    }
    lines.push(`Screen no. ${i + 1}   Wave factor: ${s.waveFactor}   Timespan: ${formatTimespan(s.span).join(" ")}`);
    lines.push(TABLE_HEAD);
    lines.push("Left   " + pointLine(leftEdge(s), ctx));
    lines.push("Target " + pointLine(s.target, ctx));
    lines.push("Right  " + pointLine(rightEdge(s), ctx));
    lines.push("");
  });
  return lines.join("\n") + "\n";
}
