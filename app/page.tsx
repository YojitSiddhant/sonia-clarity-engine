import styles from "./page.module.css";
import SignalPlate from "./engine/SignalPlate";
import { SIGNALS } from "./engine/signals";

export default function Home() {
  return (
    <main className={styles.sheet}>
      <header className={styles.masthead}>
        <span>The Clarity Engine</span>
        <span className={styles.mastMid}>A working notebook on how Sonia thinks</span>
        <span>Plate I</span>
      </header>

      {/* ── Observation ─────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="obs">
        <p className={styles.label}>Observation 01</p>
        <h1 id="obs" className={styles.headline}>
          I notice what <span className={styles.strike}>others</span>{" "}
          <span className={styles.mark}>don’t.</span>
        </h1>
        <p className={styles.sub}>
          The gaps, the confusion, the unspoken story,
          <br />
          and I help make sense of it.
        </p>
        <p className={`${styles.annot} ${styles.annotHero}`}>
          ↖ her words, the opening line of her own About
        </p>
      </section>

      {/* ── Hypothesis ──────────────────────────────── */}
      <section className={styles.hypothesis} aria-labelledby="hyp">
        <div className={styles.hypText}>
          <p className={styles.label}>Hypothesis</p>
          <h2 id="hyp" className={styles.h2}>
            Not one skill. <em>The whole picture.</em>
          </h2>
          <blockquote className={styles.verbatim}>
            “my strength isn’t just one skill or expertise but it lies in
            seeing the whole picture”
            <cite>Sonia, About</cite>
          </blockquote>
          <p className={styles.body}>
            Across global companies, early-stage teams and growing startups,
            she says her role has been the same everywhere:{" "}
            <strong>“bringing clarity, connecting the dots, and making the work
            simpler, purposeful, and aligned.”</strong>
          </p>
          <p className={styles.annot}>
            So instead of listing what she has done, this page tests how she
            connects things. →
          </p>
        </div>

        <figure className={styles.ledger} aria-label="Four signals and what each affects">
          <figcaption className={styles.figcap}>
            Fig. 1 — Four readings, as she states them
          </figcaption>
          <ol>
            {SIGNALS.map((s) => (
              <li key={s.id}>
                <span className={styles.ledgerIdx}>{s.index}</span>
                <span className={styles.ledgerFrom}>{s.label.toLowerCase()}</span>
                <span className={styles.ledgerArrow} aria-hidden="true" />
                <span className={styles.ledgerTo}>{s.affects}</span>
              </li>
            ))}
          </ol>
          <p className={styles.ledgerNote}>
            “how people affect <u>everything</u>” — the only reading with no
            boundary.
          </p>
        </figure>
      </section>

      {/* ── Experiment ──────────────────────────────── */}
      <section className={styles.experiment} aria-labelledby="exp">
        <div className={styles.expHead}>
          <p className={styles.label}>Experiment</p>
          <h2 id="exp" className={styles.h2}>
            Pull any two signals. See what holds them together.
          </h2>
          <p className={styles.body}>
            Every pair responds, but not every pair is proven. Each line is
            drawn by how strongly her own words support it: solid where they
            name both signals, dashed where the link is our reading, dotted
            where her profile doesn’t speak to it.
          </p>
        </div>
        <SignalPlate />
      </section>

      {/* ── Result ──────────────────────────────────── */}
      <section className={styles.result} aria-labelledby="res">
        <p className={styles.label}>Result</p>
        <h2 id="res" className={styles.resultLine}>
          <span>I bring structure</span>
          <span className={styles.resultStrike}>without chaos.</span>
        </h2>
        <p className={styles.body}>
          I help teams feel more confident and connected in what they’re
          building.
        </p>
        <p className={styles.closing}>
          “I’m always open to connecting with people who are building,
          learning, or growing — and want marketing that feels clear,
          meaningful, and human.”
        </p>
        <div className={styles.connect}>
          <p className={styles.annot}>If that sounds like your team →</p>
          <a
            className={styles.connectLink}
            href="https://www.linkedin.com/in/soniaspecialist/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Connect with Sonia on LinkedIn
            <span aria-hidden="true"> ↗</span>
            <span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        </div>
      </section>

      <footer className={styles.colophon}>
        <span>Source: Sonia’s public professional profile. Text in quotation marks is hers, verbatim; headings, annotations and framing are editorial.</span>
        <span>Plate I · more plates to follow</span>
      </footer>
    </main>
  );
}
