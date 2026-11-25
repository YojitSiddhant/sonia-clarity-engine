"use client";

import { useState } from "react";
import styles from "./fieldlog.module.css";
import {
  ENTRIES,
  FIRST_YEAR,
  PRESENT_STOP,
  LANE_LABEL,
  SECTION,
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

const yearLabel = (y: number) => (y === PRESENT_STOP ? "Present (as listed)" : String(y));

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
  const set = (y: number) => setYear(Math.min(PRESENT_STOP, Math.max(FIRST_YEAR, y)));
  const active = ENTRIES.filter((e) => isActive(e, year));
  const workCount = active.filter((e) => e.lane === "work").length;

  return (
    <div className={styles.wrap}>
      <div className={styles.plateCol}>
        <figure
          className={styles.plate}
          aria-label={`Timeline from ${FIRST_YEAR} to Present (as listed), in four lanes: work, education, recognition and volunteering. Use the year slider below to read each year.`}
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
            <span className={styles.needle} style={{ left: pct(year + 0.5) }} />
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

        <p className={styles.caption}>
          Fig. 3 — The Field Log. Move the needle to a year to read what her
          profile lists for it. Stacked rows show overlap only; their order
          means nothing about rank or sequence.
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
            still listed as “Present”; no end date is claimed
          </li>
        </ul>
      </div>

      <aside className={styles.readout} aria-live="polite">
        <p className={styles.kicker}>Reading — {yearLabel(year)}</p>
        <p className={styles.readTitle}>
          {year === PRESENT_STOP ? "Still listed as “Present”: " : `In ${year}: `}
          <em>{summary(year)}</em>
          {workCount > 1 ? ", running in parallel." : "."}
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
                      {SECTION[e.lane]} · {e.org} ·{" "}
                      {e.dates.replace("Present", "Present (as listed)")}
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
