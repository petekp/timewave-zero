"use client";

import { EVENTS, TIER_LABEL, eventDay } from "@/lib/wave/events";
import { eventDateText, spanForEvent } from "./EventPanel";
import { useWave, useWaveStore } from "./store-context";

const ORDERED = [...EVENTS].sort((a, b) => eventDay(a) - eventDay(b));

export default function EventList() {
  const store = useWaveStore();
  const open = useWave((s) => s.showEventList);
  const selected = useWave((s) => s.selectedEvent);
  if (!open) return null;
  return (
    <aside className="wave-list" aria-label="Events">
      <div className="wave-list-head">
        <h2>Events</h2>
        <button type="button" className="wave-close" onClick={() => store.getState().setShowEventList(false)} aria-label="Close">
          ×
        </button>
      </div>
      <p className="wave-list-intro">Moments McKenna and Meyer pointed to, plus a few from after his death. Colours: gold cited, cyan later, violet projected in 1997.</p>
      <ol>
        {ORDERED.map((e) => (
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
