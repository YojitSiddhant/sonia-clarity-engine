/**
 * POST /api/ask  { question }  → a source-grounded answer.
 * GET  /api/ask                → { enabled } (is a server key configured?)
 *
 * The Gemini key stays on the server. Nothing is stored: no question logs,
 * no IP logs. The rate limiter keeps only salted hashes in memory, briefly,
 * and trusts a client-IP header only where the host guarantees it.
 */

import { connection } from "next/server";
import { AnswerFailure, answerQuestion, cleanQuestion, MAX_QUESTION } from "../../ask/answer";
import { geminiConfigured, geminiProvider } from "../../ask/gemini";
import { groqConfigured, groqProvider } from "../../ask/groq";
import { describeFailure } from "../../ask/providerError";
import { clientId, createRateLimiter } from "../../ask/rateLimit";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

// Per instance only — see app/ask/rateLimit.ts. The real spending ceiling is
// the quota set on the Gemini API key.
const limiter = createRateLimiter({
  perClient: [
    { ms: 60_000, max: 5 },
    { ms: 3_600_000, max: 20 },
  ],
  perInstance: { ms: 60_000, max: 30 },
  maxClients: 1_000,
});

export async function GET() {
  await connection(); // read the env at request time, not at build time
  return json({ enabled: geminiConfigured() });
}

export async function POST(request: Request) {
  if (!geminiConfigured()) {
    return json(
      { state: "setup", message: "Ask the Clarity Engine isn’t set up on this deployment yet." },
      503,
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2_000) throw new Error("too large");
    body = JSON.parse(raw);
  } catch {
    return json({ state: "invalid", message: "Please send a short question." }, 400);
  }

  const question = cleanQuestion((body as { question?: unknown })?.question);
  if (!question) {
    return json(
      { state: "invalid", message: `Please ask a question between 3 and ${MAX_QUESTION} characters.` },
      400,
    );
  }

  if (limiter.limited(clientId(request.headers))) {
    return json(
      { state: "limited", message: "That’s a lot of questions in a short time. Please try again in a minute." },
      429,
    );
  }

  // Groq is a fallback only when its key is configured on the server.
  const fallback = groqConfigured() ? groqProvider : undefined;
  let primaryFailed: unknown;
  const primary: typeof geminiProvider = async (prompt) => {
    try {
      return await geminiProvider(prompt);
    } catch (e) {
      primaryFailed = e;
      throw e;
    }
  };

  try {
    const result = await answerQuestion(question, primary, fallback);
    if (primaryFailed) {
      console.warn(`[ask] provider failure ${describeFailure(primaryFailed)}; answered by fallback=groq`);
    }
    return json(result);
  } catch (e) {
    // Safe lines only: categories, HTTP status, attempts. Never a key, prompt,
    // visitor question or provider response.
    const primaryInfo = describeFailure(e instanceof AnswerFailure ? e.primary : e);
    const fallbackInfo =
      e instanceof AnswerFailure && e.fallback !== undefined
        ? `; fallback=groq ${e.fallback === "invalid" ? "category=invalid-answer" : describeFailure(e.fallback)}`
        : "";
    console.warn(`[ask] provider failure ${primaryInfo}${fallbackInfo}`);
    // Never pass provider details, prompts or stack traces to the browser.
    return json(
      { state: "error", message: "The Clarity Engine couldn’t answer just now. Please try again shortly." },
      502,
    );
  }
}
