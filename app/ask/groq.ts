/**
 * Groq fallback provider (server only). Used only when Gemini has failed.
 *
 * Verified against Groq's official docs (console.groq.com/docs, Nov 2026):
 *   POST https://api.groq.com/openai/v1/chat/completions
 *   Authorization: Bearer <key>
 *   Model openai/gpt-oss-20b — a production model with strict json_schema
 *   structured outputs (llama-3.x shut down 16 Aug 2026; qwen is preview).
 * One attempt, no retry, no tools (tool_choice defaults to none when no tools
 * are sent), so no web search or browsing.
 */

import "server-only";
import type { ModelReply, Provider } from "./answer";
import { ProviderError } from "./providerError";

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "openai/gpt-oss-20b";
const TIMEOUT_MS = 8_000;
/** Answer JSON plus the model's brief (low-effort) reasoning. */
const MAX_COMPLETION_TOKENS = 1_500;
/** Refuse to buffer anything larger than this from the provider. */
const MAX_RESPONSE_BYTES = 64_000;

export const groqConfigured = () => !!process.env.GROQ_API_KEY?.trim();

// Strict mode: every property required, no extra properties anywhere.
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
        additionalProperties: false,
      },
    },
  },
  required: ["supported", "sentences"],
  additionalProperties: false,
};

const fail = (category: ProviderError["category"], status?: number) =>
  new ProviderError(category, status, 1, "groq");

export function createGroqProvider(deps: { fetch?: typeof fetch } = {}): Provider {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return async ({ system, user }) => {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) throw fail("config");

    let res: Response;
    try {
      res = await doFetch(GROQ_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: `${system}\nReply only with JSON matching the schema.` },
            { role: "user", content: user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "grounded_answer", strict: true, schema: SCHEMA },
          },
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          temperature: 0.2,
          reasoning_effort: "low",
          stream: false,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (e) {
      const name = (e as Error)?.name;
      throw fail(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network");
    }

    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw fail(res.status === 429 || res.status === 503 ? "transient" : "http", res.status);
    }

    try {
      const raw = await res.text();
      if (raw.length > MAX_RESPONSE_BYTES) throw new Error("too large");
      const choice = JSON.parse(raw)?.choices?.[0];
      if (!choice || choice.finish_reason !== "stop") throw new Error("incomplete");
      const parsed = JSON.parse(String(choice.message?.content ?? "")) as ModelReply;
      if (typeof parsed?.supported !== "boolean") throw new Error("shape");
      return parsed;
    } catch {
      throw fail("malformed");
    }
  };
}

export const groqProvider: Provider = createGroqProvider();
