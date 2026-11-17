import { describe, expect, it } from "vitest"
import type { Segment } from "./schema"
import { buildTimeline, cueFraction, formatTime, segmentAt, visibleAt } from "./timeline"

const seg = (narration: string, elements: Segment["elements"] = [], newBoard = false, boardTitle?: string): Segment => ({
  newBoard,
  boardTitle,
  narration,
  elements,
})

const text = (id: string, cue: string) => ({ type: "text" as const, id, cue, x: 10, y: 10, text: id })

describe("cueFraction", () => {
  it("finds an exact cue and returns its relative position", () => {
    const f = cueFraction("Sunlight is a mix of every color of the rainbow.", "every color")
    expect(f).toBeGreaterThan(0.3)
    expect(f).toBeLessThan(0.7)
  })
  it("ignores case and punctuation", () => {
    expect(cueFraction("Hello, World!", "hello world")).toBe(0)
  })
  it("falls back to the first words when the cue is slightly off", () => {
    expect(cueFraction("a blue sky above", "blue skies overhead")).not.toBeNull()
  })
  it("returns null when the cue is not in the narration", () => {
    expect(cueFraction("a blue sky", "quantum entanglement")).toBeNull()
  })
})

describe("buildTimeline", () => {
  const segments = [
    seg("First we draw the sun and then the earth.", [text("sun", "the sun"), text("earth", "the earth")], true, "Intro"),
    seg("Next, a second board begins here.", [text("b2", "second board")], true, "Part two"),
  ]

  it("lays segments back to back using the measured durations", () => {
    const tl = buildTimeline(segments, [10, 6])
    expect(tl.segStarts).toEqual([0, 10])
    expect(tl.total).toBe(16)
    expect(tl.chapters.map((c) => c.title)).toEqual(["Intro", "Part two"])
  })

  it("starts each element when its cue phrase is spoken (earlier cue, earlier start)", () => {
    const tl = buildTimeline(segments, [10, 6])
    const sun = tl.byId.get("sun")!
    const earth = tl.byId.get("earth")!
    expect(sun.start).toBeLessThan(earth.start)
    expect(earth.start).toBeLessThan(10)
  })

  it("maps a time to its segment", () => {
    const tl = buildTimeline(segments, [10, 6])
    expect(segmentAt(tl, 3)).toBe(0)
    expect(segmentAt(tl, 12)).toBe(1)
  })
})

describe("visibleAt", () => {
  const segments = [
    seg("Draw the sun now.", [text("sun", "the sun")], true, "One"),
    seg("A new board starts.", [text("b2", "new board")], true, "Two"),
  ]
  const tl = buildTimeline(segments, [8, 8])

  it("shows nothing before an element's cue, and animates it afterwards", () => {
    expect(visibleAt(tl, 0).items).toHaveLength(0)
    const mid = visibleAt(tl, 4).items.find((i) => i.el.id === "sun")
    expect(mid).toBeDefined()
    expect(visibleAt(tl, 7.9).items.find((i) => i.el.id === "sun")!.progress).toBe(1)
  })

  it("wipes the previous board on a new board", () => {
    const second = visibleAt(tl, 12)
    expect(second.board).toBe(1)
    expect(second.items.every((i) => i.el.id !== "sun")).toBe(true)
  })
})

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(95)).toBe("1:35")
    expect(formatTime(-3)).toBe("0:00")
  })
})
