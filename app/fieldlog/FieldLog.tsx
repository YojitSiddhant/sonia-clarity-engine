"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./fieldlog.module.css";
import { createNarrator, maxOverlap, sentenceFor, type Narrator } from "./narration";
import {
  ENTRIES,
  FIRST_YEAR,
  PRESENT_STOP,
  LANE_LABEL,
  type Entry,
  type Lane,
  type When,
} from "./entries";

const LANES: Lane[] = ["work", "education", "recognition", "volunteering"];
const AXIS_END = PRESENT_STOP + 1; // the Present stop gets one column of its own
const SPAN = AXIS_END - FIRST_YEAR;

// Continuous position in years. Year-only dates cover the whole year.
const startT = (w: When) => w.y + ((w.m ?? 1) - 1) / 12;
const endT = (e: Entry) =>
  e.end === "present"
    ? PRESENT_STOP + 0.55
    : e.end
      ? e.end.y + (e.end.m ?? 12) / 12
      : startT(e.start) + 1 / 12;
const pct = (t: number) => `${((t - FIRST_YEAR) / SPAN) * 100}%`;

/**
 * Pack a lane into rows so overlapping entries never collide.
 * Row order comes only from this packing; it carries no meaning.
 */
function pack(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) => startT(a.start) - startT(b.start));
  const rowEnds: number[] = [];
  const rowOf = new Map<string, number>();
  for (const e of sorted) {
    let r = rowEnds.findIndex((end) => end <= startT(e.start));
    if (r === -1) r = rowEnds.push(0) - 1;
    rowEnds[r] = endT(e);
    rowOf.set(e.id, r);
  }
  return { rows: Math.max(rowEnds.length, 1), rowOf };
}

const LAYOUT = Object.fromEntries(
  LANES.map((lane) => {
    const items = ENTRIES.filter((e) => e.lane === lane);
    return [lane, { items, ...(lane === "recognition" ? { rows: 1, rowOf: new Map() } : pack(items)) }];
  }),
) as Record<Lane, { items: Entry[]; rows: number; rowOf: Map<string, number> }>;

const isActive = (e: Entry, year: number) => {
  if (year === PRESENT_STOP) return e.end === "present";
  if (!e.end) return e.start.y === year; // award: its issue year
  const endY = e.end === "present" ? Infinity : e.end.y;
  return e.start.y <= year && year <= endY;
};

const yearLabel = (y: number) => (y === PRESENT_STOP ? "Present" : String(y));

// Playback glides continuously at one year per 1.6 s, so the reading panel
// changes at a calm, readable cadence while the needle never stops.
const YEARS_PER_SECOND = 1 / 1.6;
const PLAY_END = PRESENT_STOP + 0.5; // centre of the Present column
const centre = (y: number) => y + 0.5;
const yearAt = (t: number) => Math.min(PRESENT_STOP, Math.max(FIRST_YEAR, Math.floor(t)));
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NOUN: Record<Lane, [string, string]> = {
  work: ["role", "roles"],
  education: ["course of study", "courses of study"],
  recognition: ["award", "awards"],
  volunteering: ["volunteer commitment", "volunteer commitments"],
};

function summary(year: number) {
  const parts = LANES.map((lane) => {
    const n = ENTRIES.filter((e) => e.lane === lane && isActive(e, year)).length;
    return n ? `${n} ${NOUN[lane][n === 1 ? 0 : 1]}` : "";
  }).filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing listed";
}

const TICK_LABELS = [2002, 2006, 2010, 2014, 2018, 2022];
const PRESENT_WORK = ENTRIES.filter((e) => e.lane === "work" && e.end === "present").length;

export default function FieldLog() {
  const [year, setYear] = useState(PRESENT_STOP);
  const [playing, setPlaying] = useState(false);
  // Announced once per playback event, instead of every year while playing.
  const [status, setStatus] = useState("");
  // "Replay" only after a playback has actually reached Present.
  const [finished, setFinished] = useState(false);

  // Needle position in axis years (continuous). React renders it from
  // `needleT` when stopped; while playing, the animation loop moves the DOM
  // node directly so the page doesn't re-render every frame.
  const [needleT, setNeedleT] = useState(centre(PRESENT_STOP));
  const tRef = useRef(centre(PRESENT_STOP));
  const drawnRef = useRef(centre(PRESENT_STOP));
  const needleRef = useRef<HTMLSpanElement>(null);

  // Optional spoken narration: off by default, enabled only by the visitor,
  // and spoken only while playback runs. Refs keep the animation loop in
  // sync without stale state.
  const [narrationOn, setNarrationOn] = useState(false);
  const [narrationNote, setNarrationNote] = useState("");
  const narrationOnRef = useRef(false);
  const narratorRef = useRef<Narrator | null>(null);
  const speakingRef = useRef(false); // a sentence is in progress: hold the needle
  const spokenYearRef = useRef<number | null>(null); // last year narrated

  // Stop speech now and forget the queue. The interrupted year is re-read
  // from its start if playback resumes, so no half sentence is skipped.
  const hush = () => {
    narratorRef.current?.cancel();
    speakingRef.current = false;
    spokenYearRef.current = null;
  };

  const toggleNarration = async () => {
    if (narrationOn) {
      narrationOnRef.current = false;
      setNarrationOn(false);
      hush();
      return;
    }
    narratorRef.current ??= createNarrator();
    const ok = await narratorRef.current.ready();
    if (!ok) {
      setNarrationNote("Narration isn’t available in this browser.");
      return;
    }
    setNarrationNote("");
    spokenYearRef.current = null;
    narrationOnRef.current = true;
    setNarrationOn(true);
  };

  // Put the needle at `t` in the DOM and in state, so a later render can't
  // leave it where the animation loop last drew it.
  const place = (t: number) => {
    drawnRef.current = t;
    if (needleRef.current) needleRef.current.style.left = pct(t);
    setNeedleT(t);
  };

  // Freeze the needle where it is and sync the selected year to it.
  const freeze = () => {
    hush();
    setPlaying(false);
    place(drawnRef.current);
    const y = yearAt(tRef.current);
    setYear(y);
    return y;
  };

  // Manual navigation always wins: it pauses playback first.
  const set = (y: number) => {
    const target = Math.min(PRESENT_STOP, Math.max(FIRST_YEAR, y));
    hush(); // manual navigation never speaks
    if (playing) {
      setPlaying(false);
      setStatus(`Playback paused at ${yearLabel(target)}.`);
    }
    tRef.current = centre(target);
    place(centre(target));
    setFinished(false);
    setYear(target);
  };

  const togglePlay = () => {
    if (playing) {
      const y = freeze();
      setStatus(`Playback paused at ${yearLabel(y)}.`);
      return;
    }
    // From Present (or after finishing) replay from the start of 2002;
    // otherwise resume from wherever the needle is.
    if (tRef.current >= PLAY_END - 1e-6) tRef.current = FIRST_YEAR;
    hush(); // replay/resume always starts with a clean speech queue
    const from = yearAt(tRef.current);
    setYear(from);
    setFinished(false);
    setPlaying(true);
    setStatus(`Playback started at ${yearLabel(from)}.`);
  };

  // One animation loop at most: it exists only while `playing` is true and
  // is cancelled on pause, manual navigation, finish or unmount.
  useEffect(() => {
    if (!playing) return;
    const reduce = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();

    const draw = (t: number) => {
      // Reduced motion: no glide; the needle sits at each year's centre.
      const shown = reduce ? Math.min(centre(yearAt(t)), PLAY_END) : t;
      drawnRef.current = shown;
      if (needleRef.current) needleRef.current.style.left = pct(shown);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // ignore long tab pauses
      last = now;
      // While a sentence is being spoken, hold the needle on its year so the
      // next sentence never starts early or overlaps.
      if (speakingRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(PLAY_END, tRef.current + dt * YEARS_PER_SECOND);
      tRef.current = t;
      draw(t);
      const y = yearAt(t);
      setYear(y); // no re-render unless the year actually changed

      // Narrate each year once, on arrival; silent years say nothing.
      if (narrationOnRef.current && narratorRef.current && spokenYearRef.current !== y && t < PLAY_END) {
        spokenYearRef.current = y;
        const text = sentenceFor(y);
        if (text) {
          speakingRef.current = true;
          narratorRef.current.say(text, () => {
            speakingRef.current = false;
          });
        }
      }
      if (t >= PLAY_END) {
        setNeedleT(PLAY_END);
        setPlaying(false);
        setFinished(true);
        setStatus(`Playback finished at Present. ${summary(PRESENT_STOP)}.`);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    draw(tRef.current);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // A hidden tab stops speech (playback itself halts with the frame loop);
  // leaving the page cancels anything still queued.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const narrator = narratorRef;
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      narrator.current?.cancel();
    };
  }, []);

  const active = ENTRIES.filter((e) => isActive(e, year));
  const workCount = active.filter((e) => e.lane === "work").length;

  return (
    <div className={styles.wrap}>
      <div className={styles.plateCol}>
        <figure
          className={styles.plate}
          aria-label={`Career timeline from ${FIRST_YEAR} to Present, in four rows: experience, education, awards and volunteering. Use the year slider below to see each year.`}
        >
          {/* year grid + needle */}
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: SPAN }, (_, i) => (
              <span
                key={i}
                className={`${styles.gridLine} ${TICK_LABELS.includes(FIRST_YEAR + i) ? styles.gridMajor : ""}`}
                style={{ left: pct(FIRST_YEAR + i) }}
              />
            ))}
            <span className={styles.presentZone} style={{ left: pct(PRESENT_STOP) }} />
            <span
              ref={needleRef}
              className={`${styles.needle} ${playing ? styles.needlePlaying : ""}`}
              style={{ left: pct(needleT) }}
            />
          </div>

          {LANES.map((lane) => {
            const { items, rows, rowOf } = LAYOUT[lane];
            return (
              <div key={lane} className={styles.lane} aria-hidden="true">
                <span className={styles.laneLabel}>{LANE_LABEL[lane]}</span>
                <div className={styles.track} style={{ height: `${rows * 14 + 6}px` }}>
                  {items.map((e) => {
                    const on = isActive(e, year);
                    const top = `${(rowOf.get(e.id) ?? 0) * 14 + 3}px`;
                    if (!e.end) {
                      return (
                        <span
                          key={e.id}
                          title={`${e.title} · ${e.dates}`}
                          className={`${styles.dot} ${on ? styles.on : styles.off}`}
                          style={{ left: pct(startT(e.start) + 1 / 24), top }}
                        />
                      );
                    }
                    return (
                      <span
                        key={e.id}
                        title={`${e.title} · ${e.org} · ${e.dates}`}
                        className={`${styles.bar} ${e.end === "present" ? styles.barPresent : ""} ${on ? styles.on : styles.off}`}
                        style={{ left: pct(startT(e.start)), width: `calc(${pct(endT(e))} - ${pct(startT(e.start))})`, top }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className={styles.axis} aria-hidden="true">
            {TICK_LABELS.map((y) => (
              <span key={y} style={{ left: pct(y) }}>
                {y}
              </span>
            ))}
            <span className={styles.axisPresent} style={{ left: pct(PRESENT_STOP) }}>
              Present
            </span>
          </div>

          <p className={styles.margin} aria-hidden="true">
            {PRESENT_WORK} roles listed as “Present” at the same time ↗
          </p>
        </figure>

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.play} ${playing ? styles.playOn : ""}`}
            onClick={togglePlay}
            aria-pressed={playing}
            aria-label={
              playing
                ? "Pause timeline"
                : year === PRESENT_STOP
                  ? `${finished ? "Replay" : "Play"} timeline from ${FIRST_YEAR}`
                  : "Play timeline"
            }
          >
            <span aria-hidden="true">{playing ? "❚❚" : finished ? "↺" : "▶"}</span>
            <span className={styles.playText} aria-hidden="true">
              {playing ? "Pause" : finished ? "Replay" : "Play"}
            </span>
          </button>
          <button
            type="button"
            className={styles.step}
            onClick={() => set(year - 1)}
            disabled={year === FIRST_YEAR}
            aria-label="Previous year"
          >
            ←
          </button>
          <label className={styles.sliderLabel}>
            <span className={styles.srOnly}>Year</span>
            <input
              type="range"
              className={styles.slider}
              min={FIRST_YEAR}
              max={PRESENT_STOP}
              step={1}
              value={year}
              onChange={(ev) => set(Number(ev.target.value))}
              aria-valuetext={`${yearLabel(year)}: ${summary(year)}`}
            />
          </label>
          <button
            type="button"
            className={styles.step}
            onClick={() => set(year + 1)}
            disabled={year === PRESENT_STOP}
            aria-label="Next year"
          >
            →
          </button>
        </div>

        <div className={styles.narrationRow}>
          <button
            type="button"
            className={`${styles.narration} ${narrationOn ? styles.narrationOn : ""}`}
            aria-pressed={narrationOn}
            onClick={toggleNarration}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
              {narrationOn ? (
                <path
                  d="M11 5.5c1 .8 1 4.2 0 5M12.8 3.8c2 1.8 2 6.6 0 8.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M11 6l4 4M15 6l-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <span>{narrationOn ? "Narration on" : "Narration off"}</span>
          </button>
          <span className={styles.narrationHint} role="status">
            {narrationNote ||
              (narrationOn
                ? "Speaks during Play. Pause or turn narration off to stop it."
                : "")}
          </span>
        </div>

        <p className={styles.caption}>
          Fig. 3 — Career timeline: choose a year or press Play. Stacked rows
          show roles that overlapped in time, not a ranking or order of
          importance.
        </p>
        <ul className={styles.legend} aria-label="Legend">
          <li>
            <span className={styles.legendBar} aria-hidden="true" /> a role or
            commitment, drawn across its listed dates
          </li>
          <li>
            <span className={styles.legendDot} aria-hidden="true" /> an award, at
            its issue date
          </li>
          <li>
            <span className={`${styles.legendBar} ${styles.legendPresent}`} aria-hidden="true" />{" "}
            still listed as “Present” (no end date)
          </li>
        </ul>
      </div>

      {/* Playback start/pause/finish is announced here, once per event. */}
      <p className={styles.srOnly} role="status">
        {status}
      </p>

      {/* Manual year changes are announced; silent while playback runs. */}
      <aside className={styles.readout} aria-live={playing ? "off" : "polite"}>
        <p className={styles.kicker}>Year — {yearLabel(year)}</p>
        <p className={styles.readTitle}>
          {year === PRESENT_STOP ? "Still listed as “Present”: " : `In ${year}: `}
          <em>{summary(year)}</em>
          {/* "in parallel" only when roles truly overlap, month by month */}
          {(year === PRESENT_STOP ? workCount : maxOverlap(year)) > 1 ? ", running in parallel." : "."}
        </p>

        {LANES.map((lane) => {
          const list = active.filter((e) => e.lane === lane);
          if (!list.length) return null;
          return (
            <section key={lane} className={styles.group} aria-label={LANE_LABEL[lane]}>
              <p className={styles.groupLabel}>{LANE_LABEL[lane]}</p>
              <ul className={styles.items}>
                {list.map((e) => (
                  <li key={e.id}>
                    <span className={styles.itemTitle}>{e.title}</span>
                    <span className={styles.itemWhere}>
                      {e.org} · {e.dates}
                    </span>
                    {e.note && <span className={styles.itemNote}>{e.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </aside>
    </div>
  );
}
