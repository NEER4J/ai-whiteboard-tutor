import { describe, expect, it } from "vitest"
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
    const signed = cookieValue(usageCookie({ lessons: 15, followups: 0, tts: 0 }, false))
    const forged = signed.replace("=15.", "=0.")
    expect(readUsage(req(forged))).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })

  it("ignores garbage", () => {
    expect(readUsage(req("chalk_usage=banana"))).toEqual({ lessons: 0, followups: 0, tts: 0 })
  })
})

describe("free allowance", () => {
  it("is one shared budget across lessons and follow-ups", () => {
    expect(promptsUsed({ lessons: 8, followups: 8, tts: 0 })).toBe(FREE_PROMPTS)
    expect(quotaSummary({ lessons: 2, followups: 3, tts: 0 })).toEqual({ prompts: { used: 5, limit: FREE_PROMPTS } })
  })

  it("only allows narration audio in proportion to prompts used", () => {
    expect(ttsAllowance({ lessons: 0, followups: 0, tts: 0 })).toBeLessThan(ttsAllowance({ lessons: 1, followups: 0, tts: 0 }))
  })
})
