/** Zero dates with a documented rationale. */
import { fromDayNumber, toDayNumber, DEFAULT_ZERO_MOMENT, type Moment } from "../timewave/calendar";

export interface ZeroPreset {
  id: string;
  label: string;
  detail: string;
  zero: Moment;
}

const HIROSHIMA: Moment = { year: 1945, month: 8, day: 6, hour: 8, minute: 15 };
/** One 67.29-year cycle (384 x 64 days) after the bomb: McKenna’s first zero date, before he moved it to meet the Maya calendar. */
const HIROSHIMA_ALIGNED = fromDayNumber(toDayNumber(HIROSHIMA, "gregorian") + 384 * 64, "gregorian");

export const ZERO_PRESETS: readonly ZeroPreset[] = [
  { id: "mckenna", label: "Dec 21, 2012", detail: "McKenna’s final zero date, matched to the end of the Maya Long Count", zero: DEFAULT_ZERO_MOMENT },
  { id: "hiroshima", label: "Nov 18, 2012", detail: "Hiroshima plus one 67.29-year cycle: McKenna’s first zero date", zero: HIROSHIMA_ALIGNED },
  { id: "meyer", label: "Sep 28, 1995", detail: "The zero date implied if Caesar’s and Kennedy’s assassinations are resonances (Meyer’s PROJZD example)", zero: { year: 1995, month: 9, day: 28, hour: 6, minute: 0 } },
];
