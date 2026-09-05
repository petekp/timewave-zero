"use client";

import { EVENTS, TIER_LABEL, eventDay, type EventTier } from "@/lib/wave/events";
import { eventDateText, spanForEvent } from "./EventPanel";
import { useWave, useWaveStore } from "./store-context";

const ORDERED = [...EVENTS].sort((a, b) => eventDay(a) - eventDay(b));
const TIERS: EventTier[] = ["mckenna", "added", "projected"];

export default function EventList() {
  const store = useWaveStore();
  const open = useWave((s) => s.showEventList);
  const selected = useWave((s) => s.selectedEvent);
  const tiers = useWave((s) => s.tiers);
  const eventsVisible = useWave((s) => s.eventsVisible);
  if (!open) return null;
  return (
    <aside className="wave-list" aria-label="Events">
      <div className="wave-list-head">
        <h2>Events</h2>
        <button type="button" className="wave-close" onClick={() => store.getState().setShowEventList(false)} aria-label="Close">
          ×
        </button>
      </div>
      <div className="wave-list-filters">
        {TIERS.map((t) => (
          <label key={t} className="wave-check">
            <input type="checkbox" checked={tiers[t]} onChange={(e) => store.getState().setTier(t, e.target.checked)} />
            <span className={`wave-dot wave-tier-${t}`} />
            {TIER_LABEL[t]}
          </label>
        ))}
        <label className="wave-check">
          <input type="checkbox" checked={eventsVisible} onChange={(e) => store.getState().setEventsVisible(e.target.checked)} />
          pins on the ribbon
        </label>
      </div>
      <ol>
        {ORDERED.filter((e) => tiers[e.tier]).map((e) => (
          <li key={e.id} className={e.id === selected ? "selected" : ""}>
            <button
              type="button"
              onClick={() => {
                const s = store.getState();
                s.selectEvent(e.id);
                s.setGoal(eventDay(e), spanForEvent(e, Math.min(s.goalSpan, 365.2425 * 40)));
              }}
            >
              <span className={`wave-dot wave-tier-${e.tier}`} title={TIER_LABEL[e.tier]} />
              <span className="wave-list-date">{eventDateText(e)}</span>
              <span className="wave-list-title">{e.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
