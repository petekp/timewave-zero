import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZERO_MOMENT,
  convertCalendar,
  daysInMonth,
  daysToZero,
  fromDayNumber,
  fromJdn,
  isLeapYear,
  momentBeforeZero,
  toJdn,
} from "./calendar";

describe("Julian Day Numbers", () => {
  it("known Gregorian dates", () => {
    expect(toJdn({ year: 2000, month: 1, day: 1 }, "gregorian")).toBe(2451545);
    expect(toJdn({ year: 2012, month: 12, day: 21 }, "gregorian")).toBe(2456283);
    expect(toJdn({ year: 1858, month: 11, day: 17 }, "gregorian")).toBe(2400001);
    expect(toJdn({ year: 1582, month: 10, day: 15 }, "gregorian")).toBe(2299161);
  });
  it("known Julian dates", () => {
    expect(toJdn({ year: 1582, month: 10, day: 4 }, "julian")).toBe(2299160);
    expect(toJdn({ year: -4712, month: 1, day: 1 }, "julian")).toBe(0);
  });
  it("round-trips across a huge range in both calendars", () => {
    for (const calendar of ["gregorian", "julian"] as const) {
      for (let jdn = -2_000_000_000; jdn <= 3_000_000_000; jdn += 123_456_789) {
        expect(toJdn(fromJdn(jdn, calendar), calendar)).toBe(jdn);
      }
      for (let jdn = 2_299_100; jdn < 2_299_300; jdn++) {
        expect(toJdn(fromJdn(jdn, calendar), calendar)).toBe(jdn);
      }
    }
  });
  it("converts between calendars", () => {
    expect(convertCalendar({ year: 2012, month: 12, day: 21 }, "gregorian", "julian")).toEqual({ year: 2012, month: 12, day: 8 });
    expect(convertCalendar({ year: 1582, month: 10, day: 4 }, "julian", "gregorian")).toEqual({ year: 1582, month: 10, day: 14 });
  });
});

describe("leap years and month lengths", () => {
  it("Gregorian century rule", () => {
    expect(isLeapYear(1900, "gregorian")).toBe(false);
    expect(isLeapYear(2000, "gregorian")).toBe(true);
    expect(isLeapYear(1900, "julian")).toBe(true);
    expect(isLeapYear(-1, "julian")).toBe(false);
    expect(isLeapYear(0, "gregorian")).toBe(true);
  });
  it("February length follows the calendar", () => {
    expect(daysInMonth(1900, 2, "gregorian")).toBe(28);
    expect(daysInMonth(1900, 2, "julian")).toBe(29);
    expect(daysInMonth(2023, 12, "gregorian")).toBe(31);
  });
});

describe("days to the zero point", () => {
  it("one day before 6 AM Dec 21 2012 is 6 AM Dec 20", () => {
    const m = { year: 2012, month: 12, day: 20, hour: 6, minute: 0 };
    expect(daysToZero(m, DEFAULT_ZERO_MOMENT, "gregorian")).toBe(1);
  });
  it("fractions of a day come from the time", () => {
    const m = { year: 2012, month: 12, day: 11, hour: 12, minute: 0 };
    expect(daysToZero(m, DEFAULT_ZERO_MOMENT, "gregorian")).toBeCloseTo(9.75, 9);
  });
  it("inverts back to the same moment", () => {
    const m = { year: 1945, month: 8, day: 6, hour: 8, minute: 15 };
    const d = daysToZero(m, DEFAULT_ZERO_MOMENT, "gregorian");
    expect(momentBeforeZero(d, DEFAULT_ZERO_MOMENT, "gregorian")).toEqual(m);
  });
  it("handles rounding up to the next day", () => {
    expect(fromDayNumber(2456283 + 1439.9 / 1440, "gregorian")).toEqual({ year: 2012, month: 12, day: 22, hour: 0, minute: 0 });
  });
});
