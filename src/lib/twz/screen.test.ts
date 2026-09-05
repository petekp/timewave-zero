import { describe, expect, it } from "vitest";
import { DEFAULT_ZERO_MOMENT, daysToZero } from "../timewave/calendar";
import { dataPointsFor } from "../timewave/datasets";
import { createWave } from "../timewave/wave";
import { axisLabels, labelFields } from "./labels";
import { majorResonance, trigrammaticResonance } from "./resonance";
import { leftEdge, nudgeTargetPx, rightEdge, sampleGraph, withTargetPx } from "./screen";
import { makeScreen, DAYS_PER_MONTH, DAYS_PER_YEAR } from "./types";
import { timespanFromParts } from "./format";

const wave = createWave({ dataPoints: dataPointsFor("Kelley") });
// Target 06/20/1999 06:00 with a 7-day span, as in the emulator session.
const week = makeScreen({ target: 4933, span: 7, graphed: true });

describe("plot edges", () => {
  it("centres the target by default", () => {
    expect(leftEdge(week)).toBe(4936.5);
    expect(rightEdge(week)).toBe(4929.5);
  });
  it("Home and End move the target to the edges without moving the plot", () => {
    const home = withTargetPx(week, 0);
    expect(home.target).toBe(4936.5);
    expect(leftEdge(home)).toBe(4936.5);
    const end = withTargetPx(week, 368);
    expect(end.target).toBe(4929.5);
  });
  it("minus wraps from the right edge to one pixel past the left edge", () => {
    const end = withTargetPx(week, 368);
    const wrapped = nudgeTargetPx(end, 1, true);
    expect(wrapped.targetPx).toBe(1);
    expect(wrapped.target).toBeCloseTo(4936.5 - 7 / 368, 9);
  });
});

describe("graph sampling", () => {
  it("reproduces the original's axis range for the 7-day graph", () => {
    const g = sampleGraph(week, wave);
    expect(g.values).toHaveLength(369);
    expect(g.min.toFixed(7)).toBe("0.0079891");
    expect(g.max.toFixed(7)).toBe("0.0083550");
    expect(g.ys[368]).toBe(11);
    expect(g.ys[1]).toBe(116);
    expect(g.ys[184]).toBe(71);
  });
  it("stops at the zero point", () => {
    const s = makeScreen({ target: 4933, span: timespanFromParts(100, 0, 0) });
    const g = sampleGraph(s, wave);
    expect(g.values[0]).not.toBeNull();
    expect(g.values[368]).toBeNull();
  });
});

describe("axis label fields", () => {
  it("switch at 46 hours, 46 days, half a month per tick and a year per tick", () => {
    expect(labelFields(1 / 46)).toEqual(["minute", "hour"]);
    expect(labelFields(2 / 46)).toEqual(["hour", "day"]);
    expect(labelFields(45 / 46)).toEqual(["hour", "day"]);
    expect(labelFields(46 / 46)).toEqual(["day", "month"]);
    expect(labelFields(timespanFromParts(0, 22, 0) / 46)).toEqual(["day", "month"]);
    expect(labelFields(timespanFromParts(0, 23, 0) / 46)).toEqual(["month", "year2"]);
    expect(labelFields(timespanFromParts(45, 0, 0) / 46)).toEqual(["month", "year2"]);
    expect(labelFields(timespanFromParts(47, 0, 0) / 46)).toEqual(["year"]);
  });
  it("prints the hour and day digits seen on the 7-day graph", () => {
    const [hour, day] = axisLabels(week, DEFAULT_ZERO_MOMENT, "gregorian");
    expect(hour.name).toBe("Hour");
    expect(hour.rows[0]).toBe("12000111200111200011120001120001112000112200111");
    expect(hour.rows[1]).toBe("81148259326037104815922693600371482159260337048");
    expect(day.rows[0]).toBe("11111111111111111111112222222222222222222222222");
    expect(day.rows[1]).toBe("66777777788888899999990000001111111222222233333");
  });
  it("scales year labels by thousands when they exceed four digits", () => {
    const s = makeScreen({ target: 4933, span: timespanFromParts(1000000, 0, 0) });
    const [year] = axisLabels(s, DEFAULT_ZERO_MOMENT, "gregorian");
    expect(year.scale).toBe("/10^3");
    expect(year.rows).toHaveLength(3);
    expect(year.rows.map((r) => r[0]).join("")).toBe("498");
  });
  it("leaves blank digits below shorter labels", () => {
    const s = makeScreen({ target: 4933, span: timespanFromParts(10000, 0, 0) });
    const [year] = axisLabels(s, DEFAULT_ZERO_MOMENT, "gregorian");
    expect(year.rows).toHaveLength(4);
    expect(year.rows.map((r) => r[0]).join("")).toBe("3001");
    expect(year.rows.map((r) => r[10]).join("")).toBe("827 ");
  });
});

describe("resonances", () => {
  it("major resonance scales target and span by 64", () => {
    const s = makeScreen({ target: 4258.8576, span: 694.6 });
    const r = majorResonance(s, 1, true);
    expect(r.target).toBeCloseTo(272566.8864, 4);
    expect(r.span).toBeCloseTo(694.6 * 64, 6);
    expect(majorResonance(week, 1, false).target).toBeCloseTo(77.078125, 9);
  });
  it("trigrammatic resonance shifts by half cycles", () => {
    const s = makeScreen({ target: 77.0781, span: 0.109 });
    expect(trigrammaticResonance(s, 1, 1, true).target).toBeCloseTo(269.0781, 6);
    expect(trigrammaticResonance(s, 1, 2, true).target).toBeCloseTo(461.0781, 6);
    expect(trigrammaticResonance(s, 2, 1, true).target).toBeCloseTo(77.0781 + 12288, 6);
    expect(trigrammaticResonance(s, 1, 1, false).target).toBeCloseTo(77.0781 - 192, 6);
    expect(trigrammaticResonance(s, 1, 1, true).span).toBe(0.109);
  });
  it("unit lengths match the original's timespan arithmetic", () => {
    expect(DAYS_PER_YEAR).toBe(365.2425);
    expect(DAYS_PER_MONTH).toBe(30.436875);
    const m = { year: 1999, month: 6, day: 20, hour: 6, minute: 0 };
    expect(daysToZero(m, DEFAULT_ZERO_MOMENT, "gregorian")).toBe(4933);
  });
});
