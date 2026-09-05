"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_ZERO_MOMENT, fromJdn, toJdn } from "@/lib/timewave/calendar";
import { NUMBER_SET_INFO, NUMBER_SET_NAMES, type NumberSetName } from "@/lib/timewave/datasets";
import { cycles, ladderPosition } from "@/lib/wave/cycles";
import { ZERO_PRESETS } from "@/lib/wave/presets";
import { valueAt } from "@/lib/wave/sample";
import { waveSound } from "@/lib/wave/sound";
import { formatDayFull, formatDaysToZero, formatDuration, momentToDay } from "@/lib/wave/time";
import { formatMoment, parseMoment } from "@/lib/wave/url";
import { waveFor } from "@/lib/wave/waves";
import EventList from "./EventList";
import EventPanel from "./EventPanel";
import Hexagrams from "./Hexagrams";
import { SET_COLORS } from "./SetGhosts";
import { normOf, viewMetrics } from "./mapping";
import { useWave, useWaveStore } from "./store-context";

const SLIDER_MIN = toJdn({ year: 1900, month: 1, day: 1 }, "gregorian");
const SLIDER_MAX = toJdn({ year: 2200, month: 1, day: 1 }, "gregorian");
const DEFAULT_ZERO_DAY = momentToDay(DEFAULT_ZERO_MOMENT);
export const GUIDED_KEY = "twz:wave:guided";

/** Six significant digits, the way the DOS table reads but shorter. */
export function formatWaveValue(v: number): string {
  if (v === 0) return "0";
  if (v < 1e-4) return v.toExponential(3);
  return Number(v.toPrecision(6)).toString();
}

const GUIDE = [
  {
    title: "This is the timewave.",
    body: "The ribbon is McKenna’s curve. Height is habit; the dips are novelty, and the deepest glow. Drag to travel, scroll to zoom, click to mark a date. Zoom out far enough and the same shape returns at 64 times the scale.",
  },
  {
    title: "The beam is the zero point.",
    body: "December 21, 2012, 6 AM. The wave reaches zero there and the theory stops; past it the ribbon is a grey reflection of the years before. The slider moves the zero point and the whole curve re-fits.",
  },
  {
    title: "Pins, echoes, descent.",
    body: "Gold pins are moments McKenna and Meyer pointed to; cyan were added in the same spirit. Open one to read the claim and jump to its echoes at other scales. Stack ×64 lays the scales on terraces. Descend glides you into the zero point, 64 times closer every few seconds.",
  },
];

/** Novelty of the readout day relative to the visible window, refreshed every frame because the window's range eases outside React. */
function NoveltyMeter() {
  const store = useWaveStore();
  const fill = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let last = "";
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const { hoverDay, pickDay, center, zeroDay, numberSet } = store.getState();
      const { value } = valueAt(waveFor(numberSet), zeroDay, hoverDay ?? pickDay ?? center);
      const novelty = viewMetrics.ready ? 1 - Math.min(1, Math.max(0, normOf(value))) : 0;
      const width = `${Math.round(novelty * 100)}%`;
      if (width === last) return;
      last = width;
      if (fill.current) fill.current.style.width = width;
      meter.current?.setAttribute("aria-valuenow", novelty.toFixed(2));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [store]);
  return (
    <div ref={meter} className="wave-novelty" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={0}>
      <div ref={fill} style={{ width: "0%" }} />
    </div>
  );
}

export default function Hud() {
  const store = useWaveStore();
  const center = useWave((s) => s.center);
  const span = useWave((s) => s.span);
  const hoverDay = useWave((s) => s.hoverDay);
  const pickDay = useWave((s) => s.pickDay);
  const zero = useWave((s) => s.zero);
  const zeroDay = useWave((s) => s.zeroDay);
  const numberSet = useWave((s) => s.numberSet);
  const nowDay = useWave((s) => s.nowDay);
  const showGuide = useWave((s) => s.showGuide);
  const stacked = useWave((s) => s.stacked);
  const showEventList = useWave((s) => s.showEventList);
  const sound = useWave((s) => s.sound);
  const compareSets = useWave((s) => s.compareSets);
  const showMarkEchoes = useWave((s) => s.showMarkEchoes);
  const descending = useWave((s) => s.descending);
  const interacted = useWave((s) => s.interacted);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The zero date field is free text while editing; it re-syncs whenever the store's zero date changes.
  const [zeroEdit, setZeroEdit] = useState<{ zero: typeof zero; text: string } | null>(null);
  const zeroText = zeroEdit && zeroEdit.zero === zero ? zeroEdit.text : formatMoment(zero, false);
  const [guideStep, setGuideStep] = useState(0);

  const readoutDay = hoverDay ?? pickDay ?? center;
  const readoutKind = hoverDay !== null ? "under the pointer" : pickDay !== null ? "marked" : descending ? "descending" : "centre of view";
  const { value, reflected } = valueAt(waveFor(numberSet), zeroDay, readoutDay);
  const daysToZero = zeroDay - readoutDay;
  const ladder = ladderPosition(span);
  const cycleList = cycles();
  const currentLevel = Math.min(cycleList.length - 1, Math.max(0, Math.round(ladder)));
  const currentCycle = cycleList[currentLevel];

  const setZeroDay = (day: number) => {
    const d = fromJdn(Math.round(day), "gregorian");
    store.getState().setZero({ ...d, hour: zero.hour, minute: zero.minute });
  };
  const commitZeroText = () => {
    const m = parseMoment(zeroText);
    if (m) store.getState().setZero({ ...m, hour: zero.hour, minute: zero.minute });
    setZeroEdit(null);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  };
  const toggleSound = () => {
    // Started here, inside the click, so the browser lets the audio play.
    if (sound) waveSound.stop();
    else waveSound.start();
    store.getState().setSound(!sound);
  };
  const closeGuide = () => {
    store.getState().setShowGuide(false);
    setGuideStep(0);
    try {
      localStorage.setItem(GUIDED_KEY, "1");
    } catch {
      // Storage unavailable: the guide will show again next visit.
    }
  };

  return (
    <div className="wave-hud">
      <header className="wave-brand">
        <h1>
          Timewave Zero <span>reimagined</span>
        </h1>
        <Link href="/" className="wave-link">
          ← the 1993 original
        </Link>
      </header>

      <section className="wave-readout" aria-live="polite">
        <div className="wave-readout-kind">{readoutKind}</div>
        <div className="wave-readout-date">{formatDayFull(readoutDay)}</div>
        <div className="wave-novelty-row" title={`wave value ${formatWaveValue(value)} · novelty is relative to the visible window`}>
          <span>novelty</span>
          <NoveltyMeter />
        </div>
        <button type="button" className="wave-zero-line" onClick={() => store.getState().setGoal(zeroDay, store.getState().goalSpan)} title="Go to the zero point">
          {formatDaysToZero(daysToZero)} the zero point →
        </button>
        {reflected && <div className="wave-badge">reflection · the wave is undefined after the zero point</div>}
        {pickDay !== null && (
          <div className="wave-mark-actions">
            {zeroDay - pickDay > 0 ? (
              <button type="button" className={showMarkEchoes ? "on" : ""} onClick={() => store.getState().setShowMarkEchoes(!showMarkEchoes)} title="Where the marked date recurs at other scales">
                {showMarkEchoes ? "hide echoes" : "echoes of the mark"}
              </button>
            ) : (
              <span className="wave-event-hint">no resonances after the zero point</span>
            )}
            <button type="button" onClick={() => store.getState().setPick(null)}>
              clear mark
            </button>
          </div>
        )}
        <Hexagrams daysToZero={daysToZero} currentLevel={currentLevel} />
      </section>

      <aside className="wave-ladder" aria-label="Cycles of the wave">
        <div className="wave-ladder-title">view {formatDuration(span)}</div>
        <ol>
          {cycleList.map((c) => (
            <li key={c.level} className={c === currentCycle ? "current" : ""}>
              <button type="button" onClick={() => store.getState().setGoal(store.getState().goalCenter, c.days)} title={`Zoom to one ${c.label} cycle`}>
                {c.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="wave-ladder-marker" style={{ top: `${(Math.min(6.3, Math.max(-0.3, ladder)) / 6) * 100}%` }} />
      </aside>

      <footer className="wave-bar">
        <div className="wave-group wave-zero">
          <span className="wave-group-label">zero point</span>
          <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={1} value={Math.round(zeroDay)} onChange={(e) => setZeroDay(Number(e.target.value))} aria-label="Drag the zero point through time" />
          <div className="wave-presets">
            {ZERO_PRESETS.map((p) => {
              const active = Math.abs(momentToDay(p.zero) - zeroDay) < 1e-6;
              return (
                <button key={p.id} type="button" className={active ? "on" : ""} title={p.detail} onClick={() => store.getState().setZero(p.zero)}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="wave-group wave-nav">
          <button type="button" className={descending ? "on" : ""} onClick={() => store.getState().setDescending(!descending)} title="Glide into the zero point, 64 times closer every few seconds (space)">
            {descending ? "■ stop" : "▶ descend"}
          </button>
          <button type="button" onClick={() => store.getState().setGoal(nowDay, store.getState().goalSpan)} title="Centre the present (N)">
            now
          </button>
          <button type="button" className={stacked ? "on" : ""} onClick={() => store.getState().setStacked(!stacked)} title="Show the same window at 64 and 4,096 times the scale (S)">
            {stacked ? "unstack" : "stack ×64"}
          </button>
          <button type="button" className={showEventList ? "on" : ""} onClick={() => store.getState().setShowEventList(!showEventList)} title="List the events (E)">
            events
          </button>
          <div className="wave-more">
            <button type="button" className={menuOpen ? "on" : ""} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="More">
              ⋯
            </button>
            {menuOpen && (
              <>
                <div className="wave-menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="wave-menu" role="menu">
                  <label>
                    number set
                    <select value={numberSet} onChange={(e) => store.getState().setNumberSet(e.target.value as NumberSetName)} title={NUMBER_SET_INFO[numberSet].description}>
                      {NUMBER_SET_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="wave-check">
                    <input type="checkbox" checked={compareSets} onChange={(e) => store.getState().setCompareSets(e.target.checked)} />
                    compare number sets
                  </label>
                  <label className="wave-check">
                    <input type="checkbox" checked={sound} onChange={toggleSound} />
                    sound
                  </label>
                  <label>
                    exact zero date
                    <input
                      type="text"
                      inputMode="numeric"
                      value={zeroText}
                      onChange={(e) => setZeroEdit({ zero, text: e.target.value })}
                      onBlur={commitZeroText}
                      onKeyDown={(e) => e.key === "Enter" && commitZeroText()}
                      aria-label="Zero date (YYYY-MM-DD)"
                      spellCheck={false}
                    />
                  </label>
                  {Math.abs(zeroDay - DEFAULT_ZERO_DAY) > 1e-6 && (
                    <button type="button" onClick={() => store.getState().setZero(DEFAULT_ZERO_MOMENT)}>
                      reset zero point to 2012
                    </button>
                  )}
                  <button type="button" onClick={copyLink}>
                    {copied ? "link copied" : "copy link to this view"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      store.getState().setShowGuide(true);
                    }}
                  >
                    guide
                  </button>
                  <Link href="/" className="wave-link">
                    the 1993 original →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
        {compareSets && (
          <div className="wave-group wave-legend" aria-label="Number sets">
            {NUMBER_SET_NAMES.map((n) => (
              <span key={n} className={n === numberSet ? "current" : ""}>
                <i style={{ background: SET_COLORS[n] }} />
                {n}
              </span>
            ))}
          </div>
        )}
        <p className={`wave-hint${interacted ? " gone" : ""}`}>drag to travel · scroll to zoom · click to mark</p>
      </footer>

      <EventPanel />
      <EventList />

      {showGuide && (
        <div className="wave-guide" role="dialog" aria-label="Guide">
          <div className="wave-guide-card">
            <div className="wave-guide-step">
              {guideStep + 1} / {GUIDE.length}
            </div>
            <h2>{GUIDE[guideStep].title}</h2>
            <p>{GUIDE[guideStep].body}</p>
            <div className="wave-guide-actions">
              <button type="button" onClick={closeGuide}>
                skip
              </button>
              {guideStep < GUIDE.length - 1 ? (
                <button type="button" className="primary" onClick={() => setGuideStep(guideStep + 1)}>
                  next
                </button>
              ) : (
                <button type="button" className="primary" onClick={closeGuide}>
                  begin
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
