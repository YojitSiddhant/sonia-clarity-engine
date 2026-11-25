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
const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 400;

export class ProviderError extends Error {}

export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

const SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "boolean" },
    answer: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
  },
  required: ["supported", "answer", "sourceIds"],
};

export const geminiProvider: Provider = async ({ system, user }) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new ProviderError("not configured");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  // GEMINI_API_BASE_URL exists only so tests can point at a local mock.
  const base = process.env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE;

  let res: Response;
  try {
    res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: SCHEMA,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ProviderError("request failed or timed out");
  }
  if (!res.ok) throw new ProviderError(`status ${res.status}`);

  try {
    const data = await res.json();
    const cand = data?.candidates?.[0];
    if (!cand || cand.finishReason !== "STOP") throw new Error("incomplete");
    const text = (cand.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    const parsed = JSON.parse(text) as ModelReply;
    if (typeof parsed?.supported !== "boolean") throw new Error("shape");
    return parsed;
  } catch {
    throw new ProviderError("unreadable response");
  }
};
