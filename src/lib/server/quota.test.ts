import { afterEach, describe, expect, it, vi } from "vitest"
import { FREE_PROMPTS, promptsUsed, quotaSummary, readUsage, ttsAllowance, usageCookie } from "./quota"

const req = (cookie?: string) => new Request("https://example.com/api/lesson", { headers: cookie ? { cookie } : {} })
const cookieValue = (setCookie: string) => setCookie.split(";")[0]

describe("usage cookie", () => {
  it("starts empty when there is no cookie", () => {
    expect(readUsage(req())).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })

  it("round-trips a signed cookie", () => {
    const header = usageCookie({ lessons: 3, followups: 5, tts: 20 }, true)
    expect(header).toMatch(/HttpOnly/)
    expect(header).toMatch(/Secure/)
    expect(readUsage(req(cookieValue(header)))).toEqual({ lessons: 3, followups: 5, tts: 20 })
  })

  it("ignores a cookie whose numbers were edited (bad signature)", () => {
    const signed = cookieValue(usageCookie({ lessons: 9, followups: 0, tts: 0 }, false))
    const forged = signed.replace("=9.", "=0.")
    expect(readUsage(req(forged))).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })

  it("ignores garbage", () => {
    expect(readUsage(req("chalk_usage=banana"))).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })
})

describe("daily reset", () => {
  afterEach(() => vi.useRealTimers())

  it("starts fresh the next day (UTC), even with a valid signed cookie", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-17T20:00:00Z"))
    const header = usageCookie({ lessons: 4, followups: 5, tts: 9 }, false)
    expect(readUsage(req(cookieValue(header)))).toEqual({ lessons: 4, followups: 5, tts: 9 })
    vi.setSystemTime(new Date("2026-11-18T00:30:00Z"))
    expect(readUsage(req(cookieValue(header)))).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })
})

describe("free allowance", () => {
  it("is one shared budget across lessons and follow-ups, 10 a day by default", () => {
    expect(promptsUsed({ lessons: FREE_PROMPTS - 4, followups: 4, tts: 0 })).toBe(FREE_PROMPTS)
    expect(FREE_PROMPTS).toBe(10)
    expect(quotaSummary({ lessons: 2, followups: 3, tts: 0 })).toEqual({ prompts: { used: 5, limit: FREE_PROMPTS } })
  })

  it("only allows narration audio in proportion to prompts used", () => {
    expect(ttsAllowance({ lessons: 0, followups: 0, tts: 0 })).toBeLessThan(ttsAllowance({ lessons: 1, followups: 0, tts: 0 }))
  })
})
