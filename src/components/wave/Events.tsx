"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { EVENTS, EVENTS_BY_ID, echoes, eventDay, type EventTier, type WaveEvent } from "@/lib/wave/events";
import { valueAt } from "@/lib/wave/sample";
import { waveFor } from "@/lib/wave/waves";
import { useWave, useWaveStore } from "./store-context";
import { EXTENT, VIEW_HALF, dayToX, heightOf, normOf, viewMetrics } from "./mapping";

const PIN_RISE = 0.55;
const LABEL_SPACING_PX = 120;
const CLUSTER_PX = 34;
export const TIER_COLOR: Record<EventTier, string> = { mckenna: "#ffd166", added: "#7fe9ff", projected: "#c98bff" };

const DAYS = new Map(EVENTS.map((e) => [e.id, eventDay(e)]));

interface PlacedPin {
  event: WaveEvent;
  day: number;
  labelled: boolean;
}

interface PlacedCluster {
  key: string;
  day: number;
  minDay: number;
  maxDay: number;
  count: number;
}

/** Keeps a pin's group and label on the ribbon, or hidden when off the sampled stretch. */
function usePinPlacement(day: number, groupRef: React.RefObject<THREE.Group | null>, labelRef: React.RefObject<HTMLDivElement | null>, onShown?: (h: number) => void) {
  const store = useWaveStore();
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const { center, span, zeroDay, numberSet } = store.getState();
    const x = dayToX(day, center, span);
    const shown = Math.abs(x) <= VIEW_HALF * EXTENT && viewMetrics.ready;
    // drei's Html keeps drawing for hidden objects, so the label is hidden by hand.
    g.visible = shown;
    if (labelRef.current) labelRef.current.style.display = shown ? "" : "none";
    if (!shown) return;
    const { value } = valueAt(waveFor(numberSet), zeroDay, day);
    const h = heightOf(normOf(value));
    g.position.set(x, h, 0);
    onShown?.(h);
  });
}

/** One event's pin: a thin post on the ribbon's surface with a glowing head, and a label that opens it. */
function Pin({ event, day, labelled, selected }: { event: WaveEvent; day: number; labelled: boolean; selected: boolean }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const color = TIER_COLOR[event.tier];
  const rise = selected ? PIN_RISE * 1.6 : PIN_RISE;
  usePinPlacement(day, group, label);

  return (
    <group ref={group} visible={false}>
      <mesh position={[0, rise / 2, 0]}>
        <boxGeometry args={[0.012, rise, 0.012]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : 0.6} />
      </mesh>
      <mesh position={[0, rise, 0]}>
        <sphereGeometry args={[selected ? 0.06 : 0.04, 12, 12]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(selected ? 2.4 : 1.6)} toneMapped={false} />
      </mesh>
      {(labelled || selected) && (
        <Html ref={label} position={[0, rise + 0.1, 0]} center zIndexRange={[6, 0]} className={`wave-event-label${selected ? " selected" : ""}`} style={{ pointerEvents: "none" }}>
          <button type="button" style={{ pointerEvents: "auto", borderColor: color }} onClick={() => store.getState().selectEvent(selected ? null : event.id)}>
            {event.title}
          </button>
        </Html>
      )}
    </group>
  );
}

/** Several unlabelled pins too close to tell apart: one post and a count. Clicking zooms until they separate. */
function Cluster({ cluster }: { cluster: PlacedCluster }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  usePinPlacement(cluster.day, group, label);
  const zoomIn = () => {
    const s = store.getState();
    const spread = cluster.maxDay - cluster.minDay;
    s.setGoal(cluster.day, Math.max(spread * 3, s.goalSpan / 10, 1));
  };
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, PIN_RISE / 2, 0]}>
        <boxGeometry args={[0.012, PIN_RISE, 0.012]} />
        <meshBasicMaterial color="#cfd3ea" transparent opacity={0.6} />
      </mesh>
      <Html ref={label} position={[0, PIN_RISE * 1.6 + 0.42, 0]} center zIndexRange={[6, 0]} className="wave-event-label cluster" style={{ pointerEvents: "none" }}>
        <button type="button" style={{ pointerEvents: "auto" }} onClick={zoomIn} title={`${cluster.count} events. Click to zoom in.`}>
          +{cluster.count}
        </button>
      </Html>
    </group>
  );
}

/** A ghost pin where a moment recurs at another scale of the wave. */
export function Echo({ daysToZero, level, onJump }: { daysToZero: number; level: number; onJump: () => void }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const zeroDay = store.getState().zeroDay;
  usePinPlacement(zeroDay - daysToZero, group, label);
  const factor = Math.pow(64, Math.abs(level));
  const text = level > 0 ? `echo ×${factor.toLocaleString()}` : `echo ÷${factor.toLocaleString()}`;
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, PIN_RISE * 0.6, 0]}>
        <boxGeometry args={[0.01, PIN_RISE * 1.2, 0.01]} />
        <meshBasicMaterial color="#c98bff" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, PIN_RISE * 1.2, 0]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color={new THREE.Color("#c98bff").multiplyScalar(1.8)} toneMapped={false} />
      </mesh>
      <Html ref={label} position={[0, PIN_RISE * 1.2 + 0.1, 0]} center zIndexRange={[6, 0]} className="wave-event-label echo" style={{ pointerEvents: "none" }}>
        <button type="button" style={{ pointerEvents: "auto" }} onClick={onJump} title="Show the wave at this scale">
          {text}
        </button>
      </Html>
    </group>
  );
}

/** Jump the view to an echo: same relative window, scaled by the echo's level. */
export function jumpToEcho(store: ReturnType<typeof useWaveStore>, daysToZero: number, level: number): void {
  const s = store.getState();
  s.setGoal(s.zeroDay - daysToZero, s.goalSpan * Math.pow(64, level));
}

export default function Events() {
  const store = useWaveStore();
  const { camera, size } = useThree();
  const eventsVisible = useWave((s) => s.eventsVisible);
  const tiers = useWave((s) => s.tiers);
  const selectedId = useWave((s) => s.selectedEvent);
  const showEchoes = useWave((s) => s.showEchoes);
  const zeroDay = useWave((s) => s.zeroDay);
  const [pins, setPins] = useState<PlacedPin[]>([]);
  const [clusters, setClusters] = useState<PlacedCluster[]>([]);
  const signature = useRef("");
  const projected = useRef(new THREE.Vector3());

  // Decide which pins are on the sampled ribbon, which get a label, and which collapse into clusters.
  useFrame(() => {
    const { center, span } = store.getState();
    const limit = VIEW_HALF * EXTENT;
    const candidates: { event: WaveEvent; day: number; sx: number; labelled: boolean }[] = [];
    if (eventsVisible) {
      for (const event of EVENTS) {
        if (!tiers[event.tier]) continue;
        const day = DAYS.get(event.id)!;
        const x = dayToX(day, center, span);
        if (Math.abs(x) > limit) continue;
        projected.current.set(x, 1, 0).project(camera);
        candidates.push({ event, day, sx: ((projected.current.x + 1) / 2) * size.width, labelled: false });
      }
    }
    // Labels go to the heaviest events first, then to whatever still has room.
    const byWeight = [...candidates].sort((a, b) => b.event.weight - a.event.weight || Math.abs(a.sx - size.width / 2) - Math.abs(b.sx - size.width / 2));
    const taken: number[] = [];
    for (const c of byWeight) {
      const onScreen = c.sx > -50 && c.sx < size.width + 50;
      if (c.event.id === selectedId || (onScreen && taken.every((t) => Math.abs(t - c.sx) > LABEL_SPACING_PX))) {
        c.labelled = true;
        taken.push(c.sx);
      }
    }
    // Unlabelled neighbours within a few pixels become one cluster.
    candidates.sort((a, b) => a.sx - b.sx);
    const nextPins: PlacedPin[] = [];
    const nextClusters: PlacedCluster[] = [];
    let run: typeof candidates = [];
    const flush = () => {
      if (run.length >= 2) {
        const days = run.map((r) => r.day);
        nextClusters.push({ key: run.map((r) => r.event.id).join("+"), day: days.reduce((a, b) => a + b, 0) / days.length, minDay: Math.min(...days), maxDay: Math.max(...days), count: run.length });
      } else for (const r of run) nextPins.push({ event: r.event, day: r.day, labelled: false });
      run = [];
    };
    for (const c of candidates) {
      if (c.labelled) {
        flush();
        nextPins.push({ event: c.event, day: c.day, labelled: true });
        continue;
      }
      if (run.length && c.sx - run[run.length - 1].sx > CLUSTER_PX) flush();
      run.push(c);
    }
    flush();
    const sig = nextPins.map((p) => `${p.event.id}${p.labelled ? "*" : ""}`).join("|") + "#" + nextClusters.map((c) => c.key).join("|");
    if (sig !== signature.current) {
      signature.current = sig;
      setPins(nextPins);
      setClusters(nextClusters);
    }
  });

  const selected = selectedId ? EVENTS_BY_ID.get(selectedId) : undefined;
  const selectedDay = selected ? DAYS.get(selected.id)! : null;
  const echoList = showEchoes && selectedDay !== null ? echoes(zeroDay - selectedDay) : [];

  return (
    <>
      {pins.map((p) => (
        <Pin key={p.event.id} event={p.event} day={p.day} labelled={p.labelled} selected={p.event.id === selectedId} />
      ))}
      {clusters.map((c) => (
        <Cluster key={c.key} cluster={c} />
      ))}
      {echoList.map((e) => (
        <Echo key={e.level} daysToZero={e.daysToZero} level={e.level} onJump={() => jumpToEcho(store, e.daysToZero, e.level)} />
      ))}
    </>
  );
}
