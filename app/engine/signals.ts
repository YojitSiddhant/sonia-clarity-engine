/**
 * Evidence matrix for the signal plate.
 *
 * Every `quote` is transcribed verbatim from Sonia's profile screenshots.
 * `excerpt: true` means the quote is a trimmed portion of a longer line
 * (rendered with an ellipsis and an "Excerpt" label). Titles and `reading`
 * text are editorial and are never shown inside quotation marks.
 *
 * Deliberately avoided (see audit): placeholder metrics ("$X million"),
 * date-conflicted metrics, "x yrs y mos" durations, and repeating one quote
 * across several signals/pairs where a distinct source exists.
 */

export type SignalId = "brand" | "messaging" | "people" | "operations";

export type Source = {
  quote: string;
  excerpt?: boolean;
  section: "About" | "Experience";
  /** role · organisation · dates, exactly as listed (Experience only) */
  where?: string;
};

export type Signal = {
  id: SignalId;
  label: string;
  /** From About: "how brand affects revenue, how messaging affects conversion…" */
  affects: string;
  verb: "affects" | "affect";
  index: string;
  pos: { x: number; y: number }; // percent of the plate
  source: Source;
};

export const SIGNALS: Signal[] = [
  {
    id: "brand",
    label: "Brand",
    affects: "revenue",
    verb: "affects",
    index: "S.01",
    pos: { x: 18, y: 18 },
    source: {
      quote:
        "Led marketing strategy and brand initiatives, creating clear growth direction and measurable outcomes.",
      section: "Experience",
      where: "Fractional CMO · Datt Mediproducts Pvt. Ltd. · Apr 2020 – Present",
    },
  },
  {
    id: "messaging",
    label: "Messaging",
    affects: "conversion",
    verb: "affects",
    index: "S.02",
    pos: { x: 82, y: 18 },
    source: {
      quote:
        "Supporting AYU Lifescience as a retained marketing lead for product communication, website development, and strategic alignment.",
      section: "Experience",
      where: "Fractional Marketing Lead · AYU Lifescience · Apr 2025 – Present",
    },
  },
  {
    id: "people",
    label: "People",
    affects: "everything",
    verb: "affect",
    index: "S.03",
    pos: { x: 18, y: 82 },
    source: {
      quote:
        "Built an entire new division JMC (Jaipur Marketing Center) of 15 team members and oversaw the entire hiring process",
      excerpt: true,
      section: "Experience",
      where:
        "Director – Demand Gen, Marketing & Sales Operations · Appirio · Jan 2015 – Dec 2015",
    },
  },
  {
    id: "operations",
    label: "Operations",
    affects: "execution",
    verb: "affect",
    index: "S.04",
    pos: { x: 82, y: 82 },
    source: {
      quote:
        "Built frameworks and processes that improved team alignment, execution speed, and decision-making across functions.",
      section: "Experience",
      where: "Fractional CMO · Datt Mediproducts Pvt. Ltd. · Apr 2020 – Present",
    },
  },
];

/**
 * direct       — the quoted wording itself names both signals.
 * interpretive — the source covers both topics; joining them is our reading.
 * open         — no fair support in the references; shown as unconfirmed.
 */
export type Evidence = "direct" | "interpretive" | "open";

export type Connection = {
  pair: [SignalId, SignalId];
  evidence: Evidence;
  title: string;
  /** Editorial explanation, required for interpretive and open lines. */
  reading?: string;
  source: Source | null;
};

export const pairKey = (a: SignalId, b: SignalId) => [a, b].sort().join("+");

export const CONNECTIONS: Connection[] = [
  {
    pair: ["brand", "messaging"],
    evidence: "direct",
    title: "A brand is only as clear as what it says",
    source: {
      quote:
        "Developed frameworks that clarified messaging, strengthened brand presence, and improved market reach.",
      section: "Experience",
      where: "Vice President Product Marketing · Lasersec Technologies (LT) · Feb 2021 – Present",
    },
  },
  {
    pair: ["brand", "people"],
    evidence: "direct",
    title: "Teams who can see why the brand matters",
    source: {
      quote:
        "Mentored teams to understand the connection between brand, engagement, and growth impact.",
      section: "Experience",
      where: "Digital Marketing Director · RoundGlass · Apr 2019 – Apr 2020",
    },
  },
  {
    pair: ["brand", "operations"],
    evidence: "direct",
    title: "Brand goals and operating goals, set on one frame",
    source: {
      // The same bullet also appears under AYU Inc USA; attributed to one role only.
      quote:
        "Developed frameworks that aligned brand, marketing, and operational goals, ensuring clarity and purposeful execution across teams.",
      section: "Experience",
      where: "Chief Marketing & Operations Advisor · Celestial AI · May 2025 – Present",
    },
  },
  {
    pair: ["messaging", "people"],
    evidence: "interpretive",
    title: "A shared approach, not a proven link",
    reading:
      "She names communication and team leadership together as things she approaches the same way: understanding them deeply and fixing them from the root. Her profile shows a common method here, not that one drives the other.",
    source: {
      quote:
        "That’s how I approach brand, demand, communication, and team leadership too.",
      section: "About",
    },
  },
  {
    pair: ["messaging", "operations"],
    evidence: "interpretive",
    title: "The message, and the machinery that delivers it",
    reading:
      "Email campaigns are messaging; Marketo and Salesforce.com CRM are the operating systems that carry them. The line covers both, but treating it as a link between the two is our reading.",
    source: {
      quote:
        "Executed email marketing campaigns for lead nurturing through Marketo & Salesforce.com CRM campaigns",
      excerpt: true,
      section: "Experience",
      where:
        "Senior Manager – Demand Generation & Marketing Automation · ShowMeLeads Inc · Jan 2014 – Jul 2014",
    },
  },
  {
    pair: ["people", "operations"],
    evidence: "direct",
    title: "From fragmented teams to aligned ones",
    source: {
      quote:
        "Built frameworks and processes that transformed fragmented teams into aligned, confident growth engines, increasing operational efficiency and reducing bottlenecks.",
      section: "Experience",
      where: "Chief Marketing Officer · [i-SmokeStack] · Mar 2020 – Present",
    },
  },
];

export const CONNECTION_BY_KEY = new Map(
  CONNECTIONS.map((c) => [pairKey(c.pair[0], c.pair[1]), c]),
);

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  direct: "Direct",
  interpretive: "Interpretive",
  open: "Open",
};
