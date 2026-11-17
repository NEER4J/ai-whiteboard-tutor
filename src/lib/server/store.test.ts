import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { _resetMemoryStore, hashIp, incr, today } from "./store"

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
