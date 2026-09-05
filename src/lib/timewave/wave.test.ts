import { describe, expect, it } from "vitest";
import { createWave } from "./wave";
import { dataPointsFor } from "./datasets";

const kelley = createWave({ dataPoints: dataPointsFor("Kelley") });

describe("timewave values (Kelley set)", () => {
  // Test values printed in Meyer's "The Mathematics of Timewave Zero" (1993).
  it("is zero at the zero point", () => {
    expect(kelley.value(0)).toBe(0);
  });
  it("t(1) = 0.0000036160151", () => {
    expect(kelley.value(1)).toBeCloseTo(0.0000036160151, 13);
  });
  it("t(9.75) = 0.000047385693 (printed in the appendix as t(9.5))", () => {
    expect(kelley.value(9.75)).toBeCloseTo(0.000047385693, 12);
  });
  it("t(10^12) = 5192046.655436", () => {
    expect(kelley.value(1e12)).toBeCloseTo(5192046.655436, 6);
  });
  it("major resonance: t(64x) = 64 t(x)", () => {
    for (const x of [3, 17.5, 1000, 24576.25]) {
      expect(kelley.value(64 * x)).toBeCloseTo(64 * kelley.value(x), 9);
    }
  });
  it("rejects points after the zero date", () => {
    expect(() => kelley.value(-1)).toThrow(RangeError);
  });
});

describe("other number sets and wave factors", () => {
  it("each set gives a positive value one day before the zero point", () => {
    for (const name of ["Watkins", "Sheliak", "Huang Ti"] as const) {
      expect(createWave({ dataPoints: dataPointsFor(name) }).value(1)).toBeGreaterThan(0);
    }
  });
  it("a different wave factor changes the resonance ratio", () => {
    const w = createWave({ dataPoints: dataPointsFor("Kelley"), waveFactor: 10 });
    expect(w.value(1000)).toBeCloseTo(10 * w.value(100), 9);
  });
});
