/** Screen geometry of the original program, in native 640x200 pixels and 80x25 text cells. */
export const PLOT_LEFT = 76;
export const PLOT_RIGHT = 444;
export const PLOT_WIDTH = 368;
export const PLOT_TOP = 12;
export const PLOT_BOTTOM = 116;
export const PLOT_HEIGHT = 104;
/** Number of tick intervals across the plot (47 ticks, one per text cell). */
export const TICK_INTERVALS = 46;
export const TICK_SPACING = 8;

export const DAYS_PER_YEAR = 365.2425;
export const DAYS_PER_MONTH = 30.436875;

export const SCREEN_COUNT = 11;
export const MIN_WAVE_FACTOR = 18;
export const MAX_WAVE_FACTOR = 84;

/** One of the eleven screens. Days are days before the zero point; span is in days. */
export interface ScreenState {
  target: number;
  span: number;
  /** Target marker position within the plot, 0..368 pixels from the left edge. */
  targetPx: number;
  waveFactor: number;
  /** Whether the wave has been graphed on this screen. */
  graphed: boolean;
}

export function makeScreen(partial: Partial<ScreenState> = {}): ScreenState {
  return { target: 0, span: 7, targetPx: 184, waveFactor: 64, graphed: false, ...partial };
}

/** Spans shorter than this show the target's time of day (tick interval under four days). */
export const TIME_SPAN_LIMIT = 184;

/** One of the eleven screens: target and timespan may each be unset. */
export interface Slot {
  target: number | null;
  span: number | null;
  targetPx: number;
  waveFactor: number;
  graphed: boolean;
  /** Days and wave values are printed once the target has been set or graphed. */
  valuesKnown: boolean;
}

export function emptySlot(partial: Partial<Slot> = {}): Slot {
  return { target: null, span: null, targetPx: 184, waveFactor: 64, graphed: false, valuesKnown: false, ...partial };
}

/** The plottable view of a slot, when both target and timespan are set. */
export function slotScreen(slot: Slot): ScreenState | null {
  if (slot.target === null || slot.span === null) return null;
  return { target: slot.target, span: slot.span, targetPx: slot.targetPx, waveFactor: slot.waveFactor, graphed: slot.graphed };
}

export function slotWith(slot: Slot, s: ScreenState, extra: Partial<Slot> = {}): Slot {
  return { ...slot, target: s.target, span: s.span, targetPx: s.targetPx, waveFactor: s.waveFactor, graphed: s.graphed, ...extra };
}
