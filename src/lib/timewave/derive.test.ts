import { describe, expect, it } from "vitest";
import { derive, isWenSequenceType1 } from "./derive";
import { dataPointsFor } from "./datasets";
import { HUANG_TI_ORDER, KING_WEN_ORDER, linesChanged } from "./hexagrams";
import kelley from "./__fixtures__/kelley.json";
import watkins from "./__fixtures__/watkins.json";
import sheliak from "./__fixtures__/sheliak.json";
import huangTi from "./__fixtures__/huang-ti.json";
import huangTiTwist from "./__fixtures__/huang-ti-twist.json";

// Watkins's h[1..64] from "Autopsy for a Mathematical Hallucination?" (1996).
const WATKINS_FOD = [
  6, 2, 4, 4, 4, 3, 2, 4, 2, 4, 6, 2, 2, 4, 2, 2, 6, 3, 4, 3, 2, 2, 2, 3, 4, 2, 6, 2, 6, 3, 2, 3,
  4, 4, 4, 2, 4, 6, 4, 3, 2, 4, 2, 3, 4, 3, 2, 3, 4, 4, 4, 1, 6, 2, 2, 3, 4, 3, 2, 1, 6, 3, 6, 3,
];

describe("King Wen first order of difference", () => {
  const d = derive(KING_WEN_ORDER, true);
  it("matches Watkins's published values", () => {
    expect(d.fod).toEqual(WATKINS_FOD);
  });
  it("contains no 5s and sums to 64 transitions", () => {
    expect(d.fod).not.toContain(5);
    expect(d.fod).toHaveLength(64);
  });
  it("agrees with linesChanged on the raw hexagrams", () => {
    expect(linesChanged(1, 2)).toBe(6);
    expect(linesChanged(64, 1)).toBe(3);
  });
  it("finds Meyer's closure for the King Wen sequence", () => {
    expect(d.closure).toBe(3);
    expect(d.closureOffset).toBe(1);
    expect(d.start).toBe(63);
  });
});

describe("384 data points reproduce Meyer's published files", () => {
  it("Kelley = King Wen with half twist (KING_WEN.TWZ / DATA.TWZ)", () => {
    expect(derive(KING_WEN_ORDER, true).dataPoints).toEqual(kelley);
  });
  it("Watkins = King Wen without half twist (KING_WEN.TWX)", () => {
    expect(derive(KING_WEN_ORDER, false).dataPoints).toEqual(watkins);
  });
  it("Huang Ti without half twist (DATA.TW4)", () => {
    expect(derive(HUANG_TI_ORDER, false).dataPoints).toEqual(huangTi);
  });
  it("Huang Ti with half twist (HUANG_TI.TWZ)", () => {
    expect(derive(HUANG_TI_ORDER, true).dataPoints).toEqual(huangTiTwist);
  });
  it("named sets resolve to the right data", () => {
    expect([...dataPointsFor("Kelley")]).toEqual(kelley);
    expect([...dataPointsFor("Watkins")]).toEqual(watkins);
    expect([...dataPointsFor("Sheliak")]).toEqual(sheliak);
    expect([...dataPointsFor("Huang Ti")]).toEqual(huangTi);
  });
  it("every set starts with three zeros so the wave is zero at the zero point", () => {
    for (const s of [kelley, watkins, sheliak, huangTi]) expect(s.slice(0, 3)).toEqual([0, 0, 0]);
  });
});

describe("sequence validation", () => {
  it("accepts the King Wen and Huang Ti sequences", () => {
    expect(isWenSequenceType1(KING_WEN_ORDER)).toBe(true);
    expect(isWenSequenceType1(HUANG_TI_ORDER)).toBe(true);
  });
  it("rejects a sequence that breaks the pairing rule", () => {
    const bad = [...KING_WEN_ORDER];
    [bad[2], bad[4]] = [bad[4], bad[2]];
    expect(isWenSequenceType1(bad)).toBe(false);
    expect(() => derive(bad, true)).toThrow(/not paired/);
  });
});
