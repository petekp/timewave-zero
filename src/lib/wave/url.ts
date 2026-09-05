/**
 * The modern view's state in the query string, so a view can be shared:
 * ?c=1999-06-15&s=7&z=2012-12-21T06:00&n=Kelley
 * `c` is the centre date (or a day number), `s` the span in days, `z` the zero
 * date and `n` the number set.
 */
import { isValidDate, toJdn, type Moment } from "../timewave/calendar";
import { DEFAULT_ZERO_MOMENT } from "../timewave/calendar";
import { NUMBER_SET_NAMES, type NumberSetName } from "../timewave/datasets";
import { dayToMoment, momentToDay } from "./time";

export interface WaveUrlState {
  center: number;
  span: number;
  zero: Moment;
  numberSet: NumberSetName;
}

const DATE_RE = /^(-?\d{1,12})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2}))?$/;

export function parseMoment(text: string): Moment | null {
  const m = DATE_RE.exec(text.trim());
  if (!m) return null;
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (!isValidDate(date, "gregorian")) return null;
  const hour = m[4] === undefined ? 0 : Number(m[4]);
  const minute = m[5] === undefined ? 0 : Number(m[5]);
  if (hour > 23 || minute > 59) return null;
  return { ...date, hour, minute };
}

export function formatMoment(m: Moment, withTime = true): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${m.year}-${pad(m.month)}-${pad(m.day)}`;
  return withTime && (m.hour || m.minute) ? `${date}T${pad(m.hour)}:${pad(m.minute)}` : date;
}

/** A day number as a URL value: a date when it falls on a whole minute, otherwise the number itself. */
function formatDayParam(day: number): string {
  const m = dayToMoment(day);
  return Math.abs(momentToDay(m) - day) < 1e-6 ? formatMoment(m) : String(day);
}

function parseDayParam(text: string): number | null {
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const m = parseMoment(text);
  return m ? momentToDay(m) : null;
}

export function encodeWaveState(s: WaveUrlState): string {
  const q = new URLSearchParams();
  q.set("c", formatDayParam(s.center));
  q.set("s", Number(s.span.toPrecision(10)).toString());
  if (momentToDay(s.zero) !== momentToDay(DEFAULT_ZERO_MOMENT)) q.set("z", formatMoment(s.zero));
  if (s.numberSet !== "DATA.TWZ") q.set("n", s.numberSet);
  return q.toString();
}

export function decodeWaveState(search: string): Partial<WaveUrlState> {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: Partial<WaveUrlState> = {};
  const c = q.get("c");
  if (c !== null) {
    const day = parseDayParam(c);
    if (day !== null && Number.isFinite(day)) out.center = day;
  }
  const s = q.get("s");
  if (s !== null) {
    const span = Number(s);
    if (Number.isFinite(span) && span > 0) out.span = span;
  }
  const z = q.get("z");
  if (z !== null) {
    const zero = parseMoment(z);
    if (zero) out.zero = zero;
  }
  const n = q.get("n");
  if (n !== null && (NUMBER_SET_NAMES as readonly string[]).includes(n)) out.numberSet = n as NumberSetName;
  return out;
}

/** Day number of a plain calendar date at midnight. */
export function dateDay(year: number, month: number, day: number): number {
  return toJdn({ year, month, day }, "gregorian");
}
