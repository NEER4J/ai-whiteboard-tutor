import rough from "roughjs"
import type { Options } from "roughjs/bin/core"
import type { BoardColor, BoardElement } from "@/lib/schema"
import { ICONS } from "./icons"

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

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
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
    case "ellipse": {
      const strokes = toStrokes(
        gen.ellipse(el.cx, el.cy, el.rx * 2, el.ry * 2, opts(el.id, el.fill ? { fill: "x", fillStyle: "hachure", hachureGap: 8 } : {})),
        color
      )
      const texts = el.label ? [fitLabel(el.label, el.cx, el.cy, el.rx * 1.6, "ink")] : []
      return { strokes, texts, bbox: { x: el.cx - el.rx, y: el.cy - el.ry, w: el.rx * 2, h: el.ry * 2 } }
    }
    case "curve": {
      const mx = (el.x1 + el.x2) / 2
      const my = (el.y1 + el.y2) / 2
      const dx = el.x2 - el.x1
      const dy = el.y2 - el.y1
      const len = Math.hypot(dx, dy) || 1
      const bend = clamp(el.bend ?? 60, -170, 170)
      // control point of a quadratic bezier sits at twice the visible bulge
      const cx = mx + (-dy / len) * bend * 2
      const cy = my + (dx / len) * bend * 2
      const d = gen.path(`M ${el.x1} ${el.y1} Q ${cx} ${cy} ${el.x2} ${el.y2}`, opts(el.id, { roughness: 0.6, ...(el.dashed ? { strokeLineDash: [10, 8] } : {}) }))
      const strokes = toStrokes(d, color)
      if (el.head !== false) strokes.push(...arrowHead(cx, cy, el.x2, el.y2, el.id, color))
      const bx = 0.25 * el.x1 + 0.5 * cx + 0.25 * el.x2
      const by = 0.25 * el.y1 + 0.5 * cy + 0.25 * el.y2
      const texts: TextRun[] = []
      let bbox: BBox = {
        x: Math.min(el.x1, el.x2, bx),
        y: Math.min(el.y1, el.y2, by),
        w: Math.max(Math.abs(el.x2 - el.x1), Math.abs(bx - el.x1), 8),
        h: Math.max(Math.abs(el.y2 - el.y1), Math.abs(by - el.y1), 8),
      }
      if (el.label) {
        const outward = bend >= 0 ? 1 : -1
        const lx = bx + (-dy / len) * 24 * outward
        const ly = by + (dx / len) * 24 * outward
        const run: TextRun = { x: lx, y: ly, lines: [el.label], size: FONT_PX.sm, anchor: "middle", color }
        texts.push(run)
        bbox = union(bbox, textBox(run))
      }
      return { strokes, texts, bbox }
    }
    case "note": {
      const f = 16
      const pts: [number, number][] = [
        [el.x, el.y],
        [el.x + el.w, el.y],
        [el.x + el.w, el.y + el.h - f],
        [el.x + el.w - f, el.y + el.h],
        [el.x, el.y + el.h],
      ]
      const noteColor: BoardColor = el.color ?? "orange"
      const strokes = [
        ...toStrokes(gen.polygon(pts, opts(el.id, { fill: "x", fillStyle: "solid" })), noteColor, 2.2),
        ...toStrokes(gen.linearPath([[el.x + el.w - f, el.y + el.h], [el.x + el.w - f, el.y + el.h - f], [el.x + el.w, el.y + el.h - f]], opts(el.id + ":f", { roughness: 0.4 })), noteColor, 2),
      ]
      let size = 22
      let lines = wrapText(el.text, Math.max(6, Math.floor((el.w - 28) / (size * CHAR_W))))
      if (lines.length * size * 1.25 > el.h - 22) {
        size = 18
        lines = wrapText(el.text, Math.max(6, Math.floor((el.w - 28) / (size * CHAR_W))))
      }
      const run: TextRun = { x: el.x + 14, y: el.y + size + 10, lines, size, anchor: "start", color: "ink" }
      return { strokes, texts: [run], bbox: { x: el.x, y: el.y, w: el.w, h: el.h } }
    }
    case "bars": {
      const n = Math.max(1, Math.min(7, el.values.length))
      const max = Math.max(...el.values, 1e-9)
      const slot = el.w / n
      const bw = Math.min(slot * 0.62, 90)
      const strokes: Stroke[] = [...toStrokes(gen.line(el.x - 8, el.y, el.x + el.w + 8, el.y, opts(el.id + ":base", { roughness: 0.5 })), "ink")]
      const texts: TextRun[] = []
      el.values.slice(0, n).forEach((v, i) => {
        const bh = Math.max(6, (v / max) * el.h)
        const bx = el.x + i * slot + (slot - bw) / 2
        const hi = el.highlight === i
        strokes.push(
          ...toStrokes(
            gen.rectangle(bx, el.y - bh, bw, bh, opts(`${el.id}:${i}`, { fill: "x", fillStyle: "hachure", hachureGap: 7 })),
            hi ? "orange" : color
          )
        )
        texts.push({ x: bx + bw / 2, y: el.y - bh - 10, lines: [String(v)], size: FONT_PX.sm, anchor: "middle", color: hi ? "orange" : "ink" })
        const label = el.labels?.[i]
        if (label) texts.push({ x: bx + bw / 2, y: el.y + 28, lines: wrapText(label, Math.max(6, Math.floor((slot + 10) / (FONT_PX.sm * CHAR_W)))), size: FONT_PX.sm, anchor: "middle", color: "ink" })
      })
      return { strokes, texts, bbox: { x: el.x - 8, y: el.y - el.h - 30, w: el.w + 16, h: el.h + 70 } }
    }
    case "brace": {
      const dx = el.x2 - el.x1
      const dy = el.y2 - el.y1
      const L = Math.hypot(dx, dy) || 1
      const ux = dx / L
      const uy = dy / L
      // brace bulges to the left of the direction of travel
      const nx = uy
      const ny = -ux
      const tip = 16
      const local: [number, number][] = [] // [along, outward]
      const q = (p0: [number, number], c: [number, number], p1: [number, number]) => {
        for (let t = 0; t <= 1.001; t += 0.25) {
          local.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]])
        }
      }
      const r = Math.min(14, L / 6)
      q([0, 0], [0, tip * 0.6], [r, tip * 0.6])
      local.push([L / 2 - r, tip * 0.6])
      q([L / 2 - r, tip * 0.6], [L / 2, tip * 0.6], [L / 2, tip * 1.4])
      q([L / 2, tip * 1.4], [L / 2, tip * 0.6], [L / 2 + r, tip * 0.6])
      local.push([L - r, tip * 0.6])
      q([L - r, tip * 0.6], [L, tip * 0.6], [L, 0])
      const pts = local.map(([a, b]) => [el.x1 + ux * a + nx * b, el.y1 + uy * a + ny * b] as [number, number])
      const strokes = toStrokes(gen.linearPath(pts, opts(el.id, { roughness: 0.5, strokeWidth: 3 })), color, 3)
      const mid = { x: el.x1 + ux * (L / 2) + nx * tip * 1.4, y: el.y1 + uy * (L / 2) + ny * tip * 1.4 }
      const texts: TextRun[] = []
      let bbox: BBox = { x: Math.min(el.x1, el.x2) - 20, y: Math.min(el.y1, el.y2) - 20, w: Math.abs(dx) + 40, h: Math.abs(dy) + 40 }
      if (el.label) {
        const run: TextRun = { x: mid.x + nx * 26, y: mid.y + ny * 26 + 8, lines: [el.label], size: FONT_PX.sm, anchor: "middle", color }
        texts.push(run)
        bbox = union(bbox, textBox(run))
      }
      return { strokes, texts, bbox }
    }
    case "icon": {
      const icon = ICONS[el.name]
      const size = clamp(el.size ?? 90, 40, 220)
      const k = size / 100
      const strokes: Stroke[] = []
      icon.paths.forEach((d, i) => {
        const drawable = gen.path(d, opts(`${el.id}:${i}`, { roughness: 0.7, strokeWidth: 2.4, ...(icon.fill && i === 0 ? { fill: "x", fillStyle: "hachure", hachureGap: 7 } : {}) }))
        for (const set of drawable.sets) {
          for (const o of set.ops) {
            for (let j = 0; j + 1 < o.data.length; j += 2) {
              o.data[j] = el.x + o.data[j] * k
              o.data[j + 1] = el.y + o.data[j + 1] * k
            }
          }
        }
        strokes.push(...toStrokes(drawable, color))
      })
      const texts: TextRun[] = []
      let bbox: BBox = { x: el.x, y: el.y, w: size, h: size }
      if (el.label) {
        const run: TextRun = { x: el.x + size / 2, y: el.y + size + 24, lines: wrapText(el.label, Math.max(8, Math.floor((size + 50) / (FONT_PX.sm * CHAR_W)))), size: FONT_PX.sm, anchor: "middle", color: "ink" }
        texts.push(run)
        bbox = union(bbox, textBox(run))
      }
      return { strokes, texts, bbox }
    }
    case "sketch": {
      const sx = clamp(el.w, 40, 480) / 100
      const sy = clamp(el.h, 40, 340) / 100
      const strokes: Stroke[] = []
      el.strokes.slice(0, 40).forEach((st, i) => {
        let drawable: Drawable
        try {
          drawable = gen.path(st.d, opts(`${el.id}:${i}`, { roughness: 0.6, strokeWidth: 2.4, ...(st.fill ? { fill: "x", fillStyle: "hachure", hachureGap: 7 } : {}) }))
        } catch {
          return // a malformed path is skipped rather than breaking the board
        }
        for (const set of drawable.sets) {
          for (const o of set.ops) {
            for (let j = 0; j + 1 < o.data.length; j += 2) {
              o.data[j] = el.x + o.data[j] * sx
              o.data[j + 1] = el.y + o.data[j + 1] * sy
            }
          }
        }
        strokes.push(...toStrokes(drawable, st.color ?? el.color ?? "ink"))
      })
      const w = clamp(el.w, 40, 480)
      const h = clamp(el.h, 40, 340)
      const texts: TextRun[] = []
      let bbox: BBox = { x: el.x, y: el.y, w, h }
      if (el.label) {
        const run: TextRun = { x: el.x + w / 2, y: el.y + h + 24, lines: wrapText(el.label, Math.max(8, Math.floor((w + 50) / (FONT_PX.sm * CHAR_W)))), size: FONT_PX.sm, anchor: "middle", color: "ink" }
        texts.push(run)
        bbox = union(bbox, textBox(run))
      }
      return { strokes, texts, bbox }
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
