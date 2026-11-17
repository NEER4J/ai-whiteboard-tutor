import rough from "roughjs"
import type { Options } from "roughjs/bin/core"
import type { BoardColor, BoardElement } from "@/lib/schema"

/**
 * Converts board elements into SVG stroke paths (via rough.js, for a
 * hand-drawn look) and text runs. Each stroke is drawn progressively with
 * stroke-dashoffset, so an element's appearance is a function of 0..1 progress.
 */

export type Stroke = { d: string; color: BoardColor; width: number; fill: boolean }
export type TextRun = {
  x: number
  y: number
  lines: string[]
  size: number
  anchor: "start" | "middle" | "end"
  color: BoardColor
}
export type BBox = { x: number; y: number; w: number; h: number }
export type Shape = { strokes: Stroke[]; texts: TextRun[]; bbox: BBox }

export const FONT_PX = { sm: 22, md: 28, lg: 36, xl: 48 } as const
/** Approximate glyph width of the handwriting font, as a fraction of font size. */
const CHAR_W = 0.46
const LINE_H = 1.25

const gen = rough.generator()

function seedOf(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (Math.abs(h) % 2_000_000) + 1
}

function opts(id: string, extra: Options = {}): Options {
  return {
    roughness: 0.9,
    bowing: 0.7,
    strokeWidth: 2.6,
    seed: seedOf(id),
    disableMultiStroke: true,
    disableMultiStrokeFill: true,
    preserveVertices: true,
    ...extra,
  }
}

type Drawable = ReturnType<typeof gen.line>

function toStrokes(d: Drawable, color: BoardColor, width = 2.6): Stroke[] {
  const out: Stroke[] = []
  for (const set of d.sets) {
    const path = gen.opsToPath(set, 1)
    if (!path) continue
    const fill = set.type !== "path"
    // Split into sub-paths so each one animates from its own start.
    for (const sub of path.split(/(?=M)/)) if (sub.trim()) out.push({ d: sub, color, width: fill ? 1.4 : width, fill })
  }
  return out
}

export function wrapText(text: string, maxChars: number) {
  const lines: string[] = []
  for (const raw of text.split("\n")) {
    const words = raw.split(/\s+/).filter(Boolean)
    let line = ""
    for (const w of words) {
      if (line && (line + " " + w).length > maxChars) {
        lines.push(line)
        line = w
      } else line = line ? `${line} ${w}` : w
    }
    lines.push(line)
  }
  return lines
}

function textBox(t: TextRun): BBox {
  const width = Math.max(...t.lines.map((l) => l.length)) * t.size * CHAR_W
  const x = t.anchor === "middle" ? t.x - width / 2 : t.anchor === "end" ? t.x - width : t.x
  return { x, y: t.y - t.size * 0.85, w: width, h: t.size * LINE_H * (t.lines.length - 1) + t.size * 1.1 }
}

function fitLabel(label: string, x: number, y: number, maxW: number, color: BoardColor): TextRun {
  const size = Math.max(16, Math.min(FONT_PX.md, maxW / Math.max(1, label.length * CHAR_W)))
  const maxChars = Math.max(6, Math.floor(maxW / (size * CHAR_W)))
  const lines = wrapText(label, maxChars)
  const blockH = size * LINE_H * (lines.length - 1)
  return { x, y: y + size * 0.35 - blockH / 2, lines, size, anchor: "middle", color }
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, id: string, color: BoardColor) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const len = 16
  const p1: [number, number] = [x2 - len * Math.cos(a - 0.45), y2 - len * Math.sin(a - 0.45)]
  const p2: [number, number] = [x2 - len * Math.cos(a + 0.45), y2 - len * Math.sin(a + 0.45)]
  return toStrokes(gen.linearPath([p1, [x2, y2], p2], opts(id + ":h", { roughness: 0.4 })), color)
}

function union(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

const cache = new Map<string, Shape>()

/** Builds (and caches) the drawable shape for an element. */
export function shapeOf(el: BoardElement, lookup: (id: string) => BoardElement | undefined): Shape {
  const target = el.type === "highlight" ? lookup(el.target) : undefined
  const key = JSON.stringify(el) + (target ? JSON.stringify(target) : "")
  const hit = cache.get(key)
  if (hit) return hit
  const shape = build(el, target, lookup)
  if (cache.size > 2000) cache.clear()
  cache.set(key, shape)
  return shape
}

function build(el: BoardElement, target: BoardElement | undefined, lookup: (id: string) => BoardElement | undefined): Shape {
  const color: BoardColor = el.color ?? "ink"
  switch (el.type) {
    case "text": {
      const size = FONT_PX[el.size ?? "md"]
      const anchor = el.align ?? "start"
      const room = anchor === "middle" ? Math.min(el.x, 1000 - el.x) * 2 : anchor === "end" ? el.x - 30 : 980 - el.x
      const lines = wrapText(el.text, Math.max(8, Math.floor(room / (size * CHAR_W))))
      const run: TextRun = { x: el.x, y: el.y, lines, size, anchor, color }
      return { strokes: [], texts: [run], bbox: textBox(run) }
    }
    case "line":
    case "arrow": {
      const strokes = toStrokes(
        gen.line(el.x1, el.y1, el.x2, el.y2, opts(el.id, el.dashed ? { strokeLineDash: [10, 8] } : {})),
        color
      )
      if (el.type === "arrow") strokes.push(...arrowHead(el.x1, el.y1, el.x2, el.y2, el.id, color))
      let bbox: BBox = {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        w: Math.abs(el.x2 - el.x1),
        h: Math.abs(el.y2 - el.y1),
      }
      const texts: TextRun[] = []
      if (el.label) {
        const mx = (el.x1 + el.x2) / 2
        const my = (el.y1 + el.y2) / 2
        const steep = Math.abs(el.y2 - el.y1) > Math.abs(el.x2 - el.x1)
        const run: TextRun = {
          x: steep ? mx + 12 : mx,
          y: steep ? my : my - 12,
          lines: [el.label],
          size: FONT_PX.sm,
          anchor: steep ? "start" : "middle",
          color,
        }
        texts.push(run)
        bbox = union(bbox, textBox(run))
      }
      return { strokes, texts, bbox }
    }
    case "rect": {
      const strokes = toStrokes(
        gen.rectangle(el.x, el.y, el.w, el.h, opts(el.id, el.fill ? { fill: "x", fillStyle: "hachure", hachureGap: 9 } : {})),
        color
      )
      const texts = el.label ? [fitLabel(el.label, el.x + el.w / 2, el.y + el.h / 2, el.w - 20, "ink")] : []
      return { strokes, texts, bbox: { x: el.x, y: el.y, w: el.w, h: el.h } }
    }
    case "circle": {
      const strokes = toStrokes(
        gen.circle(el.cx, el.cy, el.r * 2, opts(el.id, el.fill ? { fill: "x", fillStyle: "hachure", hachureGap: 8 } : {})),
        color
      )
      const texts = el.label ? [fitLabel(el.label, el.cx, el.cy, el.r * 1.6, "ink")] : []
      return { strokes, texts, bbox: { x: el.cx - el.r, y: el.cy - el.r, w: el.r * 2, h: el.r * 2 } }
    }
    case "path": {
      const pts = el.points.map(([x, y]) => [x, y] as [number, number])
      if (pts.length < 2) return { strokes: [], texts: [], bbox: { x: 0, y: 0, w: 0, h: 0 } }
      const o = opts(el.id, el.fill && el.closed ? { fill: "x", fillStyle: "hachure", hachureGap: 9 } : { roughness: 0.6 })
      const d = el.closed
        ? el.smooth
          ? gen.curve([...pts, pts[0]], o)
          : gen.polygon(pts, o)
        : el.smooth && pts.length > 2
          ? gen.curve(pts, o)
          : gen.linearPath(pts, o)
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
      return { strokes: toStrokes(d, color), texts: [], bbox }
    }
    case "axes": {
      const strokes = [
        ...toStrokes(gen.line(el.x, el.y, el.x + el.w, el.y, opts(el.id + "x", { roughness: 0.5 })), color),
        ...arrowHead(el.x, el.y, el.x + el.w, el.y, el.id + "x", color),
        ...toStrokes(gen.line(el.x, el.y, el.x, el.y - el.h, opts(el.id + "y", { roughness: 0.5 })), color),
        ...arrowHead(el.x, el.y, el.x, el.y - el.h, el.id + "y", color),
      ]
      const texts: TextRun[] = []
      if (el.xLabel) texts.push({ x: el.x + el.w, y: el.y + 30, lines: [el.xLabel], size: FONT_PX.sm, anchor: "end", color })
      if (el.yLabel) texts.push({ x: el.x + 12, y: el.y - el.h - 8, lines: [el.yLabel], size: FONT_PX.sm, anchor: "start", color })
      return { strokes, texts, bbox: { x: el.x, y: el.y - el.h, w: el.w, h: el.h } }
    }
    case "highlight": {
      if (!target || target.type === "highlight") return { strokes: [], texts: [], bbox: { x: 0, y: 0, w: 0, h: 0 } }
      const b = shapeOf(target, lookup).bbox
      const pad = 12
      const hl = el.color ?? "orange"
      const o = opts(el.id, { strokeWidth: 3, roughness: 1.1 })
      const d =
        el.style === "underline"
          ? gen.line(b.x - 4, b.y + b.h + 8, b.x + b.w + 4, b.y + b.h + 6, o)
          : el.style === "box"
            ? gen.rectangle(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, o)
            : gen.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 1.25 + pad * 2, b.h * 1.3 + pad * 2, o)
      return { strokes: toStrokes(d, hl, 3), texts: [], bbox: b }
    }
  }
}
