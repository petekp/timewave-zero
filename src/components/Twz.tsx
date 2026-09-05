"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Keyboard from "@/components/Keyboard";
import { LocalStorageStore } from "@/lib/twz/browser-store";
import { guideFor, type Guide } from "@/lib/twz/guide";
import { loadGlyphs } from "@/lib/twz/glyphs";
import { Machine, type KeyInput, type Printout } from "@/lib/twz/machine";
import { SCREEN_H, SCREEN_W, render, toRgba, type GlyphSource } from "@/lib/twz/renderer";
import { NUMBER_SET_NAMES, type NumberSetName } from "@/lib/timewave/datasets";

const WEEK_1999 = ["c", "6", "Enter", "2", "0", "Enter", "1", "9", "9", "9", "Enter", "n", "e", "0", "Enter", "0", "Enter", "7", "Enter", "f"];

/** Key sequences typed for the user, so the workflow of the original can be watched. */
const DEMOS: { title: string; blurb: string; keys: string[] }[] = [
  { title: "Graph a week in June 1999", blurb: "C sets the target date, E a timespan of 0 years, 0 months and 7 days, and F draws the wave.", keys: WEEK_1999 },
  {
    title: "Zoom in on the zero date",
    blurb: "Puts the zero date at the right edge with a one-year timespan, then zooms in by a factor of 3 at every step. Press Esc to stop.",
    keys: ["c", "0", "Enter", "n", "End", "e", "1", "Enter", "0", "Enter", "0", "Enter", "f", "ArrowUp", "y", "n", "3", "Enter"],
  },
  {
    title: "Jump to a major resonance",
    blurb: "After the week in June 1999, I finds the same shape 64 times larger: 448 days in the twelfth century.",
    keys: [...WEEK_1999, "i", "n", "h", "m", "1", "Enter"],
  },
  { title: "Load a shipped screen set", blurb: "N loads the 1996TRI set that came with the program; F1 then shows its first screen.", keys: ["n", "Enter", "1", "9", "9", "6", "t", "r", "i", "Enter", "F1"] },
];
const DEMO_KEY_MS = 170;

const HANDLED_KEYS = new Set(["Enter", "Escape", "Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", " ", "Tab"]);
const ZOOM_STEP_MS = 700;

interface PrintItem extends Printout {
  image?: string;
}

export default function Twz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const machineRef = useRef<Machine | null>(null);
  const glyphsRef = useRef<GlyphSource | null>(null);
  const imageRef = useRef<ImageData | null>(null);
  const cursorRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [prints, setPrints] = useState<PrintItem[]>([]);
  const [numberSet, setNumberSet] = useState<NumberSetName>("DATA.TWZ");
  const coarsePointer = useSyncExternalStore(subscribeCoarsePointer, getCoarsePointer, () => false);
  const [keyboardOverride, setKeyboardOverride] = useState<boolean | null>(null);
  const keyboard = keyboardOverride ?? coarsePointer;
  const [status, setStatus] = useState("");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [canDemo, setCanDemo] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paint = useCallback(() => {
    const m = machineRef.current;
    const glyphs = glyphsRef.current;
    const canvas = canvasRef.current;
    if (!m || !glyphs || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!imageRef.current) imageRef.current = ctx.createImageData(SCREEN_W, SCREEN_H);
    const frame = render(m, glyphs, { cursorOn: cursorRef.current });
    toRgba(frame, imageRef.current.data);
    ctx.putImageData(imageRef.current, 0, 0);
  }, []);

  // Boot: glyphs, machine, first paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const glyphs = await loadGlyphs();
      if (cancelled) return;
      glyphsRef.current = glyphs;
      const m = new Machine({ now: new Date(), store: new LocalStorageStore() });
      let printed = 0;
      let downloaded = 0;
      m.onChange = () => {
        paint();
        if (m.printouts.length > printed) {
          const fresh = m.printouts.slice(printed);
          printed = m.printouts.length;
          const image = canvasRef.current?.toDataURL("image/png");
          setPrints((p) => [...p, ...fresh.map((x) => (x.kind === "graph" ? { ...x, image } : x))]);
        }
        if (m.downloads.length > downloaded) {
          const fresh = m.downloads.slice(downloaded);
          downloaded = m.downloads.length;
          for (const d of fresh) saveTextFile(d.name, d.text);
        }
        setStatus(`Mode: ${m.mode}. Screen ${m.current + 1}.`);
        setGuide(guideFor(m));
        setCanDemo(m.mode === "menu" || m.mode === "title");
      };
      machineRef.current = m;
      setReady(true);
      setGuide(guideFor(m));
      setCanDemo(true);
      paint();
    })();
    return () => {
      cancelled = true;
    };
  }, [paint]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = machineRef.current;
      if (!m || demoRef.current) return;
      if (e.metaKey && !e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "SUMMARY")) return;
      const key = e.key;
      const isF = /^F([1-9]|1[0-2])$/.test(key);
      if (!(HANDLED_KEYS.has(key) || isF || key.length === 1)) return;
      e.preventDefault();
      const input: KeyInput = { key, ctrl: e.ctrlKey || e.altKey };
      m.key(input);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cursor blink and zoom stepping.
  useEffect(() => {
    if (!ready) return;
    const blink = setInterval(() => {
      const m = machineRef.current;
      if (!m || m.mode !== "dos") return;
      cursorRef.current = !cursorRef.current;
      paint();
    }, 500);
    const zoom = setInterval(() => {
      const m = machineRef.current;
      if (m?.mode === "zoom") m.zoomStep();
    }, ZOOM_STEP_MS);
    return () => {
      clearInterval(blink);
      clearInterval(zoom);
    };
  }, [ready, paint]);

  const runDemo = (d: (typeof DEMOS)[number]) => {
    const m = machineRef.current;
    if (!m || demoRef.current || !(m.mode === "menu" || m.mode === "title")) return;
    const keys = m.mode === "title" ? [" ", ...d.keys] : [...d.keys];
    setDemo(d.title);
    demoRef.current = setInterval(() => {
      const key = keys.shift();
      if (key === undefined || m.mode === "dos") {
        if (demoRef.current) clearInterval(demoRef.current);
        demoRef.current = null;
        setDemo(null);
        return;
      }
      m.key({ key });
    }, DEMO_KEY_MS);
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const m = machineRef.current;
    const canvas = canvasRef.current;
    if (!m || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * 80);
    const row = Math.floor(((e.clientY - r.top) / r.height) * 25);
    if (m.mode === "title") return m.key({ key: " " });
    if (m.mode !== "menu") return;
    if (col >= 57 && row >= 1 && row <= 17) {
      const letter = row === 17 ? (col >= 66 ? "R" : "Q") : String.fromCharCode(64 + row);
      m.key({ key: letter });
    } else if (row === 0 && col >= 38 && col < 57) {
      m.key({ key: "PageUp" });
    }
  };

  const changeNumberSet = (name: NumberSetName) => {
    const m = machineRef.current;
    if (!m) return;
    m.numberSet = name;
    m.clearGraphs();
    setNumberSet(name);
  };

  return (
    <div className="twz">
      <div className="monitor">
        <canvas ref={canvasRef} width={SCREEN_W} height={SCREEN_H} className="screen" onClick={onCanvasClick} aria-label="Timewave Zero screen" />
        {!ready && <div className="loading">Loading font ...</div>}
      </div>
      {keyboard && <Keyboard onKey={(key) => !demoRef.current && machineRef.current?.key(key)} />}
      {guide && (
        <section className="guide" aria-live="polite">
          <h2>{demo ? `Demo: ${demo} (typing for you)` : guide.heading}</h2>
          {guide.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="demos">
            {DEMOS.map((d) => (
              <button key={d.title} type="button" disabled={!canDemo || !!demo} onClick={() => runDemo(d)} title={d.blurb}>
                {d.title}
              </button>
            ))}
          </div>
          <details>
            <summary>What am I looking at?</summary>
            <p>
              Timewave Zero draws McKenna&apos;s &quot;timewave&quot;: a fractal curve built from the King Wen sequence of I Ching hexagrams, which he read as the ebb and flow
              of novelty in time. Low points are novel, high points habitual, and the whole curve descends to zero on the zero date, 12/21/2012. Because the wave is a
              fractal, every stretch of it repeats at 64 times the scale: the &quot;resonances&quot;. The program lets you pick a target date, choose how wide a timespan to
              look at, graph it, move about, zoom, and jump between resonances.
            </p>
            <p>
              Everything here works as it did on a 1993 PC: press the letter of a menu item, answer the prompts on the bottom line, and read the results in the table.
            </p>
          </details>
        </section>
      )}
      <div className="panel">
        <section className="help">
          <h2>Keys</h2>
          <p>
            Press any key to leave the title screen. Then press a menu letter (<kbd>A</kbd> to <kbd>R</kbd>) or click a menu line. <kbd>Esc</kbd> selects Quit.
          </p>
          <p>
            <kbd>F1</kbd> to <kbd>F11</kbd>, or <kbd>PgUp</kbd>/<kbd>PgDn</kbd>, change screens. On a Mac hold <kbd>fn</kbd> for those keys, or click the screen number.
          </p>
          <p>
            <kbd>Home</kbd>, <kbd>End</kbd>, <kbd>←</kbd>, <kbd>→</kbd> move the target date (hold <kbd>Ctrl</kbd>, or <kbd>Alt</kbd>/<kbd>Option</kbd> on a Mac, for eight pixels). After a graph, <kbd>+</kbd> and <kbd>-</kbd> move it too, and <kbd>↑</kbd>/<kbd>↓</kbd> start a zoom.
          </p>
          <p>
            <button type="button" onClick={() => setKeyboardOverride(!keyboard)}>
              {keyboard ? "Hide" : "Show"} on-screen keyboard
            </button>{" "}
            Its <kbd>Ctrl</kbd> arms the next arrow key; <kbd>Fn</kbd> turns the number row into F1 to F11.
          </p>
          <p>
            Screen sets save to this browser; the sets shipped with the program (LASTRUN, 1900RUN, 1990RUN, 1995RUN, 1996TRI, CHAP1) can be loaded by name. Printed output appears below; files download.
          </p>
          <label>
            Number set{" "}
            <select value={numberSet} onChange={(e) => changeNumberSet(e.target.value as NumberSetName)}>
              {NUMBER_SET_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>
        {prints.length > 0 && (
          <section className="printer">
            <h2>Printer</h2>
            {prints.map((p) => (
              <details key={p.id} open={p.id === prints[prints.length - 1].id}>
                <summary>
                  {p.title} (#{p.id})
                </summary>
                {p.kind === "graph" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.title} className="dump" />
                ) : (
                  <pre>{p.text}</pre>
                )}
              </details>
            ))}
            <button type="button" onClick={() => setPrints([])}>
              Clear printer
            </button>
          </section>
        )}
        <footer>
          <p>
            A recreation of Peter Meyer&apos;s Timewave Zero 4.22 for MS-DOS (1989-1993, Lux Natura / Dolphin Software), the program that drew Terence McKenna&apos;s timewave. The wave is computed from Meyer&apos;s published algorithm and the King Wen sequence; all four number sets are derived at run time.
          </p>
          <p>
            Font: Web437 IBM EGA 8x8 from the Ultimate Oldschool PC Font Pack by VileR, CC BY-SA 4.0.{" "}
            <a href="https://github.com/petekp/timewave-zero">Source on GitHub</a>.
          </p>
          {status && <p className="status">{status}</p>}
        </footer>
      </div>
    </div>
  );
}

// The on-screen keyboard shows by default where the pointer is a finger.
const COARSE = "(pointer: coarse)";

function subscribeCoarsePointer(onChange: () => void): () => void {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getCoarsePointer(): boolean {
  return window.matchMedia(COARSE).matches;
}

function saveTextFile(name: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
