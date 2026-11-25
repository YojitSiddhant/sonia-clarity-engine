/**
 * Small in-memory rate limiter for /api/ask.
 *
 * LIMITATION — read before relying on it: state lives in one server
 * process. On serverless hosts each instance keeps its own counts, so this
 * is NOT a global cap. Treat it as a speed bump; the real spending ceiling
 * is the quota/budget configured on the Gemini API key in Google AI Studio.
 * A true shared limit would need external storage (e.g. a KV store), which
 * is deliberately not added here.
 */

import { createHash, randomBytes } from "node:crypto";

export type Window = { ms: number; max: number };

/**
 * Which request header (if any) is trustworthy for the visitor's IP.
 * - On Vercel, `x-vercel-forwarded-for` is set by Vercel from the TCP
 *   connection and overwrites any client value, so it can't be spoofed
 *   when Vercel is the edge.
 * - Elsewhere, an operator can name the header their own proxy sets via
 *   TRUSTED_IP_HEADER.
 * - Otherwise (local dev, unknown hosts) no header is trusted: every
 *   request shares one bucket, so spoofed headers can't create new ones.
 */
export function trustedIpHeader(env: NodeJS.ProcessEnv = process.env): string | null {
  const named = env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (named) return named;
  if (env.VERCEL === "1") return "x-vercel-forwarded-for";
  return null;
}

const SHARED = "shared";

export function clientId(headers: Headers, env: NodeJS.ProcessEnv = process.env): string {
  const name = trustedIpHeader(env);
  if (!name) return SHARED;
  const value = headers.get(name)?.split(",")[0]?.trim();
  return value && value.length <= 64 ? value : SHARED;
}

export function createRateLimiter(opts: {
  perClient: Window[];
  /** all clients together, per instance */
  perInstance: Window;
  /** most distinct clients remembered at once */
  maxClients: number;
}) {
  const salt = randomBytes(16).toString("hex"); // per process; never stored
  const longest = Math.max(...opts.perClient.map((w) => w.ms));
  // Map keeps insertion order; re-inserting on use makes it least-recently-used.
  const clients = new Map<string, number[]>();
  let instance: number[] = [];

  const hash = (id: string) => createHash("sha256").update(salt + id).digest("hex");

  /** true when this request should be refused */
  function limited(id: string, now = Date.now()): boolean {
    instance = instance.filter((t) => now - t < opts.perInstance.ms);
    if (instance.length >= opts.perInstance.max) return true;

    const key = hash(id);
    const recent = (clients.get(key) ?? []).filter((t) => now - t < longest);
    clients.delete(key);
    const over = opts.perClient.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
    if (!over) {
      recent.push(now);
      instance.push(now);
    }
    clients.set(key, recent);

    // Bound memory: evict least-recently-used clients beyond the cap.
    while (clients.size > opts.maxClients) {
      const oldest = clients.keys().next().value as string;
      clients.delete(oldest);
    }
    return over;
  }

  return { limited, size: () => clients.size };
}
