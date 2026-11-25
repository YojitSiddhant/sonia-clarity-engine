import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerFailure, answerQuestion, type ModelReply, type Provider } from "../app/ask/answer";
import { createGroqProvider, GROQ_MODEL, GROQ_URL } from "../app/ask/groq";
import { ProviderError } from "../app/ask/providerError";
import { retrieve } from "../app/ask/knowledge";

// Mocked providers and fetch only — no live Gemini or Groq calls.
const Q = "How does Sonia connect marketing and operations?";
const AWARDS_Q = "What awards are listed in her profile?";
const ids = (q = Q) => retrieve(q).map((d) => d.id);

const geminiDown: Provider = vi.fn(async () => {
  throw new ProviderError("transient", 503, 2, "gemini");
});
const groqSays = (r: ModelReply) => vi.fn(async () => r) as unknown as Provider & ReturnType<typeof vi.fn>;
const valid = (): ModelReply => ({ supported: true, sentences: [{ text: "Sonia aligned brand and operational goals.", sourceIds: [ids()[0]] }] });

describe("answerQuestion with a fallback provider", () => {
  it("1. Gemini succeeds: the fallback is never called", async () => {
    const groq = groqSays(valid());
    const r = await answerQuestion(Q, async () => valid(), groq);
    expect(r.state).toBe("answer");
    expect(r.state === "answer" && r.provider).toBe("gemini");
    expect(groq).not.toHaveBeenCalled();
  });

  it("1b. Gemini's own invalid answer is a validation result, not a failure: no fallback", async () => {
    const groq = groqSays(valid());
    const r = await answerQuestion(Q, async () => ({ supported: true, sentences: [{ text: "x", sourceIds: ["pair:fake"] }] }), groq);
    expect(r.state).toBe("unsupported");
    expect(r).not.toHaveProperty("provider");
    expect(groq).not.toHaveBeenCalled();
  });

  it("2. Gemini fails, Groq returns a valid grounded answer: answer succeeds with the same prompt", async () => {
    const prompts: unknown[] = [];
    const gemini: Provider = async (p) => {
      prompts.push(p);
      throw new ProviderError("timeout", undefined, 1, "gemini");
    };
    const groq: Provider = async (p) => {
      prompts.push(p);
      return valid();
    };
    const r = await answerQuestion(Q, gemini, groq);
    expect(r.state).toBe("answer");
    expect(r.state === "answer" && r.provider).toBe("groq-fallback");
    expect(prompts[1]).toEqual(prompts[0]); // same question, same selected sources
  });

  it("2b. Groq can answer the awards list through the same validation", async () => {
    const list = ids(AWARDS_Q);
    const r = await answerQuestion(
      AWARDS_Q,
      geminiDown,
      groqSays({ supported: true, sentences: list.map((id) => ({ text: "An award is listed.", sourceIds: [id] })) }),
    );
    expect(r.state === "answer" && r.sentences.length).toBe(10);
  });

  const invalidGroqReplies: Array<[string, ModelReply]> = [
    ["fabricated source id", { supported: true, sentences: [{ text: "Claim.", sourceIds: ["pair:invented+id"] }] }],
    ["missing citation", { supported: true, sentences: [{ text: "Uncited claim.", sourceIds: [] }] }],
    ["invented quote", { supported: true, sentences: [{ text: "She said “I transform chaos into revenue.”", sourceIds: [] }] }],
    ["unsupported content", { supported: false, sentences: [] }],
    ["malformed shape", { supported: true, sentences: "nope" } as unknown as ModelReply],
  ];
  for (const [label, reply] of invalidGroqReplies) {
    it(`3. Groq ${label}: rejected (generic error, never shown)`, async () => {
      const err = await answerQuestion(Q, geminiDown, groqSays(reply)).catch((e) => e);
      expect(err).toBeInstanceOf(AnswerFailure);
      expect((err as AnswerFailure).fallback).toBe("invalid");
    });
  }

  it("3b. Groq quote not in its cited source: rejected", async () => {
    const reply: ModelReply = { supported: true, sentences: [{ text: "She “unified every team overnight.”", sourceIds: [ids()[0]] }] };
    await expect(answerQuestion(Q, geminiDown, groqSays(reply))).rejects.toBeInstanceOf(AnswerFailure);
  });

  it("4. both providers fail: AnswerFailure carries both safe categories", async () => {
    const groq: Provider = async () => {
      throw new ProviderError("http", 500, 1, "groq");
    };
    const err = (await answerQuestion(Q, geminiDown, groq).catch((e) => e)) as AnswerFailure;
    expect(err).toBeInstanceOf(AnswerFailure);
    expect((err.primary as ProviderError).category).toBe("transient");
    expect((err.fallback as ProviderError).provider).toBe("groq");
  });

  it("5. no fallback configured: Gemini failure behaves as before", async () => {
    const err = (await answerQuestion(Q, geminiDown).catch((e) => e)) as AnswerFailure;
    expect(err).toBeInstanceOf(AnswerFailure);
    expect(err.fallback).toBeUndefined();
  });

  it("6. off-topic questions contact neither provider", async () => {
    const gemini = vi.fn();
    const groq = vi.fn();
    const r = await answerQuestion("What is her favourite food?", gemini as unknown as Provider, groq as unknown as Provider);
    expect(r.state).toBe("unsupported");
    expect(gemini).not.toHaveBeenCalled();
    expect(groq).not.toHaveBeenCalled();
  });
});

describe("Groq provider (fetch mocked)", () => {
  const KEY = "dummy-groq-key-not-real";
  beforeEach(() => vi.stubEnv("GROQ_API_KEY", KEY));
  afterEach(() => vi.unstubAllEnvs());

  const completion = (content: string, finish = "stop") =>
    new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content } }] }), { status: 200 });

  it("calls only the official endpoint with a strict schema, the chosen model and no tools", async () => {
    const fetchMock = vi.fn(async () => completion(JSON.stringify({ supported: false, sentences: [] })));
    await createGroqProvider({ fetch: fetchMock as unknown as typeof fetch })({ system: "s", user: "u" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GROQ_URL);
    expect(new URL(url).hostname).toBe("api.groq.com");
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.tools).toBeUndefined();
    expect(body.messages).toHaveLength(2); // system + this question only: no history
  });

  it("parses a valid reply", async () => {
    const reply = { supported: true, sentences: [{ text: "A.", sourceIds: ["x"] }] };
    const p = createGroqProvider({ fetch: (async () => completion(JSON.stringify(reply))) as unknown as typeof fetch });
    await expect(p({ system: "s", user: "u" })).resolves.toEqual(reply);
  });

  const failure = async (res: Response | Error) => {
    const fetchMock = vi.fn(async () => {
      if (res instanceof Error) throw res;
      return res;
    });
    const err = await createGroqProvider({ fetch: fetchMock as unknown as typeof fetch })({ system: "s", user: "u" }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // one attempt, never retried
    return err as ProviderError;
  };

  it("classifies failures without retrying, and never leaks the key or body", async () => {
    const body = '{"error":{"message":"secret provider detail"}}';
    const cases: Array<[Response | Error, string]> = [
      [new Response(body, { status: 429, headers: { "retry-after": "5" } }), "transient"],
      [new Response(body, { status: 503 }), "transient"],
      [new Response(body, { status: 401 }), "http"],
      [Object.assign(new Error("t"), { name: "TimeoutError" }), "timeout"],
      [new Error("socket"), "network"],
      [completion("not json"), "malformed"],
      [completion('{"supported":true', "length"), "malformed"],
      [new Response("x".repeat(70_000), { status: 200 }), "malformed"],
    ];
    for (const [res, category] of cases) {
      const e = await failure(res);
      expect(e.category).toBe(category);
      expect(e.provider).toBe("groq");
      expect(e.message).not.toContain(KEY);
      expect(e.message).not.toContain("secret provider detail");
    }
  });

  it("without a key, reports config and makes no request", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchMock = vi.fn();
    const err = await createGroqProvider({ fetch: fetchMock as unknown as typeof fetch })({ system: "s", user: "u" }).catch((e) => e);
    expect((err as ProviderError).category).toBe("config");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
