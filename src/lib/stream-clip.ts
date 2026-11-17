"use client"

import { parsePartialJson } from "ai"
import { keyHeaders } from "./byok"
import { BOARD_H, BOARD_W, elementSchema, type BoardElement, type LessonRequest, type Segment } from "./schema"

export type ClipUpdate = {
  title?: string
  reply?: string
  segments: Segment[]
  done: boolean
  mode: "live" | "sample"
}

/** The free allowance is used up: the learner needs to add their own key. */
export class QuotaError extends Error {
  constructor(message: string, readonly kind: "quota" | "ip" | "capacity" = "quota") {
    super(message)
  }
}

const ERROR_MARK = "\u0000ERROR:"

/**
 * POSTs to /api/lesson and calls `onUpdate` with the partial clip as JSON
 * streams in. The last (still-being-written) segment is included but callers
 * only play segments that are complete (see Player.setContent).
 */
export async function streamClip(
  body: LessonRequest,
  onUpdate: (u: ClipUpdate) => void,
  signal?: AbortSignal
): Promise<ClipUpdate> {
  const res = await fetch("/api/lesson", {
    method: "POST",
    headers: { "content-type": "application/json", ...keyHeaders() },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => null)
    if (res.status === 402 || err?.code === "quota_exceeded") throw new QuotaError(err?.error ?? "Free allowance used.", err?.kind === "ip" || err?.kind === "capacity" ? err.kind : "quota")
    throw new Error(err?.error ?? `Request failed (${res.status})`)
  }
  const mode = res.headers.get("x-tutor-mode") === "sample" ? "sample" : "live"
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  let last: ClipUpdate = { segments: [], done: false, mode }
  let parsing = false

  const parse = async (done: boolean) => {
    const { value } = await parsePartialJson(text)
    const obj = (value ?? {}) as Record<string, unknown>
    const rawSegs = Array.isArray(obj.segments) ? obj.segments : []
    last = {
      title: typeof obj.title === "string" ? obj.title : undefined,
      reply: typeof obj.reply === "string" ? obj.reply : undefined,
      segments: rawSegs.map((s, i) => normalizeSegment(s, i)).filter((s): s is Segment => !!s),
      done,
      mode,
    }
    onUpdate(last)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    const errAt = text.indexOf(ERROR_MARK)
    if (errAt >= 0) throw new Error(text.slice(errAt + ERROR_MARK.length) || "Generation failed")
    if (!parsing) {
      parsing = true
      await parse(false)
      parsing = false
    }
  }
  await parse(true)
  if (!last.segments.length && !last.reply) throw new Error("The tutor returned an empty lesson. Please try again.")
  return last
}

/** Defensive cleanup of model output: drop invalid elements, clamp coordinates. */
function normalizeSegment(raw: unknown, index: number): Segment | null {
  if (!raw || typeof raw !== "object") return null
  const s = raw as Record<string, unknown>
  if (typeof s.narration !== "string" || !s.narration.trim()) return null
  const elements: BoardElement[] = []
  for (const e of Array.isArray(s.elements) ? s.elements : []) {
    const parsed = elementSchema.safeParse(e)
    if (parsed.success) elements.push(clampElement(parsed.data))
  }
  return {
    newBoard: index === 0 ? true : s.newBoard === true,
    boardTitle: typeof s.boardTitle === "string" ? s.boardTitle : undefined,
    narration: s.narration.trim(),
    elements,
  }
}

const cx = (v: number) => Math.min(BOARD_W - 10, Math.max(10, v))
const cy = (v: number) => Math.min(BOARD_H - 10, Math.max(10, v))

function clampElement(el: BoardElement): BoardElement {
  switch (el.type) {
    case "text":
      return { ...el, x: cx(el.x), y: cy(el.y) }
    case "line":
    case "arrow":
      return { ...el, x1: cx(el.x1), y1: cy(el.y1), x2: cx(el.x2), y2: cy(el.y2) }
    case "rect":
      return { ...el, x: cx(el.x), y: cy(el.y), w: Math.max(4, Math.min(el.w, BOARD_W - el.x)), h: Math.max(4, Math.min(el.h, BOARD_H - el.y)) }
    case "circle":
      return { ...el, cx: cx(el.cx), cy: cy(el.cy), r: Math.max(2, Math.min(el.r, 280)) }
    case "path":
      return {
        ...el,
        points: el.points.filter((p) => p.length >= 2 && p.every(Number.isFinite)).map(([x, y]) => [cx(x), cy(y)]),
      }
    case "axes":
      return { ...el, x: cx(el.x), y: cy(el.y) }
    case "icon":
      return { ...el, x: cx(el.x), y: cy(el.y) }
    case "sketch":
      return { ...el, x: cx(el.x), y: cy(el.y), w: Math.max(40, Math.min(el.w, BOARD_W - el.x)), h: Math.max(40, Math.min(el.h, BOARD_H - el.y)) }
    case "ellipse":
      return { ...el, cx: cx(el.cx), cy: cy(el.cy), rx: Math.max(4, Math.min(el.rx, 400)), ry: Math.max(4, Math.min(el.ry, 280)) }
    case "curve":
    case "brace":
      return { ...el, x1: cx(el.x1), y1: cy(el.y1), x2: cx(el.x2), y2: cy(el.y2) }
    case "note":
      return { ...el, x: cx(el.x), y: cy(el.y), w: Math.max(80, Math.min(el.w, BOARD_W - el.x)), h: Math.max(50, Math.min(el.h, BOARD_H - el.y)) }
    case "bars":
      return { ...el, x: cx(el.x), y: cy(el.y), values: el.values.slice(0, 7).map((v) => (Number.isFinite(v) ? v : 0)) }
    default:
      return el
  }
}
