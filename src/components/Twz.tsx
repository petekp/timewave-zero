"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocalStorageStore } from "@/lib/twz/browser-store";
import { loadGlyphs } from "@/lib/twz/glyphs";
import { Machine, type KeyInput, type Printout } from "@/lib/twz/machine";
import { SCREEN_H, SCREEN_W, render, toRgba, type GlyphSource } from "@/lib/twz/renderer";
import { NUMBER_SET_NAMES, type NumberSetName } from "@/lib/timewave/datasets";

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
  const [status, setStatus] = useState("");

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
      };
      machineRef.current = m;
      setReady(true);
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
      if (!m) return;
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
            <kbd>Home</kbd>, <kbd>End</kbd>, <kbd>←</kbd>, <kbd>→</kbd> move the target date (hold <kbd>Ctrl</kbd> or <kbd>Alt</kbd> for eight pixels). After a graph, <kbd>+</kbd> and <kbd>-</kbd> move it too, and <kbd>↑</kbd>/<kbd>↓</kbd> start a zoom.
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
