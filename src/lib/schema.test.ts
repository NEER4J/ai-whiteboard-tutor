import { describe, expect, it } from "vitest"
import { clipSchema, elementSchema, lessonRequestSchema } from "./schema"

describe("whiteboard elements", () => {
  it("accepts every element type", () => {
    const base = { id: "e", cue: "the thing" }
    const examples = [
      { type: "text", ...base, x: 1, y: 2, text: "hi" },
      { type: "arrow", ...base, x1: 0, y1: 0, x2: 5, y2: 5, label: "flow" },
      { type: "curve", ...base, x1: 0, y1: 0, x2: 5, y2: 5, bend: 40 },
      { type: "rect", ...base, x: 0, y: 0, w: 10, h: 10, label: "box" },
      { type: "circle", ...base, cx: 5, cy: 5, r: 4 },
      { type: "ellipse", ...base, cx: 5, cy: 5, rx: 6, ry: 3 },
      { type: "path", ...base, points: [[0, 0], [5, 5]] },
      { type: "axes", ...base, x: 0, y: 0, w: 10, h: 10 },
      { type: "icon", ...base, name: "sun", x: 0, y: 0 },
      { type: "note", ...base, x: 0, y: 0, w: 100, h: 60, text: "remember" },
      { type: "bars", ...base, x: 0, y: 0, w: 100, h: 60, values: [1, 2, 3] },
      { type: "brace", ...base, x1: 0, y1: 0, x2: 50, y2: 0 },
      { type: "highlight", ...base, target: "x", style: "box" },
    ]
    for (const e of examples) expect(elementSchema.safeParse(e).success, e.type).toBe(true)
  })

  it("rejects an unknown element type and an unknown icon", () => {
    expect(elementSchema.safeParse({ type: "dragon", id: "e", cue: "c" }).success).toBe(false)
    expect(elementSchema.safeParse({ type: "icon", id: "e", cue: "c", name: "unicorn", x: 0, y: 0 }).success).toBe(false)
  })
})

describe("clip and request schemas", () => {
  it("accepts a minimal clip, including an empty one (declined small talk)", () => {
    expect(clipSchema.safeParse({ title: "T", reply: "Hi", segments: [] }).success).toBe(true)
  })

  it("validates lesson requests", () => {
    expect(lessonRequestSchema.safeParse({ mode: "lesson", topic: "Why is the sky blue?", level: "beginner" }).success).toBe(true)
    expect(lessonRequestSchema.safeParse({ mode: "lesson", topic: "x", level: "beginner" }).success).toBe(false)
    expect(lessonRequestSchema.safeParse({ mode: "lesson", topic: "ok topic", level: "expert" }).success).toBe(false)
  })
})
