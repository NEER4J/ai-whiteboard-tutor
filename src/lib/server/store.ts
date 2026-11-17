import "server-only"
import { createHash } from "node:crypto"

/**
 * Tiny counter store used for the free-tier caps that must survive incognito windows and be shared
 * across serverless instances.
 *
 * - With Upstash Redis / Vercel KV configured (UPSTASH_REDIS_REST_URL + _TOKEN, or KV_REST_API_URL + _TOKEN)
 *   counters live in Redis, so every instance sees the same numbers.
 * - Without it, counters live in this instance's memory: fine for local development, only a partial
 *   safeguard on serverless.
 */
/**
 * Finds the Redis REST credentials in the environment. Vercel's Upstash integration names them with an
 * optional custom prefix (KV_REST_API_URL, STORAGE_REST_API_URL, MYAPP_KV_REST_API_URL, ...), so match by suffix
 * instead of an exact name. The read-only token is never used.
 */
export function findRedisEnv(env: Record<string, string | undefined>) {
  const names = Object.keys(env)
  const url = names.find((k) => /(REST_API_URL|REDIS_REST_URL)$/.test(k) && env[k])
  const token = names.find((k) => /(REST_API_TOKEN|REDIS_REST_TOKEN)$/.test(k) && !/READ_ONLY/.test(k) && env[k])
  return { url: url ? env[url] : undefined, token: token ? env[token] : undefined }
}

const { url: URL_, token: TOKEN } = findRedisEnv(process.env)

export const sharedStoreConfigured = Boolean(URL_ && TOKEN)

const mem = new Map<string, { n: number; exp: number }>()

function memIncr(key: string, ttlSeconds: number) {
  const now = Date.now()
  const hit = mem.get(key)
  if (!hit || hit.exp <= now) {
    mem.set(key, { n: 1, exp: now + ttlSeconds * 1000 })
    if (mem.size > 20_000) for (const [k, v] of mem) if (v.exp <= now) mem.delete(k)
    return 1
  }
  hit.n += 1
  return hit.n
}

/** Atomically add one to a counter that expires after `ttlSeconds`; returns the new value. */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (URL_ && TOKEN) {
    try {
      const res = await fetch(`${URL_}/pipeline`, {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify([["INCR", key], ["EXPIRE", key, ttlSeconds, "NX"]]),
        cache: "no-store",
      })
      const data = (await res.json()) as { result?: unknown }[]
      const n = data?.[0]?.result
      if (typeof n === "number") return n
    } catch {
      // Store unreachable: fall back to memory rather than failing the request.
    }
  }
  return memIncr(key, ttlSeconds)
}

/** Stable, non-reversible id for an IP address (we never store raw IPs). */
export const hashIp = (ip: string) => createHash("sha256").update(`chalk:${ip}`).digest("hex").slice(0, 16)

export const today = () => new Date().toISOString().slice(0, 10)

export const DAY = 60 * 60 * 26

/** Test helper. */
export function _resetMemoryStore() {
  mem.clear()
}
