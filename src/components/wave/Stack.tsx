"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { sampleWindow, type Samples } from "@/lib/wave/sample";
import { formatDuration } from "@/lib/wave/time";
import { waveFor } from "@/lib/wave/waves";
import { RibbonObject } from "./ribbon-object";
import { useWave, useWaveStore } from "./store-context";
import { EXTENT, HEIGHT, RIBBON_HALF_W, SAMPLE_COUNT, VIEW_HALF } from "./mapping";

const LEVELS = [1, 2];
const RISE = HEIGHT * 0.95 + 0.5;
const SETBACK = RIBBON_HALF_W * 2 + 0.7;

/**
 * One higher resonance of the current view: the same window 64^level times
 * wider and further from the zero point, drawn on a terrace behind the main
 * ribbon so the points that line up vertically are the resonant ones.
 */
function Layer({ level }: { level: number }) {
  const store = useWaveStore();
  const [ribbon] = useState(() => {
    const r = new RibbonObject();
    r.setDim(1 - level * 0.22);
    r.position.set(0, level * RISE, -level * SETBACK);
    return r;
  });
  const view = useRef({ center: NaN, span: NaN, zeroDay: NaN, numberSet: "" });
  const samplesRef = useRef<Samples | null>(null);
  const range = useRef({ min: 0, max: 1, ready: false });
  const labelRef = useRef<HTMLDivElement>(null);
  const labelText = useRef("");
  const factor = Math.pow(64, level);

  useEffect(() => () => ribbon.dispose(), [ribbon]);

  useFrame(({ camera, clock }, dt) => {
    ribbon.tick(clock.elapsedTime, camera.position);
    const { center, span, zeroDay, numberSet } = store.getState();
    const v = view.current;
    const moved = center !== v.center || span !== v.span || zeroDay !== v.zeroDay || numberSet !== v.numberSet;
    const scaledCenter = zeroDay - (zeroDay - center) * factor;
    const scaledSpan = span * factor;
    const text = `×${factor.toLocaleString()} · ${formatDuration(scaledSpan)} across`;
    if (text !== labelText.current && labelRef.current) {
      labelText.current = text;
      labelRef.current.textContent = text;
    }
    if (moved) {
      samplesRef.current = sampleWindow(waveFor(numberSet), { zeroDay, center: scaledCenter, span: scaledSpan * EXTENT, referenceSpan: scaledSpan, count: SAMPLE_COUNT });
      view.current = { center, span, zeroDay, numberSet };
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
    ribbon.update(samples, scaledCenter, scaledSpan, r.min, r.max);
  });

  return (
    <>
      <primitive object={ribbon} />
      <Html ref={labelRef} position={[-VIEW_HALF * 0.9, level * RISE + HEIGHT * 1.12, -level * SETBACK + RIBBON_HALF_W]} zIndexRange={[5, 0]} className="wave-label wave-label-layer" style={{ pointerEvents: "none" }}>
        ×{factor.toLocaleString()}
      </Html>
    </>
  );
}

export default function Stack() {
  const stacked = useWave((s) => s.stacked);
  if (!stacked) return null;
  return (
    <>
      {LEVELS.map((level) => (
        <Layer key={level} level={level} />
      ))}
    </>
  );
}
