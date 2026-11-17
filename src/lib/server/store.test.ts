import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { _resetMemoryStore, findRedisEnv, hashIp, incr, today } from "./store"

describe("counter store (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    _resetMemoryStore()
  })
  afterEach(() => vi.useRealTimers())

  it("counts up per key", async () => {
    expect(await incr("a", 60)).toBe(1)
    expect(await incr("a", 60)).toBe(2)
    expect(await incr("b", 60)).toBe(1)
  })

  it("expires after the ttl", async () => {
    await incr("a", 10)
    await incr("a", 10)
    vi.advanceTimersByTime(11_000)
    expect(await incr("a", 10)).toBe(1)
  })
})

describe("helpers", () => {
  it("hashes IPs consistently without exposing them", () => {
    expect(hashIp("203.0.113.9")).toBe(hashIp("203.0.113.9"))
    expect(hashIp("203.0.113.9")).not.toBe(hashIp("203.0.113.10"))
    expect(hashIp("203.0.113.9")).not.toContain("203")
  })
  it("formats today as a date key", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("findRedisEnv", () => {
  it("finds the standard Vercel KV / Upstash names", () => {
    expect(findRedisEnv({ KV_REST_API_URL: "https://x", KV_REST_API_TOKEN: "t" })).toEqual({ url: "https://x", token: "t" })
    expect(findRedisEnv({ UPSTASH_REDIS_REST_URL: "https://y", UPSTASH_REDIS_REST_TOKEN: "u" })).toEqual({ url: "https://y", token: "u" })
  })

  it("finds credentials created with a custom prefix", () => {
    expect(findRedisEnv({ STORAGE_REST_API_URL: "https://z", STORAGE_REST_API_TOKEN: "v" })).toEqual({ url: "https://z", token: "v" })
    expect(findRedisEnv({ CHALK_KV_REST_API_URL: "https://z", CHALK_KV_REST_API_TOKEN: "v" })).toEqual({ url: "https://z", token: "v" })
  })

  it("never picks the read-only token", () => {
    const r = findRedisEnv({ KV_REST_API_URL: "https://x", KV_REST_API_READ_ONLY_TOKEN: "ro", KV_REST_API_TOKEN: "rw" })
    expect(r.token).toBe("rw")
  })

  it("returns nothing when Redis is not configured", () => {
    expect(findRedisEnv({ NODE_ENV: "test" })).toEqual({ url: undefined, token: undefined })
  })
})
