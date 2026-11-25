/**
 * Safe provider-failure description shared by the Gemini and Groq providers.
 * Messages never contain an API key, prompt, visitor question or response body.
 */

export type ProviderName = "gemini" | "groq";

export type FailureCategory =
  | "config" // no key / disallowed host
  | "transient" // 429 or 503, after any allowed retry
  | "http" // other non-OK status (e.g. 400/403) — not retried
  | "timeout"
  | "network"
  | "malformed"; // incomplete reply, or not the expected JSON

export class ProviderError extends Error {
  constructor(
    readonly category: FailureCategory,
    readonly status?: number,
    readonly attempts = 1,
    readonly provider: ProviderName = "gemini",
  ) {
    super(`${provider} ${category}${status ? ` ${status}` : ""} after ${attempts} attempt(s)`);
  }
}

const isProviderError = (e: unknown): e is ProviderError =>
  e instanceof ProviderError ||
  (e instanceof Error && typeof (e as ProviderError).category === "string" && typeof (e as ProviderError).attempts === "number");

/** "category=… status=… attempts=…" — safe to log. Unknown errors log no detail. */
export const describeFailure = (e: unknown) =>
  isProviderError(e)
    ? `category=${e.category} status=${e.status ?? "-"} attempts=${e.attempts}`
    : "category=unexpected";
