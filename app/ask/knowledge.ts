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

function build(): SourceDoc[] {
  const docs: SourceDoc[] = [];

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
};

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

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

  // "What awards / volunteering / study…" asks for a whole lane: return all of it.
  const lane = listLane(question);
  if (lane) return KNOWLEDGE.filter((d) => d.entry?.lane === lane).slice(0, MAX_YEAR_DOCS);

  const q = words(question);
  const terms = new Set(q.flatMap((w) => [w, ...(EXPAND[w] ?? [])]));
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
    return { d, score };
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, MAX_DOCS).map((x) => x.d);
}
