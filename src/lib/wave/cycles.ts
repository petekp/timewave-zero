/**
 * The nested cycles of the timewave: 384 days, then 64 times longer at each
 * level. The seventh is longer than the age of the universe, which McKenna
 * noted and kept.
 */
import { formatDuration } from "./time";

export const BASE_CYCLE_DAYS = 384;
export const CYCLE_COUNT = 7;

export interface Cycle {
  level: number;
  days: number;
  label: string;
}

export function cycles(waveFactor = 64): Cycle[] {
  return Array.from({ length: CYCLE_COUNT }, (_, level) => {
    const days = BASE_CYCLE_DAYS * Math.pow(waveFactor, level);
    return { level, days, label: formatDuration(days) };
  });
}

/** Fractional position of a span on the ladder of cycles: 0 at 384 days, 1 at the next, and so on. */
export function ladderPosition(spanDays: number, waveFactor = 64): number {
  return Math.log(spanDays / BASE_CYCLE_DAYS) / Math.log(waveFactor);
}
