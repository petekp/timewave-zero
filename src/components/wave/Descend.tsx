"use client";

import { useFrame } from "@react-three/fiber";
import { MIN_SPAN } from "@/lib/wave/store";
import { useWaveStore } from "./store-context";

/** The view closes on the zero point at a fixed rate on the log scale: 64 times nearer every DOUBLING seconds. */
const CYCLE_SECONDS = 14;
const RATE = Math.log(64) / CYCLE_SECONDS;
/** Where the zero point sits, as a fraction of the half-view to the right of centre. */
const ZERO_AT = 0.72;
/** Where to begin when the view is already past the zero point: one 67-year cycle out. */
const RESTART_DAYS = 384 * 64;

/**
 * Descend mode. Because the wave repeats at every 64x, closing on the zero
 * point at a constant logarithmic rate makes the same terrain rise under the
 * camera again and again until an hour is left.
 */
export default function Descend() {
  const store = useWaveStore();
  useFrame((_, dt) => {
    const s = store.getState();
    if (!s.descending) return;
    const step = Math.min(dt, 0.1);
    let d = s.zeroDay - s.center;
    if (!(d > 0)) d = RESTART_DAYS;
    d *= Math.exp(-RATE * step);
    const targetSpan = (2 * d) / ZERO_AT;
    // Ease the span onto the descent path so starting from any view is smooth.
    const span = Math.exp(Math.log(s.span) + (Math.log(targetSpan) - Math.log(s.span)) * Math.min(1, 1 - Math.exp(-step * 2.5)));
    if (span <= MIN_SPAN * 1.5) {
      s.setDescending(false);
      return;
    }
    s.setView(s.zeroDay - d, span);
  });
  return null;
}
