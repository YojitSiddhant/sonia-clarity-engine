import { describe, expect, it, vi } from "vitest";
import { answerQuestion, type ModelReply, type Provider } from "../app/ask/answer";
import { KNOWLEDGE_BY_ID, retrieve } from "../app/ask/knowledge";
import { ProviderError } from "../app/ask/providerError";
import { sourceLabel } from "../app/ask/sourceLabel";

// Retrieval is real; every provider is a mock. No live Gemini or Groq calls.
const ids = (q: string) => retrieve(q).map((d) => d.id);
const says = (r: ModelReply) => vi.fn(async () => r) as unknown as Provider & ReturnType<typeof vi.fn>;
const NAME_QUOTE = "Her profile lists her name as “Soniaa S.”";

describe("the name source", () => {
  it("is exactly the profile's Services line and nothing more", () => {
    const d = KNOWLEDGE_BY_ID.get("profile:name");
    expect(d).toMatchObject({ section: "Services", text: "Soniaa S.", evidence: "direct" });
    expect(d?.where).toBeUndefined();
  });
});

describe("identity questions", () => {
  const identity = [
    "What’s her name?",
    "What's her name?",
    "What is Soniaa’s name?",
    "What is Sonia's name?",
    "What is the name of the user?",
    "what is the name of the user?",
    "Who is she?",
    "Who is the founder?",
  ];
  for (const q of identity) {
    it(`"${q}" retrieves profile:name`, () => {
      expect(ids(q)).toContain("profile:name");
    });
  }

  it("a bare 'user' or 'name' elsewhere is not an identity question", () => {
    expect(ids("How many users did her campaigns reach?")).not.toContain("profile:name");
    expect(ids("Name the companies she worked for")).not.toContain("profile:name");
  });

  it("an answer quoting the name and citing profile:name passes validation", async () => {
    const r = await answerQuestion("What’s her name?", says({ supported: true, sentences: [{ text: NAME_QUOTE, sourceIds: ["profile:name"] }] }));
    expect(r.state).toBe("answer");
    expect(r.state === "answer" && r.citations.map((c) => c.id)).toEqual(["profile:name"]);
  });

  it("the same quote attributed to a different source is rejected", async () => {
    // Both sources are sent for this question, so only the quote check can reject it.
    expect(ids("Who is the founder?")).toEqual(expect.arrayContaining(["profile:name", "log:w-founder"]));
    const r = await answerQuestion("Who is the founder?", says({ supported: true, sentences: [{ text: NAME_QUOTE, sourceIds: ["log:w-founder"] }] }));
    expect(r.state).toBe("unsupported");
  });

  it("Groq, as fallback, gets the same name source and passes the same checks", async () => {
    const prompts: unknown[] = [];
    const gemini: Provider = async (p) => {
      prompts.push(p);
      throw new ProviderError("transient", 503, 2, "gemini");
    };
    const groq: Provider = async (p) => {
      prompts.push(p);
      return { supported: true, sentences: [{ text: NAME_QUOTE, sourceIds: ["profile:name"] }] };
    };
    const r = await answerQuestion("What is the name of the user?", gemini, groq);
    expect(r.state === "answer" && r.provider).toBe("groq-fallback");
    expect(prompts[1]).toEqual(prompts[0]);
  });
});

describe("founder", () => {
  const Q = "Who is the founder?";

  it("retrieves the profile's Founder | CEO record, with its dates, and nothing about i-SmokeStack", () => {
    const docs = retrieve(Q);
    expect(docs.find((d) => d.id === "log:w-founder")?.text).toBe("Founder | CEO · Self-employed · Jan 2013 – Apr 2014");
    for (const d of docs) expect(`${d.text} ${d.where ?? ""}`).not.toMatch(/smokestack/i);
  });

  it("a reply quoting a claim she founded i-SmokeStack is rejected", async () => {
    const r = await answerQuestion(
      Q,
      says({ supported: true, sentences: [{ text: "She is “Founder of i-SmokeStack”.", sourceIds: ["log:w-founder"] }] }),
    );
    expect(r.state).toBe("unsupported");
  });
});

describe("roles and leadership", () => {
  for (const q of ["Tell me about Appirio.", "What did she do at Appirio?", "Tell me about her work at Appirio."]) {
    it(`"${q}" retrieves both Appirio roles`, () => {
      expect(ids(q)).toEqual(expect.arrayContaining(["log:w-appirio-dir", "log:w-appirio-sr"]));
    });
  }

  it("“Is she a good leader?” retrieves leadership sources", () => {
    const got = ids("Is she a good leader?");
    expect(got).toEqual(expect.arrayContaining(["signal:people", "log:w-rg-leader", "log:a-leader"]));
  });

  it("a generic word does not pull in every role", () => {
    // "marketing" names many roles, so it is not distinctive.
    expect(ids("Tell me about marketing").filter((id) => id.startsWith("log:w-"))).toEqual([]);
  });
});

describe("still not covered", () => {
  for (const q of [
    "What is her favorite food?",
    "What is her favourite food?",
    "What languages does she speak?",
    "What certifications does she have?",
  ]) {
    it(`"${q}" calls neither provider`, async () => {
      const gemini = vi.fn();
      const groq = vi.fn();
      const r = await answerQuestion(q, gemini as unknown as Provider, groq as unknown as Provider);
      expect(r.state).toBe("unsupported");
      expect(gemini).not.toHaveBeenCalled();
      expect(groq).not.toHaveBeenCalled();
    });
  }
});

describe("suggested questions keep their sources", () => {
  // Snapshot taken from retrieval before this change.
  const before: Record<string, string[]> = {
    "How does Soniaa connect marketing and operations?": [
      "pair:brand+operations", "pair:messaging+operations", "pair:brand+messaging", "pair:demand+brand",
      "pair:demand+messaging", "pair:demand+operations", "pair:people+operations", "pair:messaging+people",
    ],
    "What experience does she have building teams?": [
      "signal:people", "pair:brand+people", "pair:people+operations", "pair:messaging+people",
      "pair:demand+people", "signal:operations", "pair:brand+operations", "pair:demand+brand",
    ],
    "What does her timeline show around 2020?": [
      "log:w-iss", "log:w-datt", "log:w-lasersec-pm", "log:w-ss-consult", "log:w-rg-director",
      "log:w-rg-leader", "log:w-tadkaa", "log:v-heena", "log:v-roundglass",
    ],
    "What awards are listed in her profile?": [
      "log:a-leader", "log:a-cosr", "log:a-sales", "log:a-spotlight", "log:a-forbes",
      "log:a-outstanding", "log:a-salesops", "log:a-mktg", "log:a-employer", "log:a-presenter",
    ],
  };
  for (const [q, expected] of Object.entries(before)) {
    it(q, () => expect(ids(q)).toEqual(expected));
  }
});

describe("source labels", () => {
  it("the name source shows a neutral Profile label, not “My words”", () => {
    expect(sourceLabel({ id: "profile:name", evidence: "direct" })).toBe("Profile");
  });
  it("ordinary sources keep their labels", () => {
    const quote = KNOWLEDGE_BY_ID.get("signal:people")!;
    expect(quote.evidence).toBe("direct");
    expect(sourceLabel(quote)).toBe("My words");
    expect(sourceLabel(KNOWLEDGE_BY_ID.get("log:w-founder")!)).toBe("Dated record");
    const interp = [...KNOWLEDGE_BY_ID.values()].find((d) => d.evidence === "interpretive")!;
    expect(sourceLabel(interp)).toBe("Editorial reading");
  });
  it("the model still sees the name source as direct evidence", () => {
    expect(KNOWLEDGE_BY_ID.get("profile:name")?.evidence).toBe("direct");
  });
});
