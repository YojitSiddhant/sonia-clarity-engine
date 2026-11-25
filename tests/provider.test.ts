import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGeminiProvider, ProviderError, retryAfterMs } from "../app/ask/gemini";

// Fake fetch, clock and sleep: no network, no real waiting, no Gemini calls.
const KEY = "dummy-test-key-not-real";
const good = () =>
  new Response(
    JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ supported: false, sentences: [] }) }] } }],
    }),
    { status: 200 },
  );
const status = (code: number, headers: Record<string, string> = {}) =>
  new Response('{"error":{"message":"internal provider detail"}}', { status: code, headers });

function setup(responses: Array<Response | Error>) {
  let clock = 0;
  const waits: number[] = [];
  const fetchMock = vi.fn(async () => {
    const next = responses.shift()!;
    if (next instanceof Error) throw next;
    return next;
  });
  const provider = createGeminiProvider({
    fetch: fetchMock as unknown as typeof fetch,
    now: () => clock,
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
  });
  const call = () => provider({ system: "s", user: "u" });
  return { call, fetchMock, waits };
}

const failure = async (p: Promise<unknown>) => {
  const e = await p.catch((err) => err);
  expect(e).toBeInstanceOf(ProviderError);
  return e as ProviderError;
};

describe("Gemini provider retries", () => {
  beforeEach(() => vi.stubEnv("GEMINI_API_KEY", KEY));
  afterEach(() => vi.unstubAllEnvs());

  it("retries a transient 503 once and succeeds", async () => {
    const { call, fetchMock, waits } = setup([status(503), good()]);
    await expect(call()).resolves.toEqual({ supported: false, sentences: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([1000]);
  });

  it("honours Retry-After on a 429 before retrying", async () => {
    const { call, waits } = setup([status(429, { "retry-after": "2" }), good()]);
    await call();
    expect(waits).toEqual([2000]);
  });

  it("gives up after one retry (exhausted) with a transient category", async () => {
    const { call, fetchMock } = setup([status(503), status(503)]);
    const e = await failure(call());
    expect(e.category).toBe("transient");
    expect(e.status).toBe(503);
    expect(e.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry when Retry-After would not fit in the time budget", async () => {
    const { call, fetchMock, waits } = setup([status(429, { "retry-after": "30" }), good()]);
    const e = await failure(call());
    expect(e.category).toBe("transient");
    expect(e.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(waits).toEqual([]);
  });

  it("does not retry permanent HTTP errors", async () => {
    for (const code of [400, 401, 403, 404, 500]) {
      const { call, fetchMock } = setup([status(code), good()]);
      const e = await failure(call());
      expect([e.category, e.status, fetchMock.mock.calls.length]).toEqual(["http", code, 1]);
    }
  });

  it("reports a timeout without retrying", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const { call, fetchMock } = setup([timeout, good()]);
    const e = await failure(call());
    expect(e.category).toBe("timeout");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports network errors and malformed replies without retrying", async () => {
    const net = setup([new Error("socket hang up"), good()]);
    expect((await failure(net.call())).category).toBe("network");
    expect(net.fetchMock).toHaveBeenCalledTimes(1);

    const cut = setup([
      new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"supp' }] } }] })),
      good(),
    ]);
    expect((await failure(cut.call())).category).toBe("malformed");
    expect(cut.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never includes the key or provider text in its error message", async () => {
    const { call } = setup([status(503), status(503)]);
    const e = await failure(call());
    expect(e.message).not.toContain(KEY);
    expect(e.message).not.toContain("internal provider detail");
    expect(e.message).toMatch(/^gemini transient 503 after 2 attempt/);
  });

  it("reports a missing key as configuration, without calling out", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { call, fetchMock } = setup([good()]);
    expect((await failure(call())).category).toBe("config");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("retryAfterMs", () => {
  it("parses seconds and HTTP dates, and ignores junk", () => {
    expect(retryAfterMs("3")).toBe(3000);
    expect(retryAfterMs(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(retryAfterMs("soon")).toBeNull();
    expect(retryAfterMs(null)).toBeNull();
  });
});
