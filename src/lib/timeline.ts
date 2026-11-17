import type { BoardElement, Segment } from "./schema"

/**
 * Turns segments + per-segment narration durations into an absolute timeline.
 *
 * Sync model: inside a segment, narration time is treated as proportional to
 * character position. An element whose cue phrase starts 40% of the way into
 * the narration starts drawing 40% of the way into that segment's audio. When
 * real audio is available its measured duration is used, so drift is bounded
 * to a single segment (a few seconds of speech).
 */

const WORDS_PER_SECOND = 2.6

export function estimateDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1.5, words / WORDS_PER_SECOND + 0.5)
}

export type TimedElement = {
  el: BoardElement
  seg: number
  board: number
  start: number
  drawDur: number
}

export type Chapter = { board: number; title: string; start: number; firstSeg: number }

export type Timeline = {
  segStarts: number[]
  segDurs: number[]
  total: number
  boardOfSeg: number[]
  chapters: Chapter[]
  elements: TimedElement[]
  /** cue time of each element by id (for highlights) */
  byId: Map<string, TimedElement>
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** 0..1 position of `cue` inside `narration`, or null if it can't be found. */
export function cueFraction(narration: string, cue: string | undefined): number | null {
  if (!cue) return null
  const n = normalize(narration)
  const c = normalize(cue)
  if (!c || !n) return null
  let idx = n.indexOf(c)
  if (idx < 0) {
    // Fall back to the first two words of the cue, then the first word.
    const words = c.split(" ")
    for (const probe of [words.slice(0, 2).join(" "), words[0]]) {
      if (probe.length >= 3) {
        idx = n.indexOf(probe)
        if (idx >= 0) break
      }
    }
  }
  return idx < 0 ? null : idx / n.length
}

function drawDuration(el: BoardElement) {
  switch (el.type) {
    case "text":
      return clamp(el.text.length * 0.045, 0.4, 1.6)
    case "path":
      return clamp(el.points.length * 0.06, 0.6, 1.8)
    case "axes":
      return 1
    case "icon":
    case "note":
      return 1
    case "bars":
      return 1.4
    case "rect":
    case "circle":
      return 0.8
    default:
      return 0.6
  }
}

export function buildTimeline(segments: Segment[], durations: number[]): Timeline {
  const segStarts: number[] = []
  const boardOfSeg: number[] = []
  const chapters: Chapter[] = []
  const elements: TimedElement[] = []
  const byId = new Map<string, TimedElement>()
  let t = 0
  let board = -1

  segments.forEach((seg, i) => {
    const dur = durations[i] ?? estimateDuration(seg.narration)
    if (seg.newBoard || board < 0) {
      board++
      chapters.push({ board, title: seg.boardTitle?.trim() || `Part ${board + 1}`, start: t, firstSeg: i })
    }
    segStarts.push(t)
    boardOfSeg.push(board)

    const els = seg.elements ?? []
    els.forEach((el, k) => {
      const frac = cueFraction(seg.narration, el.cue) ?? ((k + 0.5) / (els.length + 0.5)) * 0.85
      const timed: TimedElement = {
        el,
        seg: i,
        board,
        start: t + Math.max(0, frac * dur - 0.15),
        drawDur: drawDuration(el),
      }
      elements.push(timed)
      byId.set(el.id, timed)
    })
    t += dur
  })

  return { segStarts, segDurs: segments.map((s, i) => durations[i] ?? estimateDuration(s.narration)), total: t, boardOfSeg, chapters, elements, byId }
}

export function segmentAt(tl: Timeline, time: number) {
  let lo = 0
  for (let i = 0; i < tl.segStarts.length; i++) if (tl.segStarts[i] <= time + 1e-6) lo = i
  return lo
}

export type VisibleElement = { el: BoardElement; progress: number; seg: number }

export function visibleAt(tl: Timeline, time: number): { board: number; items: VisibleElement[] } {
  if (!tl.segStarts.length) return { board: -1, items: [] }
  const seg = segmentAt(tl, time)
  const board = tl.boardOfSeg[seg]
  const items: VisibleElement[] = []
  for (const te of tl.elements) {
    if (te.board !== board || te.start > time) continue
    items.push({ el: te.el, seg: te.seg, progress: clamp((time - te.start) / te.drawDur, 0, 1) })
  }
  return { board, items }
}

/** Index of the word being spoken at `frac` of the narration (for captions). */
export function wordIndexAt(words: string[], frac: number) {
  const total = words.reduce((n, w) => n + w.length + 1, 0)
  let acc = 0
  const target = frac * total
  for (let i = 0; i < words.length; i++) {
    acc += words[i].length + 1
    if (acc > target) return i
  }
  return words.length - 1
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}
