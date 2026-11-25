import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientId, createRateLimiter, trustedIpHeader } from "../app/ask/rateLimit";
import { geminiProvider, GOOGLE_HOST, keyMayGoTo, resolveBaseUrl } from "../app/ask/gemini";

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
const headers = (h: Record<string, string>) => new Headers(h);

describe("client identity (spoofing)", () => {
  it("ignores client-supplied forwarding headers when no trusted header is configured", () => {
    const e = env({});
    expect(trustedIpHeader(e)).toBeNull();
    expect(clientId(headers({ "x-forwarded-for": "1.1.1.1" }), e)).toBe("shared");
    expect(clientId(headers({ "x-forwarded-for": "2.2.2.2", "x-real-ip": "3.3.3.3" }), e)).toBe("shared");
  });

  it("on Vercel, uses only Vercel's own header, never x-forwarded-for from the client", () => {
    const e = env({ VERCEL: "1" });
    expect(clientId(headers({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "1.2.3.4" }), e)).toBe("9.9.9.9");
    expect(clientId(headers({ "x-forwarded-for": "1.2.3.4" }), e)).toBe("shared");
  });

  it("honours an operator-named header and rejects junk values", () => {
    const e = env({ TRUSTED_IP_HEADER: "CF-Connecting-IP" });
    expect(clientId(headers({ "cf-connecting-ip": "8.8.8.8" }), e)).toBe("8.8.8.8");
    expect(clientId(headers({ "cf-connecting-ip": "x".repeat(200) }), e)).toBe("shared");
  });
});

describe("rate limiter", () => {
  const make = () =>
    createRateLimiter({
      perClient: [
        { ms: 60_000, max: 5 },
        { ms: 3_600_000, max: 20 },
      ],
      perInstance: { ms: 60_000, max: 30 },
      maxClients: 100,
    });

  it("can't be dodged by rotating spoofed x-forwarded-for values", () => {
    const limiter = make();
    const results = Array.from({ length: 6 }, (_, i) =>
      limiter.limited(clientId(headers({ "x-forwarded-for": `10.0.0.${i}` }), env({})), 1_000),
    );
    expect(results).toEqual([false, false, false, false, false, true]);
  });

  it("allows a client again once the window has passed", () => {
    const limiter = make();
    for (let i = 0; i < 5; i++) limiter.limited("a", 0);
    expect(limiter.limited("a", 1_000)).toBe(true);
    expect(limiter.limited("a", 61_000)).toBe(false);
  });

  it("caps total requests per instance across all clients", () => {
    const limiter = make();
    const refused = Array.from({ length: 40 }, (_, i) => limiter.limited(`client-${i}`, 5_000)).filter(Boolean);
    expect(refused).toHaveLength(10);
  });

  it("keeps memory bounded however many distinct clients appear", () => {
    const limiter = createRateLimiter({
      perClient: [{ ms: 3_600_000, max: 5 }],
      perInstance: { ms: 1, max: 1_000_000 },
      maxClients: 100,
    });
    for (let i = 0; i < 5_000; i++) limiter.limited(`random-${i}`, i * 10);
    expect(limiter.size()).toBeLessThanOrEqual(100);
  });
});

describe("Gemini endpoint", () => {
  it("ignores GEMINI_API_BASE_URL in production", () => {
    const e = env({ NODE_ENV: "production", GEMINI_API_BASE_URL: "https://attacker.example/v1beta" });
    expect(new URL(resolveBaseUrl(e)).hostname).toBe(GOOGLE_HOST);
  });

  it("allows a local mock URL only outside production", () => {
    expect(resolveBaseUrl(env({ NODE_ENV: "development", GEMINI_API_BASE_URL: "http://127.0.0.1:4599" }))).toBe(
      "http://127.0.0.1:4599",
    );
    expect(keyMayGoTo("http://127.0.0.1:4599/x", env({ NODE_ENV: "development" }))).toBe(true);
    expect(keyMayGoTo("http://127.0.0.1:4599/x", env({ NODE_ENV: "production" }))).toBe(false);
    expect(keyMayGoTo("https://attacker.example/x", env({ NODE_ENV: "development" }))).toBe(false);
    expect(keyMayGoTo(`https://${GOOGLE_HOST}/v1beta/x`, env({ NODE_ENV: "production" }))).toBe(true);
  });

  describe("geminiProvider (fetch mocked — no live calls)", () => {
    const KEY = "dummy-test-key-not-real";
    beforeEach(() => {
      vi.stubEnv("GEMINI_API_KEY", KEY);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    const ok = (body: unknown) =>
      new Response(
        JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(body) }] } }] }),
        { status: 200 },
      );

    it("in production sends the key only to Google even if a test URL is set", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("GEMINI_API_BASE_URL", "https://attacker.example/v1beta");
      const fetchMock = vi.fn(async () => ok({ supported: false, sentences: [] }));
      vi.stubGlobal("fetch", fetchMock);
      await geminiProvider({ system: "s", user: "u" });
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(new URL(url).hostname).toBe(GOOGLE_HOST);
      expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(KEY);
    });

    it("turns provider failures into a generic error that doesn't contain the key", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"internal detail"}', { status: 500 })));
      const err = await geminiProvider({ system: "s", user: "u" }).catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect(String((err as Error).message)).not.toContain(KEY);
      expect(String((err as Error).message)).not.toContain("internal detail");
    });

    it("treats network errors and unreadable replies as failures", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("socket"))));
      await expect(geminiProvider({ system: "s", user: "u" })).rejects.toThrow();
      vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
      await expect(geminiProvider({ system: "s", user: "u" })).rejects.toThrow();
    });
  });
});
