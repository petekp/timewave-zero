"use client";

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

/** The hexagram in effect at a moment on each of the seven cycles, with the cycle nearest the view highlighted. */
export default function Hexagrams({ daysToZero, currentLevel }: { daysToZero: number; currentLevel: number }) {
  const list = cycles().map((c) => hexagramAt(daysToZero, c.level));
  const current = list[currentLevel];
  return (
    <div className="wave-hexagrams">
      <div className="wave-hexagram-row">
        {list.map((h) => (
          <div key={h.level} className={`wave-hexagram${h.level === currentLevel ? " current" : ""}`} title={`${h.number} ${h.name}, line ${h.line} (${cycles()[h.level].label} cycle)`}>
            <Glyph lines={h.lines} />
            <span>{h.number}</span>
          </div>
        ))}
      </div>
      <div className="wave-hexagram-name">
        {current.number} {current.name} · line {current.line} · cycle of {cycles()[currentLevel].label}
      </div>
    </div>
  );
}
