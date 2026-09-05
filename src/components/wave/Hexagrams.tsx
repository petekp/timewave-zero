"use client";

import { useState } from "react";
import { cycles } from "@/lib/wave/cycles";
import { hexagramAt } from "@/lib/wave/hexagram";

/** Six lines drawn top to bottom; a yang line is solid, a yin line broken. */
export function Glyph({ lines, size = 18 }: { lines: string; size?: number }) {
  const gap = size / 7;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="wave-glyph">
      {lines.split("").map((l, i) => {
        const y = gap * (i + 0.5);
        return l === "1" ? (
          <rect key={i} x={0} y={y} width={size} height={gap * 0.55} />
        ) : (
          <g key={i}>
            <rect x={0} y={y} width={size * 0.4} height={gap * 0.55} />
            <rect x={size * 0.6} y={y} width={size * 0.4} height={gap * 0.55} />
          </g>
        );
      })}
    </svg>
  );
}

/** The hexagram in effect on the cycle the view sits in, the 384-day one beside it, and all seven on request. */
export default function Hexagrams({ daysToZero, currentLevel }: { daysToZero: number; currentLevel: number }) {
  const [expanded, setExpanded] = useState(false);
  const list = cycles().map((c) => hexagramAt(daysToZero, c.level));
  const current = list[currentLevel];
  const base = list[0];
  return (
    <div className="wave-hexagrams">
      <button type="button" className="wave-hexagram-main" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} title={expanded ? "Hide the other cycles" : "Show the hexagram on every cycle"}>
        <Glyph lines={current.lines} size={30} />
        <span className="wave-hexagram-text">
          <span className="wave-hexagram-title">
            {current.number} {current.name}
          </span>
          <span className="wave-hexagram-sub">line {current.line} · hexagram of this cycle</span>
        </span>
        {currentLevel !== 0 && (
          <span className="wave-hexagram-base" title={`${base.number} ${base.name}, line ${base.line}, on the 384-day cycle`}>
            <Glyph lines={base.lines} size={16} />
            <span>{base.number}</span>
          </span>
        )}
      </button>
      {expanded && (
        <div className="wave-hexagram-row">
          {list.map((h) => (
            <div key={h.level} className={`wave-hexagram${h.level === currentLevel ? " current" : ""}`} title={`${h.number} ${h.name}, line ${h.line} (${cycles()[h.level].label} cycle)`}>
              <Glyph lines={h.lines} />
              <span>{h.number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
