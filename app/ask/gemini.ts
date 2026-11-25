/**
 * Gemini provider (server only). Plain REST `generateContent` call — no SDK.
 *
 * Verified against the official Gemini API docs (Nov 2026):
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *   header x-goog-api-key; generationConfig.responseMimeType + responseJsonSchema.
 * Default model: gemini-3.5-flash-lite (stable Flash-Lite). No tools, so no
 * web search or browsing; thinking stays at the model's default (minimal).
 */

import "server-only";
import type { ModelReply, Provider } from "./answer";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const GOOGLE_HOST = "generativelanguage.googleapis.com";
const DEFAULT_BASE = `https://${GOOGLE_HOST}/v1beta`;
/** Whole call, including one retry: kept well inside a typical function limit. */
const TOTAL_BUDGET_MS = 14_000;
/** Longest a single attempt may run. */
const ATTEMPT_TIMEOUT_MS = 12_000;
/** Don't start a retry unless at least this long remains for it. */
const MIN_RETRY_ATTEMPT_MS = 5_000;
const DEFAULT_BACKOFF_MS = 1_000;
/** Only 429 (rate/quota) and 503 (overloaded) are retried — once. */
const TRANSIENT = new Set([429, 503]);
// Room for a fully cited list (one sentence + ids per item, up to 12).
const MAX_OUTPUT_TOKENS = 1024;

/**
 * Safe failure categories. Messages never contain the key, prompt,
 * question or provider response body.
 */
export type FailureCategory =
  | "config" // no key / disallowed host
  | "transient" // 429 or 503, after any allowed retry
  | "http" // other non-OK status (e.g. 400/403) — not retried
  | "timeout"
  | "network"
  | "malformed"; // finishReason not STOP, or reply not the expected JSON

export class ProviderError extends Error {
  constructor(
    readonly category: FailureCategory,
    readonly status?: number,
    readonly attempts = 1,
  ) {
    super(`gemini ${category}${status ? ` ${status}` : ""} after ${attempts} attempt(s)`);
  }
}

/** Retry-After as milliseconds: seconds or an HTTP date. */
export function retryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

/**
 * Where requests (and therefore the API key) go.
 * GEMINI_API_BASE_URL exists only so local tests can use a mock; it is
 * ignored entirely in production, so a stray setting can't redirect the key.
 */
export function resolveBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV === "production") return DEFAULT_BASE;
  return env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE;
}

/** The key may only be sent to Google's Gemini host outside tests. */
export function keyMayGoTo(url: string, env: NodeJS.ProcessEnv = process.env): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (host === GOOGLE_HOST) return true;
  // Non-production only: a loopback mock for tests.
  return env.NODE_ENV !== "production" && (host === "127.0.0.1" || host === "localhost");
}

// One entry per sentence, each with its own citations.
const SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "boolean" },
    sentences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
        required: ["text", "sourceIds"],
      },
    },
  },
  required: ["supported", "sentences"],
};

type Deps = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

const defaultDeps: Deps = {
  fetch: (...args) => fetch(...args),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};

export function createGeminiProvider(deps: Partial<Deps> = {}): Provider {
  const { fetch: doFetch, sleep, now } = { ...defaultDeps, ...deps };

  return async ({ system, user }) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new ProviderError("config");
    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
    const url = `${resolveBaseUrl()}/models/${encodeURIComponent(model)}:generateContent`;
    if (!keyMayGoTo(url)) throw new ProviderError("config");

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
    });

    const deadline = now() + TOTAL_BUDGET_MS;

    for (let attempt = 1; ; attempt++) {
      const remaining = deadline - now();
      let res: Response;
      try {
        res = await doFetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body,
          signal: AbortSignal.timeout(Math.max(1, Math.min(ATTEMPT_TIMEOUT_MS, remaining))),
          cache: "no-store",
        });
      } catch (e) {
        const timedOut = (e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError";
        throw new ProviderError(timedOut ? "timeout" : "network", undefined, attempt);
      }

      if (!res.ok) {
        if (!TRANSIENT.has(res.status)) throw new ProviderError("http", res.status, attempt);
        // One bounded retry, honouring Retry-After, only if it fits the budget.
        const wait = retryAfterMs(res.headers.get("retry-after"), now()) ?? DEFAULT_BACKOFF_MS;
        const left = deadline - now();
        if (attempt >= 2 || wait + MIN_RETRY_ATTEMPT_MS > left) {
          throw new ProviderError("transient", res.status, attempt);
        }
        await res.body?.cancel().catch(() => {});
        await sleep(wait);
        continue;
      }

      try {
        const data = await res.json();
        const cand = data?.candidates?.[0];
        if (!cand || cand.finishReason !== "STOP") throw new Error("incomplete");
        const text = (cand.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
        const parsed = JSON.parse(text) as ModelReply;
        if (typeof parsed?.supported !== "boolean") throw new Error("shape");
        return parsed;
      } catch {
        // A bad reply is not retried: it isn't a transient service problem.
        throw new ProviderError("malformed", undefined, attempt);
      }
    }
  };
}

export const geminiProvider: Provider = createGeminiProvider();
