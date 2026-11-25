import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the provider boundary: no Gemini requests are ever made.
const state = vi.hoisted(() => ({ configured: true, mode: "ok" as "ok" | "fail" }));
vi.mock("../app/ask/gemini", () => ({
  geminiConfigured: () => state.configured,
  geminiProvider: async ({ user }: { user: string }) => {
    if (state.mode === "fail") throw new Error("upstream 500: secret internal detail");
    const id = /"id":"([^"]+)"/.exec(user)![1];
    return { supported: true, sentences: [{ text: "A sourced sentence.", sourceIds: [id] }] };
  },
}));

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
