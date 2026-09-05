/**
 * World coordinates of the modern view. Time runs along X (past on the left),
 * the wave's height along Y, and the ribbon has a fixed width along Z.
 */
import * as THREE from "three";

/** World X of the view's edges at the ribbon's centreline. */
export const VIEW_HALF = 6;
export const RIBBON_HALF_W = 1.35;
/** World Y of the most habitual value in the visible window. */
export const HEIGHT = 2.4;
/** The ribbon is sampled this many times wider than the view, so it runs off to the horizon. */
export const EXTENT = 2.4;
export const SAMPLE_COUNT = 1536;
export const BACKGROUND = "#06050c";

export function unitsPerDay(span: number): number {
  return (2 * VIEW_HALF) / span;
}

export function dayToX(day: number, center: number, span: number): number {
  return (day - center) * unitsPerDay(span);
}

export function xToDay(x: number, center: number, span: number): number {
  return center + x / unitsPerDay(span);
}

/** Height of a value scaled to the visible range; values outside 0..1 are compressed so the horizon stays in frame. */
export function heightOf(norm: number): number {
  let v = norm;
  if (v > 1) v = 1 + Math.tanh((v - 1) * 1.2) * 0.45;
  else if (v < 0) v = -Math.tanh(-v * 1.2) * 0.3;
  return v * HEIGHT;
}

/** Scaling of the visible window, eased frame to frame so the terrain does not jump while panning. */
export const viewMetrics = { min: 0, max: 1, ready: false };

export function normOf(value: number): number {
  const range = viewMetrics.max - viewMetrics.min;
  return range > 0 ? (value - viewMetrics.min) / range : 0.5;
}

const origin = new THREE.Vector3();
const dir = new THREE.Vector3();
const tmp = new THREE.Vector3();

/** World X where the ray through a point in normalised device coordinates meets the plane y = planeY. */
export function groundXAt(camera: THREE.Camera, ndcX: number, ndcY: number, planeY = 0): number | null {
  origin.set(ndcX, ndcY, -1).unproject(camera);
  dir.set(ndcX, ndcY, 1).unproject(camera).sub(origin).normalize();
  if (Math.abs(dir.y) < 1e-6) return null;
  const t = (planeY - origin.y) / dir.y;
  if (t < 0) return null;
  return origin.x + dir.x * t;
}

/** World X range visible along the ribbon's centreline. */
export function visibleXRange(camera: THREE.Camera): [number, number] {
  const y0 = tmp.set(0, 0, 0).project(camera).y;
  const a = groundXAt(camera, -1, y0);
  const b = groundXAt(camera, 1, y0);
  return [a ?? -VIEW_HALF, b ?? VIEW_HALF];
}
