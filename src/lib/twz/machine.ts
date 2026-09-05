/**
 * The interactive program: eleven screens, the lettered menu, prompt flows,
 * zoom mode and a small DOS shell. Pure TypeScript so it can be driven from
 * tests; rendering lives in renderer.ts.
 */
import { DEFAULT_ZERO_MOMENT, convertCalendar, daysToZero, fromJdn, isValidDate, momentBeforeZero, toJdn, type CalendarKind, type Moment } from "../timewave/calendar";
import { dataPointsFor, type NumberSetName } from "../timewave/datasets";
import { createWave, type Wave } from "../timewave/wave";
import { formatDate, pad2, timespanFromParts } from "./format";
import { allScreensText, resonancePointsText, waveValuesText, type PrintContext } from "./printout";
import { majorResonance, trigrammaticResonance, trigrammaticSet } from "./resonance";
import { nudgeTargetPx, sampleGraph, withTargetPx, type GraphSamples } from "./screen";
import builtInSets from "./screen-sets.json";
import dirListing from "./dir-listing.json";
import type { ScreenSetStore } from "./store";
import { MAX_WAVE_FACTOR, MIN_WAVE_FACTOR, PLOT_WIDTH, SCREEN_COUNT, TICK_SPACING, emptySlot, slotScreen, slotWith, type ScreenState, type Slot } from "./types";

export type Mode = "title" | "menu" | "prompt" | "zoom" | "dos";

export type PromptKind = "input" | "yn" | "choice" | "confirm" | "anykey";

export interface PromptSpec {
  /** Text for row 20, and optionally row 21; typed input follows the last line. */
  lines: string[];
  kind: PromptKind;
  maxLength?: number;
  /** Accepted keys for "choice", upper case. */
  choices?: string;
}

export interface KeyInput {
  /** KeyboardEvent.key: "a", "Enter", "Escape", "F1", "PageUp", "ArrowLeft", "Home", "+" ... */
  key: string;
  ctrl?: boolean;
}

export interface ZoomState {
  factor: number;
  approach: boolean;
  seek: "min" | "max" | null;
}

export interface Printout {
  id: number;
  title: string;
  /** Plain text, or "graph" for a screen dump the view captures itself. */
  kind: "text" | "graph";
  text?: string;
}

export interface Download {
  id: number;
  name: string;
  text: string;
}

export interface DosState {
  lines: string[];
  input: string;
  /** Whether EXIT returns to the program (R DOS) rather than being the end (Q). */
  shell: boolean;
}

const SEEK_FACTOR = 3;
const DEFAULT_SET_NAME = "LASTRUN.SCR";
const MAX_DAYS = 7e9 * 365.2425;
const PRESS_KEY = "Please press a key to begin ...";

type Flow = Generator<PromptSpec, void, string>;

const input = (line: string, maxLength: number, line2?: string): PromptSpec => ({ lines: line2 ? [line, line2] : [line], kind: "input", maxLength });
const yn = (line: string): PromptSpec => ({ lines: [line], kind: "yn" });
const choice = (line: string, choices: string): PromptSpec => ({ lines: [line], kind: "choice", choices });
const confirm = (item: string): PromptSpec => ({ lines: [`"${item}" selected; [Enter] = confirm, [Escape] = cancel.`], kind: "confirm" });
const anykey = (line: string): PromptSpec => ({ lines: [line], kind: "anykey" });

export const MENU_ITEMS: [string, string][] = [
  ["A", "Calendar"],
  ["B", "Zero date"],
  ["C", "Specify target date"],
  ["D", "Days to zero date"],
  ["E", "Specify timespan"],
  ["F", "Graph the wave"],
  ["G", "Dump graph to printer"],
  ["H", "Print wave values"],
  ["I", "Resonances"],
  ["J", "Print resonance pnts"],
  ["K", "Copy this screen"],
  ["L", "Remove this screen"],
  ["M", "Save screen set"],
  ["N", "Load screen set"],
  ["O", "Print all screens"],
  ["P", "Wave factor"],
  ["Q", "Quit"],
  ["R", "DOS"],
];

export interface MachineOptions {
  now: Date;
  store: ScreenSetStore;
  numberSet?: NumberSetName;
}

export class Machine {
  screens: Slot[] = [];
  graphs: (GraphSamples | null)[] = [];
  current = SCREEN_COUNT - 1;
  calendar: CalendarKind = "gregorian";
  zero: Moment = { ...DEFAULT_ZERO_MOMENT };
  numberSet: NumberSetName;
  mode: Mode = "title";
  prompt: PromptSpec | null = null;
  input = "";
  zoom: ZoomState | null = null;
  dos: DosState | null = null;
  printouts: Printout[] = [];
  downloads: Download[] = [];
  /** Incremented on every change so a view can re-render. */
  version = 0;
  onChange: (() => void) | null = null;

  private flow: Flow | null = null;
  private store: ScreenSetStore;
  private now: Date;
  private waves = new Map<string, Wave>();
  private nextId = 1;

  constructor(opts: MachineOptions) {
    this.store = opts.store;
    this.now = opts.now;
    this.numberSet = opts.numberSet ?? "DATA.TWZ";
    this.loadScreenSet(DEFAULT_SET_NAME, true);
  }

  // ----- helpers -------------------------------------------------------

  get slot(): Slot {
    return this.screens[this.current];
  }

  /** The current screen when it can be plotted (target and timespan both set). */
  get screen(): ScreenState | null {
    return slotScreen(this.slot);
  }

  get graph(): GraphSamples | null {
    return this.graphs[this.current];
  }

  waveFor(waveFactor: number): Wave {
    const key = `${this.numberSet}:${waveFactor}`;
    let w = this.waves.get(key);
    if (!w) {
      w = createWave({ dataPoints: dataPointsFor(this.numberSet), waveFactor });
      this.waves.set(key, w);
    }
    return w;
  }

  /** Forget every graph, e.g. after the number set changes. */
  clearGraphs(): void {
    this.waves.clear();
    this.screens = this.screens.map((s) => ({ ...s, graphed: false }));
    this.graphs = this.graphs.map(() => null);
    this.changed();
  }

  private printContext(waveFactor: number): PrintContext {
    return { zero: this.zero, calendar: this.calendar, wave: this.waveFor(waveFactor) };
  }

  private changed(): void {
    this.version++;
    this.onChange?.();
  }

  private nowMoment(): Moment {
    const d = this.now;
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
  }

  private setSlot(i: number, slot: Slot, graph: GraphSamples | null = null): void {
    this.screens[i] = slot;
    this.graphs[i] = graph;
  }

  private update(slot: Slot, graph: GraphSamples | null = null): void {
    this.setSlot(this.current, slot, graph);
  }

  /** Recompute a screen's graph; false when it cannot be drawn. */
  private drawGraph(i = this.current): boolean {
    const slot = this.screens[i];
    const s = slotScreen(slot);
    if (!s || s.target < 0) return false;
    const g = sampleGraph(s, this.waveFor(s.waveFactor));
    if (!g.any) return false;
    this.screens[i] = { ...slot, graphed: true, valuesKnown: true };
    this.graphs[i] = g;
    return true;
  }

  private serializeScreens(): string {
    return JSON.stringify(this.screens.slice(0, SCREEN_COUNT - 1).map((s) => ({ target: s.target, span: s.span, targetPx: s.targetPx, waveFactor: s.waveFactor })));
  }

  private loadScreenSet(name: string, fallbackToShipped: boolean): boolean {
    const data = this.store.load(name);
    let saved: Partial<Slot>[] | null = null;
    if (data) {
      try {
        const parsed: unknown = JSON.parse(data);
        if (Array.isArray(parsed)) saved = parsed.map((p) => (p && typeof p === "object" ? (p as Partial<Slot>) : {}));
      } catch {
        saved = null;
      }
    }
    if (!saved) {
      const builtIn = (builtInSets as Record<string, Partial<Slot>[]>)[name.toUpperCase()];
      if (builtIn) saved = builtIn;
      else if (fallbackToShipped) saved = (builtInSets as Record<string, Partial<Slot>[]>)[DEFAULT_SET_NAME];
      else return false;
    }
    const screens: Slot[] = [];
    for (let i = 0; i < SCREEN_COUNT - 1; i++) {
      const p = saved[i] ?? {};
      screens.push(emptySlot({ ...p, target: p.target ?? null, span: p.span ?? null, graphed: false, valuesKnown: p.target !== null && p.target !== undefined }));
    }
    const nowMoment = this.nowMoment();
    screens.push(emptySlot({ target: daysToZero(nowMoment, this.zero, this.calendar), span: 7 }));
    this.screens = screens;
    this.graphs = screens.map(() => null);
    for (let i = 0; i < SCREEN_COUNT - 1; i++) this.drawGraph(i);
    return true;
  }

  // ----- key handling --------------------------------------------------

  key(k: KeyInput): void {
    switch (this.mode) {
      case "title":
        this.mode = "menu";
        break;
      case "menu":
        this.menuKey(k);
        break;
      case "prompt":
        this.promptKey(k);
        break;
      case "zoom":
        if (k.key === "Escape") this.endZoom();
        break;
      case "dos":
        this.dosKey(k);
        break;
    }
    this.changed();
  }

  private moveMarker(px: number | null, delta: number, wrap: boolean): void {
    const slot = this.slot;
    const s = this.screen;
    if (s) {
      const next = px !== null ? withTargetPx(s, px) : nudgeTargetPx(s, delta, wrap);
      this.update(slotWith(slot, next), this.graph);
      return;
    }
    let p = px !== null ? px : slot.targetPx + delta;
    p = Math.max(0, Math.min(PLOT_WIDTH, p));
    this.update({ ...slot, targetPx: p }, this.graph);
  }

  private menuKey(k: KeyInput): void {
    const key = k.key;
    const letter = key.length === 1 ? key.toUpperCase() : "";
    const graphed = this.slot.graphed;
    if (/^F([1-9]|1[01])$/.test(key)) {
      this.current = Number(key.slice(1)) - 1;
      return;
    }
    switch (key) {
      case "PageUp":
        this.current = (this.current + 1) % SCREEN_COUNT;
        return;
      case "PageDown":
        this.current = (this.current + SCREEN_COUNT - 1) % SCREEN_COUNT;
        return;
      case "Escape":
        this.start(this.flowQuit());
        return;
      case "Home":
        return this.moveMarker(0, 0, false);
      case "End":
        return this.moveMarker(PLOT_WIDTH, 0, false);
      case "ArrowLeft":
        return this.moveMarker(null, k.ctrl ? -TICK_SPACING : -1, false);
      case "ArrowRight":
        return this.moveMarker(null, k.ctrl ? TICK_SPACING : 1, false);
      case "+":
        if (graphed) this.moveMarker(null, -1, true);
        return;
      case "-":
        if (graphed) this.moveMarker(null, 1, true);
        return;
      case "ArrowUp":
        if (graphed) this.start(this.flowZoom(true));
        return;
      case "ArrowDown":
        if (graphed) this.start(this.flowZoom(false));
        return;
    }
    switch (letter) {
      case "A":
        return this.start(this.flowCalendar());
      case "B":
        return this.start(this.flowDate("zero"));
      case "C":
        return this.start(this.flowDate("target"));
      case "D":
        return this.start(this.flowDaysToZero());
      case "E":
        return this.start(this.flowTimespan());
      case "F":
        return this.start(this.flowGraph());
      case "G":
        return this.start(this.flowDump());
      case "H":
        return this.start(this.flowPrintValues());
      case "I":
        return this.start(this.flowResonances());
      case "J":
        return this.start(this.flowPrintResonances());
      case "K":
        return this.start(this.flowCopy());
      case "L":
        return this.start(this.flowRemove());
      case "M":
        return this.start(this.flowSave());
      case "N":
        return this.start(this.flowLoad());
      case "O":
        return this.start(this.flowPrintAll());
      case "P":
        return this.start(this.flowWaveFactor());
      case "Q":
        return this.start(this.flowQuit());
      case "R":
        return this.enterDos(true);
    }
  }

  private start(flow: Flow): void {
    this.flow = flow;
    this.input = "";
    this.advance(undefined);
  }

  /** Resume the flow with an answer; when it finishes, return to the menu. */
  private advance(answer: string | undefined): void {
    if (!this.flow) return;
    const r = answer === undefined ? this.flow.next() : this.flow.next(answer);
    if (r.done) {
      this.flow = null;
      this.prompt = null;
      this.input = "";
      if (this.mode === "prompt") this.mode = "menu";
      return;
    }
    this.prompt = r.value;
    this.input = "";
    this.mode = "prompt";
  }

  private cancelFlow(): void {
    this.flow = null;
    this.prompt = null;
    this.input = "";
    this.mode = "menu";
  }

  private promptKey(k: KeyInput): void {
    const p = this.prompt;
    if (!p) return this.cancelFlow();
    const key = k.key;
    switch (p.kind) {
      case "anykey":
        this.advance("");
        return;
      case "confirm":
        if (key === "Enter") this.advance("");
        else if (key === "Escape") this.cancelFlow();
        return;
      case "yn":
        if (key.length === 1 && "yYnN".includes(key)) this.advance(key.toUpperCase());
        else if (key === "Enter") this.cancelFlow();
        return;
      case "choice":
        if (key.length === 1 && p.choices?.includes(key.toUpperCase())) this.advance(key.toUpperCase());
        else if (key === "Enter") this.cancelFlow();
        return;
      case "input":
        if (key === "Enter") {
          if (this.input === "") this.cancelFlow();
          else this.advance(this.input);
        } else if (key === "Backspace") {
          this.input = this.input.slice(0, -1);
        } else if (key.length === 1 && this.input.length < (p.maxLength ?? 20)) {
          this.input += key;
        }
        return;
    }
  }

  // ----- flows ---------------------------------------------------------

  private *flowDate(kind: "target" | "zero"): Flow {
    const label = kind === "target" ? "Target date." : "Zero date.";
    let acc = `${label}  Month:`;
    const monthText = yield input(acc, 2);
    const month = Number(monthText);
    let date: Moment;
    if (kind === "target" && month === 0) {
      date = { ...this.zero };
    } else {
      acc += ` ${monthText}  Day:`;
      const dayText = yield input(acc, 2);
      acc += ` ${dayText}  Year:`;
      const yearText = yield input(acc, 12);
      const d = { year: Number(yearText), month, day: Number(dayText) };
      if (!/^-?\d+$/.test(yearText) || !isValidDate(d, this.calendar)) {
        yield anykey(`${pad2(month)}/${pad2(Number(dayText) || 0)}/${yearText} is invalid!  Press a key ...`);
        return;
      }
      date = { ...d, hour: 6, minute: 0 };
    }
    const shown = `${label.slice(0, -1)}: ${formatDate(date)}`;
    const add = yield yn(`${shown}  Do you wish to add a number of days? (Y/N)`);
    let extra = 0;
    if (add === "Y") {
      const text = yield input(`${shown}  How many days?`, 12);
      extra = Number(text);
      if (!Number.isFinite(extra)) extra = 0;
    }
    const jdn = toJdn(date, this.calendar) + extra;
    const moment: Moment = { ...fromJdn(jdn, this.calendar), hour: date.hour, minute: date.minute };
    if (kind === "zero") {
      this.zero = moment;
      this.screens = this.screens.map((s) => ({ ...s, graphed: false }));
      this.graphs = this.graphs.map(() => null);
      return;
    }
    this.update({ ...this.slot, target: daysToZero(moment, this.zero, this.calendar), graphed: false, valuesKnown: true });
  }

  private *flowDaysToZero(): Flow {
    const text = yield input("Specify the target date as a number of days before the zero date.", 16, "How many days?");
    const days = Number(text);
    if (!Number.isFinite(days) || days < 0 || days > MAX_DAYS) {
      yield anykey(`Invalid number of days.  ${PRESS_KEY}`);
      return;
    }
    this.update({ ...this.slot, target: days, graphed: false, valuesKnown: true });
  }

  private *flowTimespan(): Flow {
    let acc = "Timespan.  Years:";
    const y = yield input(acc, 11);
    acc += ` ${y}  plus months:`;
    const m = yield input(acc, 11);
    acc += ` ${m}  plus days:`;
    const d = yield input(acc, 11);
    const total = timespanFromParts(Number(y) || 0, Number(m) || 0, Number(d) || 0);
    if (!(total > 0)) {
      yield anykey(`Timespan is too short.  ${PRESS_KEY}`);
      return;
    }
    if (total > MAX_DAYS) {
      yield anykey(`Timespan is too long.  ${PRESS_KEY}`);
      return;
    }
    this.update({ ...this.slot, span: total, graphed: false });
  }

  private *flowGraph(): Flow {
    const slot = this.slot;
    if (slot.target === null) {
      yield anykey(`Target date not valid.  ${PRESS_KEY}`);
      return;
    }
    if (slot.target < 0) {
      yield anykey(`Target date later than zero date.  ${PRESS_KEY}`);
      return;
    }
    if (slot.span === null) {
      yield anykey(`Timespan not specified.  ${PRESS_KEY}`);
      return;
    }
    if (!this.drawGraph()) yield anykey(`Target date later than zero date.  ${PRESS_KEY}`);
  }

  private *flowCalendar(): Flow {
    const c = yield choice("Use Gregorian or Julian calendrical notation? (G/J)", "GJ");
    const next: CalendarKind = c === "J" ? "julian" : "gregorian";
    if (next === this.calendar) return;
    // Days to zero are unchanged; only the notation of every date changes.
    this.zero = { ...convertCalendar(this.zero, this.calendar, next), hour: this.zero.hour, minute: this.zero.minute };
    this.calendar = next;
  }

  private *flowWaveFactor(): Flow {
    const text = yield input(`Please specify wave factor (${MIN_WAVE_FACTOR} through ${MAX_WAVE_FACTOR}):`, 3);
    const wf = Number(text);
    if (!Number.isInteger(wf) || wf < MIN_WAVE_FACTOR || wf > MAX_WAVE_FACTOR) {
      yield anykey(`Wave factor must be from ${MIN_WAVE_FACTOR} through ${MAX_WAVE_FACTOR}.  Press a key ...`);
      return;
    }
    this.update({ ...this.slot, waveFactor: wf, graphed: false });
  }

  private *flowResonances(): Flow {
    const s = this.screen;
    if (!s?.graphed) {
      yield anykey("Draw graph first.  Press a key ...");
      return;
    }
    const set = yield yn("Construct set of 11 trigrammatic resonances? (Y/N)");
    const higher = (yield choice("Higher or lower resonance?  (H/L)", "HL")) === "H";
    const cyclePrompt = "Which cycle? (1=384-day, 2=67.29-year, 3=4306.36-year, 4=275,607-year)";
    if (set === "Y") {
      const cycle = Number(yield choice(cyclePrompt, "1234"));
      const screens = trigrammaticSet(s, cycle, higher);
      for (let i = 0; i < SCREEN_COUNT; i++) {
        this.setSlot(i, slotWith(this.screens[i], screens[i], { valuesKnown: true }));
        this.drawGraph(i);
      }
      return;
    }
    const major = (yield choice("Major or trigrammatic resonance?  (M/T)", "MT")) === "M";
    let cycle = 1;
    if (!major) cycle = Number(yield choice(cyclePrompt, "1234"));
    const pointText = yield input("Which point: 1st, 2nd, 3rd ...  99th?", 2);
    const point = Number(pointText);
    if (!Number.isInteger(point) || point < 1 || point > 99) return;
    const next = major ? majorResonance(s, point, higher) : trigrammaticResonance(s, cycle, point, higher);
    if (next.target < 0 || next.target > MAX_DAYS) {
      yield anykey("Resonance point is outside the range of the wave.  Press a key ...");
      return;
    }
    this.update(slotWith(this.slot, { ...next, graphed: false }, { valuesKnown: true }));
    this.drawGraph();
  }

  private *flowPrintValues(): Flow {
    yield confirm("Print wave values");
    const s = this.screen;
    const g = this.graph;
    if (!s?.graphed || !g) {
      yield anykey("Draw graph first.  Press a key ...");
      return;
    }
    const extremaOnly = (yield yn("Print only local maximum and minimum values? (Y/N)")) === "Y";
    const vicinityOnly = (yield yn("Print only values in vicinity of target date?  (Y/N)")) === "Y";
    const text = waveValuesText(this.current + 1, s, g, this.printContext(s.waveFactor), { extremaOnly, vicinityOnly });
    yield* this.sendOutput("Wave values", text);
  }

  private *sendOutput(title: string, text: string): Flow {
    const dest = yield choice("Send values to printer or to file?  (P/F)", "PF");
    if (dest === "P") {
      this.printouts.push({ id: this.nextId++, title, kind: "text", text });
      return;
    }
    const name = yield input("Send values to which file?", 12);
    this.downloads.push({ id: this.nextId++, name: name.toUpperCase().includes(".") ? name.toUpperCase() : `${name.toUpperCase()}.TXT`, text });
  }

  private *flowPrintResonances(): Flow {
    yield confirm("Print resonance pnts");
    const s = this.screen;
    if (!s) {
      yield anykey(`Target date not valid.  ${PRESS_KEY}`);
      return;
    }
    const triOnly = (yield yn("Print trigrammatic resonance points only?  (Y/N)")) === "Y";
    this.printouts.push({ id: this.nextId++, title: "Resonance points", kind: "text", text: resonancePointsText(this.current + 1, s, this.printContext(s.waveFactor), triOnly) });
  }

  private *flowPrintAll(): Flow {
    yield confirm("Print all screens");
    this.printouts.push({ id: this.nextId++, title: "All screens", kind: "text", text: allScreensText(this.screens.map(slotScreen), this.printContext(this.slot.waveFactor)) });
  }

  private *flowDump(): Flow {
    yield confirm("Dump graph to printer");
    this.printouts.push({ id: this.nextId++, title: `Screen no. ${this.current + 1}`, kind: "graph" });
  }

  private *flowCopy(): Flow {
    const withTarget = this.screens.map((x, i) => (x.target !== null ? i + 1 : null)).filter((n): n is number => n !== null);
    const list = withTarget.join(",");
    const text = yield input(`Screens with target date: ${list}.${withTarget.length === SCREEN_COUNT ? "  " : " "}Copy to which screen?`, 2);
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > SCREEN_COUNT || n === this.current + 1) return;
    if (this.screens[n - 1].target !== null) {
      const ok = yield yn(`Overwrite screen no. ${n}? (Y/N)`);
      if (ok !== "Y") return;
    }
    this.setSlot(n - 1, { ...this.slot }, this.graph);
  }

  private *flowRemove(): Flow {
    yield confirm("Remove this screen");
    this.update({ ...this.slot, span: null, graphed: false });
    const also = yield yn("Remove target date also? (Y/N)");
    if (also === "Y") this.update({ ...this.slot, target: null, valuesKnown: false });
  }

  private *flowSave(): Flow {
    yield confirm("Save screen set");
    const def = yield yn(`Save screen set to ${DEFAULT_SET_NAME}? (Y/N)`);
    let name = DEFAULT_SET_NAME;
    if (def !== "Y") {
      const text = yield input("Save screen set to which file?", 12);
      name = normalizeSetName(text);
    }
    this.store.save(name, this.serializeScreens());
  }

  private *flowLoad(): Flow {
    yield confirm("Load screen set");
    const text = yield input("Load screen set from which file?", 12);
    if (!this.loadScreenSet(normalizeSetName(text), false)) {
      yield anykey(`Load screen set from which file? ${text}  Cannot open file!  Press a key ...`);
    }
  }

  private *flowQuit(): Flow {
    yield confirm("Quit");
    this.enterDos(false);
  }

  private *flowZoom(approach: boolean): Flow {
    if ((yield yn("Zoom?  (Y/N)")) !== "Y") return;
    let acc = `Zoom:  Seek ${approach ? "minimum" : "maximum"}? (Y/N)`;
    const seek = yield yn(acc);
    let factor = SEEK_FACTOR;
    if (seek !== "Y") {
      acc += ` N  ${approach ? "Approach" : "Recession"} factor? (>1.0)`;
      const text = yield input(acc, 8);
      factor = Number(text);
      if (!(factor > 1)) {
        yield anykey("Factor must be greater than 1.0.  Press a key ...");
        return;
      }
    }
    this.zoom = { factor, approach, seek: seek === "Y" ? (approach ? "min" : "max") : null };
    this.mode = "zoom";
  }

  /** One zoom step; the view calls this on a timer while in zoom mode. */
  zoomStep(): void {
    const z = this.zoom;
    const s = this.screen;
    if (!z || !s || this.mode !== "zoom") return;
    const span = z.approach ? s.span / z.factor : s.span * z.factor;
    if (span < 1 / 1440 || span > MAX_DAYS) {
      this.endZoom();
      this.changed();
      return;
    }
    let next: ScreenState = { ...s, span };
    if (z.seek) {
      const g = sampleGraph(next, this.waveFor(s.waveFactor));
      let best = -1;
      g.values.forEach((v, i) => {
        if (v === null) return;
        if (best < 0) best = i;
        else if (z.seek === "min" ? v < (g.values[best] as number) : v > (g.values[best] as number)) best = i;
      });
      if (best >= 0) next = withTargetPx(next, best);
    }
    this.update(slotWith(this.slot, next));
    this.drawGraph();
    this.changed();
  }

  private endZoom(): void {
    this.zoom = null;
    this.mode = "menu";
  }

  // ----- DOS shell -------------------------------------------------------

  private enterDos(shell: boolean): void {
    this.mode = "dos";
    const lines = shell ? ["Type EXIT to return to Timewave Zero.", ""] : [];
    this.dos = { lines, input: "", shell };
  }

  private dosKey(k: KeyInput): void {
    const d = this.dos;
    if (!d) return;
    if (k.key === "Enter") {
      const cmd = d.input.trim();
      d.lines.push(`C:\\>${d.input}`);
      d.input = "";
      this.dosCommand(cmd);
      if (d.lines.length > 22) d.lines.splice(0, d.lines.length - 22);
    } else if (k.key === "Backspace") {
      d.input = d.input.slice(0, -1);
    } else if (k.key.length === 1 && d.input.length < 70) {
      d.input += k.key;
    }
  }

  private dosCommand(cmd: string): void {
    const d = this.dos;
    if (!d) return;
    const up = cmd.toUpperCase();
    if (up === "") return;
    if (["TWZ", "TWZ87", "TWZERO", "TWZERO87", "TWZLP", "TWZMONO"].includes(up)) {
      this.loadScreenSet(DEFAULT_SET_NAME, true);
      this.current = SCREEN_COUNT - 1;
      this.dos = null;
      this.mode = "title";
      return;
    }
    if (up === "EXIT") {
      if (d.shell) {
        this.dos = null;
        this.mode = "menu";
      } else {
        d.lines.push("There is nowhere to exit to.  Type TWZ to start Timewave Zero.");
      }
      return;
    }
    if (up === "CLS") {
      d.lines = [];
      return;
    }
    if (up === "DIR") {
      d.lines.push(" Directory of C:\\TWZ", "", ...(dirListing as string[]), "");
      return;
    }
    if (up === "VER") {
      d.lines.push("", "Timewave Zero web edition.  DOSBox-style shell.", "");
      return;
    }
    d.lines.push(`Illegal command: ${cmd}.`, "");
  }
}

function normalizeSetName(text: string): string {
  let name = text.trim().toUpperCase();
  if (!name) name = DEFAULT_SET_NAME;
  if (!name.includes(".")) name += ".SCR";
  return name;
}


/** Moment of a target on the current calendar, for the view. */
export function targetMoment(m: Machine, days: number): Moment {
  return momentBeforeZero(days, m.zero, m.calendar);
}
