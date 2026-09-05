"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { cycles } from "@/lib/wave/cycles";
import { useWaveStore } from "./store-context";
import { EXTENT, HEIGHT, VIEW_HALF, dayToX } from "./mapping";

function makeDashedLine(): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, HEIGHT * 1.15, 0)]);
  const material = new THREE.LineDashedMaterial({ color: "#8d93b8", dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0.55 });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

/** Where a cycle begins: `days` before the zero point. The label shows only while the view is at a scale where the cycle means something. */
function CycleLine({ days, label }: { days: number; label: string }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [line] = useState(makeDashedLine);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { center, span, zeroDay } = store.getState();
    const x = dayToX(zeroDay - days, center, span);
    const shown = Math.abs(x) <= VIEW_HALF * EXTENT;
    g.visible = shown;
    const labelOn = shown && span > days / 40 && span < days * 6;
    if (labelRef.current) labelRef.current.style.display = labelOn ? "" : "none";
    if (shown) g.position.x = x;
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={line} />
      <Html ref={labelRef} position={[0, HEIGHT * 1.2, 0]} center zIndexRange={[4, 0]} className="wave-label wave-label-cycle" style={{ pointerEvents: "none" }}>
        cycle of {label} begins
      </Html>
    </group>
  );
}

/** The starts of the seven nested cycles, given the current zero point. */
export default function CycleLines() {
  return (
    <>
      {cycles().map((c) => (
        <CycleLine key={c.level} days={c.days} label={c.label} />
      ))}
    </>
  );
}
