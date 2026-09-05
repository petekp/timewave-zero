/**
 * Helpers for dragging the end date: keeping the zero point in view and
 * counting which events sit in dips under a fixed vertical scale.
 */
import type { Wave } from "../timewave/wave";
import { eventDay, type EventTier, type WaveEvent } from "./events";
import { valueAt } from "./sample";

export interface ViewWindow {
  center: number;
  span: number;
}

/** How far from the centre, as a fraction of the span, the zero point may sit before the view moves. */
const KEEP = 0.42;

/** Widens the view around its centre until the zero point is inside it. */
export function viewWithZero(view: ViewWindow, zeroDay: number): ViewWindow {
  const d = zeroDay - view.center;
  if (Math.abs(d) <= KEEP * view.span) return view;
  return { center: view.center + d / 2, span: Math.max(view.span, Math.abs(d) * 1.4) };
}

/** Pans the view by the least amount that keeps the zero point inside it. */
export function followZero(view: ViewWindow, zeroDay: number): ViewWindow {
  const limit = KEEP * view.span;
  if (zeroDay > view.center + limit) return { center: zeroDay - limit, span: view.span };
  if (zeroDay < view.center - limit) return { center: zeroDay + limit, span: view.span };
  return view;
}

/** An event sits in a dip when its value is in the lowest third of the wave over the surrounding stretch. */
export const DIP_NORM = 1 / 3;
/** Each side of the event, as a fraction of the view's span. */
const NEIGHBOURHOOD = 1 / 16;
const NEIGHBOUR_SAMPLES = 48;

/** Counts the events in the window and before the zero point, and how many of them sit in dips. */
export function dipCount(wave: Wave, events: readonly WaveEvent[], tiers: Record<EventTier, boolean>, zeroDay: number, view: ViewWindow): { inDip: number; total: number } {
  const half = view.span * NEIGHBOURHOOD;
  let inDip = 0;
  let total = 0;
  for (const e of events) {
    if (!tiers[e.tier]) continue;
    const day = eventDay(e);
    if (Math.abs(day - view.center) > view.span / 2 || day >= zeroDay) continue;
    total++;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < NEIGHBOUR_SAMPLES; i++) {
      const v = valueAt(wave, zeroDay, day - half + (2 * half * i) / (NEIGHBOUR_SAMPLES - 1)).value;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const v = valueAt(wave, zeroDay, day).value;
    if (max - min <= 0 || (v - min) / (max - min) <= DIP_NORM) inDip++;
  }
  return { inDip, total };
}
