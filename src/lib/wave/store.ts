/**
 * State of the modern view. `center` and `span` are what is drawn now; the
 * scene eases them toward `goalCenter` and `goalSpan` every frame, so wheel
 * zooms and jumps glide instead of snapping.
 */
import { create } from "zustand";
import { DEFAULT_ZERO_MOMENT, type Moment } from "../timewave/calendar";
import type { NumberSetName } from "../timewave/datasets";
import type { EventTier } from "./events";
import { BASE_CYCLE_DAYS } from "./cycles";
import { followZero, viewWithZero } from "./fit";
import { sampleWindow } from "./sample";
import { dateToDay, momentToDay } from "./time";
import { waveFor } from "./waves";

export const MIN_SPAN = 1 / 24;
export const MAX_SPAN = BASE_CYCLE_DAYS * Math.pow(64, 6) * 1.5;

export interface WaveState {
  zero: Moment;
  zeroDay: number;
  numberSet: NumberSetName;
  nowDay: number;
  center: number;
  span: number;
  goalCenter: number;
  goalSpan: number;
  hoverDay: number | null;
  pickDay: number | null;
  stacked: boolean;
  showGuide: boolean;
  /** Id of the selected event, or null. */
  selectedEvent: string | null;
  /** Show the selected event's resonances at other scales. */
  showEchoes: boolean;
  showEventList: boolean;
  eventsVisible: boolean;
  /** Which event tiers are drawn and listed. */
  tiers: Record<EventTier, boolean>;
  sound: boolean;
  /** Ghost lines of the other number sets. */
  compareSets: boolean;
  /** Resonances of the marked date. */
  showMarkEchoes: boolean;
  /** Gliding toward the zero point, zooming as it nears. */
  descending: boolean;
  /** Set after the first drag or wheel, to retire the hint. */
  interacted: boolean;
  /** While the end date is dragged: where it started and the vertical scale held for the drag. */
  fitting: { fromDay: number; min: number; max: number } | null;

  setZero(zero: Moment): void;
  setNumberSet(name: NumberSetName): void;
  /** Move the view at once, with no easing (dragging). */
  setView(center: number, span: number): void;
  /** Ease the view toward a new centre and span. */
  setGoal(center: number, span: number): void;
  /** Advance the drawn view toward the goal; `rate` in 0..1 is the fraction closed this frame. */
  ease(rate: number): void;
  setHover(day: number | null): void;
  setPick(day: number | null): void;
  setStacked(on: boolean): void;
  setShowGuide(on: boolean): void;
  selectEvent(id: string | null): void;
  setShowEchoes(on: boolean): void;
  setShowEventList(on: boolean): void;
  setEventsVisible(on: boolean): void;
  setTier(tier: EventTier, on: boolean): void;
  setSound(on: boolean): void;
  setCompareSets(on: boolean): void;
  setShowMarkEchoes(on: boolean): void;
  setDescending(on: boolean): void;
  setInteracted(): void;
  /** Start dragging the end date: bring the zero point into view and hold the scale. */
  beginFit(): void;
  endFit(): void;
  /** Ease the view out until the zero point is inside it. */
  revealZero(): void;
  /** Refresh the present moment. */
  touchNow(): void;
}

export function clampSpan(span: number): number {
  return Math.min(MAX_SPAN, Math.max(MIN_SPAN, span));
}

function clampCenter(center: number, zeroDay: number): number {
  return Math.min(zeroDay + MAX_SPAN, Math.max(zeroDay - MAX_SPAN, center));
}

export interface InitialView {
  center?: number;
  span?: number;
  zero?: Moment;
  numberSet?: NumberSetName;
}

export function createWaveStore(initial: InitialView = {}, now: Date = new Date()) {
  const zero = initial.zero ?? DEFAULT_ZERO_MOMENT;
  const zeroDay = momentToDay(zero);
  const nowDay = dateToDay(now);
  // Default view: a year around today.
  const span = clampSpan(initial.span ?? 365);
  const center = clampCenter(initial.center ?? nowDay, zeroDay);
  return create<WaveState>((set, get) => ({
    zero,
    zeroDay,
    numberSet: initial.numberSet ?? "DATA.TWZ",
    nowDay,
    center,
    span,
    goalCenter: center,
    goalSpan: span,
    hoverDay: null,
    pickDay: null,
    stacked: false,
    showGuide: false,
    selectedEvent: null,
    showEchoes: false,
    showEventList: false,
    eventsVisible: true,
    tiers: { mckenna: true, added: true, projected: false },
    sound: false,
    compareSets: false,
    showMarkEchoes: false,
    descending: false,
    interacted: false,
    fitting: null,

    setZero: (zero) => {
      const zeroDay = momentToDay(zero);
      const { fitting, goalCenter, goalSpan } = get();
      if (!fitting) return set({ zero, zeroDay });
      const view = followZero({ center: goalCenter, span: goalSpan }, zeroDay);
      set({ zero, zeroDay, goalCenter: view.center });
    },
    beginFit: () => {
      const { zeroDay, goalCenter, goalSpan, numberSet } = get();
      const view = viewWithZero({ center: goalCenter, span: goalSpan }, zeroDay);
      const span = clampSpan(view.span);
      const { min, max } = sampleWindow(waveFor(numberSet), { zeroDay, center: view.center, span, count: 2048 });
      set({ fitting: { fromDay: zeroDay, min, max }, descending: false, goalCenter: clampCenter(view.center, zeroDay), goalSpan: span });
    },
    endFit: () => set({ fitting: null }),
    revealZero: () => {
      const { zeroDay, goalCenter, goalSpan } = get();
      const view = viewWithZero({ center: goalCenter, span: goalSpan }, zeroDay);
      set({ goalCenter: clampCenter(view.center, zeroDay), goalSpan: clampSpan(view.span) });
    },
    setNumberSet: (numberSet) => set({ numberSet }),
    setView: (c, s) => {
      const span = clampSpan(s);
      const center = clampCenter(c, get().zeroDay);
      set({ center, span, goalCenter: center, goalSpan: span });
    },
    setGoal: (c, s) => set({ goalSpan: clampSpan(s), goalCenter: clampCenter(c, get().zeroDay) }),
    ease: (rate) => {
      const { center, span, goalCenter, goalSpan } = get();
      if (center === goalCenter && span === goalSpan) return;
      const logSpan = Math.log(span) + (Math.log(goalSpan) - Math.log(span)) * rate;
      let nextSpan = Math.exp(logSpan);
      let nextCenter = center + (goalCenter - center) * rate;
      // Snap once the remaining motion is below what a pixel could show.
      if (Math.abs(Math.log(goalSpan / nextSpan)) < 1e-4 && Math.abs(goalCenter - nextCenter) < goalSpan * 1e-5) {
        nextSpan = goalSpan;
        nextCenter = goalCenter;
      }
      set({ center: nextCenter, span: nextSpan });
    },
    setHover: (hoverDay) => set({ hoverDay }),
    setPick: (pickDay) => set(pickDay === null ? { pickDay, showMarkEchoes: false } : { pickDay }),
    setStacked: (stacked) => set({ stacked }),
    setShowGuide: (showGuide) => set({ showGuide }),
    selectEvent: (selectedEvent) => set({ selectedEvent }),
    setShowEchoes: (showEchoes) => set({ showEchoes }),
    setShowEventList: (showEventList) => set({ showEventList }),
    setEventsVisible: (eventsVisible) => set({ eventsVisible }),
    setTier: (tier, on) => set({ tiers: { ...get().tiers, [tier]: on } }),
    setSound: (sound) => set({ sound }),
    setCompareSets: (compareSets) => set({ compareSets }),
    setShowMarkEchoes: (showMarkEchoes) => set({ showMarkEchoes }),
    setDescending: (descending) => set({ descending }),
    setInteracted: () => {
      if (!get().interacted) set({ interacted: true });
    },
    touchNow: () => set({ nowDay: dateToDay(new Date()) }),
  }));
}

export type WaveStore = ReturnType<typeof createWaveStore>;
