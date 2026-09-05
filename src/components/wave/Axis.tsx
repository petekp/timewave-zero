"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { ticksFor, type Tick } from "@/lib/wave/ticks";
import { useWaveStore } from "./store-context";
import { EXTENT, RIBBON_HALF_W, VIEW_HALF, dayToX, visibleXRange, xToDay } from "./mapping";

const LABEL_Z = RIBBON_HALF_W + 0.9;
const MARK_Z = RIBBON_HALF_W + 0.21;

export default function Axis() {
  const store = useWaveStore();
  const [ticks, setTicks] = useState<Tick[]>([]);
  const signature = useRef("");
  const groups = useRef(new Map<string, THREE.Group>());

  useFrame(({ camera, size }) => {
    const { center, span } = store.getState();
    const [x0, x1] = visibleXRange(camera);
    const start = xToDay(x0, center, span);
    const end = xToDay(x1, center, span);
    const want = Math.max(3, Math.min(10, Math.round(size.width / 150)));
    const next = ticksFor(start, end, want);
    const sig = next.map((t) => t.label).join("|");
    if (sig !== signature.current) {
      signature.current = sig;
      setTicks(next);
    }
    for (const t of next) {
      const g = groups.current.get(t.label);
      if (g) g.position.x = dayToX(t.day, center, span);
    }
  });

  return (
    <>
      <mesh position={[0, 0, RIBBON_HALF_W + 0.06]}>
        <boxGeometry args={[VIEW_HALF * 2 * EXTENT, 0.006, 0.006]} />
        <meshBasicMaterial color="#8d93b8" transparent opacity={0.35} />
      </mesh>
      {ticks.map((t) => (
        <group
          key={t.label}
          ref={(g) => {
            if (g) groups.current.set(t.label, g);
            else groups.current.delete(t.label);
          }}
          position={[dayToX(t.day, store.getState().center, store.getState().span), 0, 0]}
        >
          <mesh position={[0, 0, MARK_Z]}>
            <boxGeometry args={[0.012, 0.012, 0.3]} />
            <meshBasicMaterial color="#8d93b8" transparent opacity={0.75} />
          </mesh>
          <Html position={[0, 0, LABEL_Z]} center zIndexRange={[4, 0]} className="wave-tick" style={{ pointerEvents: "none" }}>
            {t.label}
          </Html>
        </group>
      ))}
    </>
  );
}
