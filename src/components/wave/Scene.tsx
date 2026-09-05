"use client";

import { Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import Axis from "./Axis";
import Effects from "./Effects";
import Events from "./Events";
import Interaction from "./Interaction";
import Markers from "./Markers";
import Ribbon from "./Ribbon";
import Sound from "./Sound";
import Stack from "./Stack";
import { useWaveStore } from "./store-context";
import { BACKGROUND, HEIGHT } from "./mapping";

const CAMERA_POS = new THREE.Vector3(0.6, 2.9, 9.4);
const LOOK_AT = new THREE.Vector3(0.1, HEIGHT * 0.24, 0);
/** With the terraces raised the camera pulls up and back to take them in. */
const CAMERA_POS_STACKED = new THREE.Vector3(1.4, 8.2, 15.5);
const LOOK_AT_STACKED = new THREE.Vector3(0.15, HEIGHT * 1.7, -2.6);

/** Eases the view toward its goal and keeps the camera gently alive. */
function Rig() {
  const store = useWaveStore();
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z));
  const base = useRef(CAMERA_POS.clone());
  const sway = useRef(1);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      sway.current = mq.matches ? 0 : 1;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useFrame(({ clock }, dt) => {
    const state = store.getState();
    state.ease(Math.min(1, 1 - Math.exp(-dt * 9)));
    // Narrow screens see less of the ribbon; back the camera off so the view still spans it.
    const aspect = size.width / Math.max(1, size.height);
    const back = aspect < 1.2 ? (1.2 - aspect) * 6 : 0;
    const k = Math.min(1, 1 - Math.exp(-dt * 3));
    base.current.lerp(state.stacked ? CAMERA_POS_STACKED : CAMERA_POS, k);
    target.current.lerp(state.stacked ? LOOK_AT_STACKED : LOOK_AT, k);
    const t = clock.elapsedTime * sway.current;
    camera.position.set(base.current.x + Math.sin(t * 0.11) * 0.12, base.current.y + Math.sin(t * 0.07) * 0.06 + back * 0.25, base.current.z + back);
    camera.lookAt(target.current);
  });
  return null;
}

export default function Scene() {
  const surfaceRef = useRef<THREE.Mesh | null>(null);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: CAMERA_POS.toArray(), fov: 42, near: 0.1, far: 90 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      style={{ position: "absolute", inset: 0 }}
      fallback={<div className="wave-nogl">This view needs WebGL, which the browser could not start. The 1993 original still works without it.</div>}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 10, 30]} />
      <Stars radius={70} depth={40} count={1600} factor={2.6} saturation={0.35} fade speed={0.35} />
      <Rig />
      <Ribbon surfaceRef={surfaceRef} />
      <Stack />
      <Markers />
      <Events />
      <Sound />
      <Axis />
      <Interaction surfaceRef={surfaceRef} />
      <Effects />
    </Canvas>
  );
}
