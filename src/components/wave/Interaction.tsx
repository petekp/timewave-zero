"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useWaveStore } from "./store-context";
import type { SurfaceRef } from "./Ribbon";
import { groundXAt, unitsPerDay, xToDay } from "./mapping";

const DRAG_THRESHOLD_PX = 5;
const WHEEL_ZOOM_RATE = 0.0016;

/**
 * Pointer and wheel handling on the canvas: drag to move through time, wheel
 * or pinch to change the span, click to mark a date. Everything is expressed in
 * days so the date under the pointer stays put while dragging or zooming.
 */
export default function Interaction({ surfaceRef }: { surfaceRef: SurfaceRef }) {
  const store = useWaveStore();
  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { startDay: number; startX: number; startY: number; moved: boolean; pointerId: number } | null = null;
    let pinch: { span: number; dist: number; midDay: number } | null = null;

    const toNdc = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      return ndc;
    };

    /** Day under a screen point, from the ribbon surface if it is under the pointer, else the ground plane. */
    const dayAt = (clientX: number, clientY: number, surface: boolean): number | null => {
      const { center, span } = store.getState();
      const p = toNdc(clientX, clientY);
      const mesh = surfaceRef.current;
      if (surface && mesh) {
        raycaster.setFromCamera(p, camera);
        const hit = raycaster.intersectObject(mesh, false)[0];
        if (hit) return xToDay(hit.point.x, center, span);
      }
      const x = groundXAt(camera, p.x, p.y);
      return x === null ? null : xToDay(x, center, span);
    };

    const groundX = (clientX: number, clientY: number): number | null => {
      const p = toNdc(clientX, clientY);
      return groundXAt(camera, p.x, p.y);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const { span, center } = store.getState();
        const mx = groundX((a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = { span, dist: Math.hypot(a.x - b.x, a.y - b.y), midDay: mx === null ? center : xToDay(mx, center, span) };
        drag = null;
        return;
      }
      const day = dayAt(e.clientX, e.clientY, false);
      if (day === null) return;
      drag = { startDay: day, startX: e.clientX, startY: e.clientY, moved: false, pointerId: e.pointerId };
    };

    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 1) return;
        const span = pinch.span * (pinch.dist / dist);
        const mx = groundX((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (mx === null) return;
        store.getState().setView(pinch.midDay - mx / unitsPerDay(span), span);
        return;
      }
      if (drag && drag.pointerId === e.pointerId) {
        if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        el.style.cursor = "grabbing";
        const gx = groundX(e.clientX, e.clientY);
        if (gx === null) return;
        const { span } = store.getState();
        store.getState().setView(drag.startDay - gx / unitsPerDay(span), span);
        store.getState().setHover(null);
        return;
      }
      if (e.pointerType === "mouse") store.getState().setHover(dayAt(e.clientX, e.clientY, true));
    };

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && drag.pointerId === e.pointerId) {
        if (!drag.moved && e.type === "pointerup") {
          const day = dayAt(e.clientX, e.clientY, true);
          const s = store.getState();
          s.setPick(day !== null && s.pickDay !== null && Math.abs(day - s.pickDay) < s.span * 0.004 ? null : day);
        }
        drag = null;
      }
      el.style.cursor = "";
    };

    const onLeave = () => store.getState().setHover(null);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dy = e.deltaY * scale;
      const dx = e.deltaX * scale;
      const s = store.getState();
      const gx = groundX(e.clientX, e.clientY);
      let span = s.goalSpan;
      let center = s.goalCenter;
      if (Math.abs(dy) > 0) {
        const factor = Math.exp(Math.max(-1, Math.min(1, dy * WHEEL_ZOOM_RATE)) * (e.ctrlKey ? 2 : 1));
        const anchor = gx === null ? center : xToDay(gx, center, span);
        span = span * factor;
        center = gx === null ? center : anchor - gx / unitsPerDay(span);
      }
      if (Math.abs(dx) > 0) center += (dx / el.clientWidth) * span;
      s.setGoal(center, span);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
    };
  }, [camera, gl, surfaceRef, store]);

  return null;
}
