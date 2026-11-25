import styles from "./page.module.css";
import SignalPlate from "./engine/SignalPlate";
import FieldLog from "./fieldlog/FieldLog";
import AskEngine from "./ask/AskEngine";
import { SIGNALS } from "./engine/signals";

export default function Home() {
  return (
    <main className={styles.sheet}>
      <header className={styles.masthead}>
        <span>The Clarity Engine</span>
        <span className={styles.mastMid}>A closer look at Soniaa’s work, ideas, and experience</span>
        <span>Soniaa · Marketing &amp; Operations</span>
      </header>

      {/* ── Observation ─────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="obs">
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
          <h2 id="hyp" className={styles.h2}>
            Not one skill. <em>The whole picture.</em>
          </h2>
          <blockquote className={styles.verbatim}>
            “my strength isn’t just one skill or expertise but it lies in
            seeing the whole picture”
            <cite>Soniaa, About</cite>
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
            {SIGNALS.filter((s) => s.affects).map((s) => (
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

      {/* ── Ask ─────────────────────────────────────── */}
      <section className={styles.ask} aria-labelledby="ask">
        <div className={styles.expHead}>
          <h2 id="ask" className={styles.h2}>
            Have a question? <em>Ask it of her own record.</em>
          </h2>
          <p className={styles.body}>
            The Clarity Engine reads the same profile references as the plate
            above and answers in a few sentences, showing exactly where each
            answer comes from. If her profile doesn’t say, it will tell you.
          </p>
        </div>
        <AskEngine />
      </section>

      {/* ── Field log ───────────────────────────────── */}
      <section className={styles.fieldlog} aria-labelledby="log">
        <div className={styles.expHead}>
          <h2 id="log" className={styles.h2}>
            Not one path. <em>Several threads at once.</em>
          </h2>
          <p className={styles.body}>
            Her profile lists roles, study, awards and volunteering that often
            overlap. Move through the years to see what ran side by side,
            dated exactly as she lists it.
          </p>
        </div>
        <FieldLog />
      </section>

      {/* ── Result ──────────────────────────────────── */}
      <section className={styles.result} aria-labelledby="res">
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
            Connect with Soniaa on LinkedIn
            <span aria-hidden="true"> ↗</span>
            <span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        </div>
      </section>

      <footer className={styles.colophon}>
        <span>Built from Soniaa’s supplied professional profile. Quoted text is hers; summaries and connections are editorial.</span>
        <span>A clearer view of the work behind the titles.</span>
      </footer>
    </main>
  );
}
