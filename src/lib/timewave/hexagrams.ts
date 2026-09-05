/**
 * The 64 I Ching hexagrams in King Wen order (hexagram 1 through 64).
 * Each string lists the six lines top to bottom; 1 = yang (solid), 0 = yin (broken).
 * Transcribed from Peter Meyer's SEQ.H (WEN_GRPH 2.1, 1997).
 */
export const KING_WEN_LINES: readonly string[] = [
  "111111", "000000", "010001", "100010", "010111", "111010", "000010",
  "010000", "110111", "111011", "000111", "111000", "111101", "101111",
  "000100", "001000", "011001", "100110", "000011", "110000", "101001",
  "100101", "100000", "000001", "111001", "100111", "100001", "011110",
  "010010", "101101", "011100", "001110", "111100", "001111", "101000",
  "000101", "110101", "101011", "010100", "001010", "100011", "110001",
  "011111", "111110", "011000", "000110", "011010", "010110", "011101",
  "101110", "001001", "100100", "110100", "001011", "001101", "101100",
  "110110", "011011", "110010", "010011", "110011", "001100", "010101",
  "101010",
];

/** A hexagram ordering: King Wen hexagram numbers (1..64) listed in sequence order. */
export type HexagramOrder = readonly number[];

export const KING_WEN_ORDER: HexagramOrder = Array.from({ length: 64 }, (_, i) => i + 1);

/** The Huang Ti sequence, from Meyer's HUANG_TI.SEQ. */
export const HUANG_TI_ORDER: HexagramOrder = [
  1, 2, 33, 34, 4, 3, 26, 25, 40, 39, 31, 32, 36, 35, 28, 27,
  24, 23, 45, 46, 60, 59, 18, 17, 43, 44, 57, 58, 8, 7, 54, 53,
  6, 5, 47, 48, 37, 38, 12, 11, 42, 41, 30, 29, 63, 64, 56, 55,
  15, 16, 19, 20, 10, 9, 14, 13, 21, 22, 49, 50, 51, 52, 62, 61,
];

/** Lines of a hexagram (top to bottom) as an array of six 0/1 values. */
export function linesOf(hexagramNumber: number): number[] {
  const s = KING_WEN_LINES[hexagramNumber - 1];
  if (s === undefined) throw new RangeError(`Hexagram number out of range: ${hexagramNumber}`);
  return s.split("").map(Number);
}

/** Number of lines that differ between two hexagrams. */
export function linesChanged(a: number, b: number): number {
  const la = linesOf(a);
  const lb = linesOf(b);
  let n = 0;
  for (let i = 0; i < 6; i++) if (la[i] !== lb[i]) n++;
  return n;
}
