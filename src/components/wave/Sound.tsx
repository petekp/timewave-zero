"use client";

import { useFrame } from "@react-three/fiber";
import { ladderPosition } from "@/lib/wave/cycles";
import { valueAt } from "@/lib/wave/sample";
import { waveSound } from "@/lib/wave/sound";
import { waveFor } from "@/lib/wave/waves";
import { useWaveStore } from "./store-context";
import { normOf, viewMetrics } from "./mapping";

/** Feeds the drone the novelty under the pointer, or at the centre of the view. */
export default function Sound() {
  const store = useWaveStore();
  useFrame(() => {
    if (!waveSound.enabled || !viewMetrics.ready) return;
    const { hoverDay, pickDay, center, span, zeroDay, numberSet } = store.getState();
    const day = hoverDay ?? pickDay ?? center;
    const { value } = valueAt(waveFor(numberSet), zeroDay, day);
    waveSound.set(1 - Math.min(1, Math.max(0, normOf(value))), ladderPosition(span));
  });
  return null;
}
