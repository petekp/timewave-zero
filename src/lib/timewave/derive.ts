/**
 * Derivation of the 384 timewave data points from a hexagram sequence.
 *
 * This is a direct port of Peter Meyer's WEN_GRPH 2.1 (SEQAUX.C, GRAPH.C,
 * DATA_PTS.C, 1994-1998), the program McKenna and Meyer used to produce the
 * published number sets. Index conventions follow the C code (1-based
 * hexagram arrays) so the two can be compared line by line.
 */
import { KING_WEN_LINES, type HexagramOrder } from "./hexagrams";

export interface Derivation {
  /** Hexagram numbers in sequence order. */
  order: number[];
  /** First order of difference: fod[i] = lines changed from sequence position i+1 to i+2, wrapping at the end. */
  fod: number[];
  /** Second order of difference (differences of consecutive fod values). */
  fod2: number[];
  closure: number;
  closureOffset: number;
  /** Position at which the reversed wave is aligned against the forward wave. */
  start: number;
  /** Vertical offset of the reversed graph, chosen so the end points coincide. */
  row2: number;
  halfTwist: boolean;
  /** Per-position intermediate values, 384 each. */
  angleLin: number[];
  angleTri: number[];
  angleHex: number[];
  distLin: number[];
  distTri: number[];
  distHex: number[];
  /** The 384 data points: |angle sum| + |distance sum|. */
  dataPoints: number[];
}

function invert(h: number[]): number[] {
  const r = [0];
  for (let j = 1; j <= 6; j++) r[j] = h[7 - j];
  return r;
}

function complement(h: number[]): number[] {
  const r = [0];
  for (let j = 1; j <= 6; j++) r[j] = 1 - h[j];
  return r;
}

function sameLines(a: number[], b: number[]): boolean {
  for (let j = 1; j <= 6; j++) if (a[j] !== b[j]) return false;
  return true;
}

/**
 * Checks the pairing rule Meyer enforces: every even-position hexagram is the
 * inversion of the one before it, or its complement when inversion gives the same hexagram.
 */
export function isWenSequenceType1(order: HexagramOrder): boolean {
  try {
    validate(order);
    return true;
  } catch {
    return false;
  }
}

function validate(order: HexagramOrder): number[][] {
  if (order.length !== 64) throw new Error(`Hexagram sequence contains ${order.length} hexagram numbers. There must be 64.`);
  if (order[0] !== 1) throw new Error("First hexagram must be #1.");
  const seen = new Set<number>();
  const hexagram: number[][] = [[]];
  for (let i = 1; i <= 64; i++) {
    const n = order[i - 1];
    if (!Number.isInteger(n) || n < 1 || n > 64) throw new Error(`Invalid hexagram number ${n} at position ${i}.`);
    if (seen.has(n)) throw new Error(`Hexagram number ${n} occurs more than once.`);
    seen.add(n);
    hexagram[i] = [0, ...KING_WEN_LINES[n - 1].split("").map(Number)];
  }
  for (let i = 2; i <= 64; i += 2) {
    const prev = hexagram[i - 1];
    let expected = invert(prev);
    if (sameLines(expected, prev)) expected = complement(prev);
    if (!sameLines(expected, hexagram[i])) {
      throw new Error(`Hexagram ${i} is not paired with hexagram ${i - 1} as required in a Wen sequence of type 1.`);
    }
  }
  return hexagram;
}

export function derive(order: HexagramOrder, halfTwist: boolean): Derivation {
  const hexagram = validate(order);

  const lineDiffs = (a: number, b: number): number => {
    let d = 0;
    for (let j = 1; j <= 6; j++) if (hexagram[a][j] !== hexagram[b][j]) d++;
    return d;
  };

  // First- and second-order differences (SEQAUX.C: generate_differences, analyze_sequence).
  const diff1: number[] = new Array(65).fill(0);
  const diff2: number[] = new Array(65).fill(0);
  for (let i = 1; i < 64; i++) diff1[i] = lineDiffs(i, i + 1);
  diff1[64] = lineDiffs(64, 1);
  for (let i = 1; i < 64; i++) diff2[i] = diff1[i + 1] - diff1[i];
  diff2[64] = diff1[1] - diff1[64];

  // Maximum closure: the offset at which the reversed second-order wave best matches the forward one.
  let closure = 0;
  let closureOffset = 0;
  for (let m = 0; m < 64; m++) {
    if (diff2[64] === diff2[63 - m >= 1 ? 63 - m : 64]) {
      let i = 1;
      while (i <= 64 && diff2[i] === diff2[63 - m - i >= 1 ? 63 - m - i : 127 - m - i]) i++;
      i--;
      let j = 1;
      while (j <= 64 && diff2[64 - j] === diff2[63 - m + j <= 64 ? 63 - m + j : -1 - m + j]) j++;
      j--;
      if (j > 1) {
        closure = i + j + 1;
        closureOffset = m;
      }
    }
  }

  // Alignment of the reversed graph against the forward graph (WEN_GRPH.C main, GRAPH.C labels_2).
  const start = closure ? 64 - closureOffset : 64;
  const row1 = 0;
  const row2 = row1 + diff1[64] + diff1[start] - 5;
  const distance1: number[] = new Array(65).fill(0);
  const distance2: number[] = new Array(65).fill(0);
  for (let i = 0; i <= 64; i++) {
    let j = start - i;
    if (j < 1) j += 64;
    distance1[i] = row2 + 6 - diff1[j] - (row1 + 1 + diff1[i ? i : 64]);
    j = start - i - 1;
    if (j < 1) j += 64;
    if (j < 1) j += 64;
    distance2[i] = -diff2[j] + diff2[i ? i : 64];
  }

  // DATA_PTS.C: calculate_data_points.
  const distLin: number[] = new Array(384).fill(0);
  const angleLin: number[] = new Array(384).fill(0);
  for (let j = 0; j < 64; j++) {
    distLin[j] = distance1[64 - j];
    angleLin[j] = distance2[64 - j];
  }
  if (halfTwist) {
    // The "half twist": McKenna's unexplained sign change on the first half of the angle values.
    for (let j = 1; j <= 32; j++) angleLin[j] = -angleLin[j];
  }
  for (let j = 64; j < 384; j++) {
    distLin[j] = distLin[j % 64];
    angleLin[j] = angleLin[j % 64];
  }
  const distTri: number[] = new Array(384).fill(0);
  const angleTri: number[] = new Array(384).fill(0);
  for (let j = 0; j < 192; j++) {
    distTri[j + 192] = distTri[j] = 3 * distLin[Math.floor(j / 3)];
    angleTri[j + 192] = angleTri[j] = 3 * angleLin[Math.floor(j / 3)];
  }
  const distHex: number[] = new Array(384).fill(0);
  const angleHex: number[] = new Array(384).fill(0);
  for (let j = 0; j < 384; j++) {
    distHex[j] = 6 * distLin[Math.floor(j / 6)];
    angleHex[j] = 6 * angleLin[Math.floor(j / 6)];
  }
  const dataPoints: number[] = new Array(384).fill(0);
  for (let j = 0; j < 384; j++) {
    const angleSum = angleLin[j] + angleTri[j] + angleHex[j];
    const distSum = distLin[j] + distTri[j] + distHex[j];
    dataPoints[j] = Math.abs(angleSum) + Math.abs(distSum);
  }

  return {
    order: [...order],
    fod: diff1.slice(1),
    fod2: diff2.slice(1),
    closure,
    closureOffset,
    start,
    row2,
    halfTwist,
    angleLin,
    angleTri,
    angleHex,
    distLin,
    distTri,
    distHex,
    dataPoints,
  };
}
