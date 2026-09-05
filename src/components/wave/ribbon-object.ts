/**
 * The ribbon as a plain three.js object: a top surface with a front wall,
 * plus a bright lip along the front edge. `update` rewrites the vertex
 * buffers from a set of samples; React only positions it in the scene.
 */
import * as THREE from "three";
import type { Samples } from "@/lib/wave/sample";
import { BACKGROUND, RIBBON_HALF_W, SAMPLE_COUNT, dayToX, heightOf } from "./mapping";

const N = SAMPLE_COUNT;
/** Strips: top surface and front wall. Each has two vertices per sample. */
const STRIPS = 2;

const vertexShader = /* glsl */ `
  attribute float aNorm;
  attribute float aRefl;
  varying float vNorm;
  varying float vRefl;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNorm = aNorm;
    vRefl = aRefl;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uHabit;
  uniform vec3 uMid;
  uniform vec3 uNovel;
  uniform vec3 uGlow;
  uniform vec3 uCamPos;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  varying float vNorm;
  varying float vRefl;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  vec3 hueShift(vec3 c, float a) {
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    float sa = sin(a);
    return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
  }

  void main() {
    float n = clamp(vNorm, 0.0, 1.0);
    float novelty = 1.0 - n;
    vec3 col = mix(uHabit, uMid, smoothstep(0.0, 0.6, novelty));
    col = mix(col, uNovel, smoothstep(0.6, 1.0, novelty));

    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    vec3 L = normalize(vec3(0.5, 1.0, 0.6));
    float diff = 0.5 + 0.5 * max(dot(N, L), 0.0);
    vec3 V = normalize(uCamPos - vPosW);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 irid = hueShift(uGlow, uTime * 0.12 + vPosW.x * 0.3 + novelty * 2.5) * fres * 0.5;
    col = col * diff + irid;

    // Contour lines at every tenth of the height.
    float c = abs(fract(vNorm * 10.0) - 0.5);
    float w = fwidth(vNorm * 10.0);
    float line = 1.0 - smoothstep(0.0, max(w * 1.5, 0.02), c);
    col += line * 0.06;

    // The most novel stretches glow.
    col += uNovel * pow(novelty, 5.0) * 0.7;

    float alpha = 1.0;
    if (vRefl > 0.5) {
      // The reflection past the zero point: the same shape, drained of colour.
      col = mix(col, vec3(dot(col, vec3(0.3333))) * vec3(0.75, 0.8, 1.0), 0.7) * 0.6;
      alpha = 0.78;
    }
    col *= uDim;
    float f = smoothstep(uFogNear, uFogFar, length(uCamPos - vPosW));
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, alpha * (1.0 - f * 0.7));
  }
`;

const EDGE_COLOR = new THREE.Color("#9ff2ff").multiplyScalar(2.2);
const EDGE_REFLECTED = new THREE.Color("#8a8f9a").multiplyScalar(0.9);

function stripIndex(strips: number): number[] {
  const index: number[] = [];
  for (let s = 0; s < strips; s++) {
    const base = s * 2 * N;
    for (let i = 0; i < N - 1; i++) {
      const a = base + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  return index;
}

export class RibbonObject extends THREE.Group {
  readonly surface: THREE.Mesh;
  readonly edge: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly edgeMaterial: THREE.MeshBasicMaterial;
  private readonly positions: Float32Array;
  private readonly norms: Float32Array;
  private readonly refls: Float32Array;
  private readonly edgePositions: Float32Array;
  private readonly edgeColors: Float32Array;

  constructor() {
    super();
    const vertexCount = STRIPS * 2 * N;
    this.positions = new Float32Array(vertexCount * 3);
    this.norms = new Float32Array(vertexCount);
    this.refls = new Float32Array(vertexCount);
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(stripIndex(STRIPS));
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    geometry.setAttribute("aNorm", new THREE.BufferAttribute(this.norms, 1));
    geometry.setAttribute("aRefl", new THREE.BufferAttribute(this.refls, 1));

    this.edgePositions = new Float32Array(2 * N * 3);
    this.edgeColors = new Float32Array(2 * N * 3);
    const edge = new THREE.BufferGeometry();
    edge.setIndex(stripIndex(1));
    edge.setAttribute("position", new THREE.BufferAttribute(this.edgePositions, 3));
    edge.setAttribute("color", new THREE.BufferAttribute(this.edgeColors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uHabit: { value: new THREE.Color("#141a3d") },
        uMid: { value: new THREE.Color("#4b2a8a") },
        uNovel: { value: new THREE.Color("#ff5f9e") },
        uGlow: { value: new THREE.Color("#66e0ff") },
        uCamPos: { value: new THREE.Vector3() },
        uFogColor: { value: new THREE.Color(BACKGROUND) },
        uFogNear: { value: 10 },
        uFogFar: { value: 30 },
        uDim: { value: 1 },
      },
    });
    this.edgeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide });

    this.surface = new THREE.Mesh(geometry, this.material);
    this.surface.frustumCulled = false;
    this.edge = new THREE.Mesh(edge, this.edgeMaterial);
    this.edge.frustumCulled = false;
    this.add(this.surface, this.edge);
  }

  /** Per-frame uniforms. */
  tick(time: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCamPos.value.copy(cameraPosition);
  }

  /** Brightness multiplier, 1 for the main ribbon and less for stacked copies. */
  setDim(dim: number): void {
    this.material.uniforms.uDim.value = dim;
    this.edgeMaterial.color.setScalar(dim);
  }

  /** Rewrite the geometry from samples, scaling values between `min` and `max` to the ribbon's height. */
  update(samples: Samples, center: number, span: number, min: number, max: number): void {
    const range = max - min;
    const { positions, norms, refls, edgePositions, edgeColors } = this;
    const w = RIBBON_HALF_W;
    const frontBase = 2 * N;
    for (let i = 0; i < N; i++) {
      const x = dayToX(samples.days[i], center, span);
      const norm = range > 0 ? (samples.values[i] - min) / range : 0.5;
      const h = heightOf(norm);
      const r = samples.reflected[i];
      // Top: back edge then front edge.
      let v = i * 6;
      positions[v] = x;
      positions[v + 1] = h;
      positions[v + 2] = -w;
      positions[v + 3] = x;
      positions[v + 4] = h;
      positions[v + 5] = w;
      // Front wall: bottom then top.
      v = (frontBase + i * 2) * 3;
      positions[v] = x;
      positions[v + 1] = 0;
      positions[v + 2] = w;
      positions[v + 3] = x;
      positions[v + 4] = h;
      positions[v + 5] = w;
      for (const base of [0, frontBase]) {
        norms[base + i * 2] = norm;
        norms[base + i * 2 + 1] = norm;
        refls[base + i * 2] = r;
        refls[base + i * 2 + 1] = r;
      }
      // Lip along the front of the top surface.
      const e = i * 6;
      edgePositions[e] = x;
      edgePositions[e + 1] = h + 0.012;
      edgePositions[e + 2] = w - 0.07;
      edgePositions[e + 3] = x;
      edgePositions[e + 4] = h + 0.012;
      edgePositions[e + 5] = w + 0.005;
      const c = r ? EDGE_REFLECTED : EDGE_COLOR;
      edgeColors[e] = edgeColors[e + 3] = c.r;
      edgeColors[e + 1] = edgeColors[e + 4] = c.g;
      edgeColors[e + 2] = edgeColors[e + 5] = c.b;
    }
    const g = this.surface.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aNorm.needsUpdate = true;
    g.attributes.aRefl.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const eg = this.edge.geometry;
    eg.attributes.position.needsUpdate = true;
    eg.attributes.color.needsUpdate = true;
    eg.computeBoundingSphere();
  }

  dispose(): void {
    this.surface.geometry.dispose();
    this.edge.geometry.dispose();
    this.material.dispose();
    this.edgeMaterial.dispose();
  }
}
