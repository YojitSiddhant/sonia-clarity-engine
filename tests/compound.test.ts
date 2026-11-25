import { describe, expect, it, vi } from "vitest";
import { answerQuestion, type ModelReply, type Provider } from "../app/ask/answer";
import { KNOWLEDGE, retrieve, splitQuestion } from "../app/ask/knowledge";
import { ProviderError } from "../app/ask/providerError";

// Real retrieval and validation; every provider is a mock. No live calls.
const ids = (q: string) => retrieve(q).map((d) => d.id);
const PRESENT_ROLES = KNOWLEDGE.filter((d) => d.entry?.lane === "work" && d.entry.end === "present").map((d) => d.id);

/** A mock model that answers with one "listed as current" sentence per role it was sent. */
function currentRolesModel() {
  const prompts: { system: string; user: string }[] = [];
  const provider = vi.fn(async (p: { system: string; user: string }): Promise<ModelReply> => {
    prompts.push(p);
    const sent = [...p.user.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]).filter((id) => PRESENT_ROLES.includes(id));
    return { supported: true, sentences: sent.map((id) => ({ text: "This role is listed as current.", sourceIds: [id] })) };
  });
  return { provider: provider as unknown as Provider, prompts, calls: provider };
}

const COMBINED = "What is her age and currently where is she working?";

describe("compound question: her age and where she works now", () => {
  it("splits into the two things it asks", () => {
    expect(splitQuestion(COMBINED)).toEqual(["What is her age", "currently where is she working?"]);
  });

  it("answers the current roles with citations and reports age as not listed", async () => {
    const m = currentRolesModel();
    const r = await answerQuestion(COMBINED, m.provider);
    expect(r.state).toBe("answer");
    if (r.state !== "answer") return;
    expect(r.gaps).toEqual(["What is her age"]);
    expect(r.citations.map((c) => c.id).sort()).toEqual([...PRESENT_ROLES].sort());
    for (const c of r.citations) expect(c.text).toMatch(/Present$/);
    expect(r.sentences.every((s) => s.cites.length > 0)).toBe(true);
  });

  it("the model never sees the unsupported part, so it can't guess an age", async () => {
    const m = currentRolesModel();
    await answerQuestion(COMBINED, m.provider);
    const user = m.prompts[0].user;
    expect(user).not.toMatch(/\bage\b/i);
    expect(user).toMatch(/QUESTION: currently where is she working\?/);
    expect(m.prompts[0].system).toMatch(/listed as current/);
  });

  it("only roles whose dates end in Present are sent as current", () => {
    const docs = retrieve("currently where is she working?");
    expect(docs.length).toBe(PRESENT_ROLES.length);
    for (const d of docs) expect(d.entry?.end).toBe("present");
  });
});

describe("natural phrasings of 'where does she work now'", () => {
  const phrasings = [
    "Where does she work now?",
    "What are her current roles?",
    "Where's she working these days?",
    "Where is she currently employed?",
    "what is her current job",
    "Which companies is she with at the moment?",
    "currently where is she working?",
  ];
  for (const q of phrasings) {
    it(`"${q}" retrieves the roles listed as Present`, () => {
      expect(ids(q).sort()).toEqual([...PRESENT_ROLES].sort());
    });
  }

  it("informal and formal versions retrieve the same sources", () => {
    expect(ids("where's she working rn these days")).toEqual(ids("Where is she currently employed?"));
    expect(ids("What is her name?")).toEqual(ids("what's her name"));
    expect(ids("Tell me about Appirio.")).toEqual(ids("what did she do at appirio"));
  });

  it("without 'now', a work question still reads her whole career", () => {
    expect(ids("Where has she worked?").length).toBeGreaterThan(0);
    expect(ids("Where has she worked?").some((id) => !PRESENT_ROLES.includes(id))).toBe(true);
  });
});

describe("mixed and unsupported compound questions", () => {
  it("one supported part and one unsupported part: the answer plus a clear gap", async () => {
    const provider = vi.fn(async (): Promise<ModelReply> => ({
      supported: true,
      sentences: [{ text: "Her profile lists her name as “Soniaa S.”", sourceIds: ["profile:name"] }],
    }));
    const r = await answerQuestion("Who is she and what is her favourite food?", provider as unknown as Provider);
    expect(r.state === "answer" && r.gaps).toEqual(["what is her favourite food"]);
    expect(r.state === "answer" && r.citations.map((c) => c.id)).toEqual(["profile:name"]);
  });

  it("two supported parts are both retrieved, with no gap", async () => {
    const m = currentRolesModel();
    const r = await answerQuestion("What awards has she won and where does she work now?", m.provider);
    const sent = [...m.prompts[0].user.matchAll(/"id":"([^"]+)"/g)].map((x) => x[1]);
    expect(sent.some((id) => id.startsWith("log:a-"))).toBe(true);
    expect(sent.some((id) => PRESENT_ROLES.includes(id))).toBe(true);
    expect(r.state === "answer" && r.gaps).toBeUndefined();
  });

  for (const q of ["What is her favorite food and her age?", "How old is she?", "What is her age and her favourite food?"]) {
    it(`fully unsupported "${q}" calls neither provider`, async () => {
      const gemini = vi.fn();
      const groq = vi.fn();
      const r = await answerQuestion(q, gemini as unknown as Provider, groq as unknown as Provider);
      expect(r.state).toBe("unsupported");
      expect(gemini).not.toHaveBeenCalled();
      expect(groq).not.toHaveBeenCalled();
    });
  }

  it("if the model declines the covered part, the whole reply is 'not covered' (no gap-only answer)", async () => {
    const r = await answerQuestion(COMBINED, async () => ({ supported: false, sentences: [] }));
    expect(r).toEqual({ state: "unsupported", answer: expect.any(String) });
  });
});

describe("partial answers get no shortcut through validation", () => {
  const bad: Array<[string, ModelReply]> = [
    ["a fabricated source", { supported: true, sentences: [{ text: "She works at Example Corp.", sourceIds: ["log:w-invented"] }] }],
    ["an uncited sentence", { supported: true, sentences: [{ text: "She is 45 years old.", sourceIds: [] }] }],
    ["an invented quote", { supported: true, sentences: [{ text: "She is “the best CMO alive”.", sourceIds: [PRESENT_ROLES[0]] }] }],
    ["a source not sent for this question", { supported: true, sentences: [{ text: "She studied.", sourceIds: ["log:e-iimb"] }] }],
  ];
  for (const [label, reply] of bad) {
    it(`a compound answer with ${label} is rejected`, async () => {
      const r = await answerQuestion(COMBINED, async () => reply);
      expect(r.state).toBe("unsupported");
    });
  }
});

describe("Gemini and Groq get the same evidence for a compound question", () => {
  it("Groq, as fallback, receives exactly Gemini's prompt and keeps the gap", async () => {
    const prompts: unknown[] = [];
    const gemini: Provider = async (p) => {
      prompts.push(p);
      throw new ProviderError("transient", 503, 2, "gemini");
    };
    const groq = currentRolesModel();
    const r = await answerQuestion(COMBINED, gemini, async (p) => {
      prompts.push(p);
      return groq.provider(p);
    });
    expect(prompts[1]).toEqual(prompts[0]);
    expect(r.state === "answer" && r.provider).toBe("groq-fallback");
    expect(r.state === "answer" && r.gaps).toEqual(["What is her age"]);
  });
});

describe("existing retrieval is unchanged", () => {
  it("name, Appirio, leadership and awards", () => {
    expect(ids("What is the name of the user?")).toEqual(["profile:name"]);
    expect(ids("Tell me about Appirio.")).toEqual(expect.arrayContaining(["log:w-appirio-dir", "log:w-appirio-sr"]));
    expect(ids("Is she a good leader?")).toEqual(expect.arrayContaining(["signal:people", "log:w-rg-leader"]));
    expect(ids("What awards are listed in her profile?")).toHaveLength(10);
  });

  it("questions that are one topic are not split", () => {
    for (const q of [
      "How does Soniaa connect marketing and operations?",
      "What experience does she have building teams?",
      "Does she work with brand and messaging?",
    ]) {
      expect(splitQuestion(q)).toEqual([q]);
    }
  });
});
