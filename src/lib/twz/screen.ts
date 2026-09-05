import type { Wave } from "../timewave/wave";
import { PLOT_HEIGHT, PLOT_LEFT, PLOT_RIGHT, PLOT_TOP, PLOT_WIDTH, type ScreenState } from "./types";

/** Days to zero at the left edge of the plot. */
export function leftEdge(s: ScreenState): number {
  return s.target + (s.span * s.targetPx) / PLOT_WIDTH;
}

export function rightEdge(s: ScreenState): number {
  return leftEdge(s) - s.span;
}

/** Days to zero at plot column x (76..444). */
export function daysAtColumn(s: ScreenState, x: number): number {
  return leftEdge(s) - ((x - PLOT_LEFT) * s.span) / PLOT_WIDTH;
}

/** Move the target marker to a pixel position, keeping the plot edges fixed. */
export function withTargetPx(s: ScreenState, px: number): ScreenState {
  const left = leftEdge(s);
  const clamped = Math.max(0, Math.min(PLOT_WIDTH, px));
  return { ...s, targetPx: clamped, target: left - (clamped * s.span) / PLOT_WIDTH };
}

/** Move the target by a number of pixels, wrapping around the plot edges like the "+" and "-" keys. */
export function nudgeTargetPx(s: ScreenState, delta: number, wrap: boolean): ScreenState {
  let px = s.targetPx + delta;
  if (wrap) {
    if (px > PLOT_WIDTH) px -= PLOT_WIDTH;
    if (px < 0) px += PLOT_WIDTH;
  }
  return withTargetPx(s, px);
}

export interface GraphSamples {
  /** Wave value per plot column 76..444; null after the zero point. */
  values: (number | null)[];
  /** Pixel row per column, null where not drawn. */
  ys: (number | null)[];
  min: number;
  max: number;
  /** True when at least one column lies before the zero point. */
  any: boolean;
}

/** Sample the wave at every plot column, as the original does before drawing. */
export function sampleGraph(s: ScreenState, wave: Wave): GraphSamples {
  const values: (number | null)[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let x = PLOT_LEFT; x <= PLOT_RIGHT; x++) {
    const d = daysAtColumn(s, x);
    if (d < 0) {
      values.push(null);
      continue;
    }
    const v = wave.value(d);
    values.push(v);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const any = min !== Infinity;
  const range = max - min;
  // The original maps the range onto rows 11..116: the minimum sits on the axis line.
  const ys = values.map((v) => (v === null ? null : PLOT_TOP - 1 + Math.floor((range > 0 ? 1 - (v - min) / range : 1) * (PLOT_HEIGHT + 1))));
  return { values, ys, min: any ? min : 0, max: any ? max : 0, any };
}
