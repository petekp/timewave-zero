/** Draws the CGA 640x200 monochrome screen for a Machine into a bit buffer. */
import { formatDate, formatDays, formatPercent, formatTime, formatTimespan, formatValue, formatYLabels } from "./format";
import { axisLabels } from "./labels";
import { MENU_ITEMS, targetMoment, type Machine } from "./machine";
import { leftEdge, rightEdge } from "./screen";
import { PLOT_BOTTOM, PLOT_LEFT, PLOT_RIGHT, PLOT_TOP, SCREEN_COUNT, TICK_SPACING, TIME_SPAN_LIMIT } from "./types";

export const SCREEN_W = 640;
export const SCREEN_H = 200;
export const COLS = 80;
export const ROWS = 25;

/** 8 bytes per glyph, one per row, most significant bit is the left pixel. */
export type GlyphSource = (ch: string) => Uint8Array;

export class Frame {
  bits = new Uint8Array(SCREEN_W * SCREEN_H);

  set(x: number, y: number): void {
    if (x >= 0 && x < SCREEN_W && y >= 0 && y < SCREEN_H) this.bits[y * SCREEN_W + x] = 1;
  }

  hline(x0: number, x1: number, y: number): void {
    for (let x = x0; x <= x1; x++) this.set(x, y);
  }

  vline(x: number, y0: number, y1: number): void {
    for (let y = y0; y <= y1; y++) this.set(x, y);
  }

  line(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  text(glyphs: GlyphSource, row: number, col: number, s: string): void {
    for (let i = 0; i < s.length; i++) {
      const c = col + i;
      if (c < 0 || c >= COLS) continue;
      const g = glyphs(s[i]);
      const x0 = c * 8;
      const y0 = row * 8;
      for (let r = 0; r < 8; r++) {
        const b = g[r];
        if (!b) continue;
        for (let k = 0; k < 8; k++) if (b & (0x80 >> k)) this.set(x0 + k, y0 + r);
      }
    }
  }
}

export interface RenderOptions {
  cursorOn: boolean;
}

export function render(m: Machine, glyphs: GlyphSource, opts: RenderOptions): Frame {
  const f = new Frame();
  if (m.mode === "title") renderTitle(f, glyphs);
  else if (m.mode === "dos") renderDos(f, glyphs, m, opts.cursorOn);
  else renderMain(f, glyphs, m);
  return f;
}

const TITLE_LINES: [number, number, string][] = [
  [4, 28, "***  Timewave Zero  ***"],
  [6, 34, "Version 4.22"],
  [8, 24, "Copyright 1989,1993 Lux Natura"],
  [10, 21, "A precision instrument for exploring"],
  [11, 21, "the theory of time as a fractal wave"],
  [12, 12, "derived from the King Wen Sequence of I Ching Hexagrams"],
  [14, 10, "Based on extraterrestrial communications to Terence McKenna"],
  [16, 23, "Software developed by Peter Meyer"],
  [18, 25, "Published by Dolphin Software"],
  [22, 23, "Please press a key to begin ..."],
];

function renderTitle(f: Frame, glyphs: GlyphSource): void {
  const w = COLS - 1;
  f.text(glyphs, 0, 0, "\u2554" + "\u2550".repeat(w - 2) + "\u2557");
  for (let r = 1; r < ROWS - 1; r++) {
    f.text(glyphs, r, 0, "\u2551");
    f.text(glyphs, r, w - 1, "\u2551");
  }
  f.text(glyphs, ROWS - 1, 0, "\u255a" + "\u2550".repeat(w - 2) + "\u255d");
  for (const [row, col, s] of TITLE_LINES) f.text(glyphs, row, col, s);
}

function renderDos(f: Frame, glyphs: GlyphSource, m: Machine, cursorOn: boolean): void {
  const d = m.dos;
  if (!d) return;
  const lines = d.lines.slice(-(ROWS - 1));
  lines.forEach((l, i) => f.text(glyphs, i, 0, l.slice(0, COLS)));
  const promptLine = `C:\\>${d.input}`;
  f.text(glyphs, lines.length, 0, promptLine);
  if (cursorOn) f.text(glyphs, lines.length, promptLine.length, "_");
}

function renderMain(f: Frame, glyphs: GlyphSource, m: Machine): void {
  const slot = m.slot;
  const s = m.screen;
  const g = m.graph;
  const graphed = !!(s?.graphed && g);
  const menuMode = m.mode === "menu";
  const zooming = m.mode === "zoom";

  f.text(glyphs, 0, 0, "Timewave Zero (Version 4.22 US)");
  f.text(glyphs, 0, 35, `Screen no. ${m.current + 1} of ${SCREEN_COUNT}`);

  // Menu.
  const menuCol = 57;
  if (menuMode) f.text(glyphs, 0, menuCol, "Select item:");
  const values: Record<string, string> = {
    A: `Calendar: ${m.calendar === "julian" ? "Julian" : "Gregorian"}`,
    B: `Zero date: ${formatDate(m.zero)}`,
    P: `Wave factor: ${slot.waveFactor}`,
  };
  let row = 1;
  for (const [letter, name] of MENU_ITEMS) {
    if (letter === "Q") {
      f.text(glyphs, row, menuCol, "Q Quit   R DOS");
      break;
    }
    f.text(glyphs, row, menuCol, `${letter} ${values[letter] ?? name}`);
    row++;
  }
  if (menuMode) {
    f.text(glyphs, 18, menuCol, "Use function keys or");
    f.text(glyphs, 19, menuCol, "PgUp/Dn for new screen");
    if (graphed) f.text(glyphs, 20, menuCol, "\u2191 \u2193 to approach/recede");
  }

  // Axes and ticks.
  f.vline(PLOT_LEFT, PLOT_TOP, PLOT_BOTTOM + 2);
  f.hline(PLOT_LEFT - 2, PLOT_RIGHT + 1, PLOT_BOTTOM);
  for (let x = PLOT_LEFT; x <= PLOT_RIGHT; x += TICK_SPACING) f.vline(x, PLOT_BOTTOM + 1, PLOT_BOTTOM + 2);
  for (let y = PLOT_TOP; y <= PLOT_BOTTOM; y += TICK_SPACING) f.hline(PLOT_LEFT - 2, PLOT_LEFT - 1, y);

  if (s && graphed && g) {
    // Curve: each column's point joined to the previous one, drawn right to left as the original does.
    let prev: number | null = null;
    for (let i = 0; i < g.ys.length; i++) {
      const y = g.ys[i];
      const x = PLOT_LEFT + i;
      if (y === null) {
        prev = null;
        continue;
      }
      if (prev === null) f.set(x, y);
      else f.line(x, y, x - 1, prev);
      prev = y;
    }
    if (!zooming) {
      formatYLabels(g.max, g.min).forEach((label, i) => f.text(glyphs, 1 + i, 0, label));
      const groups = axisLabels(s, m.zero, m.calendar);
      if (groups.length === 1) {
        const yr = groups[0];
        yr.rows.forEach((r, i) => f.text(glyphs, 15 + i, 9, r));
        f.text(glyphs, 16, 0, yr.name);
        if (yr.scale) f.text(glyphs, 17, 0, yr.scale);
      } else {
        const [a, b] = groups;
        a.rows.forEach((r, i) => f.text(glyphs, 15 + i, 9, r));
        f.text(glyphs, 16, 0, a.name);
        b.rows.forEach((r, i) => f.text(glyphs, 18 + i, 9, r));
        f.text(glyphs, 18, 0, b.name);
      }
    }
  }

  // Target marker: 32 rows below the curve pixel of the previous column, or 16 rows above the axis.
  if (!zooming) {
    const x = PLOT_LEFT + slot.targetPx;
    if (graphed && g) {
      const y = g.ys[Math.max(0, slot.targetPx - 1)];
      if (y !== null) f.vline(x, y + 2, Math.min(y + 33, PLOT_BOTTOM - 1));
    } else {
      f.vline(x, PLOT_BOTTOM - 16, PLOT_BOTTOM - 1);
      const pct = formatPercent(slot.targetPx);
      f.text(glyphs, 15, Math.floor(x / 8) - pct.length + 1, pct);
    }
  }

  // Row 20: key hint, prompt or zoom status.
  if (zooming && m.zoom) {
    const z = m.zoom;
    const what = z.seek ? `seek ${z.seek === "min" ? "minimum" : "maximum"}` : `${z.approach ? "approach" : "recession"} factor = ${z.factor}`;
    f.text(glyphs, 19, 0, `Zoom: ${what}.  Press Escape to quit.`);
  } else if (m.mode === "prompt" && m.prompt) {
    const p = m.prompt;
    const first = p.lines[0];
    if (p.lines.length > 1) {
      f.text(glyphs, 20, 0, first);
      f.text(glyphs, 21, 0, `${p.lines[1]} ${m.input}`);
    } else {
      f.text(glyphs, 20, 0, p.kind === "input" ? `${first} ${m.input}` : first);
    }
  } else {
    f.text(glyphs, 20, 0, graphed ? "Home End + - [Ctrl] \u2192 to move target date" : "Home End [Ctrl] \u2192 to move target date");
  }

  // Bottom table.
  const twoLinePrompt = m.mode === "prompt" && (m.prompt?.lines.length ?? 0) > 1;
  if (!twoLinePrompt) {
    if (slot.target !== null) {
      f.text(glyphs, 21, 9, "Date");
      f.text(glyphs, 21, 28, "Days to zero date");
      f.text(glyphs, 21, 48, "Value");
    }
    f.text(glyphs, 21, 62, "Timespan:");
  }
  if (slot.span === null) f.text(glyphs, 22, 62, "unspecified");
  else formatTimespan(slot.span).forEach((line, i) => f.text(glyphs, 22 + i, 62, line));

  if (slot.target === null) return;
  const wave = slot.valuesKnown ? m.waveFor(slot.waveFactor) : null;
  const showTime = slot.span === null || slot.span < TIME_SPAN_LIMIT;
  const rows: [string, number | null][] = [
    ["Left", s ? leftEdge(s) : null],
    ["Target", slot.target],
    ["Right", s ? rightEdge(s) : null],
  ];
  rows.forEach(([name, days], i) => {
    if (days === null || (zooming && name !== "Target")) return;
    const r = 22 + i;
    f.text(glyphs, r, 0, name);
    const moment = targetMoment(m, days);
    f.text(glyphs, r, 7, formatDate(moment));
    if (name === "Target" && showTime) f.text(glyphs, r, 19, formatTime(moment.hour, moment.minute));
    if (wave && days >= 0) {
      f.text(glyphs, r, 28, formatDays(days));
      f.text(glyphs, r, 46, formatValue(wave.value(days)));
    }
  });
}

/** Expand the 640x200 bit buffer to RGBA pixels. */
export function toRgba(frame: Frame, out: Uint8ClampedArray, fg: [number, number, number] = [170, 170, 170]): void {
  const bits = frame.bits;
  for (let i = 0; i < bits.length; i++) {
    const o = i * 4;
    const on = bits[i];
    out[o] = on ? fg[0] : 0;
    out[o + 1] = on ? fg[1] : 0;
    out[o + 2] = on ? fg[2] : 0;
    out[o + 3] = 255;
  }
}

/** Plain-text dump of a frame, for tests and for the "dump graph" printout. */
export function frameToText(frame: Frame): string {
  const lines: string[] = [];
  for (let y = 0; y < SCREEN_H; y++) {
    let line = "";
    for (let x = 0; x < SCREEN_W; x++) line += frame.bits[y * SCREEN_W + x] ? "#" : " ";
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}
