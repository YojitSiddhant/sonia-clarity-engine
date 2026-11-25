/**
 * POST /api/ask  { question }  → a source-grounded answer.
 * GET  /api/ask                → { enabled } (is a server key configured?)
 *
 * The Gemini key stays on the server. Nothing is stored: no question logs,
 * no IP logs. The rate limiter keeps only salted hashes in memory, briefly.
 */

import { createHash, randomBytes } from "node:crypto";
import { connection } from "next/server";
import { answerQuestion, cleanQuestion, MAX_QUESTION } from "../../ask/answer";
import { geminiConfigured, geminiProvider } from "../../ask/gemini";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

// ── modest per-IP limit for a demo: 5 a minute, 20 an hour ──────────
const WINDOWS = [
  { ms: 60_000, max: 5 },
  { ms: 3_600_000, max: 20 },
];
const SALT = randomBytes(16).toString("hex"); // per process; never stored
const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local";
  const key = createHash("sha256").update(SALT + ip).digest("hex");
  const now = Date.now();
  const longest = WINDOWS[WINDOWS.length - 1].ms;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);
  const over = WINDOWS.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
  if (!over) recent.push(now);
  hits.set(key, recent);
  // Drop idle entries so memory stays small.
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => now - t < longest)) hits.delete(k);
  return over;
}

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

  if (limited(request)) {
    return json(
      { state: "limited", message: "That’s a lot of questions in a short time. Please try again in a minute." },
      429,
    );
  }

  try {
    return json(await answerQuestion(question, geminiProvider));
  } catch {
    // Never pass provider details, prompts or stack traces to the browser.
    return json(
      { state: "error", message: "The Clarity Engine couldn’t answer just now. Please try again shortly." },
      502,
    );
  }
}
