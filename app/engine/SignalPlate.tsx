"use client";

import { useState } from "react";
import styles from "./plate.module.css";
import {
  SIGNALS,
  CONNECTION_BY_KEY,
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
    title: "Not yet confirmed from her profile",
    reading:
      "No line in the profile material fairly relates these two, so this line is left open rather than guessed.",
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
        {source.excerpt && <span className={styles.excerptTag}>Excerpt</span>}
        “{source.quote}
        {source.excerpt ? "…" : ""}”
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

  const toggle = (id: SignalId) => {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((p) => p !== id);
      if (cur.length < 2) return [...cur, id];
      return [cur[1], id]; // a third pick replaces the oldest one
    });
  };

  const [a, b] = picked;
  const activeKey = a && b ? pairKey(a, b) : null;
  const connection = a && b ? lookup(a, b) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.figureCol}>
        <figure
          className={styles.plate}
          aria-label="Diagram: Brand, Messaging, People and Operations, connected through clarity"
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
              const state =
                key === activeKey
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
                  className={`${styles.edge} ${EDGE_CLASS[lookup(s, t).evidence]} ${state}`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <div className={styles.core} aria-hidden="true">
            <span>clarity</span>
          </div>

          {SIGNALS.map((s) => {
            const on = picked.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.node} ${on ? styles.nodeOn : ""}`}
                style={{ left: `${s.pos.x}%`, top: `${s.pos.y}%` }}
                aria-pressed={on}
                onClick={() => toggle(s.id)}
              >
                <span className={styles.nodeIndex}>{s.index}</span>
                <span className={styles.nodeLabel}>{s.label}</span>
                <span className={styles.nodeAffects}>→ {s.affects}</span>
              </button>
            );
          })}
        </figure>

        <div className={styles.key}>
          <p className={styles.caption}>
            Fig. 2 — The engine. Select one signal to read it; select a second
            to read the line between them. A third selection replaces the
            oldest.
          </p>
          <ul className={styles.legend} aria-label="How strong each line is">
            {(
              [
                ["direct", "her words name both signals"],
                ["interpretive", "her words cover both; the link is our reading"],
                [
                  "open",
                  `not supported by her profile; left unconfirmed${
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

      <aside className={styles.readout} aria-live="polite">
        {picked.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.kicker}>Reading — idle</p>
            <p className={styles.readTitle}>
              Nothing selected. Start anywhere: every signal can be paired with
              the other three.
            </p>
            <p className={styles.note}>
              Six lines, four signals, one thing at the crossing.
            </p>
          </div>
        )}

        {picked.length === 1 && a && (
          <div>
            <p className={styles.kicker}>
              Reading — {byId[a].index} / {byId[a].label}
            </p>
            <p className={styles.readTitle}>
              {byId[a].label} {byId[a].verb} <em>{byId[a].affects}</em>.
            </p>
            <Quote source={byId[a].source} />
            <p className={styles.note}>
              Now pick a second signal to trace a connection.
            </p>
          </div>
        )}

        {connection && a && b && (
          <div>
            <p className={styles.kicker}>
              Line — {byId[a].label} ↔ {byId[b].label}
              <span className={styles.srOnly}>, evidence: </span>
              <span className={`${styles.badge} ${BADGE_CLASS[connection.evidence]}`}>
                {EVIDENCE_LABEL[connection.evidence]}
              </span>
            </p>
            <p className={styles.readTitle}>{connection.title}</p>
            {connection.reading && (
              <p className={styles.reading}>
                <span className={styles.readingTag}>
                  {connection.evidence === "open" ? "Unconfirmed" : "Editorial reading"}
                </span>
                {connection.reading}
              </p>
            )}
            {connection.source && <Quote source={connection.source} />}
          </div>
        )}

        <button
          type="button"
          className={styles.reset}
          onClick={() => setPicked([])}
          disabled={picked.length === 0}
        >
          Clear the plate
        </button>
      </aside>
    </div>
  );
}
