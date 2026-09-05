import { describe, expect, it } from "vitest";
import { formatDate, formatDays, formatPercent, formatTimespan, formatValue, formatYLabels, formatYear, timespanFromParts } from "./format";

// Every expected string below was read off the DOS program's screen.
describe("dates and days", () => {
  it("prints years without padding, with separators from five digits", () => {
    expect(formatDate({ year: 1999, month: 6, day: 20 })).toBe("06/20/1999");
    expect(formatDate({ year: 678, month: 2, day: 6 })).toBe("02/06/678");
    expect(formatDate({ year: -141, month: 11, day: 6 })).toBe("11/06/-141");
    expect(formatDate({ year: -498001, month: 6, day: 20 })).toBe("06/20/-498,001");
    expect(formatDate({ year: 2500001999, month: 6, day: 20 })).toBe("06/20/2,500,001,999");
    expect(formatYear(-3001)).toBe("-3001");
  });
  it("prints days to zero with separators and four decimals", () => {
    expect(formatDays(4936.5)).toBe("4,936.5000");
    expect(formatDays(913106254.933)).toBe("913,106,254.9330");
    expect(formatDays(0)).toBe("0.0000");
    expect(formatDays(4936.5 - 7 / 368)).toBe("4,936.4809");
    expect(formatDays(4933 + (1095.7275 * 184) / 368)).toBe("5,480.8637");
  });
});

describe("wave values", () => {
  it("uses fourteen characters and drops trailing zeros", () => {
    expect(formatValue(0.00799012184108)).toBe("0.007990121841");
    expect(formatValue(0.00814417998)).toBe("0.00814417998");
    expect(formatValue(415.7689741055)).toBe("415.7689741055");
    expect(formatValue(6657986.589901)).toBe("6657986.589901");
    expect(formatValue(2.977179030577)).toBe("2.977179030577");
    expect(formatValue(0)).toBe("0");
  });
});

describe("y-axis labels (single-precision fraction)", () => {
  it("uses seven decimals for small values", () => {
    const l = formatYLabels(0.008355, 0.0079891);
    expect(l[0]).toBe("0.0083550");
    expect(l[1]).toBe("0.0083269");
    expect(l[13]).toBe("0.0079891");
  });
  it("fits wide values into nine characters", () => {
    expect(formatYLabels(874.33817, 0.00814)[0]).toBe("874.33817");
    // Screen 10 of the shipped set: the 7th decimal only matches with a single-precision row fraction.
    const big = formatYLabels(2.5652541471665415, 0);
    expect(big[3].trim()).toBe("1.9732725");
    expect(big[6].trim()).toBe("1.3812908");
    expect(big[13].trim()).toBe("0.0000000");
    expect(formatYLabels(874.33817, 0.00814)[13]).toBe("  0.00814");
    expect(formatYLabels(6933805.6, 0)[0]).toBe("6933805.6");
    expect(formatYLabels(6933805.6, 0)[13]).toBe("      0.0");
  });
});

describe("timespans", () => {
  it("shows whole units, up to three lines", () => {
    expect(formatTimespan(7)).toEqual(["7 days"]);
    expect(formatTimespan(timespanFromParts(0, 7, 0))).toEqual(["7 months"]);
    expect(formatTimespan(timespanFromParts(1, 11, 15))).toEqual(["1 year", "and 11 months", "and 15 days"]);
    expect(formatTimespan(7 / 3)).toEqual(["2 days", "and 8 hours"]);
    expect(formatTimespan(7 / 9)).toEqual(["18 hours", "and 40 minutes"]);
    expect(formatTimespan(786412.7578)).toEqual(["2153 years", "and 1 month", "and 15 days"]);
  });
  it("abbreviates very long year counts", () => {
    expect(formatTimespan(timespanFromParts(1000000, 0, 0))).toEqual(["1,000,000 years"]);
    expect(formatTimespan(timespanFromParts(5000000000, 0, 0))).toEqual(["5,000,000,000 yrs"]);
  });
  it("prints the target position", () => {
    expect(formatPercent(184)).toBe("50.0%");
    expect(formatPercent(359)).toBe("97.6%");
  });
});
