/**
 * Sampling the wave over a window of time for the 3D view.
 *
 * Past the zero point the wave is undefined; the view continues it as a
 * reflection (the value at the same distance before zero) and marks those
 * samples so they can be drawn as a ghost.
 */
import type { Wave } from "../timewave/wave";

export interface Samples {
  count: number;
  /** Day number of each sample. */
  days: Float64Array;
  /** Raw wave value at each sample. */
  values: Float64Array;
  /** Value scaled so the reference window spans 0..1; can exceed that outside it. */
  norm: Float32Array;
  /** 1 where the sample lies after the zero point. */
  reflected: Uint8Array;
  min: number;
  max: number;
}

export interface SampleWindow {
  /** Day number of the zero point. */
  zeroDay: number;
  /** Centre and width of the window to sample, in days. */
  center: number;
  span: number;
  /** Width of the inner window used for the 0..1 scaling; defaults to the whole span. */
  referenceSpan?: number;
  count: number;
}

export function valueAt(wave: Wave, zeroDay: number, day: number): { value: number; reflected: boolean } {
  const x = zeroDay - day;
  return { value: wave.value(Math.abs(x)), reflected: x < 0 };
}

export function sampleWindow(wave: Wave, w: SampleWindow): Samples {
  const n = w.count;
  const days = new Float64Array(n);
  const values = new Float64Array(n);
  const norm = new Float32Array(n);
  const reflected = new Uint8Array(n);
  const start = w.center - w.span / 2;
  const step = w.span / (n - 1);
  const refHalf = (w.referenceSpan ?? w.span) / 2;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const day = start + i * step;
    const x = w.zeroDay - day;
    const v = wave.value(Math.abs(x));
    days[i] = day;
    values[i] = v;
    reflected[i] = x < 0 ? 1 : 0;
    if (Math.abs(day - w.center) <= refHalf) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) {
    min = 0;
    max = 0;
  }
  const range = max - min;
  for (let i = 0; i < n; i++) norm[i] = range > 0 ? (values[i] - min) / range : 0.5;
  return { count: n, days, values, norm, reflected, min, max };
}
