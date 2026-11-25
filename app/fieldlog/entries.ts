/**
 * Fig. 3 — The Field Log: dated entries from Sonia's profile screenshots.
 *
 * Titles, organisations and `dates` strings are transcribed as shown.
 * "Present" is kept as listed (end: "present"); no end date is claimed.
 * Deliberately excluded: role descriptions (several are duplicated across
 * roles), all metrics, "x yrs y mos" durations, school entries,
 * certifications, services, languages, interests. No Causes screenshot exists.
 * Screenshot filenames are for auditability only and never rendered.
 */

export type Lane = "work" | "education" | "recognition" | "volunteering";

/** month is 1–12; omitted when the screenshot shows a year only */
export type When = { y: number; m?: number };

export type Entry = {
  id: string;
  lane: Lane;
  title: string;
  org: string;
  /** exactly as listed */
  dates: string;
  start: When;
  /** omitted for point events (awards) */
  end?: When | "present";
  /** discreet source note shown in the reading panel */
  note?: string;
};

export const SECTION: Record<Lane, string> = {
  work: "Experience",
  education: "Education",
  recognition: "Awards",
  volunteering: "Volunteering",
};

export const LANE_LABEL: Record<Lane, string> = {
  work: "Experience",
  education: "Education",
  recognition: "Awards",
  volunteering: "Volunteering",
};

export const ENTRIES: Entry[] = [
  // ── Work: SONIA-INFO/EXPERIENCE ─────────────────────────────
  // EXPERIENCE SONIA-1.png
  { id: "w-celestial", lane: "work", title: "Chief Marketing & Operations Advisor", org: "Celestial AI", dates: "May 2025 – Present", start: { y: 2025, m: 5 }, end: "present" },
  { id: "w-ayu-ls", lane: "work", title: "Fractional Marketing Lead", org: "AYU Lifescience", dates: "Apr 2025 – Present", start: { y: 2025, m: 4 }, end: "present" },
  // EXPERIENCE SONIA-2.png (AYU Inc USA bullets duplicate Celestial AI's; none shown)
  { id: "w-ayu-us", lane: "work", title: "Chief Marketing & Operations Advisor", org: "AYU Inc USA", dates: "Jan 2023 – Present", start: { y: 2023, m: 1 }, end: "present" },
  { id: "w-iss", lane: "work", title: "Chief Marketing Officer", org: "[i-SmokeStack]", dates: "Mar 2020 – Present", start: { y: 2020, m: 3 }, end: "present" },
  // EXPERIENCE SONIA-3.png
  { id: "w-datt", lane: "work", title: "Fractional CMO", org: "Datt Mediproducts Pvt. Ltd.", dates: "Apr 2020 – Present", start: { y: 2020, m: 4 }, end: "present" },
  { id: "w-lasersec-pm", lane: "work", title: "Vice President Product Marketing", org: "Lasersec Technologies (LT)", dates: "Feb 2021 – Present", start: { y: 2021, m: 2 }, end: "present" },
  // EXPERIENCE SONIA-4.png
  { id: "w-ss-consult", lane: "work", title: "Consulting Specialist", org: "Sonia Specialist", dates: "Oct 2016 – Present", start: { y: 2016, m: 10 }, end: "present" },
  { id: "w-ss-digital", lane: "work", title: "Digital Consultant", org: "Sonia Specialist", dates: "Oct 2013 – Sep 2016", start: { y: 2013, m: 10 }, end: { y: 2016, m: 9 } },
  // EXPERIENCE SONIA-5.png
  { id: "w-rg-director", lane: "work", title: "Digital Marketing Director", org: "RoundGlass", dates: "Apr 2019 – Apr 2020", start: { y: 2019, m: 4 }, end: { y: 2020, m: 4 } },
  { id: "w-rg-leader", lane: "work", title: "Leader - Digital Marketing", org: "RoundGlass", dates: "May 2018 – Mar 2019", start: { y: 2018, m: 5 }, end: { y: 2019, m: 3 } },
  {
    id: "w-tadkaa", lane: "work", title: "Advisory Board Member", org: "Brand Tadkaa", dates: "May 2014 – Dec 2019",
    start: { y: 2014, m: 5 }, end: { y: 2019, m: 12 },
    note: "The role’s description mentions April 2018.",
  },
  {
    id: "w-founder", lane: "work", title: "Founder | CEO", org: "Self-employed", dates: "Jan 2013 – Apr 2014",
    start: { y: 2013, m: 1 }, end: { y: 2014, m: 4 },
  },
  // EXPERIENCE-SONIA-6.png (both roles share the same description; none shown)
  { id: "w-lasersec-vp", lane: "work", title: "Vice President Global Sales Marketing", org: "Lasersec Technologies (LT)", dates: "Dec 2016 – Jul 2018", start: { y: 2016, m: 12 }, end: { y: 2018, m: 7 } },
  { id: "w-lasersec-dir", lane: "work", title: "Director - Demand Generation & Sales", org: "Lasersec Technologies (LT)", dates: "Jan 2016 – Dec 2016", start: { y: 2016, m: 1 }, end: { y: 2016, m: 12 } },
  // EXPERIENCE-SONIA-7.png
  { id: "w-appirio-dir", lane: "work", title: "Director - Demand Gen, Marketing & Sales Operations", org: "Appirio", dates: "Jan 2015 – Dec 2015", start: { y: 2015, m: 1 }, end: { y: 2015, m: 12 } },
  { id: "w-appirio-sr", lane: "work", title: "Sr. Demand Generation Manager", org: "Appirio", dates: "Jul 2014 – Dec 2014", start: { y: 2014, m: 7 }, end: { y: 2014, m: 12 } },
  // EXPERIENCE-SONIA-8.png (descriptions duplicated, with a date conflict; none shown)
  { id: "w-sml-sr", lane: "work", title: "Senior Manager - Demand Generation & Marketing Automation", org: "ShowMeLeads Inc", dates: "Jan 2014 – Jul 2014", start: { y: 2014, m: 1 }, end: { y: 2014, m: 7 } },
  { id: "w-sml-mgr", lane: "work", title: "Manager - Demand Generation Services", org: "ShowMeLeads Inc", dates: "Aug 2013 – Dec 2013", start: { y: 2013, m: 8 }, end: { y: 2013, m: 12 } },
  // EXPERIENCE-SONIA-9.png
  { id: "w-creaform", lane: "work", title: "Head of Marketing and Sales", org: "Creaform Inc.", dates: "Sep 2010 – Jun 2013", start: { y: 2010, m: 9 }, end: { y: 2013, m: 6 } },
  // EXPERIENCE-SONIA-10.png
  { id: "w-faro-asia", lane: "work", title: "Marketing and Communication Manager - Asia", org: "FARO Technologies", dates: "Apr 2009 – Aug 2010", start: { y: 2009, m: 4 }, end: { y: 2010, m: 8 } },
  { id: "w-faro-india", lane: "work", title: "Marketing and Communication Manager - India", org: "FARO Technologies", dates: "May 2008 – Mar 2009", start: { y: 2008, m: 5 }, end: { y: 2009, m: 3 } },
  // EXPERIENCE-SONIA-11.png
  { id: "w-bosch-spec", lane: "work", title: "Marketing Specialist", org: "Bosch", dates: "Nov 2006 – May 2008", start: { y: 2006, m: 11 }, end: { y: 2008, m: 5 } },
  { id: "w-bosch-trainee", lane: "work", title: "Marketing Management Trainee", org: "Bosch", dates: "May 2006 – Oct 2006", start: { y: 2006, m: 5 }, end: { y: 2006, m: 10 } },

  // ── Education: SONIA-INFO/EDUCATION/EDUCATION.png (years only; schools excluded)
  { id: "e-iimb", lane: "education", title: "Executive MBA, Marketing", org: "Indian Institute of Management Bangalore", dates: "2007 – 2008", start: { y: 2007 }, end: { y: 2008 } },
  { id: "e-sims", lane: "education", title: "PGDBM, Marketing & Sales", org: "Symbiosis Institute of Management Studies", dates: "2007 – 2009", start: { y: 2007 }, end: { y: 2009 } },
  { id: "e-mdu", lane: "education", title: "B.E, Electronics & Telecommunication", org: "Maharshi Dayanand University", dates: "2002 – 2006", start: { y: 2002 }, end: { y: 2006 } },

  // ── Recognition: SONIA-INFO/AWARDS (placed by issue date)
  // AWARD'S-1.png
  { id: "a-leader", lane: "recognition", title: "Best Leader - 2018", org: "Issued by Lasersec Technologies", dates: "May 2018", start: { y: 2018, m: 5 } },
  { id: "a-cosr", lane: "recognition", title: "Best COSR Expert - 2017", org: "Issued by Lasersec Technologies Pvt. Ltd.", dates: "Oct 2017", start: { y: 2017, m: 10 } },
  { id: "a-sales", lane: "recognition", title: "Best Sales Performer - 2016", org: "Issued by Lasersec Technologies Pvt. Ltd.", dates: "Apr 2016", start: { y: 2016, m: 4 } },
  { id: "a-spotlight", lane: "recognition", title: "Team Spot Light - 2015", org: "Issued by Appirio", dates: "Mar 2015", start: { y: 2015, m: 3 } },
  // AWARD'S-2.png
  { id: "a-forbes", lane: "recognition", title: "Ranked #13, in Top Demand Generation Experts - 2014", org: "Issued by Forbes", dates: "Oct 2014", start: { y: 2014, m: 10 } },
  { id: "a-outstanding", lane: "recognition", title: "Outstanding Performer - 2014", org: "Issued by ShowMeLeads", dates: "Mar 2014", start: { y: 2014, m: 3 } },
  {
    id: "a-salesops", lane: "recognition", title: "Sales Operations Professional of the Year - 2012", org: "Issued by Creaform", dates: "Jan 2013",
    start: { y: 2013, m: 1 },
    note: "Placed by its issue date (Jan 2013); the title names 2012.",
  },
  { id: "a-mktg", lane: "recognition", title: "MARKETING LEADERSHIP - 2011", org: "Issued by Creaform", dates: "Dec 2011", start: { y: 2011, m: 12 } },
  { id: "a-employer", lane: "recognition", title: "Best Employer - 2008", org: "Issued by FARO", dates: "Dec 2008", start: { y: 2008, m: 12 } },
  { id: "a-presenter", lane: "recognition", title: "Best Presenter Award - 2007", org: "Issued by Bosch, Power Tool Division", dates: "Mar 2007", start: { y: 2007, m: 3 } },

  // ── Volunteering: SONIA-INFO/VOLUNTEERING/VOLUNTEERING.png
  { id: "v-opendoors", lane: "volunteering", title: "Marketing", org: "Open Doors Group", dates: "Feb 2015 – Jun 2016", start: { y: 2015, m: 2 }, end: { y: 2016, m: 6 } },
  { id: "v-heena", lane: "volunteering", title: "Digital Marketing Consultant", org: "Project Heena", dates: "Oct 2014 – Present", start: { y: 2014, m: 10 }, end: "present" },
  { id: "v-roundglass", lane: "volunteering", title: "Volunteer", org: "RoundGlass Foundation", dates: "Jun 2018 – Present", start: { y: 2018, m: 6 }, end: "present" },
];

/** Axis: 2002 → the "Present" stop, which is not given a year. */
export const FIRST_YEAR = 2002;
export const LAST_DATED_YEAR = 2025; // latest dated start (May 2025)
export const PRESENT_STOP = LAST_DATED_YEAR + 1; // slider value meaning "Present"
