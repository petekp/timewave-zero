"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import type * as THREE from "three";
import { sampleWindow, type Samples } from "@/lib/wave/sample";
import { waveFor } from "@/lib/wave/waves";
import { RibbonObject } from "./ribbon-object";
import { useWaveStore } from "./store-context";
import { EXTENT, SAMPLE_COUNT, viewMetrics } from "./mapping";

/** Where the ribbon's surface mesh is published for raycasting. */
export type SurfaceRef = RefObject<THREE.Mesh | null>;

export default function Ribbon({ surfaceRef }: { surfaceRef: SurfaceRef }) {
  const store = useWaveStore();
  const [ribbon] = useState(() => new RibbonObject());
  const view = useRef({ center: NaN, span: NaN, zeroDay: NaN, numberSet: "" });
  const samplesRef = useRef<Samples | null>(null);
  const drawn = useRef({ min: NaN, max: NaN });

  useEffect(() => {
    surfaceRef.current = ribbon.surface;
    return () => {
      surfaceRef.current = null;
    };
  }, [surfaceRef, ribbon]);

  useEffect(() => () => ribbon.dispose(), [ribbon]);

  useFrame(({ camera, clock }, dt) => {
    ribbon.tick(clock.elapsedTime, camera.position);
    const { center, span, zeroDay, numberSet, fitting } = store.getState();
    const v = view.current;
    const moved = center !== v.center || span !== v.span || zeroDay !== v.zeroDay || numberSet !== v.numberSet;
    if (moved) {
      samplesRef.current = sampleWindow(waveFor(numberSet), { zeroDay, center, span: span * EXTENT, referenceSpan: span, count: SAMPLE_COUNT });
      view.current = { center, span, zeroDay, numberSet };
    }
    const samples = samplesRef.current;
    if (!samples) return;

    // Ease the displayed range toward the sampled one so the terrain settles instead of jumping.
    // While the end date is dragged the range holds, so the curve slides instead of re-fitting.
    const target = fitting ?? samples;
    const k = viewMetrics.ready ? Math.min(1, 1 - Math.exp(-dt * 7)) : 1;
    viewMetrics.min += (target.min - viewMetrics.min) * k;
    viewMetrics.max += (target.max - viewMetrics.max) * k;
    viewMetrics.ready = true;
    if (!moved && drawn.current.min === viewMetrics.min && drawn.current.max === viewMetrics.max) return;
    drawn.current = { min: viewMetrics.min, max: viewMetrics.max };
    ribbon.update(samples, center, span, viewMetrics.min, viewMetrics.max);
  });

  return <primitive object={ribbon} />;
}
