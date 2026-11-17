"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PlayerSnapshot } from "@/lib/player"
import type { Segment } from "@/lib/schema"
import { wordIndexAt } from "@/lib/timeline"

/** Karaoke-style caption of the narration, highlighting the spoken word. */
export function Captions({ snap, segments }: { snap: PlayerSnapshot; segments: Segment[] }) {
  const seg = segments[Math.min(snap.seg, segments.length - 1)]
  const words = React.useMemo(() => seg?.narration.split(/\s+/).filter(Boolean) ?? [], [seg])
  if (!seg || snap.seg >= snap.available || snap.status === "idle") return null

  const start = snap.timeline.segStarts[snap.seg] ?? 0
  const dur = snap.timeline.segDurs[snap.seg] ?? 1
  const frac = Math.min(1, Math.max(0, (snap.time - start) / dur))
  const current = snap.status === "ended" ? words.length : wordIndexAt(words, frac)

  return (
    <p
      aria-live="off"
      className="mx-auto max-w-[min(52rem,96%)] rounded-xl bg-background/85 px-4 py-2.5 text-center text-base leading-snug font-medium text-balance backdrop-blur-sm sm:text-xl sm:leading-snug"
    >
      {words.map((w, i) => (
        <span key={i} className={cn("transition-colors duration-150", i <= current ? "text-foreground" : "text-muted-foreground/45")}>
          {w}{" "}
        </span>
      ))}
    </p>
  )
}
