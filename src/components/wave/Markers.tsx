"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { echoes } from "@/lib/wave/events";
import { valueAt } from "@/lib/wave/sample";
import { waveFor } from "@/lib/wave/waves";
import { Echo, jumpToEcho } from "./Events";
import { useWave, useWaveStore } from "./store-context";
import { HEIGHT, RIBBON_HALF_W, VIEW_HALF, dayToX, heightOf, normOf } from "./mapping";

/** A soft radial glow, drawn once. */
function useGlowTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

const LIMIT = VIEW_HALF * 3;

/** Moves a group to the X of a day, or parks it out of sight when off the sampled ribbon. */
function place(group: THREE.Group | null, day: number | null, center: number, span: number): number | null {
  if (!group) return null;
  if (day === null) {
    group.visible = false;
    return null;
  }
  const x = dayToX(day, center, span);
  if (Math.abs(x) > LIMIT) {
    group.visible = false;
    return null;
  }
  group.visible = true;
  group.position.x = x;
  return x;
}

export default function Markers() {
  const store = useWaveStore();
  const glow = useGlowTexture();
  const pickDay = useWave((s) => s.pickDay);
  const showMarkEchoes = useWave((s) => s.showMarkEchoes);
  const zeroDayNow = useWave((s) => s.zeroDay);
  const markEchoes = pickDay !== null && showMarkEchoes ? echoes(zeroDayNow - pickDay) : [];
  const zeroRef = useRef<THREE.Group>(null);
  const zeroLabelRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<THREE.Group>(null);
  const nowLabelRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<THREE.Group>(null);
  const hoverBar = useRef<THREE.Mesh>(null);
  const pickRef = useRef<THREE.Group>(null);
  const pickBar = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const setBar = (bar: THREE.Mesh | null, day: number, zeroDay: number, numberSet: Parameters<typeof waveFor>[0]) => {
    if (!bar) return;
    const { value } = valueAt(waveFor(numberSet), zeroDay, day);
    const h = Math.max(0.02, heightOf(normOf(value)));
    bar.scale.y = h;
    bar.position.y = h / 2;
  };

  useFrame(({ clock }) => {
    const { center, span, zeroDay, nowDay, hoverDay, pickDay, numberSet } = store.getState();
    // drei's Html keeps drawing for hidden groups, so the labels are hidden by hand.
    if (zeroLabelRef.current) zeroLabelRef.current.style.display = place(zeroRef.current, zeroDay, center, span) === null ? "none" : "";
    if (nowLabelRef.current) nowLabelRef.current.style.display = place(nowRef.current, nowDay, center, span) === null ? "none" : "";
    if (place(hoverRef.current, hoverDay, center, span) !== null && hoverDay !== null) setBar(hoverBar.current, hoverDay, zeroDay, numberSet);
    if (place(pickRef.current, pickDay, center, span) !== null && pickDay !== null) setBar(pickBar.current, pickDay, zeroDay, numberSet);
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.7) * 0.15;
    }
  });

  return (
    <>
      {/* The zero point: a beam of light where the wave reaches zero. */}
      <group ref={zeroRef}>
        <mesh ref={beamRef} position={[0, HEIGHT * 0.6, 0]}>
          <boxGeometry args={[0.03, HEIGHT * 1.2, 0.03]} />
          <meshBasicMaterial color={new THREE.Color("#c8fbff").multiplyScalar(3)} toneMapped={false} transparent />
        </mesh>
        <sprite position={[0, 0.05, 0]} scale={[3.2, 3.2, 1]}>
          <spriteMaterial map={glow} color="#7fe9ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <sprite position={[0, HEIGHT * 0.6, 0]} scale={[0.9, HEIGHT * 1.6, 1]}>
          <spriteMaterial map={glow} color="#9ff2ff" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <Html ref={zeroLabelRef} position={[0, HEIGHT * 1.3, 0]} center zIndexRange={[5, 0]} className="wave-label wave-label-zero" style={{ pointerEvents: "none" }}>
          zero point
        </Html>
      </group>

      {/* The present moment. */}
      <group ref={nowRef}>
        <mesh position={[0, HEIGHT * 0.6, RIBBON_HALF_W + 0.02]}>
          <boxGeometry args={[0.012, HEIGHT * 1.2, 0.012]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
        </mesh>
        <Html ref={nowLabelRef} position={[0, HEIGHT * 1.28, RIBBON_HALF_W]} center zIndexRange={[5, 0]} className="wave-label wave-label-now" style={{ pointerEvents: "none" }}>
          now
        </Html>
      </group>

      {/* Cursor under the pointer. */}
      <group ref={hoverRef} visible={false}>
        <mesh ref={hoverBar} position={[0, 0.5, RIBBON_HALF_W + 0.03]}>
          <boxGeometry args={[0.014, 1, 0.014]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0, RIBBON_HALF_W + 0.03]}>
          <boxGeometry args={[0.02, 0.02, 0.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      </group>

      {markEchoes.map((e) => (
        <Echo key={`mark-${e.level}`} daysToZero={e.daysToZero} level={e.level} onJump={() => jumpToEcho(store, e.daysToZero, e.level)} />
      ))}

      {/* A marked date, set by clicking. */}
      <group ref={pickRef} visible={false}>
        <mesh ref={pickBar} position={[0, 0.5, RIBBON_HALF_W + 0.03]}>
          <boxGeometry args={[0.02, 1, 0.02]} />
          <meshBasicMaterial color={new THREE.Color("#ffd166").multiplyScalar(1.8)} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.02, RIBBON_HALF_W * 2 + 0.3]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.6} />
        </mesh>
      </group>
    </>
  );
}
