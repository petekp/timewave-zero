import { describe, expect, it } from "vitest";
import { Machine, type KeyInput } from "./machine";
import { MemoryStore } from "./store";
import { leftEdge } from "./screen";

const NOW = new Date(2026, 8, 4, 23, 21);

function boot(): Machine {
  const m = new Machine({ now: NOW, store: new MemoryStore() });
  m.key({ key: " " });
  return m;
}

function type(m: Machine, text: string): void {
  for (const ch of text) m.key({ key: ch });
}

function line(m: Machine, keys: (string | KeyInput)[]): void {
  for (const k of keys) m.key(typeof k === "string" ? { key: k } : k);
}

/** Type digits then Enter, like the emulator session. */
function enter(m: Machine, text: string): void {
  type(m, text);
  m.key({ key: "Enter" });
}

function setTargetJune1999(m: Machine): void {
  m.key({ key: "c" });
  enter(m, "6");
  enter(m, "20");
  enter(m, "1999");
  m.key({ key: "n" });
}

describe("start-up", () => {
  it("shows the title until a key is pressed, then screen 11 for now", () => {
    const m = new Machine({ now: NOW, store: new MemoryStore() });
    expect(m.mode).toBe("title");
    m.key({ key: "x" });
    expect(m.mode).toBe("menu");
    expect(m.current).toBe(10);
    expect(m.screen?.span).toBe(7);
    expect(m.screen!.target).toBeLessThan(0);
  });
  it("loads the shipped screen set into screens 1-10 with graphs drawn", () => {
    const m = boot();
    m.key({ key: "F1" });
    expect(m.screen?.target).toBe(15285);
    expect(m.slot.graphed).toBe(true);
    expect(m.graph?.values[0]).not.toBeNull();
    m.key({ key: "PageUp" });
    expect(m.current).toBe(1);
    expect(m.screen?.target).toBe(487552);
    m.key({ key: "PageDown" });
    m.key({ key: "PageDown" });
    expect(m.current).toBe(10);
  });
});

describe("target date and timespan prompts", () => {
  it("walks month, day, year and the add-days question", () => {
    const m = boot();
    m.key({ key: "c" });
    expect(m.prompt?.lines[0]).toBe("Target date.  Month:");
    enter(m, "6");
    expect(m.prompt?.lines[0]).toBe("Target date.  Month: 6  Day:");
    enter(m, "20");
    enter(m, "1999");
    expect(m.prompt?.lines[0]).toBe("Target date: 06/20/1999  Do you wish to add a number of days? (Y/N)");
    m.key({ key: "n" });
    m.key({ key: "c" });
    enter(m, "13");
    enter(m, "1");
    enter(m, "1999");
    expect(m.prompt?.lines[0]).toBe("13/01/1999 is invalid!  Press a key ...");
    m.key({ key: " " });
    m.key({ key: "c" });
    enter(m, "6");
    enter(m, "20");
    enter(m, "1999");
    m.key({ key: "n" });
    expect(m.mode).toBe("menu");
    expect(m.screen?.target).toBe(4933);
    expect(leftEdge(m.screen!)).toBe(4936.5);
  });
  it("refuses a graph after the zero date and accepts one before it", () => {
    const m = boot();
    m.key({ key: "f" });
    expect(m.prompt?.lines[0]).toMatch(/Target date later than zero date/);
    m.key({ key: " " });
    expect(m.slot.valuesKnown).toBe(false);
    setTargetJune1999(m);
    expect(m.slot.valuesKnown).toBe(true);
    m.key({ key: "f" });
    expect(m.mode).toBe("menu");
    expect(m.screen?.graphed).toBe(true);
    expect(m.graph?.min.toFixed(7)).toBe("0.0079891");
  });
  it("sets the timespan in years, months and days and clears the graph", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "f" });
    m.key({ key: "e" });
    enter(m, "0");
    enter(m, "7");
    expect(m.prompt?.lines[0]).toBe("Timespan.  Years: 0  plus months: 7  plus days:");
    enter(m, "0");
    expect(m.screen?.span).toBeCloseTo(213.058125, 9);
    expect(m.screen?.graphed).toBe(false);
    m.key({ key: "e" });
    enter(m, "0");
    enter(m, "0");
    enter(m, "0");
    expect(m.prompt?.lines[0]).toMatch(/Timespan is too short/);
  });
  it("Escape does not cancel an input field, Enter on an empty field does", () => {
    const m = boot();
    m.key({ key: "b" });
    m.key({ key: "Escape" });
    expect(m.mode).toBe("prompt");
    type(m, "aa");
    expect(m.input).toBe("aa");
    m.key({ key: "d" });
    expect(m.input).toBe("aa");
    m.key({ key: "Backspace" });
    m.key({ key: "Backspace" });
    m.key({ key: "Enter" });
    expect(m.mode).toBe("menu");
  });
});

describe("resonances and navigation", () => {
  it("first higher major resonance multiplies target and span by 64", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "f" });
    line(m, ["i", "n", "h", "m"]);
    expect(m.prompt?.lines[0]).toBe("Which point: 1st, 2nd, 3rd ...  99th?");
    enter(m, "1");
    expect(m.screen?.target).toBe(4933 * 64);
    expect(m.screen?.span).toBe(7 * 64);
    expect(m.screen?.graphed).toBe(true);
  });
  it("trigrammatic resonance of the 384-day cycle shifts by 192 days", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "f" });
    line(m, ["i", "n", "h", "t"]);
    expect(m.prompt?.lines[0]).toMatch(/Which cycle/);
    m.key({ key: "1" });
    enter(m, "1");
    expect(m.screen?.target).toBe(4933 + 192);
    expect(m.screen?.span).toBe(7);
  });
  it("asks to draw the graph first", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "i" });
    expect(m.prompt?.lines[0]).toBe("Draw graph first.  Press a key ...");
  });
  it("Home, End and arrows move the target without moving the plot", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "Home" });
    expect(m.screen?.target).toBe(4936.5);
    m.key({ key: "End" });
    expect(m.screen?.target).toBe(4929.5);
    m.key({ key: "ArrowLeft", ctrl: true });
    expect(m.screen?.targetPx).toBe(360);
    m.key({ key: "ArrowLeft" });
    expect(m.screen?.targetPx).toBe(359);
    expect(leftEdge(m.screen!)).toBeCloseTo(4936.5, 9);
  });
  it("zoom dialog then repeated approach steps until Escape", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "f" });
    m.key({ key: "ArrowUp" });
    expect(m.prompt?.lines[0]).toBe("Zoom?  (Y/N)");
    m.key({ key: "y" });
    m.key({ key: "n" });
    expect(m.prompt?.lines[0]).toBe("Zoom:  Seek minimum? (Y/N) N  Approach factor? (>1.0)");
    enter(m, "3");
    expect(m.mode).toBe("zoom");
    m.zoomStep();
    expect(m.screen?.span).toBeCloseTo(7 / 3, 9);
    m.zoomStep();
    expect(m.screen?.span).toBeCloseTo(7 / 9, 9);
    m.key({ key: "Escape" });
    expect(m.mode).toBe("menu");
  });
});

describe("calendar", () => {
  it("switching to Julian renotates dates without moving them", () => {
    const m = boot();
    setTargetJune1999(m);
    line(m, ["a", "j"]);
    expect(m.calendar).toBe("julian");
    expect(m.zero).toEqual({ year: 2012, month: 12, day: 8, hour: 6, minute: 0 });
    expect(m.screen?.target).toBe(4933);
    line(m, ["a", "g"]);
    expect(m.zero).toEqual({ year: 2012, month: 12, day: 21, hour: 6, minute: 0 });
  });
});

describe("screens, printing and quitting", () => {
  it("copies with an overwrite question and removes", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "k" });
    expect(m.prompt?.lines[0]).toBe("Screens with target date: 1,2,3,4,5,6,7,8,9,10,11.  Copy to which screen?");
    enter(m, "9");
    expect(m.prompt?.lines[0]).toBe("Overwrite screen no. 9? (Y/N)");
    m.key({ key: "y" });
    expect(m.screens[8]?.target).toBe(4933);
    line(m, ["l", "Enter"]);
    expect(m.prompt?.lines[0]).toBe("Remove target date also? (Y/N)");
    expect(m.slot.span).toBeNull();
    expect(m.slot.target).toBe(4933);
    m.key({ key: "y" });
    expect(m.slot.target).toBeNull();
    expect(m.screen).toBeNull();
    m.key({ key: "k" });
    expect(m.prompt?.lines[0]).toBe("Screens with target date: 1,2,3,4,5,6,7,8,9,10. Copy to which screen?");
    m.key({ key: "Enter" });
    m.key({ key: "f" });
    expect(m.prompt?.lines[0]).toMatch(/Target date not valid/);
  });
  it("saves and loads screen sets and reports missing files", () => {
    const store = new MemoryStore();
    const m = new Machine({ now: NOW, store });
    m.key({ key: " " });
    m.key({ key: "F3" });
    setTargetJune1999(m);
    line(m, ["m", "Enter", "y"]);
    expect(store.load("LASTRUN.SCR")).toContain("4933");
    line(m, ["n", "Enter"]);
    enter(m, "NOPE");
    expect(m.prompt?.lines[0]).toMatch(/Cannot open file!/);
    m.key({ key: " " });
    m.key({ key: "F3" });
    m.key({ key: "c" });
    enter(m, "0");
    m.key({ key: "n" });
    expect(m.screen?.target).toBe(0);
    line(m, ["n", "Enter"]);
    enter(m, "LASTRUN");
    expect(m.screens[2]?.target).toBe(4933);
    line(m, ["n", "Enter"]);
    enter(m, "1996tri");
    expect(m.screens[0].target).not.toBeNull();
    expect(m.screens[0].graphed).toBe(true);
  });
  it("prints wave values to the printer tray or a file", () => {
    const m = boot();
    setTargetJune1999(m);
    m.key({ key: "f" });
    line(m, ["h", "Enter", "n", "n"]);
    expect(m.prompt?.lines[0]).toBe("Send values to printer or to file?  (P/F)");
    m.key({ key: "p" });
    expect(m.printouts).toHaveLength(1);
    expect(m.printouts[0].text).toContain("06/20/1999");
    line(m, ["h", "Enter", "y", "n", "f"]);
    enter(m, "TESTOUT");
    expect(m.downloads[0].name).toBe("TESTOUT.TXT");
  });
  it("Escape offers to quit; confirming drops to a DOS prompt that can relaunch", () => {
    const m = boot();
    m.key({ key: "Escape" });
    expect(m.prompt?.lines[0]).toBe('"Quit" selected; [Enter] = confirm, [Escape] = cancel.');
    m.key({ key: "Escape" });
    expect(m.mode).toBe("menu");
    line(m, ["q", "Enter"]);
    expect(m.mode).toBe("dos");
    enter(m, "twz87");
    expect(m.mode).toBe("title");
  });
});
