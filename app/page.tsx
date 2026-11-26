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
        <span className={styles.mastMid}>A closer look at my experience, thinking and approach to business</span>
        <span>Soniaa · Interactive Professional Profile</span>
      </header>

      {/* ── Observation ─────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="obs">
        <h1 id="obs" className={styles.headline}>
          I see the <span className={styles.strike}>bigger</span>{" "}
          <span className={styles.mark}>picture.</span>
        </h1>
        <p className={styles.sub}>
          I bring the pieces together.
          <br />
          This is a closer look at how I think, work and connect different
          parts of a business.
        </p>
      </section>

      {/* ── Hypothesis ──────────────────────────────── */}
      <section className={styles.hypothesis} aria-labelledby="hyp">
        <div className={styles.hypText}>
          <h2 id="hyp" className={styles.h2}>
            More than individual capabilities.{" "}
            <em>A connected business perspective.</em>
          </h2>
          <blockquote className={styles.verbatim}>
            “my strength isn’t just one skill or expertise but it lies in
            seeing the whole picture”
            <cite>Soniaa, About</cite>
          </blockquote>
          <p className={styles.body}>
            I believe business challenges rarely exist in isolation. Across
            global companies, early-stage teams and growing startups, my role
            has been the same everywhere:{" "}
            <strong>“bringing clarity, connecting the dots, and making the work
            simpler, purposeful, and aligned.”</strong>
          </p>
        </div>

        <figure className={styles.ledger} aria-label="Four business areas and what each affects">
          <figcaption className={styles.figcap}>
            Fig. 1 — Four connections, in my own words
          </figcaption>
          <ol>
            {SIGNALS.filter((s) => s.affects).map((s, i) => (
              <li key={s.id}>
                <span className={styles.ledgerIdx}>{i + 1}</span>
                <span className={styles.ledgerFrom}>{s.label.toLowerCase()}</span>
                <span className={styles.ledgerArrow} aria-hidden="true" />
                <span className={styles.ledgerTo}>{s.affects}</span>
              </li>
            ))}
          </ol>
          <p className={styles.ledgerNote}>
            “how people affect <u>everything</u>” — the one connection with no
            limit.
          </p>
        </figure>
      </section>

      {/* ── Experiment ──────────────────────────────── */}
      <section className={styles.experiment} aria-labelledby="exp">
        <div className={styles.expHead}>
          <h2 id="exp" className={styles.h2}>
            Explore the connections.
          </h2>
          <p className={styles.body}>
            Select any two business areas to see how they relate and how my
            experience brings them together. Each line shows how clearly my
            profile supports the connection: solid for direct, dashed for
            interpretive, dotted for independent. Six business areas. Fifteen
            possible connections. One integrated perspective.
          </p>
        </div>
        <SignalPlate />
      </section>

      {/* ── Ask ─────────────────────────────────────── */}
      <section className={styles.ask} aria-labelledby="ask">
        <div className={styles.expHead}>
          <h2 id="ask" className={styles.h2}>
            Have a question about my experience? <em>Ask me.</em>
          </h2>
          <p className={styles.body}>
            The AI-powered Clarity Engine lets you explore my background in
            your own words: my leadership approach, marketing, operations,
            team development, career journey or awards. Each answer is short
            and shows the profile information it comes from. If a detail isn’t
            in my profile, it will say so rather than guess.
          </p>
        </div>
        <AskEngine />
      </section>

      {/* ── Field log ───────────────────────────────── */}
      <section className={styles.fieldlog} aria-labelledby="log">
        <div className={styles.expHead}>
          <h2 id="log" className={styles.h2}>
            A career built across <em>multiple dimensions.</em>
          </h2>
          <p className={styles.body}>
            My journey combines leadership roles, consulting, education, awards
            and volunteering, and several have run at the same time. Move
            through the years to see the roles and commitments listed for each
            period, with dates exactly as they appear in my profile.
          </p>
        </div>
        <FieldLog />
      </section>

      {/* ── Result ──────────────────────────────────── */}
      <section className={styles.result} aria-labelledby="res">
        <h2 id="res" className={styles.resultLine}>
          <span>I bring structure, clarity</span>
          <span className={styles.resultStrike}>and confidence to teams.</span>
        </h2>
        <p className={styles.body}>
          My focus is on helping businesses identify what matters, align
          their teams, simplify complexity and turn ideas into meaningful
          outcomes.
        </p>
        <p className={styles.closing}>
          “I’m always open to connecting with people who are building,
          learning, or growing — and want marketing that feels clear,
          meaningful, and human.”
        </p>
        <div className={styles.connect}>
          <p className={styles.annot}>Let’s connect and explore possibilities →</p>
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
        <span>Built from my professional profile. Text in quotation marks is my own wording; summaries and connections are editorial.</span>
        <span>Interactive business map, AI-assisted questions and a career timeline.</span>
      </footer>
    </main>
  );
}
