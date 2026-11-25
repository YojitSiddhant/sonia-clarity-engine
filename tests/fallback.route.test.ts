import { beforeEach, describe, expect, it, vi } from "vitest";

// Both providers are mocked at the module boundary: no live calls.
const s = vi.hoisted(() => ({
  geminiMode: "ok" as "ok" | "fail",
  groqConfigured: true,
  groqMode: "ok" as "ok" | "fail" | "fabricated",
  geminiCalls: 0,
  groqCalls: 0,
}));

vi.mock("../app/ask/gemini", async (importOriginal) => {
  const real = await importOriginal<typeof import("../app/ask/gemini")>();
  return {
    ...real,
    geminiConfigured: () => true,
    geminiProvider: async ({ user }: { user: string }) => {
      s.geminiCalls++;
      if (s.geminiMode === "fail") throw new real.ProviderError("transient", 503, 2, "gemini");
      return { supported: true, sentences: [{ text: "Primary sentence.", sourceIds: [/"id":"([^"]+)"/.exec(user)![1]] }] };
    },
  };
});

vi.mock("../app/ask/groq", async (importOriginal) => {
  const real = await importOriginal<typeof import("../app/ask/groq")>();
  const { ProviderError } = await import("../app/ask/providerError");
  return {
    ...real,
    groqConfigured: () => s.groqConfigured,
    groqProvider: async ({ user }: { user: string }) => {
      s.groqCalls++;
      if (s.groqMode === "fail") throw new ProviderError("http", 500, 1, "groq");
      if (s.groqMode === "fabricated") return { supported: true, sentences: [{ text: "Made up.", sourceIds: ["pair:invented"] }] };
      return { supported: true, sentences: [{ text: "Backup sentence.", sourceIds: [/"id":"([^"]+)"/.exec(user)![1]] }] };
    },
  };
});

const KEYS = ["dummy-gemini-key-not-real", "dummy-groq-key-not-real"];
const post = (question: unknown, ip = "") =>
  new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", ...(ip ? { "x-forwarded-for": ip } : {}) },
    body: JSON.stringify({ question }),
  });

async function freshRoute() {
  vi.resetModules();
  return import("../app/api/ask/route");
}

describe("POST /api/ask with the Groq fallback", () => {
  let logs: string[];
  beforeEach(() => {
    Object.assign(s, { geminiMode: "ok", groqConfigured: true, groqMode: "ok", geminiCalls: 0, groqCalls: 0 });
    vi.stubEnv("GEMINI_API_KEY", KEYS[0]);
    vi.stubEnv("GROQ_API_KEY", KEYS[1]);
    logs = [];
    vi.spyOn(console, "warn").mockImplementation((...a) => void logs.push(a.join(" ")));
  });

  const Q = "How does Sonia connect marketing and operations?";

  it("Gemini succeeds: Groq is never called, nothing is logged, provider is gemini", async () => {
    const { POST } = await freshRoute();
    const body = await (await POST(post(Q))).json();
    expect(body.sentences[0].text).toBe("Primary sentence.");
    expect(body.provider).toBe("gemini");
    expect(s.groqCalls).toBe(0);
    expect(logs).toEqual([]);
  });

  it("Gemini fails, Groq answers: the normal answer, labelled only by a safe provider id", async () => {
    s.geminiMode = "fail";
    const { POST } = await freshRoute();
    const res = await POST(post(Q));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe("answer");
    expect(Object.keys(body).sort()).toEqual(["citations", "provider", "sentences", "state"]);
    expect(body.provider).toBe("groq-fallback");
    // nothing else about either provider: no error detail, status or model
    const { provider: _p, ...rest } = body;
    expect(JSON.stringify(rest)).not.toMatch(/groq|gemini|503|transient/i);
    expect(logs).toEqual(["[ask] provider failure category=transient status=503 attempts=2; answered by fallback=groq"]);
  });

  it("Gemini fails, Groq fabricates a source: generic error", async () => {
    Object.assign(s, { geminiMode: "fail", groqMode: "fabricated" });
    const { POST } = await freshRoute();
    const res = await POST(post(Q));
    expect(res.status).toBe(502);
    expect((await res.json()).state).toBe("error");
    expect(logs).toEqual(["[ask] provider failure category=transient status=503 attempts=2; fallback=groq category=invalid-answer"]);
  });

  it("both providers fail: the existing generic error", async () => {
    Object.assign(s, { geminiMode: "fail", groqMode: "fail" });
    const { POST } = await freshRoute();
    const res = await POST(post(Q));
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/couldn’t answer just now/);
    expect(logs).toEqual([
      "[ask] provider failure category=transient status=503 attempts=2; fallback=groq category=http status=500 attempts=1",
    ]);
  });

  it("Groq not configured: Gemini failure behaves exactly as before, Groq never contacted", async () => {
    Object.assign(s, { geminiMode: "fail", groqConfigured: false });
    const { POST } = await freshRoute();
    expect((await POST(post(Q))).status).toBe(502);
    expect(s.groqCalls).toBe(0);
    expect(logs).toEqual(["[ask] provider failure category=transient status=503 attempts=2"]);
  });

  it("off-topic and invalid questions contact neither provider", async () => {
    s.geminiMode = "fail";
    const { POST } = await freshRoute();
    expect((await (await POST(post("What is her favourite food?"))).json()).state).toBe("unsupported");
    expect((await POST(post("  "))).status).toBe(400);
    expect((await POST(post(42))).status).toBe(400);
    expect(s.geminiCalls + s.groqCalls).toBe(0);
  });

  it("keys, questions and provider bodies never reach the browser or logs", async () => {
    Object.assign(s, { geminiMode: "fail", groqMode: "fail" });
    const { POST } = await freshRoute();
    const text = await (await POST(post(Q))).text();
    for (const secret of [...KEYS, Q, "SOURCES", "pair:"]) {
      expect(text).not.toContain(secret);
      expect(logs.join("\n")).not.toContain(secret);
    }
  });

  it("the existing rate limit still applies with the fallback in place", async () => {
    s.geminiMode = "fail";
    const { POST } = await freshRoute();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(post(Q, `198.51.100.${i}`))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(s.groqCalls).toBe(5);
  });

  it("Groq configured but not needed is never shown: Gemini's own 'not covered' has no provider", async () => {
    const { POST } = await freshRoute();
    const body = await (await POST(post("What is her favourite food?"))).json();
    expect(body.state).toBe("unsupported");
    expect(body).not.toHaveProperty("provider");
    expect(s.groqCalls).toBe(0);
  });

  it("errors, setup, invalid and rate-limited responses carry no provider", async () => {
    Object.assign(s, { geminiMode: "fail", groqMode: "fail" });
    const { POST } = await freshRoute();
    const failed = await (await POST(post(Q))).json();
    expect(failed.state).toBe("error");
    expect(failed).not.toHaveProperty("provider");
    const invalid = await (await POST(post("  "))).json();
    expect(invalid).not.toHaveProperty("provider");
    let limited: Record<string, unknown> = {};
    for (let i = 0; i < 6; i++) limited = await (await POST(post(Q, "192.0.2.7"))).json();
    expect(limited.state).toBe("limited");
    expect(limited).not.toHaveProperty("provider");
  });
});
