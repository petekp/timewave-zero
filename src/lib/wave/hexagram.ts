/**
 * Which hexagram a moment falls in, at each scale of the wave.
 *
 * The 384 data points of the hexagrammatic layer are six per hexagram, and
 * the derivation walks the King Wen sequence backwards as days-to-zero grows
 * (distLin[j] = distance1[64 - j]). Read forwards in time, a 384-day cycle
 * therefore opens at hexagram 1 and closes at hexagram 64 on the zero point.
 */
import { KING_WEN_LINES } from "../timewave/hexagrams";
import { BASE_CYCLE_DAYS } from "./cycles";

/** Wilhelm/Baynes titles, hexagram 1 through 64. */
export const HEXAGRAM_NAMES: readonly string[] = [
  "The Creative", "The Receptive", "Difficulty at the Beginning", "Youthful Folly", "Waiting", "Conflict", "The Army", "Holding Together",
  "The Taming Power of the Small", "Treading", "Peace", "Standstill", "Fellowship", "Possession in Great Measure", "Modesty", "Enthusiasm",
  "Following", "Work on What Has Been Spoiled", "Approach", "Contemplation", "Biting Through", "Grace", "Splitting Apart", "Return",
  "Innocence", "The Taming Power of the Great", "The Corners of the Mouth", "Preponderance of the Great", "The Abysmal", "The Clinging", "Influence", "Duration",
  "Retreat", "The Power of the Great", "Progress", "Darkening of the Light", "The Family", "Opposition", "Obstruction", "Deliverance",
  "Decrease", "Increase", "Break-through", "Coming to Meet", "Gathering Together", "Pushing Upward", "Oppression", "The Well",
  "Revolution", "The Caldron", "The Arousing", "Keeping Still", "Development", "The Marrying Maiden", "Abundance", "The Wanderer",
  "The Gentle", "The Joyous", "Dispersion", "Limitation", "Inner Truth", "Preponderance of the Small", "After Completion", "Before Completion",
];

export interface HexagramAt {
  level: number;
  /** King Wen number, 1..64. */
  number: number;
  /** Line within the hexagram, 1 (bottom, earliest) to 6 (top, latest). */
  line: number;
  /** Six characters top to bottom, 1 = yang. */
  lines: string;
  name: string;
}

/** The hexagram in effect at `daysToZero` on the cycle `level` levels above 384 days. Past the zero point the reflection is used. */
export function hexagramAt(daysToZero: number, level: number, waveFactor = 64): HexagramAt {
  const scaled = Math.abs(daysToZero) / Math.pow(waveFactor, level);
  const p = ((scaled % BASE_CYCLE_DAYS) + BASE_CYCLE_DAYS) % BASE_CYCLE_DAYS;
  const index = Math.floor(p / 6);
  const number = 64 - index;
  const line = 6 - Math.floor(p % 6);
  return { level, number, line, lines: KING_WEN_LINES[number - 1], name: HEXAGRAM_NAMES[number - 1] };
}
