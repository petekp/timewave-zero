"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_ZERO_MOMENT, fromJdn, toJdn } from "@/lib/timewave/calendar";
import { NUMBER_SET_INFO, NUMBER_SET_NAMES, type NumberSetName } from "@/lib/timewave/datasets";
import { cycles, ladderPosition } from "@/lib/wave/cycles";
import { valueAt } from "@/lib/wave/sample";
import { formatDayFull, formatDaysToZero, formatDuration, momentToDay } from "@/lib/wave/time";
import { formatMoment, parseMoment } from "@/lib/wave/url";
import { waveSound } from "@/lib/wave/sound";
import { waveFor } from "@/lib/wave/waves";
import EventList from "./EventList";
import EventPanel from "./EventPanel";
import Hexagrams from "./Hexagrams";
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
    body: "The ribbon is McKenna's curve. Height is habit. The dips are novelty, the moments when something new comes into the world. Colour follows the same idea: the deepest dips glow.",
  },
  {
    title: "Drag to travel. Scroll to zoom.",
    body: "Left is the past, right is the future. Zoom out far enough and the same shape returns at 64 times the scale. The ladder on the right shows which of the seven cycles you are inside.",
  },
  {
    title: "The beam is the zero point.",
    body: "McKenna set it at December 21, 2012, 6 AM. The wave reaches zero there and the theory stops. Past it the ribbon continues as a ghost: a reflection of the years before.",
  },
  {
    title: "Stack the scales.",
    body: "Stack ×64 raises two terraces behind the ribbon: the same window 64 and 4,096 times wider. Points that line up vertically are resonances, the theory's claim that history rhymes across scales. The readout shows the I Ching hexagram in effect on each cycle.",
  },
  {
    title: "The pins are events.",
    body: "Gold pins are moments McKenna and Meyer pointed to as novelty or as resonances of one another. Cyan pins came after his death. Open one and press show echoes to see where it recurs at 64 times the scale.",
  },
  {
    title: "Move the zero point.",
    body: "The slider at the bottom drags the zero point through time and the whole curve re-fits around it. Click the ribbon to mark a date; press Now to come back to the present.",
  },
];

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
  const eventsVisible = useWave((s) => s.eventsVisible);
  const sound = useWave((s) => s.sound);
  const [copied, setCopied] = useState(false);
  // The zero date field is free text while editing; it re-syncs whenever the store's zero date changes.
  const [zeroEdit, setZeroEdit] = useState<{ zero: typeof zero; text: string } | null>(null);
  const zeroText = zeroEdit && zeroEdit.zero === zero ? zeroEdit.text : formatMoment(zero, false);
  const setZeroText = (text: string) => setZeroEdit({ zero, text });
  const [guideStep, setGuideStep] = useState(0);

  const readoutDay = hoverDay ?? pickDay ?? center;
  const readoutKind = hoverDay !== null ? "under the pointer" : pickDay !== null ? "marked" : "centre of view";
  const { value, reflected } = valueAt(waveFor(numberSet), zeroDay, readoutDay);
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
  const zoom = (factor: number) => {
    const s = store.getState();
    s.setGoal(s.goalCenter, s.goalSpan * factor);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
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
        <dl>
          <div>
            <dt>wave value</dt>
            <dd>{formatWaveValue(value)}</dd>
          </div>
          <div>
            <dt>zero point</dt>
            <dd>{formatDaysToZero(zeroDay - readoutDay)}</dd>
          </div>
        </dl>
        {reflected && <div className="wave-badge">reflection · the wave is undefined after the zero point</div>}
        <Hexagrams daysToZero={zeroDay - readoutDay} currentLevel={currentLevel} />
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
          <label>
            zero point
            <input
              type="text"
              inputMode="numeric"
              value={zeroText}
              onChange={(e) => setZeroText(e.target.value)}
              onBlur={commitZeroText}
              onKeyDown={(e) => e.key === "Enter" && commitZeroText()}
              aria-label="Zero date (YYYY-MM-DD)"
              spellCheck={false}
            />
          </label>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={Math.round(zeroDay)}
            onChange={(e) => setZeroDay(Number(e.target.value))}
            aria-label="Drag the zero point through time"
          />
          {Math.abs(zeroDay - DEFAULT_ZERO_DAY) > 1e-6 && (
            <button type="button" onClick={() => store.getState().setZero(DEFAULT_ZERO_MOMENT)}>
              reset to 2012
            </button>
          )}
        </div>
        <div className="wave-group">
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
        </div>
        <div className="wave-group wave-nav">
          <button type="button" onClick={() => zoom(2)} title="Zoom out">
            −
          </button>
          <button type="button" onClick={() => zoom(0.5)} title="Zoom in">
            +
          </button>
          <button type="button" onClick={() => store.getState().setGoal(nowDay, store.getState().goalSpan)}>
            now
          </button>
          <button type="button" onClick={() => store.getState().setGoal(zeroDay, store.getState().goalSpan)}>
            zero point
          </button>
          <button type="button" className={stacked ? "on" : ""} onClick={() => store.getState().setStacked(!stacked)} title="Show the same window at 64 and 4,096 times the scale">
            {stacked ? "unstack" : "stack ×64"}
          </button>
          <button type="button" className={showEventList ? "on" : ""} onClick={() => store.getState().setShowEventList(!showEventList)}>
            events
          </button>
          <button type="button" className={eventsVisible ? "" : "off"} onClick={() => store.getState().setEventsVisible(!eventsVisible)} title={eventsVisible ? "Hide the pins" : "Show the pins"}>
            {eventsVisible ? "hide pins" : "show pins"}
          </button>
          {pickDay !== null && (
            <button type="button" onClick={() => store.getState().setPick(null)}>
              clear mark
            </button>
          )}
          <button
            type="button"
            className={sound ? "on" : ""}
            onClick={() => {
              // Started here, inside the click, so the browser lets the audio play.
              if (sound) waveSound.stop();
              else waveSound.start();
              store.getState().setSound(!sound);
            }}
            title="A drone that follows the wave: lower for wider views, brighter in the dips"
          >
            {sound ? "sound on" : "sound"}
          </button>
          <button type="button" onClick={share}>
            {copied ? "copied" : "share"}
          </button>
          <button type="button" onClick={() => store.getState().setShowGuide(true)} aria-label="Guide">
            ?
          </button>
        </div>
        <p className="wave-hint">drag to travel · scroll to zoom · click to mark</p>
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
