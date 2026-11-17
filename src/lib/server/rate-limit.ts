import "server-only"

/**
 * Best-effort, per-instance sliding-window limiter. It keeps a public demo from
 * being drained by one visitor; it is not a substitute for a shared store
 * (Redis/KV) in a production deployment.
 */
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) }
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) buckets.clear()
  return { ok: true, retryAfter: 0 }
}
