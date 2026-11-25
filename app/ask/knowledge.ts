/**
 * Retrieval for "Ask the Clarity Engine".
 *
 * The knowledge base is built at runtime from the app's existing curated
 * data only — the signal plate (app/engine/signals.ts) and the Field Log
 * (app/fieldlog/entries.ts). Nothing is duplicated or re-transcribed here.
 * Open pairs (no source) are excluded; interpretive pairs keep their
 * "editorial reading" label so the model can't present them as fact.
 */

import { SIGNALS, CONNECTIONS, CORE_NOTES } from "../engine/signals";
import { ENTRIES, SECTION, PRESENT_STOP, type Entry, type Lane } from "../fieldlog/entries";

export type Evidence = "direct" | "interpretive" | "record";

export type SourceDoc = {
  id: string;
  /** Profile section shown in the citation (Experience, About, Awards…) */
  section: string;
  /** role · organisation · dates, when the source has them */
  where?: string;
  /** Exact source wording, or the dated record as listed */
  text: string;
  /** Editorial reading attached to an interpretive pair (never a quote) */
  reading?: string;
  evidence: Evidence;
  /** Topic words used only for matching */
  tags: string[];
  /** Field Log entry, for year questions */
  entry?: Entry;
};

const label = (id: string) => SIGNALS.find((s) => s.id === id)?.label ?? id;

/**
 * Her name, exactly as the profile shows it (SONIA-INFO/SERVICES:
 * "Soniaa S."). Nothing beyond that line is claimed.
 */
const PROFILE_NAME: SourceDoc = {
  id: "profile:name",
  section: "Services",
  text: "Soniaa S.",
  evidence: "direct",
  // No bare "name" tag: "Name the companies…" is not an identity question.
  // Name questions reach this through IDENTITY below.
  tags: ["identity", "person", "profile", "founder"],
};

function build(): SourceDoc[] {
  const docs: SourceDoc[] = [PROFILE_NAME];

  for (const s of SIGNALS) {
    docs.push({
      id: `signal:${s.id}`,
      section: s.source.section,
      where: s.source.where,
      text: s.source.quote,
      evidence: "direct",
      tags: [s.label, s.affects ?? "", "example"],
    });
  }

  for (const c of CONNECTIONS) {
    if (!c.source || c.evidence === "open") continue; // no source: never cited
    docs.push({
      id: `pair:${c.pair[0]}+${c.pair[1]}`,
      section: c.source.section,
      where: c.source.where,
      text: c.source.quote,
      reading: c.evidence === "interpretive" ? c.reading : undefined,
      evidence: c.evidence === "interpretive" ? "interpretive" : "direct",
      tags: [label(c.pair[0]), label(c.pair[1]), "connect", "connection", "link"],
    });
  }

  CORE_NOTES.forEach((n, i) =>
    docs.push({
      id: `core:${i}`,
      section: n.source.split(" · ")[0],
      where: n.source.includes(" · ") ? n.source.split(" · ").slice(1).join(" · ") : undefined,
      text: n.gloss ? `${n.quote} (${n.gloss})` : n.quote,
      evidence: "direct",
      tags: ["method", "approach", "root", "clarity", "simple", "simplicity", "think"],
    }),
  );

  for (const e of ENTRIES) {
    docs.push({
      id: `log:${e.id}`,
      section: SECTION[e.lane],
      text: `${e.title} · ${e.org} · ${e.dates}${e.note ? ` (note: ${e.note})` : ""}`,
      evidence: "record",
      tags: [e.lane, e.lane === "recognition" ? "award awards" : "", e.lane === "work" ? "role roles job career" : ""],
      entry: e,
    });
  }
  return docs;
}

export const KNOWLEDGE: SourceDoc[] = build();
export const KNOWLEDGE_BY_ID = new Map(KNOWLEDGE.map((d) => [d.id, d]));

// ── retrieval ──────────────────────────────────────────────────────

const STOP = new Set(
  "a an and are as at be by can did do does for from has have her how in is it its of on or she sonia's sonia soniaa's soniaa show shows tell the their this to was what when where which who why with about around her's me".split(
    " ",
  ),
);

/** Question words → topic words that appear in the curated data. */
const EXPAND: Record<string, string[]> = {
  marketing: ["brand", "messaging", "demand", "marketing"],
  team: ["people", "team", "teams", "leadership", "mentored"],
  teams: ["people", "team", "teams", "leadership", "mentored"],
  people: ["people", "team", "teams"],
  leadership: ["people", "leader", "leadership", "mentored"],
  leader: ["people", "leader", "leadership", "mentored"],
  lead: ["people", "led", "leader"],
  hiring: ["people", "hiring"],
  build: ["built", "building"],
  building: ["built", "building"],
  operations: ["operations", "operational", "processes", "execution"],
  ops: ["operations", "operational"],
  process: ["processes", "frameworks", "operations"],
  communication: ["messaging", "communication"],
  content: ["messaging", "content"],
  leads: ["demand", "lead", "leads", "funnel"],
  pipeline: ["demand", "lead", "funnel"],
  sales: ["sales", "demand"],
  research: ["insight", "market", "data"],
  data: ["insight", "data", "analyzed"],
  market: ["insight", "market"],
  award: ["recognition", "award"],
  awards: ["recognition", "award"],
  recognition: ["recognition", "award"],
  volunteer: ["volunteering"],
  volunteering: ["volunteering"],
  education: ["education", "study"],
  study: ["education"],
  degree: ["education"],
  mba: ["education", "mba"],
  method: ["method", "root", "clarity"],
  approach: ["approach", "method", "root"],
  // where she works, however it is phrased
  work: ["work", "role"],
  works: ["work", "role"],
  worked: ["work", "role"],
  working: ["work", "role"],
  employed: ["work", "role"],
  employer: ["work", "role"],
  employers: ["work", "role"],
  job: ["work", "role"],
  jobs: ["work", "role"],
  position: ["work", "role"],
  positions: ["work", "role"],
  company: ["work", "role"],
  companies: ["work", "role"],
};

/** "now", "currently", "these days"… */
const CURRENT = /\b(?:current(?:ly)?|now|presently|today|these\s+days|at\s+present|at\s+the\s+moment)\b/i;

/**
 * A question about where she works *now*: every work record whose listed
 * dates end in "Present", and nothing else. Being listed as Present is the
 * only evidence of "current" the profile gives.
 */
export function isCurrentWorkQuestion(question: string): boolean {
  if (!CURRENT.test(question)) return false;
  return words(question).some((w) => (EXPAND[w] ?? []).includes("work") || w === "role" || w === "roles");
}

/**
 * Split a compound question into the separate things it asks
 * ("What is her age and currently where is she working?" → two parts).
 * Only splits where a new question clearly starts, so "marketing and
 * operations" stays one topic.
 */
export function splitQuestion(question: string): string[] {
  const parts = question
    .split(
      /\s*(?:[?;]|,?\s+\b(?:and|also|plus)\b)\s+(?=(?:(?:currently|now|also)\s+)?(?:what|what['’]s|where|where['’]s|who|who['’]s|when|which|how|is|are|was|were|does|do|did|has|have|tell|can|could)\b)/i,
    )
    .map((p) => p.trim().replace(/^(?:and|also|plus)\s+/i, "").trim())
    .filter((p) => p.replace(/[^a-z0-9]/gi, "").length > 1);
  return parts.length ? parts : [question];
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/**
 * Questions about who she is ("What's her name?", "What is the name of the
 * user?", "Who is the founder?"). Deliberately narrow: "user" or "name"
 * alone elsewhere in a question does not count.
 */
const IDENTITY =
  /\b(?:(?:her|soniaa?(?:['’]s)?)\s+name|name\s+of\s+(?:the\s+)?(?:user|person|founder|profile(?:\s+owner)?|soniaa?)|who\s*(?:is|['’]s)\s+(?:she|soniaa?|the\s+(?:user|person|founder|profile\s+owner))\b)/i;

const titleWords = (d: SourceDoc) => (d.entry ? words(`${d.entry.title} ${d.entry.org}`) : []);

/** How many dated records each title/organisation word appears in. */
const RECORD_FREQ = new Map<string, number>();
for (const d of KNOWLEDGE) for (const w of new Set(titleWords(d))) RECORD_FREQ.set(w, (RECORD_FREQ.get(w) ?? 0) + 1);
/** A word naming three or fewer records ("appirio", "founder") is distinctive. */
const DISTINCTIVE_MAX = 3;

const activeIn = (e: Entry, year: number) => {
  if (!e.end) return e.start.y === year;
  const endY = e.end === "present" ? Infinity : e.end.y;
  return e.start.y <= year && year <= endY;
};

const MAX_DOCS = 8;
const MAX_YEAR_DOCS = 12;

/** A small set of the entries most relevant to the question. */
/**
 * Questions that ask for a whole list ("What awards…", "Where did she
 * volunteer…", "What did she study…") map to one Field Log lane.
 */
export function listLane(question: string): Lane | null {
  if (/\b(award|awards|recognition|honou?rs?)\b/i.test(question)) return "recognition";
  if (/\bvolunteer(ing)?\b/i.test(question)) return "volunteering";
  if (/\b(education|study|studied|degree|mba|university)\b/i.test(question)) return "education";
  return null;
}

export function retrieve(question: string): SourceDoc[] {
  // Year questions ("around 2020", "in 2016") read the Field Log directly.
  const years = [...question.matchAll(/\b(20[0-2]\d)\b/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 2002 && y < PRESENT_STOP);
  if (years.length) {
    const y = years[0];
    const near = /around|about|near|circa/i.test(question) ? [y - 1, y, y + 1] : [y];
    return KNOWLEDGE.filter((d) => d.entry && near.some((n) => activeIn(d.entry!, n)))
      .sort((a, b) => Number(!!b.entry && b.entry.start.y === y) - Number(!!a.entry && a.entry.start.y === y))
      .slice(0, MAX_YEAR_DOCS);
  }

  // "Where does she work now?": the roles listed as Present.
  if (isCurrentWorkQuestion(question)) {
    return KNOWLEDGE.filter((d) => d.entry?.lane === "work" && d.entry.end === "present").slice(0, MAX_YEAR_DOCS);
  }

  // "What awards / volunteering / study…" asks for a whole lane: return all of it.
  const lane = listLane(question);
  if (lane) return KNOWLEDGE.filter((d) => d.entry?.lane === lane).slice(0, MAX_YEAR_DOCS);

  const q = words(question);
  const terms = new Set(q.flatMap((w) => [w, ...(EXPAND[w] ?? [])]));
  if (IDENTITY.test(question)) terms.add("identity");
  if (!terms.size) return [];

  const scored = KNOWLEDGE.map((d) => {
    const hay = words(`${d.text} ${d.where ?? ""} ${d.section} ${d.tags.join(" ")}`);
    const tagHay = new Set(words(d.tags.join(" ")));
    let score = 0;
    for (const t of terms) {
      if (tagHay.has(t)) score += 3;
      else if (hay.includes(t)) score += 1;
    }
    // Quotes explain how she works; dated records only list facts.
    if (score && d.evidence !== "record") score += 1;
    // …but a record whose own title or organisation the question names
    // (a distinctive word like "appirio") is exactly what was asked for.
    if (d.entry) {
      const own = titleWords(d);
      if ([...terms].some((t) => own.includes(t) && (RECORD_FREQ.get(t) ?? 0) <= DISTINCTIVE_MAX)) score += 1;
    }
    return { d, score };
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_DOCS).map((x) => x.d);
}
