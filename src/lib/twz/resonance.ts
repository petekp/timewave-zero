import type { ScreenState } from "./types";

/** Length of the fundamental cycle in days (64 hexagrams x 6 lines). */
export const BASE_CYCLE_DAYS = 384;

/** The k-th higher (or lower) major resonance: target and span scaled by the wave factor to the k. */
export function majorResonance(s: ScreenState, point: number, higher: boolean): ScreenState {
  const f = Math.pow(s.waveFactor, point);
  return higher ? { ...s, target: s.target * f, span: s.span * f } : { ...s, target: s.target / f, span: s.span / f };
}

/** Days in trigrammatic cycle 1..4: 384 days, then times the wave factor per level. */
export function cycleDays(s: ScreenState, cycle: number): number {
  return BASE_CYCLE_DAYS * Math.pow(s.waveFactor, cycle - 1);
}

/** The k-th trigrammatic resonance point: the target shifted by k half-cycles, span unchanged. */
export function trigrammaticResonance(s: ScreenState, cycle: number, point: number, higher: boolean): ScreenState {
  const shift = (point * cycleDays(s, cycle)) / 2;
  return { ...s, target: higher ? s.target + shift : s.target - shift };
}

/** The eleven trigrammatic resonance screens (points 1..11) built by the "construct set" option. */
export function trigrammaticSet(s: ScreenState, cycle: number, higher: boolean): ScreenState[] {
  return Array.from({ length: 11 }, (_, i) => trigrammaticResonance(s, cycle, i + 1, higher));
}
