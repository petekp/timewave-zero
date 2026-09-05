import { describe, expect, test } from "vitest";
import { DEFAULT_ZERO_MOMENT } from "../timewave/calendar";
import { waveFor } from "./waves";
import { sampleWindow } from "./sample";
import { ticksFor } from "./ticks";
import { formatDuration, formatYear, momentToDay } from "./time";
import { dateDay, decodeWaveState, encodeWaveState } from "./url";
import { cycles } from "./cycles";
import { dipCount, followZero, viewWithZero } from "./fit";
import { EVENTS } from "./events";

const ZERO_DAY = momentToDay(DEFAULT_ZERO_MOMENT);

describe("sampling", () => {
  test("marks samples after the zero point as reflected and mirrors their values", () => {
    const s = sampleWindow(waveFor("DATA.TWZ"), { zeroDay: ZERO_DAY, center: ZERO_DAY, span: 20, count: 21 });
    expect(Array.from(s.reflected)).toEqual([...Array(10).fill(0), 0, ...Array(10).fill(1)]);
    expect(s.values[10]).toBe(0);
    expect(s.values[0]).toBeCloseTo(s.values[20], 12);
  });

  test("scales the inner window to 0..1", () => {
    const s = sampleWindow(waveFor("DATA.TWZ"), { zeroDay: ZERO_DAY, center: ZERO_DAY - 1000, span: 400, referenceSpan: 200, count: 401 });
    const inner = Array.from(s.norm).filter((_, i) => Math.abs(s.days[i] - (ZERO_DAY - 1000)) <= 100);
    expect(Math.min(...inner)).toBe(0);
    expect(Math.max(...inner)).toBe(1);
  });
});

describe("ticks", () => {
  test("uses calendar-aligned steps at every scale", () => {
    const week = ticksFor(dateDay(1999, 6, 14), dateDay(1999, 6, 21));
    expect(week.map((t) => t.label)).toEqual(["Jun 14, 1999", "Jun 15, 1999", "Jun 16, 1999", "Jun 17, 1999", "Jun 18, 1999", "Jun 19, 1999", "Jun 20, 1999", "Jun 21, 1999"]);
    const decades = ticksFor(dateDay(1945, 1, 1), dateDay(2013, 1, 1));
    expect(decades.map((t) => t.label)).toEqual(["1950", "1960", "1970", "1980", "1990", "2000", "2010"]);
    const eons = ticksFor(dateDay(-4306, 1, 1), dateDay(2013, 1, 1));
    expect(eons[0].label).toBe("4001 BC");
    expect(eons.length).toBeGreaterThan(4);
    expect(ticksFor(ZERO_DAY, ZERO_DAY + 1 / 12).map((t) => t.label)).toEqual(["Dec 21, 06:00", "Dec 21, 06:15", "Dec 21, 06:30", "Dec 21, 06:45", "Dec 21, 07:00", "Dec 21, 07:15", "Dec 21, 07:30", "Dec 21, 07:45", "Dec 21, 08:00"]);
  });
});

describe("formatting", () => {
  test("durations keep their trailing zeros", () => {
    expect(formatDuration(40000)).toBe("110 years");
    expect(formatDuration(100)).toBe("100 days");
    expect(formatDuration(3.6 * 365.25)).toBe("3.6 years");
  });

  test("years read as people write them", () => {
    expect(formatYear(1999)).toBe("1999");
    expect(formatYear(12000)).toBe("12,000");
    expect(formatYear(0)).toBe("1 BC");
    expect(formatYear(-2299)).toBe("2300 BC");
    expect(formatYear(-17_600_000)).toBe("17.6 million BC");
  });

  test("cycle lengths", () => {
    expect(cycles().map((c) => c.label)).toEqual(["384 days", "67.3 years", "4,306 years", "275,600 years", "17.6 million years", "1.13 billion years", "72.2 billion years"]);
    expect(formatDuration(7)).toBe("7 days");
    expect(formatDuration(1 / 48)).toBe("30 min");
  });
});

describe("url state", () => {
  test("round-trips and omits defaults", () => {
    const state = { center: dateDay(1999, 6, 15), span: 7, zero: DEFAULT_ZERO_MOMENT, numberSet: "DATA.TWZ" as const };
    const q = encodeWaveState(state);
    expect(q).toBe("c=1999-06-15&s=7");
    expect(decodeWaveState(q)).toEqual({ center: state.center, span: 7 });
    const custom = { ...state, center: state.center + 0.123456, zero: { year: 2018, month: 7, day: 8, hour: 0, minute: 0 }, numberSet: "Sheliak" as const };
    const decoded = decodeWaveState(encodeWaveState(custom));
    expect(decoded.center).toBeCloseTo(custom.center, 6);
    expect(decoded.zero).toEqual(custom.zero);
    expect(decoded.numberSet).toBe("Sheliak");
  });

  test("ignores malformed values", () => {
    expect(decodeWaveState("c=nope&s=-3&z=2012-13-40&n=Bogus")).toEqual({});
  });
});

describe("hexagrams", () => {
  test("a 384-day cycle opens at hexagram 1 and closes at hexagram 64 on the zero point", async () => {
    const { hexagramAt } = await import("./hexagram");
    expect(hexagramAt(383.5, 0)).toMatchObject({ number: 1, line: 1, name: "The Creative" });
    expect(hexagramAt(0.5, 0)).toMatchObject({ number: 64, line: 6, name: "Before Completion" });
    expect(hexagramAt(6.5, 0)).toMatchObject({ number: 63, line: 6 });
    // One level up, each hexagram lasts 64 times longer.
    expect(hexagramAt(383.5 * 64, 1).number).toBe(1);
    expect(hexagramAt(-0.5, 0).number).toBe(64);
  });
});

describe("events", () => {
  test("dates resolve to day numbers in the right calendar and the 1997 projections are real resonances", async () => {
    const { EVENTS, EVENTS_BY_ID, eventDay } = await import("./events");
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    expect(eventDay(EVENTS_BY_ID.get("caesar")!)).toBe(1705426);
    const zero = ZERO_DAY;
    // 1171 is 64 times as far from the zero point as October 27, 1999.
    const later = zero - eventDay(EVENTS_BY_ID.get("p1999")!);
    const yearOfEcho = 2012 - (later * 64) / 365.2425;
    expect(Math.abs(yearOfEcho - 1171)).toBeLessThan(1);
  });
});

describe("zero presets", () => {
  test("the Hiroshima-aligned zero date is one 67-year cycle after the bomb", async () => {
    const { ZERO_PRESETS } = await import("./presets");
    const h = ZERO_PRESETS.find((p) => p.id === "hiroshima")!;
    expect(h.zero).toMatchObject({ year: 2012, month: 11, day: 18, hour: 8, minute: 15 });
  });
});

describe("fitting the end date", () => {
  const zero = momentToDay(DEFAULT_ZERO_MOMENT);
  const view = { center: dateDay(1945, 8, 6), span: 40000 };

  test("the view widens until the zero point is inside it", () => {
    const v = viewWithZero(view, zero);
    expect(Math.abs(zero - v.center)).toBeLessThanOrEqual(0.42 * v.span);
    expect(Math.abs(view.center - v.center)).toBeLessThanOrEqual(0.42 * v.span);
    expect(viewWithZero({ center: zero - 100, span: 3000 }, zero)).toEqual({ center: zero - 100, span: 3000 });
  });

  test("following pans by the least amount", () => {
    const v = followZero({ center: zero - 3000, span: 3000 }, zero);
    expect(zero - v.center).toBeCloseTo(0.42 * 3000, 6);
    expect(v.span).toBe(3000);
  });

  test("dip count only looks at events in view and before the zero point", () => {
    const wave = waveFor("DATA.TWZ");
    const tiers = { mckenna: true, added: true, projected: false };
    const { inDip, total } = dipCount(wave, EVENTS, tiers, zero, view);
    expect(total).toBeGreaterThan(10);
    expect(inDip).toBeGreaterThan(0);
    expect(inDip).toBeLessThan(total);
    expect(dipCount(wave, EVENTS, tiers, view.center - view.span, view).total).toBe(0);
  });
});
