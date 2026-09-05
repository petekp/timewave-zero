import { describe, expect, it } from "vitest";
import { guideFor } from "./guide";
import { Machine } from "./machine";
import { MemoryStore } from "./store";

describe("guide", () => {
  it("follows the program from title to graph", () => {
    const m = new Machine({ now: new Date(2026, 8, 5, 12, 0), store: new MemoryStore() });
    expect(guideFor(m).heading).toBe("Title screen");
    m.key({ key: " " });
    expect(guideFor(m).heading).toMatch(/after the zero date/);
    m.key({ key: "c" });
    expect(guideFor(m).lines[0]).toMatch(/Enter the month number/);
    for (const k of ["6", "Enter", "2", "0", "Enter", "1", "9", "9", "9", "Enter"]) m.key({ key: k });
    expect(guideFor(m).lines[1]).toBe("Press Y or N. Enter cancels.");
    m.key({ key: "n" });
    expect(guideFor(m).heading).toBe("Screen 11 is ready to graph");
    m.key({ key: "f" });
    expect(guideFor(m).heading).toBe("Screen 11 shows the timewave");
    for (const k of ["l", "Enter", "y"]) m.key({ key: k });
    expect(guideFor(m).heading).toBe("Screen 11 is empty");
    for (const k of ["q", "Enter"]) m.key({ key: k });
    expect(guideFor(m).heading).toBe("DOS prompt");
  });
});
