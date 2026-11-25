"use client";

import { useState } from "react";
import styles from "./plate.module.css";
import {
  SIGNALS,
  CONNECTIONS,
  CONNECTION_BY_KEY,
  pairKey,
  type SignalId,
} from "./signals";

const byId = Object.fromEntries(SIGNALS.map((s) => [s.id, s])) as Record<
  SignalId,
  (typeof SIGNALS)[number]
>;

export default function SignalPlate() {
  // Up to two selected signals. One = read a signal; two = read the link.
  const [picked, setPicked] = useState<SignalId[]>([]);

  const toggle = (id: SignalId) => {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((p) => p !== id);
      if (cur.length < 2) return [...cur, id];
      return [cur[1], id]; // slide the window: keep the latest pick
    });
  };

  const [a, b] = picked;
  const activeKey = a && b ? pairKey(a, b) : null;
  const connection = activeKey ? CONNECTION_BY_KEY.get(activeKey) : undefined;

  return (
    <div className={styles.wrap}>
      <figure className={styles.plate} aria-label="Diagram of four connected signals">
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
          {CONNECTIONS.map((c) => {
            const p = byId[c.pair[0]].pos;
            const q = byId[c.pair[1]].pos;
            const key = pairKey(c.pair[0], c.pair[1]);
            const touches = picked.some((id) => c.pair.includes(id));
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
                className={`${styles.edge} ${state}`}
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

        <figcaption className={styles.caption}>
          Fig. 2 — The engine. Select one signal to read it; select a second to
          read the line between them.
        </figcaption>
      </figure>

      <aside className={styles.readout} aria-live="polite">
        {picked.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.kicker}>Reading — idle</p>
            <p className={styles.readTitle}>
              Nothing selected. Start anywhere: every signal is wired to the
              other three.
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
              {byId[a].label} affects <em>{byId[a].affects}</em>.
            </p>
            <blockquote className={styles.quote}>
              “{byId[a].source.quote}”
            </blockquote>
            <p className={styles.where}>{byId[a].source.where}</p>
            <p className={styles.note}>
              Now pick a second signal to trace a connection.
            </p>
          </div>
        )}

        {connection && a && b && (
          <div>
            <p className={styles.kicker}>
              Line — {byId[a].label} ↔ {byId[b].label}
            </p>
            <p className={styles.readTitle}>{connection.title}</p>
            <blockquote className={styles.quote}>
              “{connection.source.quote}”
            </blockquote>
            <p className={styles.where}>{connection.source.where}</p>
          </div>
        )}

        {picked.length > 0 && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => setPicked([])}
          >
            Clear the plate
          </button>
        )}
      </aside>
    </div>
  );
}
