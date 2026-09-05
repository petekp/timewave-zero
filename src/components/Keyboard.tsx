"use client";

import { useState } from "react";
import type { KeyInput } from "@/lib/twz/machine";

interface KeyDef {
  /** Text on the keycap. */
  label: string;
  /** Up to three characters for narrow screens. */
  short?: string;
  /** KeyboardEvent.key value sent to the program; modifiers have none. */
  key?: string;
  span?: number;
  mod?: "ctrl" | "fn";
}

const k = (label: string, key = label, span = 1, short?: string): KeyDef => ({ label, key, span, short });

const DIGITS: KeyDef[] = [k("Esc", "Escape"), ...Array.from("1234567890", (d) => k(d)), k("Bksp", "Backspace", 1, "BS")];
const FKEYS: KeyDef[] = [k("Esc", "Escape"), ...Array.from({ length: 11 }, (_, i) => k(`F${i + 1}`))];

const ROWS: KeyDef[][] = [
  DIGITS,
  [...Array.from("QWERTYUIOP", (c) => k(c, c.toLowerCase())), k("Home", "Home", 1, "\u2302"), k("End")],
  [...Array.from("ASDFGHJKL", (c) => k(c, c.toLowerCase())), k("Enter", "Enter", 2), k("PgUp", "PageUp", 1, "PgU")],
  [...Array.from("ZXCVBNM", (c) => k(c, c.toLowerCase())), k("."), k("-"), k("+"), k("PgDn", "PageDown", 1, "PgD"), k("↑", "ArrowUp")],
  [{ label: "Ctrl", span: 2, mod: "ctrl" }, { label: "Fn", mod: "fn" }, k("Space", " ", 5), k("/"), k("←", "ArrowLeft"), k("↓", "ArrowDown"), k("→", "ArrowRight")],
];

export default function Keyboard({ onKey }: { onKey: (key: KeyInput) => void }) {
  const [ctrl, setCtrl] = useState(false);
  const [fn, setFn] = useState(false);

  const press = (def: KeyDef) => {
    if (def.mod === "ctrl") return setCtrl((c) => !c);
    if (def.mod === "fn") return setFn((f) => !f);
    if (!def.key) return;
    onKey({ key: def.key, ctrl });
    setCtrl(false);
    if (fn && def.key.startsWith("F")) setFn(false);
  };

  return (
    <div className="kbd" role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, r) => (
        <div className="kbd-row" key={r}>
          {(r === 0 && fn ? FKEYS : row).map((def) => {
            const armed = (def.mod === "ctrl" && ctrl) || (def.mod === "fn" && fn);
            return (
              <button
                key={def.label + (def.key ?? "")}
                type="button"
                className={`kbd-key${armed ? " armed" : ""}${def.mod ? " mod" : ""}${def.label.length > 3 && (def.span ?? 1) === 1 ? " small" : ""}`}
                style={{ gridColumn: `span ${def.span ?? 1}` }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  press(def);
                }}
                aria-pressed={def.mod ? armed : undefined}
              >
                <span className="long">{def.label}</span>
                <span className="short">{def.short ?? def.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
