"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { BOARD_H, BOARD_W, type BoardElement } from "@/lib/schema"
import type { VisibleElement } from "@/lib/timeline"
import { shapeOf, type Shape } from "./shapes"

export type Tool = "pointer" | "pen" | "highlighter"
export type InkStroke = { tool: "pen" | "highlighter"; points: [number, number][] }

const colorVar = (c: string) => `var(--wb-${c})`

type Props = {
  items: VisibleElement[]
  tool: Tool
  ink: InkStroke[]
  onInk: (stroke: InkStroke) => void
  onElementClick?: (el: BoardElement) => void
  className?: string
  children?: React.ReactNode
}

/**
 * Renders the board for one moment of the timeline. `items` already carry a
 * 0..1 progress value per element, so this component is stateless apart from
 * the learner's own ink while drawing.
 */
export function Whiteboard({ items, tool, ink, onInk, onElementClick, className, children }: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [draft, setDraft] = React.useState<InkStroke | null>(null)

  const lookup = React.useMemo(() => {
    const m = new Map(items.map((i) => [i.el.id, i.el]))
    return (id: string) => m.get(id)
  }, [items])

  const toBoard = (e: React.PointerEvent): [number, number] => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return [Math.round(p.x), Math.round(p.y)]
  }

  const drawing = tool !== "pointer"

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className={cn("block size-full touch-none select-none", drawing && "cursor-crosshair", className)}
      role="img"
      aria-label="Whiteboard"
      onPointerDown={(e) => {
        if (!drawing) return
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        setDraft({ tool, points: [toBoard(e)] })
      }}
      onPointerMove={(e) => {
        if (!draft) return
        const p = toBoard(e)
        const last = draft.points[draft.points.length - 1]
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return
        setDraft({ ...draft, points: [...draft.points, p] })
      }}
      onPointerUp={() => {
        if (draft && draft.points.length > 1) onInk(draft)
        setDraft(null)
      }}
    >
      {items.map(({ el, progress }) => (
        <ElementView
          key={el.id}
          el={el}
          shape={shapeOf(el, lookup)}
          progress={progress}
          interactive={!drawing && !!onElementClick && el.type !== "highlight"}
          onClick={() => onElementClick?.(el)}
        />
      ))}
      <g className="pointer-events-none">
        {[...ink, ...(draft ? [draft] : [])].map((s, i) => (
          <path
            key={i}
            d={smoothPath(s.points)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              stroke: s.tool === "pen" ? "var(--wb-pen)" : "var(--wb-marker)",
              strokeWidth: s.tool === "pen" ? 3 : 22,
              opacity: s.tool === "pen" ? 1 : 0.35,
            }}
          />
        ))}
      </g>
      {children}
    </svg>
  )
}

const ElementView = React.memo(function ElementView({
  el,
  shape,
  progress,
  interactive,
  onClick,
}: {
  el: BoardElement
  shape: Shape
  progress: number
  interactive: boolean
  onClick: () => void
}) {
  const { strokes, texts, bbox } = shape
  const outlines = strokes.filter((s) => !s.fill)
  const fills = strokes.filter((s) => s.fill)
  // Budget: outlines draw first, then text writes, then fills fade in.
  const textShare = texts.length ? (outlines.length ? 0.4 : 1) : 0
  const lineShare = 1 - textShare
  const lineP = lineShare ? Math.min(1, progress / lineShare) : 1
  const textP = textShare ? Math.max(0, (progress - lineShare) / textShare) : 1
  const label = describe(el)

  return (
    <g
      className={cn(interactive && "group/el cursor-pointer")}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? `Ask about ${label}` : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      {interactive && (
        <rect
          x={bbox.x - 10}
          y={bbox.y - 10}
          width={bbox.w + 20}
          height={bbox.h + 20}
          rx={12}
          className="fill-transparent transition-colors group-hover/el:fill-[var(--wb-hover)] group-focus-visible/el:fill-[var(--wb-hover)]"
        />
      )}
      {fills.map((s, i) => (
        <path
          key={`f${i}`}
          d={s.d}
          fill="none"
          strokeLinecap="round"
          style={{ stroke: colorVar(s.color), strokeWidth: s.width, opacity: 0.35 * Math.max(0, (progress - 0.55) / 0.45) }}
        />
      ))}
      {outlines.map((s, i) => {
        // Each sub-path gets an equal slice of the outline budget.
        const n = outlines.length
        const p = Math.min(1, Math.max(0, lineP * n - i))
        if (p <= 0) return null
        return (
          <path
            key={i}
            d={s.d}
            pathLength={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 1"
            strokeDashoffset={1 - p}
            style={{ stroke: colorVar(s.color), strokeWidth: s.width }}
          />
        )
      })}
      {texts.map((t, i) => {
        const total = t.lines.reduce((n, l) => n + l.length, 0)
        let budget = Math.round(textP * total)
        return (
          <text
            key={`t${i}`}
            x={t.x}
            y={t.y}
            textAnchor={t.anchor}
            className="font-hand"
            style={{ fill: colorVar(t.color), fontSize: t.size * 1.18 }}
          >
            {t.lines.map((line, k) => {
              const shown = line.slice(0, Math.max(0, budget))
              budget -= line.length
              return (
                <tspan key={k} x={t.x} dy={k === 0 ? 0 : t.size * 1.25}>
                  {shown || "​"}
                </tspan>
              )
            })}
          </text>
        )
      })}
    </g>
  )
})

export function describe(el: BoardElement): string {
  switch (el.type) {
    case "text":
      return el.text.replace(/\n/g, " ")
    case "rect":
    case "circle":
      return el.label ?? `the ${el.type === "rect" ? "box" : "circle"}`
    case "line":
    case "arrow":
      return el.label ?? `the ${el.type}`
    case "axes":
      return [el.yLabel, el.xLabel].filter(Boolean).join(" vs ") || "the graph"
    case "path":
      return "the curve"
    case "icon":
      return el.label ?? `the ${el.name}`
    case "ellipse":
      return el.label ?? "the oval"
    case "curve":
      return el.label ?? "the curved arrow"
    case "note":
      return el.text
    case "bars":
      return "the bar chart"
    case "brace":
      return el.label ?? "the bracket"
    default:
      return "this"
  }
}

function smoothPath(pts: [number, number][]) {
  if (pts.length < 3) return `M${pts.map((p) => p.join(",")).join(" L")}`
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q${pts[i][0]},${pts[i][1]} ${mx},${my}`
  }
  const last = pts[pts.length - 1]
  return d + ` L${last[0]},${last[1]}`
}
