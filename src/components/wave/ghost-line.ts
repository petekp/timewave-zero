/** A thin line following another number set's wave over the same window, drawn on top of the ribbon. */
import * as THREE from "three";
import type { Samples } from "@/lib/wave/sample";
import { SAMPLE_COUNT, dayToX, heightOf } from "./mapping";

const N = SAMPLE_COUNT;
const HALF_W = 0.035;
const LIFT = 0.02;

export class GhostLine extends THREE.Mesh {
  private readonly positions: Float32Array;

  constructor(color: string) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(2 * N * 3);
    const index: number[] = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    super(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
    this.positions = positions;
    this.frustumCulled = false;
    this.renderOrder = 10;
  }

  update(samples: Samples, center: number, span: number, min: number, max: number): void {
    const range = max - min;
    const p = this.positions;
    for (let i = 0; i < N; i++) {
      const x = dayToX(samples.days[i], center, span);
      const h = heightOf(range > 0 ? (samples.values[i] - min) / range : 0.5) + LIFT;
      const v = i * 6;
      p[v] = x;
      p[v + 1] = h;
      p[v + 2] = -HALF_W;
      p[v + 3] = x;
      p[v + 4] = h;
      p[v + 5] = HALF_W;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
