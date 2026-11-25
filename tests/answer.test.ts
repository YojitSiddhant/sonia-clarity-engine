import { describe, expect, it, vi } from "vitest";
import {
  answerQuestion,
  cleanQuestion,
  quotesMatch,
  UNSUPPORTED,
  type ModelReply,
  type Provider,
} from "../app/ask/answer";
import { KNOWLEDGE_BY_ID, retrieve } from "../app/ask/knowledge";

const Q = "How does Sonia connect marketing and operations?";

/** Ids the pipeline actually sends to the model for Q. */
const sentIds = () => retrieve(Q).map((d) => d.id);

const reply = (r: ModelReply): Provider => vi.fn(async () => r);

describe("cleanQuestion", () => {
  it("rejects empty, whitespace-only and too-short questions", () => {
    expect(cleanQuestion("")).toBeNull();
    expect(cleanQuestion("    ")).toBeNull();
    expect(cleanQuestion("hi")).toBeNull();
  });
  it("rejects overlong and non-string input", () => {
    expect(cleanQuestion("x".repeat(301))).toBeNull();
    expect(cleanQuestion(42)).toBeNull();
    expect(cleanQuestion(null)).toBeNull();
    expect(cleanQuestion({ question: "How?" })).toBeNull();
  });
  it("trims and collapses whitespace", () => {
    expect(cleanQuestion("  How   does she\nwork?  ")).toBe("How does she work?");
  });
});

describe("answerQuestion", () => {
  it("never calls the model when nothing in the references matches", async () => {
    const provider = vi.fn();
    const r = await answerQuestion("What is her favourite food?", provider as unknown as Provider);
    expect(provider).not.toHaveBeenCalled();
    expect(r).toEqual({ state: "unsupported", answer: UNSUPPORTED });
  });

  it("returns sentences with citations drawn only from sources in the request", async () => {
    const [a, b] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({
        supported: true,
        sentences: [
          { text: "Sonia aligns brand, marketing and operational goals.", sourceIds: [a] },
          { text: "Another role pairs messaging with marketing systems.", sourceIds: [b, a] },
        ],
      }),
    );
    expect(r.state).toBe("answer");
    if (r.state !== "answer") return;
    expect(r.citations.map((c) => c.id)).toEqual([a, b]);
    expect(r.sentences[0].cites).toEqual([1]);
    expect(r.sentences[1].cites).toEqual([2, 1]);
    // every citation carries its visible source context
    for (const c of r.citations) expect(c.section).toBeTruthy();
  });

  it("refuses the reply when any cited id was not in the request (fabricated id)", async () => {
    const [a] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({ supported: true, sentences: [{ text: "Plausible claim.", sourceIds: [a, "pair:invented+id"] }] }),
    );
    expect(r).toEqual({ state: "unsupported", answer: UNSUPPORTED });
  });

  it("refuses an id that exists in the knowledge base but was not sent this time", async () => {
    const notSent = [...KNOWLEDGE_BY_ID.keys()].find((id) => !sentIds().includes(id))!;
    const r = await answerQuestion(Q, reply({ supported: true, sentences: [{ text: "Claim.", sourceIds: [notSent] }] }));
    expect(r.state).toBe("unsupported");
  });

  it("refuses a sentence that cites nothing", async () => {
    const [a] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({
        supported: true,
        sentences: [
          { text: "A sourced sentence.", sourceIds: [a] },
          { text: "An unsourced extra claim.", sourceIds: [] },
        ],
      }),
    );
    expect(r.state).toBe("unsupported");
  });

  it("refuses invented text presented as a direct quote", async () => {
    const [a] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({ supported: true, sentences: [{ text: "She says “I turn chaos into revenue overnight.”", sourceIds: [a] }] }),
    );
    expect(r.state).toBe("unsupported");
  });

  it("accepts a quote copied verbatim from the cited source", async () => {
    const id = "pair:brand+operations";
    expect(sentIds()).toContain(id);
    const r = await answerQuestion(
      Q,
      reply({
        supported: true,
        sentences: [{ text: "She “developed frameworks that aligned brand, marketing, and operational goals.”", sourceIds: [id] }],
      }),
    );
    expect(r.state).toBe("answer");
  });

  it("refuses a real quote attributed to a source the sentence does not cite", async () => {
    const other = sentIds().find((id) => id !== "pair:brand+operations")!;
    const r = await answerQuestion(
      Q,
      reply({
        supported: true,
        sentences: [{ text: "She “developed frameworks that aligned brand, marketing, and operational goals.”", sourceIds: [other] }],
      }),
    );
    expect(r.state).toBe("unsupported");
  });

  it("returns the unsupported state when the model says the sources don't cover it", async () => {
    const r = await answerQuestion(Q, reply({ supported: false, sentences: [] }));
    expect(r).toEqual({ state: "unsupported", answer: UNSUPPORTED });
  });

  it("treats malformed model output as unsupported", async () => {
    const bad = vi.fn(async () => ({ supported: true, sentences: "nope" }) as unknown as ModelReply);
    expect((await answerQuestion(Q, bad)).state).toBe("unsupported");
    const overlong = reply({ supported: true, sentences: [{ text: "y".repeat(400), sourceIds: [sentIds()[0]] }] });
    expect((await answerQuestion(Q, overlong)).state).toBe("unsupported");
  });

  it("keeps at most three sentences", async () => {
    const [a] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({ supported: true, sentences: Array.from({ length: 6 }, (_, i) => ({ text: `Claim ${i}.`, sourceIds: [a] })) }),
    );
    expect(r.state === "answer" && r.sentences.length).toBe(3);
  });

  it("propagates provider failure so the route can return a generic error", async () => {
    const failing: Provider = vi.fn(async () => {
      throw new Error("provider down");
    });
    await expect(answerQuestion(Q, failing)).rejects.toThrow();
  });
});

describe("quotesMatch", () => {
  const doc = KNOWLEDGE_BY_ID.get("pair:brand+operations")!;
  it("ignores typographic differences only", () => {
    expect(quotesMatch('She "Developed frameworks that aligned brand"', [doc])).toBe(true);
    expect(quotesMatch("She “developed frameworks that aligned brand, marketing”.", [doc])).toBe(true);
  });
  it("rejects altered wording", () => {
    expect(quotesMatch("She “developed frameworks that unified brand”", [doc])).toBe(false);
  });
  it("passes sentences without quotation marks", () => {
    expect(quotesMatch("She aligned brand and operational goals.", [doc])).toBe(true);
  });
});

describe("regression: “What awards are listed in her profile?”", () => {
  const AWARDS_Q = "What awards are listed in her profile?";
  const awardIds = () => retrieve(AWARDS_Q).map((d) => d.id);

  it("asks the model for a cited list, labelling each source as an award", async () => {
    const provider = vi.fn(async () => ({ supported: false, sentences: [] }) as ModelReply);
    await answerQuestion(AWARDS_Q, provider);
    const { user } = (provider.mock.calls[0] as unknown as [{ user: string }])[0];
    expect(user).toContain("TASK: This question asks for a list");
    expect(user.match(/"kind":"award"/g)).toHaveLength(10);
  });

  it("shows every award when each sentence cites its own award record", async () => {
    const ids = awardIds();
    const r = await answerQuestion(
      AWARDS_Q,
      reply({
        supported: true,
        sentences: ids.map((id) => {
          const title = KNOWLEDGE_BY_ID.get(id)!.text.split(" · ")[0];
          return { text: `She received the “${title}” award.`, sourceIds: [id] };
        }),
      }),
    );
    expect(r.state).toBe("answer");
    if (r.state !== "answer") return;
    expect(r.sentences).toHaveLength(10);
    expect(r.citations.map((c) => c.id)).toEqual(ids);
    expect(r.citations.every((c) => c.section === "Awards")).toBe(true);
  });

  it("still refuses a list containing an invented award quote", async () => {
    const ids = awardIds();
    const r = await answerQuestion(
      AWARDS_Q,
      reply({
        supported: true,
        sentences: [
          { text: "She received the “Best Leader - 2018” award.", sourceIds: [ids[0]] },
          { text: "She received the “Global Visionary of the Decade” award.", sourceIds: [ids[1]] },
        ],
      }),
    );
    expect(r.state).toBe("unsupported");
  });

  it("still refuses a list citing an id that was not sent", async () => {
    const [first] = awardIds();
    const r = await answerQuestion(
      AWARDS_Q,
      reply({ supported: true, sentences: [{ text: "An award is listed.", sourceIds: [first, "log:a-invented"] }] }),
    );
    expect(r.state).toBe("unsupported");
  });

  it("keeps non-list answers to three sentences", async () => {
    const [a] = sentIds();
    const r = await answerQuestion(
      Q,
      reply({ supported: true, sentences: Array.from({ length: 10 }, (_, i) => ({ text: `Claim ${i}.`, sourceIds: [a] })) }),
    );
    expect(r.state === "answer" && r.sentences.length).toBe(3);
  });
});
