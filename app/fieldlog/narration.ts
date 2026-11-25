/**
 * Optional spoken narration for Field Log playback.
 *
 * Sentences are built only from ENTRIES (transcribed from Sonia's profile
 * screenshots). For each year it names what *starts* that year (new roles,
 * study, volunteering) and awards issued that year, then says how many
 * roles are listed concurrently. It never explains why, never links
 * entries, and stays silent for years where nothing new is listed.
 *
 * Speech uses the browser's built-in Speech Synthesis API only.
 */

import { ENTRIES, PRESENT_STOP, type Entry } from "./entries";

/**
 * Most work roles active in the same month of `year` — true overlap, so two
 * roles that merely share a calendar year aren't called concurrent.
 */
export function maxOverlap(year: number) {
  const m = (y: number, mo?: number) => y * 12 + ((mo ?? 1) - 1);
  let most = 0;
  for (let mo = 1; mo <= 12; mo++) {
    const now = m(year, mo);
    const n = ENTRIES.filter((e) => {
      if (e.lane !== "work" || !e.end) return false;
      const from = m(e.start.y, e.start.m);
      const to = e.end === "present" ? Infinity : m(e.end.y, e.end.m ?? 12);
      return from <= now && now <= to;
    }).length;
    most = Math.max(most, n);
  }
  return most;
}

// ── sentence building ─────────────────────────────────────────────

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => WORDS[n] ?? String(n);

/** Spoken form only — the on-screen text keeps the exact source wording. */
function speakable(text: string, year?: number) {
  let s = text;
  // "Best Leader - 2018" in 2018 → "Best Leader" (the year was just said).
  if (year !== undefined) s = s.replace(new RegExp(`\\s*-\\s*${year}$`), "");
  return s
    .replace(/^[A-Z][A-Z\s]+(?=\s*-|$)/, (m) => m.charAt(0) + m.slice(1).toLowerCase()) // all-caps titles
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s*\|\s*/g, " and ")
    .replace(/&/g, "and")
    .replace(/#(\d+)/g, "number $1")
    .replace(/[[\]]/g, "")
    .replace(/\s*\(LT\)/g, "")
    .replace(/\.$/, "") // "Inc." / "Pvt. Ltd." — the sentence adds its own stop
    .replace(/\bB\.E,/g, "B.E.,")
    .replace(/\bSr\./g, "Senior");
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`;
}

const role = (e: Entry) =>
  e.org === "Self-employed"
    ? `${speakable(e.title)}, self-employed`
    : `${speakable(e.title)}, at ${speakable(e.org)}`;

const byStart = (a: Entry, b: Entry) =>
  a.start.y * 12 + (a.start.m ?? 1) - (b.start.y * 12 + (b.start.m ?? 1));

/** One short sentence for a year, or null when nothing new is listed. */
export function sentenceFor(year: number): string | null {
  if (year === PRESENT_STOP) {
    const work = ENTRIES.filter((e) => e.lane === "work" && e.end === "present").length;
    const vol = ENTRIES.filter((e) => e.lane === "volunteering" && e.end === "present").length;
    return `Present. ${count(work)} roles and ${count(vol)} volunteer commitments are listed as present, at the same time.`.replace(
      /^Present\. (\w)/,
      (_, c) => `Present. ${c.toUpperCase()}`,
    );
  }

  const starts = (lane: Entry["lane"]) =>
    ENTRIES.filter((e) => e.lane === lane && e.end && e.start.y === year).sort(byStart);
  const work = starts("work");
  const study = starts("education");
  const vol = starts("volunteering");
  const awards = ENTRIES.filter((e) => e.lane === "recognition" && e.start.y === year).sort(byStart);
  if (!work.length && !study.length && !vol.length && !awards.length) return null;

  const parts: string[] = [];
  if (work.length)
    parts.push(`${work.length === 1 ? "a role begins" : `${count(work.length)} roles begin`}: ${listJoin(work.map(role))}`);
  if (study.length)
    parts.push(`study begins: ${listJoin(study.map((e) => `${speakable(e.title)}, at ${speakable(e.org)}`))}`);
  if (vol.length)
    parts.push(`volunteering begins: ${listJoin(vol.map((e) => `${speakable(e.title)}, with ${speakable(e.org)}`))}`);
  if (awards.length)
    parts.push(
      `${awards.length === 1 ? "an award is listed" : `${count(awards.length)} awards are listed`}: ${listJoin(
        awards.map((e) => speakable(e.title, year)),
      )}`,
    );

  let text = `${year}. ${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(". ")}.`;

  const overlap = maxOverlap(year);
  if (overlap > 1)
    text += ` In this year, up to ${count(overlap)} roles are listed at the same time.`;
  return text;
}

// ── speech ────────────────────────────────────────────────────────

export type Narrator = {
  /** Resolves false when speech or a voice isn't available. */
  ready: () => Promise<boolean>;
  /** Speak one sentence (cancelling anything else); `done` runs once it ends. */
  say: (text: string, done: () => void) => void;
  /** Stop immediately and drop anything queued. */
  cancel: () => void;
};

// Clear, natural voices commonly found on macOS/iOS, Chrome and Windows.
const CLEAR_VOICES = [
  "Daniel", "Samantha", "Karen", "Moira", "Tessa", "Rishi", "Serena", "Kate", "Oliver", "Alex",
  "Google UK English", "Google US English",
  "Microsoft Sonia", "Microsoft Libby", "Microsoft Ryan", "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy",
];
// macOS novelty/character voices: never used for narration.
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/;

export function createNarrator(): Narrator {
  const synth =
    typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  let voice: SpeechSynthesisVoice | null = null;
  let token = 0; // ignores callbacks from cancelled utterances
  let guard: ReturnType<typeof setTimeout> | undefined;

  const pickVoice = () => {
    const voices = synth?.getVoices() ?? [];
    const en = voices.filter(
      (v) => v.lang?.toLowerCase().startsWith("en") && !NOVELTY.test(v.name),
    );
    const want = (typeof navigator !== "undefined" ? navigator.language : "en-GB").toLowerCase();
    const rank = (v: SpeechSynthesisVoice) => {
      const i = CLEAR_VOICES.findIndex((n) => v.name.startsWith(n));
      return (
        (i === -1 ? 100 : i) - // known clear, natural voices first
        (v.lang.toLowerCase() === want ? 50 : 0) - // then the visitor's own English
        (v.localService ? 5 : 0)
      );
    };
    voice = [...en].sort((a, b) => rank(a) - rank(b))[0] ?? null;
    return voice;
  };

  const ready = () =>
    new Promise<boolean>((resolve) => {
      try {
        if (!synth || typeof SpeechSynthesisUtterance === "undefined") return resolve(false);
        if (pickVoice()) return resolve(true);
        // Some browsers load voices asynchronously.
        const onVoices = () => {
          synth.removeEventListener("voiceschanged", onVoices);
          clearTimeout(wait);
          resolve(!!pickVoice());
        };
        const wait = setTimeout(() => {
          synth.removeEventListener("voiceschanged", onVoices);
          resolve(!!pickVoice());
        }, 1500);
        synth.addEventListener("voiceschanged", onVoices);
      } catch {
        resolve(false);
      }
    });

  const cancel = () => {
    token++;
    clearTimeout(guard);
    try {
      synth?.cancel();
    } catch {
      /* nothing to cancel */
    }
  };

  const say = (text: string, done: () => void) => {
    cancel(); // never more than one utterance
    const mine = token;
    const finish = () => {
      if (mine !== token) return; // cancelled or superseded
      token++;
      clearTimeout(guard);
      done();
    };
    try {
      if (!synth) return finish();
      const u = new SpeechSynthesisUtterance(text);
      if (!voice) pickVoice(); // voices can arrive after the toggle
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      u.onend = finish;
      u.onerror = finish;
      // Safety net if a browser never fires `end`: ~0.45 s a word + slack.
      guard = setTimeout(finish, text.split(/\s+/).length * 450 + 4000);
      synth.speak(u);
    } catch {
      finish();
    }
  };

  return { ready, say, cancel };
}
