"use client";

import { useEffect, useState } from "react";
import { waveSound } from "@/lib/wave/sound";
import { createWaveStore } from "@/lib/wave/store";
import { dateToDay, momentToDay } from "@/lib/wave/time";
import { decodeWaveState, encodeWaveState } from "@/lib/wave/url";
import { DEFAULT_ZERO_MOMENT } from "@/lib/timewave/calendar";
import Hud, { GUIDED_KEY } from "./Hud";
import Scene from "./Scene";
import { WaveStoreContext } from "./store-context";

/** First view: the zero point and the present both in frame, with room around them. */
function defaultView(zeroDay: number, nowDay: number): { center: number; span: number } {
  const gap = Math.abs(nowDay - zeroDay);
  return { center: (zeroDay + nowDay) / 2, span: Math.max(365.2425 * 20, gap * 2.4) };
}

export default function WaveApp() {
  const [store] = useState(() => {
    const fromUrl = decodeWaveState(window.location.search);
    const zero = fromUrl.zero ?? DEFAULT_ZERO_MOMENT;
    const view = defaultView(momentToDay(zero), dateToDay(new Date()));
    return createWaveStore({ ...view, ...fromUrl });
  });

  // Keep the address bar sharable.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const write = () => {
      const s = store.getState();
      const q = encodeWaveState({ center: s.goalCenter, span: s.goalSpan, zero: s.zero, numberSet: s.numberSet });
      window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
    };
    const unsubscribe = store.subscribe((s, prev) => {
      if (s.goalCenter === prev.goalCenter && s.goalSpan === prev.goalSpan && s.zero === prev.zero && s.numberSet === prev.numberSet) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(write, 250);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [store]);

  // Keyboard: arrows travel, + and - zoom, N now, Z zero point, S stacks the scales, E events, space descends, Esc clears, ? the guide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || (e.key === " " && target.tagName === "BUTTON"))) return;
      const s = store.getState();
      const step = s.goalSpan * 0.15;
      switch (e.key) {
        case "ArrowLeft":
          s.setGoal(s.goalCenter - step, s.goalSpan);
          break;
        case "ArrowRight":
          s.setGoal(s.goalCenter + step, s.goalSpan);
          break;
        case "ArrowUp":
        case "+":
        case "=":
          s.setGoal(s.goalCenter, s.goalSpan / 1.6);
          break;
        case "ArrowDown":
        case "-":
        case "_":
          s.setGoal(s.goalCenter, s.goalSpan * 1.6);
          break;
        case "n":
        case "N":
        case "Home":
          s.setGoal(s.nowDay, s.goalSpan);
          break;
        case "z":
        case "Z":
          s.setGoal(s.zeroDay, s.goalSpan);
          break;
        case "s":
        case "S":
          s.setStacked(!s.stacked);
          break;
        case "Escape":
          if (s.showGuide) s.setShowGuide(false);
          else if (s.showEventList) s.setShowEventList(false);
          else if (s.selectedEvent) s.selectEvent(null);
          else s.setPick(null);
          break;
        case "e":
        case "E":
          s.setShowEventList(!s.showEventList);
          break;
        case " ":
        case "d":
        case "D":
          s.setDescending(!s.descending);
          break;
        case "?":
          s.setShowGuide(!s.showGuide);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  useEffect(() => {
    const id = setInterval(() => store.getState().touchNow(), 60_000);
    return () => {
      clearInterval(id);
      waveSound.stop();
    };
  }, [store]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(GUIDED_KEY)) store.getState().setShowGuide(true);
    } catch {
      // Storage unavailable: no guide on first visit.
    }
  }, [store]);

  return (
    <WaveStoreContext.Provider value={store}>
      <div className="wave-root">
        <Scene />
        <Hud />
      </div>
    </WaveStoreContext.Provider>
  );
}
