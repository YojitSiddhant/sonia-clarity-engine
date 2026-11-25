import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the provider boundary: no Gemini requests are ever made.
const state = vi.hoisted(() => ({ configured: true, mode: "ok" as "ok" | "fail" | "transient" }));
vi.mock("../app/ask/gemini", async (importOriginal) => {
  const real = await importOriginal<typeof import("../app/ask/gemini")>();
  return {
  ...real,
  geminiConfigured: () => state.configured,
  geminiProvider: async ({ user }: { user: string }) => {
    if (state.mode === "fail") throw new Error("upstream 500: secret internal detail");
    if (state.mode === "transient") throw new real.ProviderError("transient", 503, 2);
    const id = /"id":"([^"]+)"/.exec(user)![1];
    return { supported: true, sentences: [{ text: "A sourced sentence.", sourceIds: [id] }] };
  },
  };
});

const post = (body: unknown, h: Record<string, string> = {}) =>
  new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", ...h },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function freshRoute() {
  vi.resetModules(); // a new module instance = a fresh in-memory limiter
  return import("../app/api/ask/route");
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    state.configured = true;
    state.mode = "ok";
  });

  it("shows the setup state without a key", async () => {
    state.configured = false;
    const { POST } = await freshRoute();
    const res = await POST(post({ question: "How does she lead teams?" }));
    expect(res.status).toBe(503);
    expect((await res.json()).state).toBe("setup");
  });

  it("rejects empty, malformed, overlong and oversized input", async () => {
    const { POST } = await freshRoute();
    expect((await POST(post({ question: "  " }))).status).toBe(400);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect((await POST(post({ question: 42 }))).status).toBe(400);
    expect((await POST(post({ question: "a".repeat(301) }))).status).toBe(400);
    expect((await POST(post({ question: "b".repeat(5000) }))).status).toBe(400);
  });

  it("answers with validated citations", async () => {
    const { POST } = await freshRoute();
    const body = await (await POST(post({ question: "How does Sonia connect marketing and operations?" }))).json();
    expect(body.state).toBe("answer");
    expect(body.citations).toHaveLength(1);
    expect(body.sentences[0].cites).toEqual([1]);
  });

  it("regression: answers the suggested awards question with award citations", async () => {
    const { POST } = await freshRoute();
    const body = await (await POST(post({ question: "What awards are listed in her profile?" }))).json();
    expect(body.state).toBe("answer");
    expect(body.citations[0].section).toBe("Awards");
  });

  it("rate-limits even when every request spoofs a different x-forwarded-for", async () => {
    const { POST } = await freshRoute();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await POST(post({ question: "What experience does she have building teams?" }, { "x-forwarded-for": `203.0.113.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("returns a generic error on provider failure, with no internal detail", async () => {
    state.mode = "fail";
    const { POST } = await freshRoute();
    const res = await POST(post({ question: "How does Sonia connect marketing and operations?" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toMatch(/secret|internal|upstream|stack/i);
    expect(JSON.parse(text).state).toBe("error");
  });
});

describe("provider failures in the route", () => {
  beforeEach(() => {
    state.configured = true;
  });

  it("shows the generic error for an exhausted transient failure — never a guessed or 'not covered' answer", async () => {
    state.mode = "transient";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await freshRoute();
    const question = "What awards are listed in her profile?";
    const res = await POST(post({ question }));
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.state).toBe("error");
    expect(body.message).toMatch(/couldn’t answer just now/);
    expect(JSON.stringify(body)).not.toMatch(/503|transient|gemini|not cover/i);
    // one safe log line: category, status and attempts only
    const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toBe("[ask] provider failure category=transient status=503 attempts=2");
    expect(logged).not.toContain(question);
    warn.mockRestore();
  });

  it("logs unexpected errors without their message", async () => {
    state.mode = "fail";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await freshRoute();
    await POST(post({ question: "How does Sonia connect marketing and operations?" }));
    const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toBe("[ask] provider failure category=unexpected");
    expect(logged).not.toMatch(/secret|upstream/);
    warn.mockRestore();
  });
});
