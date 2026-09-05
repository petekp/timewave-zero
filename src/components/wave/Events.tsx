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
const TIER_COLOR: Record<EventTier, string> = { mckenna: "#ffd166", later: "#7fe9ff", projected: "#c98bff" };

interface Placed {
  event: WaveEvent;
  day: number;
  labelled: boolean;
}

const DAYS = new Map(EVENTS.map((e) => [e.id, eventDay(e)]));

/** One event's pin: a thin post on the ribbon's surface with a glowing head, and a label that opens it. */
function Pin({ event, day, labelled, selected }: { event: WaveEvent; day: number; labelled: boolean; selected: boolean }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const post = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const color = TIER_COLOR[event.tier];
  const rise = selected ? PIN_RISE * 1.6 : PIN_RISE;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { center, span, zeroDay, numberSet } = store.getState();
    const x = dayToX(day, center, span);
    const shown = Math.abs(x) <= VIEW_HALF * EXTENT && viewMetrics.ready;
    // drei's Html keeps drawing for hidden objects, so the label is hidden by hand.
    g.visible = shown;
    if (label.current) label.current.style.display = shown ? "" : "none";
    if (!shown) return;
    const { value } = valueAt(waveFor(numberSet), zeroDay, day);
    const h = heightOf(normOf(value));
    g.position.set(x, h, 0);
    if (post.current) {
      post.current.scale.y = rise;
      post.current.position.y = rise / 2;
    }
    if (head.current) head.current.position.y = rise;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={post} position={[0, rise / 2, 0]}>
        <boxGeometry args={[0.012, 1, 0.012]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : 0.6} />
      </mesh>
      <mesh ref={head} position={[0, rise, 0]}>
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

/** A ghost pin where the selected event recurs at another scale of the wave. */
function Echo({ daysToZero, level, onJump }: { daysToZero: number; level: number; onJump: () => void }) {
  const store = useWaveStore();
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { center, span, zeroDay, numberSet } = store.getState();
    const day = zeroDay - daysToZero;
    const x = dayToX(day, center, span);
    const shown = Math.abs(x) <= VIEW_HALF * EXTENT && viewMetrics.ready;
    g.visible = shown;
    if (label.current) label.current.style.display = shown ? "" : "none";
    if (!shown) return;
    const { value } = valueAt(waveFor(numberSet), zeroDay, day);
    g.position.set(x, heightOf(normOf(value)), 0);
  });
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

export default function Events() {
  const store = useWaveStore();
  const { camera, size } = useThree();
  const eventsVisible = useWave((s) => s.eventsVisible);
  const selectedId = useWave((s) => s.selectedEvent);
  const showEchoes = useWave((s) => s.showEchoes);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const signature = useRef("");
  const projected = useRef(new THREE.Vector3());

  // Decide which pins are on the sampled ribbon and which get a label, only re-rendering when that changes.
  useFrame(() => {
    if (!eventsVisible) {
      if (signature.current !== "") {
        signature.current = "";
        setPlaced([]);
      }
      return;
    }
    const { center, span } = store.getState();
    const limit = VIEW_HALF * EXTENT;
    const candidates: { event: WaveEvent; day: number; sx: number }[] = [];
    for (const event of EVENTS) {
      const day = DAYS.get(event.id)!;
      const x = dayToX(day, center, span);
      if (Math.abs(x) > limit) continue;
      projected.current.set(x, 1, 0).project(camera);
      candidates.push({ event, day, sx: ((projected.current.x + 1) / 2) * size.width });
    }
    candidates.sort((a, b) => b.event.weight - a.event.weight || Math.abs(a.sx - size.width / 2) - Math.abs(b.sx - size.width / 2));
    const taken: number[] = [];
    const next: Placed[] = candidates.map((c) => {
      const onScreen = c.sx > -50 && c.sx < size.width + 50;
      const free = onScreen && taken.every((t) => Math.abs(t - c.sx) > LABEL_SPACING_PX);
      if (free) taken.push(c.sx);
      return { event: c.event, day: c.day, labelled: free };
    });
    const sig = next.map((p) => `${p.event.id}${p.labelled ? "*" : ""}`).join("|");
    if (sig !== signature.current) {
      signature.current = sig;
      setPlaced(next);
    }
  });

  const selected = selectedId ? EVENTS_BY_ID.get(selectedId) : undefined;
  const selectedDay = selected ? DAYS.get(selected.id)! : null;
  const zeroDay = useWave((s) => s.zeroDay);
  const echoList = showEchoes && selectedDay !== null ? echoes(zeroDay - selectedDay) : [];

  return (
    <>
      {placed.map((p) => (
        <Pin key={p.event.id} event={p.event} day={p.day} labelled={p.labelled} selected={p.event.id === selectedId} />
      ))}
      {echoList.map((e) => (
        <Echo
          key={e.level}
          daysToZero={e.daysToZero}
          level={e.level}
          onJump={() => {
            const s = store.getState();
            s.setGoal(s.zeroDay - e.daysToZero, s.goalSpan * Math.pow(64, e.level));
          }}
        />
      ))}
    </>
  );
}
