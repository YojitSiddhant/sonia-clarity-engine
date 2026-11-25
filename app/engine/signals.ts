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

export type SignalId =
  | "brand"
  | "messaging"
  | "people"
  | "operations"
  | "demand"
  | "insight";

export type Source = {
  quote: string;
  /** trimmed at the end (…) */
  excerpt?: boolean;
  /** trimmed at the start (…) */
  excerptStart?: boolean;
  section: "About" | "Experience" | "Awards";
  /** role · organisation · dates, exactly as listed (Experience only) */
  where?: string;
};

export type Signal = {
  id: SignalId;
  label: string;
  /**
   * From About: "how brand affects revenue, how messaging affects conversion…".
   * Only the four original signals have this; added signals use `descriptor`.
   */
  affects?: string;
  verb?: "affects" | "affect";
  descriptor?: string;
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
    pos: { x: 16, y: 30 },
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
    pos: { x: 84, y: 30 },
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
    pos: { x: 16, y: 70 },
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
    pos: { x: 84, y: 70 },
    source: {
      quote:
        "Built frameworks and processes that improved team alignment, execution speed, and decision-making across functions.",
      section: "Experience",
      where: "Fractional CMO · Datt Mediproducts Pvt. Ltd. · Apr 2020 – Present",
    },
  },
  {
    id: "demand",
    label: "Demand Generation",
    descriptor: "From her roles",
    index: "S.05",
    pos: { x: 50, y: 10 },
    source: {
      quote:
        "Created and drove lead nurturing strategies to convert existing prospects in the database to sales qualified leads.",
      section: "Experience",
      where: "Head of Marketing and Sales · Creaform Inc. · Sep 2010 – Jun 2013",
    },
  },
  {
    id: "insight",
    label: "Market Insight",
    descriptor: "From her roles",
    index: "S.06",
    pos: { x: 50, y: 90 },
    source: {
      // Same bullet also appears under the India role; it continues with
      // "Took strategic actions to improve company RO." (unclear), so it is cut here.
      quote:
        "Analyzed prospect, customer, and market data and shaped into actionable information.",
      excerpt: true,
      section: "Experience",
      where:
        "Marketing and Communication Manager – Asia · FARO Technologies · Apr 2009 – Aug 2010",
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
  /** Editorial explanation, required for interpretive lines. */
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
  {
    pair: ["demand", "brand"],
    evidence: "direct",
    title: "Brand work that also fills the pipeline",
    source: {
      quote:
        "Led marketing strategy and brand initiatives for early-stage startups and global teams, creating clear growth direction and measurable outcomes, including accelerating lead generation and improving campaign effectiveness.",
      section: "Experience",
      where: "Chief Marketing Officer · [i-SmokeStack] · Mar 2020 – Present",
    },
  },
  {
    pair: ["demand", "messaging"],
    evidence: "interpretive",
    title: "Offers and nurturing that move the funnel",
    reading:
      "Lead scoring and the funnel are demand generation; “compelling offers” and nurturing campaigns are what gets said along the way. Reading those as messaging is our interpretation, not her wording.",
    source: {
      quote:
        "Developed innovative lead scoring models, compelling offers, and lead nurturing campaigns to drive the funnel from prospect to lead to customer and improve conversion rate through the funnel.",
      section: "Experience",
      where:
        "Senior Manager – Demand Generation & Marketing Automation · ShowMeLeads Inc · Jan 2014 – Jul 2014",
    },
  },
  {
    pair: ["demand", "people"],
    evidence: "direct",
    title: "A demand engine is a team",
    source: {
      // Same sentence also appears under Director – Demand Generation & Sales (2016).
      quote:
        "Lead a team of 20+ marketing professionals focused on digital marketing, demand marketing, marketing operations, web, account development, and sales development.",
      excerpt: true,
      section: "Experience",
      where:
        "Vice President Global Sales Marketing · Lasersec Technologies (LT) · Dec 2016 – Jul 2018",
    },
  },
  {
    pair: ["demand", "operations"],
    evidence: "direct",
    title: "Leads are only as good as what happens next",
    source: {
      quote:
        "Worked closely with Marketing Operations and Sales to ensure generated leads are high quality and being acted on appropriately.",
      section: "Experience",
      where: "Head of Marketing and Sales · Creaform Inc. · Sep 2010 – Jun 2013",
    },
  },
  {
    pair: ["insight", "demand"],
    evidence: "interpretive",
    title: "Reading the market before filling the pipeline",
    reading:
      "The line names market and product insight, and customer acquisition. It doesn’t use the words demand generation; treating customer acquisition as demand work is our reading.",
    source: {
      quote:
        "Translated complex market and product insights into actionable strategies that drove engagement, visibility, and customer acquisition.",
      section: "Experience",
      where: "Fractional CMO · Datt Mediproducts Pvt. Ltd. · Apr 2020 – Present",
    },
  },
  {
    pair: ["insight", "brand"],
    evidence: "interpretive",
    title: "Positioning starts with the competitive picture",
    reading:
      "A competitive SWOT analysis is market insight; positioning in the market is brand work. The line covers both, but joining them is our reading.",
    source: {
      quote: "to do a Competitive SWOT Analysis and positioning in the market.",
      excerptStart: true,
      section: "Experience",
      where: "Marketing Specialist · Bosch · Nov 2006 – May 2008",
    },
  },
  {
    pair: ["insight", "messaging"],
    evidence: "interpretive",
    title: "What the data says, and what the sales team says",
    reading:
      "In the same FARO role she lists analysing prospect, customer and market data alongside building the sales toolkit below. She doesn’t connect the two herself; placing them side by side is our reading.",
    source: {
      quote:
        "Developed & maintained Sales Toolkit, including sales presentations, fact sheets, data sheets, case studies & white papers.",
      excerpt: true,
      section: "Experience",
      where:
        "Marketing and Communication Manager – Asia · FARO Technologies · Apr 2009 – Aug 2010",
    },
  },
  {
    pair: ["insight", "operations"],
    evidence: "interpretive",
    title: "Insight that runs on the operating tools",
    reading:
      "Trend analysis is insight; Eloqua and Google Analytics are operating systems for marketing. The line covers both, but treating it as a link between them is our reading.",
    source: {
      quote: "Analyzed daily trends through Eloqua Email Marketing and Google Analytics.",
      section: "Experience",
      where: "Marketing Specialist · Bosch · Nov 2006 – May 2008",
    },
  },
  {
    pair: ["insight", "people"],
    evidence: "open",
    // No source relates these two; the plate shows each signal's own example instead.
    title: "Two notes from her profile",
    source: null,
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

/**
 * The clarity core: Sonia's method, not a pairable signal.
 * Each note is verbatim and carries its own source.
 */
export const CORE_NOTES: { quote: string; source: string; gloss?: string }[] = [
  {
    quote:
      "I’ve always been the kind of person who likes to understand things deeply and fix them from the root.",
    source: "About",
  },
  {
    quote: "I don’t believe in complicating things.",
    source: "About",
  },
  {
    quote: "Best COSR Expert - 2017",
    gloss: "COSR - Challenges, Obstacles and taken Steps, and showcased Results",
    source: "Awards · Issued by Lasersec Technologies Pvt. Ltd. · Oct 2017",
  },
];
