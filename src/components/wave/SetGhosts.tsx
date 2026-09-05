"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { NUMBER_SET_NAMES, type NumberSetName } from "@/lib/timewave/datasets";
import { sampleWindow, type Samples } from "@/lib/wave/sample";
import { waveFor } from "@/lib/wave/waves";
import { GhostLine } from "./ghost-line";
import { useWave, useWaveStore } from "./store-context";
import { EXTENT, SAMPLE_COUNT } from "./mapping";

export const SET_COLORS: Record<NumberSetName, string> = {
  "DATA.TWZ": "#ffffff",
  Kelley: "#f2a9ff",
  Watkins: "#7dffb0",
  Sheliak: "#ffb86b",
  "Huang Ti": "#9bb8ff",
};

/** One other number set's wave, scaled to its own range over the visible window so the shapes can be compared. */
function Ghost({ name }: { name: NumberSetName }) {
  const store = useWaveStore();
  const [line] = useState(() => new GhostLine(SET_COLORS[name]));
  const view = useRef({ center: NaN, span: NaN, zeroDay: NaN });
  const samplesRef = useRef<Samples | null>(null);
  const range = useRef({ min: 0, max: 1, ready: false });
  useEffect(() => () => line.dispose(), [line]);
  useFrame((_, dt) => {
    const { center, span, zeroDay } = store.getState();
    const v = view.current;
    const moved = center !== v.center || span !== v.span || zeroDay !== v.zeroDay;
    if (moved) {
      samplesRef.current = sampleWindow(waveFor(name), { zeroDay, center, span: span * EXTENT, referenceSpan: span, count: SAMPLE_COUNT });
      view.current = { center, span, zeroDay };
    }
    const samples = samplesRef.current;
    if (!samples) return;
    const r = range.current;
    const k = r.ready ? Math.min(1, 1 - Math.exp(-dt * 7)) : 1;
    const before = { min: r.min, max: r.max };
    r.min += (samples.min - r.min) * k;
    r.max += (samples.max - r.max) * k;
    r.ready = true;
    if (!moved && before.min === r.min && before.max === r.max) return;
    line.update(samples, center, span, r.min, r.max);
  });
  return <primitive object={line} />;
}

export default function SetGhosts() {
  const on = useWave((s) => s.compareSets);
  const current = useWave((s) => s.numberSet);
  if (!on) return null;
  return (
    <>
      {NUMBER_SET_NAMES.filter((n) => n !== current).map((n) => (
        <Ghost key={n} name={n} />
      ))}
    </>
  );
}
