"use client";

import { useRef, useState, type CSSProperties } from "react";
import styles from "./plate.module.css";
import {
  SIGNALS,
  CONNECTION_BY_KEY,
  CORE_NOTES,
  EVIDENCE_LABEL,
  pairKey,
  type Connection,
  type Evidence,
  type SignalId,
  type Source,
} from "./signals";

const byId = Object.fromEntries(SIGNALS.map((s) => [s.id, s])) as Record<
  SignalId,
  (typeof SIGNALS)[number]
>;

// Every combination of two signals gets a line, whether or not it has evidence.
const ALL_PAIRS: [SignalId, SignalId][] = SIGNALS.flatMap((s, i) =>
  SIGNALS.slice(i + 1).map((t) => [s.id, t.id] as [SignalId, SignalId]),
);

const lookup = (a: SignalId, b: SignalId): Connection =>
  CONNECTION_BY_KEY.get(pairKey(a, b)) ?? {
    pair: [a, b],
    evidence: "open",
    title: "Two notes from her profile",
    source: null,
  };

const EDGE_CLASS: Record<Evidence, string> = {
  direct: styles.edgeDirect,
  interpretive: styles.edgeInterpretive,
  open: styles.edgeOpen,
};

const BADGE_CLASS: Record<Evidence, string> = {
  direct: styles.badgeDirect,
  interpretive: styles.badgeInterpretive,
  open: styles.badgeOpen,
};

function Quote({ source }: { source: Source }) {
  return (
    <>
      <blockquote className={styles.quote}>
        {(source.excerpt || source.excerptStart) && (
          <span className={styles.excerptTag}>Excerpt</span>
        )}
        “{source.excerptStart ? "…" : ""}
        {/* an excerpt ends in "…", so drop its own closing full stop */}
        {source.excerpt ? `${source.quote.replace(/\.$/, "")}…` : source.quote}”
      </blockquote>
      <p className={styles.where}>
        {source.section}
        {source.where ? ` · ${source.where}` : ""}
      </p>
    </>
  );
}

export default function SignalPlate() {
  // Up to two selected signals. One = read a signal; two = read the line.
  const [picked, setPicked] = useState<SignalId[]>([]);
  // The clarity core shows her method; it is not part of any pair.
  const [coreOpen, setCoreOpen] = useState(false);

  const toggle = (id: SignalId) => {
    setCoreOpen(false);
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((p) => p !== id);
      if (cur.length < 2) return [...cur, id];
      return [cur[1], id]; // a third pick replaces the oldest one
    });
  };

  const openCore = () => {
    setPicked([]);
    setCoreOpen((v) => !v);
  };

  const reset = () => {
    setPicked([]);
    setCoreOpen(false);
  };

  const readoutRef = useRef<HTMLElement>(null);
  // Single-column layouts put the reading below the plate: offer a jump to it.
  // Plain scroll (no focus move), instant when reduced motion is preferred.
  const showReading = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    readoutRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const [a, b] = picked;
  const activeKey = a && b ? pairKey(a, b) : null;
  const connection = a && b ? lookup(a, b) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.figureCol}>
        <p className={`${styles.note} ${styles.plateIntro}`}>
          Four areas come from my About section. Demand Generation and Market Insight come from my roles.
        </p>
        <figure
          className={styles.plate}
          aria-label="Diagram: six business areas, connected through clarity at the centre"
        >
          <svg
            className={styles.lines}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* registration grid */}
            {[25, 50, 75].map((v) => (
              <g key={v} className={styles.grid}>
                <line x1={v} y1={0} x2={v} y2={100} />
                <line x1={0} y1={v} x2={100} y2={v} />
              </g>
            ))}
            {ALL_PAIRS.map(([s, t]) => {
              const p = byId[s].pos;
              const q = byId[t].pos;
              const key = pairKey(s, t);
              const touches = picked.includes(s) || picked.includes(t);
              const evidence = lookup(s, t).evidence;
              const state =
                key === activeKey && evidence !== "open"
                  ? styles.edgeActive
                  : touches && picked.length === 1
                    ? styles.edgeHint
                    : "";
              return (
                <line
                  key={key}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  className={`${styles.edge} ${EDGE_CLASS[evidence]} ${state}`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <button
            type="button"
            className={`${styles.core} ${coreOpen ? styles.coreOn : ""}`}
            aria-pressed={coreOpen}
            aria-label="Clarity: read my method"
            onClick={openCore}
          >
            <span>clarity</span>
          </button>

          {SIGNALS.map((s) => {
            const on = picked.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.node} ${on ? styles.nodeOn : ""}`}
                style={{ "--x": s.pos.x, top: `${s.pos.y}%` } as CSSProperties}
                aria-pressed={on}
                onClick={() => toggle(s.id)}
              >
                <span className={styles.nodeIndex}>{s.index}</span>
                <span className={styles.nodeLabel}>{s.label}</span>
                <span className={styles.nodeAffects}>
                  {s.affects ? `→ ${s.affects}` : s.descriptor}
                </span>
              </button>
            );
          })}
        </figure>

        {(picked.length > 0 || coreOpen) && (
          // Visual cue only: the reading itself is already announced by the
          // live region, so this stays out of the tab order and the a11y tree.
          <button
            type="button"
            className={styles.jump}
            onClick={showReading}
            // never take focus: it is hidden from assistive tech
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex={-1}
            aria-hidden="true"
          >
            {picked.length === 2 ? "Read the line below" : "Reading below"} ↓
          </button>
        )}

        <div className={styles.key}>
          <p className={styles.caption}>
            Select one area, then another to explore their
            connection. Select the centre to read my method.
          </p>
          <ul className={styles.legend} aria-label="How strongly each connection is supported">
            {(
              [
                ["direct", "my own words connect both areas"],
                ["interpretive", "drawn from the wider context of my experience; the link is an editorial reading"],
                [
                  "open",
                  `both areas appear in my profile but aren’t directly connected; shown as two separate notes${
                    ALL_PAIRS.some(([s, t]) => lookup(s, t).evidence === "open")
                      ? ""
                      : " (none at present)"
                  }`,
                ],
              ] as [Evidence, string][]
            ).map(([kind, text]) => (
              <li key={kind}>
                <svg aria-hidden="true" viewBox="0 0 40 6" className={styles.legendLine}>
                  <line x1="0" y1="3" x2="40" y2="3" className={`${styles.edge} ${EDGE_CLASS[kind]}`} />
                </svg>
                <span>
                  <b>{EVIDENCE_LABEL[kind]}</b> {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside ref={readoutRef} className={styles.readout} aria-live="polite">
        {coreOpen && (
          <div>
            <p className={styles.kicker}>At the centre — clarity</p>
            <p className={styles.readTitle}>
              My method: <em>find the root, keep it simple.</em>
            </p>
            {CORE_NOTES.map((n) => (
              <div key={n.quote}>
                <blockquote className={styles.quote}>
                  “{n.quote}”
                  {n.gloss && (
                    <span className={styles.gloss}>“{n.gloss}”</span>
                  )}
                </blockquote>
                <p className={styles.where}>{n.source}</p>
              </div>
            ))}
            <p className={styles.note}>
              This is how I work across every area, so it isn’t paired with
              just one.
            </p>
          </div>
        )}

        {picked.length === 0 && !coreOpen && (
          <div className={styles.empty}>
            <p className={styles.kicker}>Your selection</p>
            <p className={styles.readTitle}>
              Select any two areas to see how they connect. Start anywhere.
            </p>
          </div>
        )}

        {picked.length === 1 && a && (
          <div>
            <p className={styles.kicker}>
              Selected — {byId[a].index} / {byId[a].label}
            </p>
            <p className={styles.readTitle}>
              {byId[a].affects ? (
                <>
                  {byId[a].label} {byId[a].verb} <em>{byId[a].affects}</em>.
                </>
              ) : (
                <>
                  {byId[a].label}, <em>{byId[a].descriptor?.toLowerCase()}</em>.
                </>
              )}
            </p>
            <Quote source={byId[a].source} />
            <p className={styles.note}>
              Now select a second area to see how they connect.
            </p>
          </div>
        )}

        {connection && a && b && (
          <div>
            <p className={styles.kicker}>
              Connection — {byId[a].label} ↔ {byId[b].label}
              <span className={styles.srOnly}>, evidence: </span>
              <span className={`${styles.badge} ${BADGE_CLASS[connection.evidence]}`}>
                {EVIDENCE_LABEL[connection.evidence]}
              </span>
            </p>
            <p className={styles.readTitle}>{connection.title}</p>
            {connection.reading && (
              <p className={styles.reading}>
                <span className={styles.readingTag}>Editorial reading</span>
                {connection.reading}
              </p>
            )}
            {connection.source && <Quote source={connection.source} />}

            {/* Open pair: each signal's own verified example, side by side. */}
            {connection.evidence === "open" && (
              <>
                {[a, b].map((id) => (
                  <section
                    key={id}
                    className={styles.sideNote}
                    aria-label={`${byId[id].label}: a note from my profile`}
                  >
                    <p className={styles.sideLabel}>
                      {byId[id].index} / {byId[id].label}
                    </p>
                    <Quote source={byId[id].source} />
                  </section>
                ))}
                <p className={styles.sourceNote}>
                  My profile presents these two examples separately; it
                  doesn’t state a connection between them.
                </p>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          className={styles.reset}
          onClick={reset}
          disabled={picked.length === 0 && !coreOpen}
        >
          Reset selection
        </button>
      </aside>
    </div>
  );
}
