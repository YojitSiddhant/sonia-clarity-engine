/**
 * Every quoted line below is transcribed verbatim from Sonia's profile
 * screenshots (About + Experience). The framing words ("reading", the
 * connection titles) are editorial; the evidence is not invented.
 */

export type SignalId = "brand" | "messaging" | "operations" | "people";

export type Source = {
  quote: string;
  where: string; // role · organisation · dates, exactly as listed
};

export type Signal = {
  id: SignalId;
  label: string;
  /** From About: "how brand affects revenue, how messaging affects conversion…" */
  affects: string;
  index: string;
  pos: { x: number; y: number }; // percent of the plate
  source: Source;
};

export const SIGNALS: Signal[] = [
  {
    id: "brand",
    label: "Brand",
    affects: "revenue",
    index: "S.01",
    pos: { x: 18, y: 18 },
    source: {
      quote:
        "Developed frameworks that clarified messaging, strengthened brand presence, and improved market reach.",
      where: "Vice President Product Marketing · Lasersec Technologies · Feb 2021 – Present",
    },
  },
  {
    id: "messaging",
    label: "Messaging",
    affects: "conversion",
    index: "S.02",
    pos: { x: 82, y: 18 },
    source: {
      quote:
        "Developed innovative lead scoring models, compelling offers, and lead nurturing campaigns to drive the funnel from prospect to lead to customer and improve conversion rate through the funnel.",
      where: "Senior Manager – Demand Generation & Marketing Automation · ShowMeLeads Inc · Jan 2014 – Jul 2014",
    },
  },
  {
    id: "operations",
    label: "Operations",
    affects: "execution",
    index: "S.03",
    pos: { x: 82, y: 82 },
    source: {
      quote:
        "Built frameworks and processes that improved team alignment, execution speed, and decision-making across functions.",
      where: "Fractional CMO · Datt Mediproducts Pvt. Ltd. · Apr 2020 – Present",
    },
  },
  {
    id: "people",
    label: "People",
    affects: "everything",
    index: "S.04",
    pos: { x: 18, y: 82 },
    source: {
      quote:
        "Built an entire new division JMC (Jaipur Marketing Center) of 15 team members and oversaw the entire hiring process, from short-listing and finalizing candidates to creating and implementing a well designed training program for the new joiners.",
      where: "Director – Demand Gen, Marketing & Sales Operations · Appirio · Jan 2015 – Dec 2015",
    },
  },
];

export type Connection = {
  pair: [SignalId, SignalId];
  title: string;
  source: Source;
};

export const pairKey = (a: SignalId, b: SignalId) => [a, b].sort().join("+");

export const CONNECTIONS: Connection[] = [
  {
    pair: ["brand", "messaging"],
    title: "A brand is only as clear as what it says",
    source: SIGNALS[0].source,
  },
  {
    pair: ["brand", "operations"],
    title: "Brand goals and operating goals, set on one frame",
    source: {
      quote:
        "Developed frameworks that aligned brand, marketing, and operational goals, ensuring clarity and purposeful execution across teams.",
      where: "Chief Marketing & Operations Advisor · Celestial AI · May 2025 – Present",
    },
  },
  {
    pair: ["brand", "people"],
    title: "Teams who can see why the brand matters",
    source: {
      quote:
        "Mentored teams to understand the connection between brand, engagement, and growth impact.",
      where: "Digital Marketing Director · RoundGlass · Apr 2019 – Apr 2020",
    },
  },
  {
    pair: ["messaging", "operations"],
    title: "A message has to land somewhere ready to act on it",
    source: {
      quote:
        "Worked closely with Marketing Operations and Sales to ensure generated leads are high quality and being acted on appropriately.",
      where: "Head of Marketing and Sales · Creaform Inc. · Sep 2010 – Jun 2013",
    },
  },
  {
    pair: ["messaging", "people"],
    title: "Seeing the bigger picture before saying anything",
    source: {
      quote:
        "Guided product and marketing teams to see the bigger picture and connect initiatives across global markets.",
      where: "Vice President Product Marketing · Lasersec Technologies · Feb 2021 – Present",
    },
  },
  {
    pair: ["operations", "people"],
    title: "From fragmented teams to aligned ones",
    source: {
      quote:
        "Built frameworks and processes that transformed fragmented teams into aligned, confident growth engines, increasing operational efficiency and reducing bottlenecks.",
      where: "Chief Marketing Officer · i-SmokeStack · Mar 2020 – Present",
    },
  },
];

export const CONNECTION_BY_KEY = new Map(
  CONNECTIONS.map((c) => [pairKey(c.pair[0], c.pair[1]), c]),
);
