"use client";

import { useEffect, useState } from "react";
import { EVENTS_BY_ID, SOURCES, TIER_LABEL, eventDay, type WaveEvent } from "@/lib/wave/events";
import { DAYS_PER_YEAR, formatDay, formatDaysToZero, formatDuration, formatYear } from "@/lib/wave/time";
import { useWave, useWaveStore } from "./store-context";
import { fetchSummary, type WikiSummary } from "./wikipedia";

/** How wide a view suits an event: its own precision, or the current span if that is wider. */
export function spanForEvent(e: WaveEvent, current: number): number {
  if (!e.approx) return current;
  const yearsAgo = Math.abs(2000 - e.year);
  return Math.max(current, yearsAgo * 0.06 * DAYS_PER_YEAR);
}

export function eventDateText(e: WaveEvent): string {
  if (e.approx) {
    if (e.year < -10000) return `about ${formatDuration((2000 - e.year) * DAYS_PER_YEAR).replace(/ years$/, "")} years ago`;
    if (e.year <= 0) return `about ${(-e.year).toLocaleString()} BC`;
    return `about ${formatYear(e.year)}`;
  }
  const day = eventDay(e);
  return formatDay(day, e.day ? "day" : e.month ? "month" : "year");
}

export default function EventPanel() {
  const id = useWave((s) => s.selectedEvent);
  const event = id ? EVENTS_BY_ID.get(id) : undefined;
  if (!event) return null;
  // Keyed by event so the summary and player state start fresh for each one.
  return <EventCard key={event.id} event={event} />;
}

function EventCard({ event }: { event: WaveEvent }) {
  const store = useWaveStore();
  const showEchoes = useWave((s) => s.showEchoes);
  const zeroDay = useWave((s) => s.zeroDay);
  const [summary, setSummary] = useState<WikiSummary | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!event.wiki) return;
    let live = true;
    fetchSummary(event.wiki).then((s) => {
      if (live) setSummary(s);
    });
    return () => {
      live = false;
    };
  }, [event]);

  const day = eventDay(event);
  const daysToZero = zeroDay - day;
  const source = SOURCES[event.source];

  return (
    <aside className="wave-event" aria-label="Event">
      <div className="wave-event-head">
        <span className={`wave-tier wave-tier-${event.tier}`}>{TIER_LABEL[event.tier]}</span>
        <button type="button" className="wave-close" onClick={() => store.getState().selectEvent(null)} aria-label="Close">
          ×
        </button>
      </div>
      <h2>{event.title}</h2>
      <div className="wave-event-date">
        {eventDateText(event)} · {formatDaysToZero(daysToZero)} the zero point
      </div>
      <p className="wave-event-note">{event.note}</p>
      <p className="wave-event-source">
        Source: {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> : source.label}
      </p>
      {summary && (
        <div className="wave-wiki">
          {summary.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={summary.thumbnail} alt="" loading="lazy" />
          )}
          <p>
            {summary.extract.length > 360 ? summary.extract.slice(0, 357).replace(/\s+\S*$/, "") + "…" : summary.extract}{" "}
            <a href={summary.url} target="_blank" rel="noopener noreferrer">
              Wikipedia
            </a>
          </p>
        </div>
      )}
      {event.archive && (
        <div className="wave-media">
          {playing ? (
            <iframe src={`https://archive.org/embed/${event.archive}`} title="Internet Archive player" allow="autoplay" allowFullScreen loading="lazy" />
          ) : (
            <button type="button" onClick={() => setPlaying(true)}>
              ▶ Listen: McKenna on the timewave (Internet Archive)
            </button>
          )}
          <a href={`https://archive.org/details/${event.archive}`} target="_blank" rel="noopener noreferrer">
            open on archive.org
          </a>
        </div>
      )}
      <div className="wave-event-actions">
        <button type="button" onClick={() => store.getState().setGoal(day, spanForEvent(event, store.getState().goalSpan))}>
          go there
        </button>
        {daysToZero > 0 ? (
          <button type="button" className={showEchoes ? "on" : ""} onClick={() => store.getState().setShowEchoes(!showEchoes)} title="Where this moment recurs at 64, 4,096 and 262,144 times the scale">
            {showEchoes ? "hide echoes" : "show echoes"}
          </button>
        ) : (
          <span className="wave-event-hint">after the zero point there are no resonances</span>
        )}
      </div>
    </aside>
  );
}
