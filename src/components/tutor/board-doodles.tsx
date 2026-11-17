"use client"

import * as React from "react"

/**
 * A very faint whiteboard backdrop: a handful of pastel marker doodles scattered
 * at random spots around the edges (never behind the prompt), over a dot grid.
 * The layout is re-rolled on every page load. Decorative only.
 */

const W = 1200
const H = 800

type Doodle = { id: string; color: string; node: React.ReactNode }

const hand = { className: "font-hand", fill: "currentColor", stroke: "none" } as const

const POOL: Doodle[] = [
  {
    id: "triangle",
    color: "text-sky-300",
    node: (
      <>
        <path d="M0 110 L0 0 L150 110 Z" />
        <path d="M0 90 L20 90 L20 110" />
        <text x="-34" y="62" fontSize="30" {...hand}>a</text>
        <text x="60" y="140" fontSize="30" {...hand}>b</text>
        <text x="86" y="46" fontSize="30" {...hand}>c</text>
      </>
    ),
  },
  {
    id: "bulb",
    color: "text-amber-300",
    node: (
      <>
        <path d="M30 60 C-6 30 14 -10 40 -10 C66 -10 86 30 50 60 V82 H30 Z" />
        <path d="M30 96 H50 M34 108 H46" />
        <path d="M40 -34 V-22 M8 -22 L16 -12 M72 -22 L64 -12" />
      </>
    ),
  },
  {
    id: "checklist",
    color: "text-emerald-300",
    node: (
      <>
        <rect x="0" y="0" width="150" height="104" rx="8" />
        <path d="M16 30 l8 8 l14 -16 M16 62 l8 8 l14 -16" />
        <path d="M52 32 H130 M52 64 H112" />
      </>
    ),
  },
  {
    id: "note",
    color: "text-violet-300",
    node: (
      <>
        <path d="M0 0 H130 V110 L100 140 H0 Z" />
        <path d="M100 140 V110 H130" />
        <text x="16" y="44" fontSize="28" {...hand}>remember:</text>
        <text x="16" y="82" fontSize="28" {...hand}>ask why?</text>
      </>
    ),
  },
  {
    id: "star",
    color: "text-rose-300",
    node: <path d="M30 0 l9 21 l23 3 l-17 15 l5 23 l-20 -12 l-20 12 l5 -23 l-17 -15 l23 -3 z" />,
  },
  {
    id: "formula",
    color: "text-sky-300",
    node: <text x="0" y="0" fontSize="42" {...hand}>E = mc²</text>,
  },
  {
    id: "pythag",
    color: "text-emerald-300",
    node: <text x="0" y="0" fontSize="38" {...hand}>a² + b² = c²</text>,
  },
  {
    id: "wave",
    color: "text-violet-300",
    node: (
      <>
        <path d="M0 60 H190 M0 0 V120" />
        <path d="M0 60 C25 -10 45 -10 62 60 S100 130 125 60 S160 -10 190 60" />
      </>
    ),
  },
  {
    id: "arrow",
    color: "text-amber-300",
    node: (
      <>
        <path d="M0 60 C70 0 130 40 190 100" />
        <path d="M168 104 L192 102 L184 78" />
      </>
    ),
  },
  {
    id: "idea",
    color: "text-rose-300",
    node: (
      <>
        <ellipse cx="45" cy="0" rx="62" ry="32" />
        <text x="2" y="10" fontSize="30" {...hand}>idea!</text>
      </>
    ),
  },
]

type Placed = { id: string; color: string; node: React.ReactNode; x: number; y: number; rot: number; scale: number }

function makeLayout(): Placed[] {
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  // The triangle is always pinned to the very top edge, at a random spot along it.
  const triangle = POOL.find((d) => d.id === "triangle")!
  const placed: Placed[] = [{ ...triangle, x: rand(120, W - 320), y: rand(-14, 4), rot: rand(-6, 6), scale: rand(0.95, 1.15) }]
  const picks = POOL.filter((d) => d.id !== "triangle")
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
  for (const d of picks) {
    let x = 0
    let y = 0
    for (let tries = 0; tries < 60; tries++) {
      x = rand(40, W - 220)
      y = rand(120, H - 180)
      const dx = (x + 80 - W / 2) / 360
      const dy = (y + 60 - H / 2) / 280
      const outsideCentre = dx * dx + dy * dy > 1
      const apart = placed.every((p) => Math.hypot(p.x - x, p.y - y) > 240)
      if (outsideCentre && apart) break
    }
    placed.push({ ...d, x, y, rot: rand(-12, 12), scale: rand(0.85, 1.2) })
  }
  return placed
}

let layout: Placed[] | null = null
const noopSubscribe = () => () => {}
const getLayout = () => (layout ??= makeLayout())

export function BoardDoodles() {
  // null on the server (and during hydration) so server and client markup match.
  const items = React.useSyncExternalStore(noopSubscribe, getLayout, () => null)

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,transparent_35%,black_80%)]"
    >
      <div className="absolute inset-0 text-foreground opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.05]" />
      {items && (
        <svg
          className="absolute inset-0 size-full opacity-[0.22] dark:opacity-[0.11]"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {items.map((d) => (
            <g key={d.id} transform={`translate(${d.x} ${d.y}) rotate(${d.rot}) scale(${d.scale})`} className={d.color}>
              {d.node}
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
