import { describe, expect, it } from "vitest"
import { checkTopic } from "./intent"

describe("checkTopic", () => {
  it.each(["hi", "Hello!", "hey there", "thanks", "ok", "test", "good morning"])("does not start a lesson for %j", (t) => {
    const r = checkTopic(t)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reply.length).toBeGreaterThan(10)
  })

  it.each(["what are you", "how are you", "who made you"])("answers questions about the tutor instead of teaching: %j", (t) => {
    expect(checkTopic(t).ok).toBe(false)
  })

  it.each(["a", "??", "qwrtp", "aaaaaa"])("rejects gibberish: %j", (t) => {
    expect(checkTopic(t).ok).toBe(false)
  })

  it.each(["Why is the sky blue?", "How do vaccines work", "photosynthesis", "the Pythagorean theorem", "What is AI?"])(
    "accepts a real topic: %j",
    (t) => {
      expect(checkTopic(t).ok).toBe(true)
    }
  )

  it("thanks gets a different reply than a greeting", () => {
    const a = checkTopic("thanks")
    const b = checkTopic("hi")
    expect(a.ok || b.ok).toBe(false)
    if (!a.ok && !b.ok) expect(a.reply).not.toBe(b.reply)
  })
})
