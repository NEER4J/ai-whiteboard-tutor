"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Player, PlayerSnapshot } from "@/lib/player"
import { formatTime } from "@/lib/timeline"
import { IconButton } from "./icon-button"

const RATES = [0.75, 1, 1.25, 1.5]

type Props = {
  player: Player
  snap: PlayerSnapshot
  captions: boolean
  onCaptions: (v: boolean) => void
  generating: boolean
}

export function PlayerControls({ player, snap, captions, onCaptions, generating }: Props) {
  const { status, time, timeline } = snap
  const total = Math.max(timeline.total, 0.1)
  const playing = status === "playing"
  const loading = status === "buffering"
  const resumeAfterDrag = React.useRef(false)
  const dragging = React.useRef(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative px-1">
        <Slider
          aria-label="Lesson position"
          value={[Math.min(time, total)]}
          min={0}
          max={total}
          step={0.1}
          onValueChange={(v) => {
            const t = Array.isArray(v) ? v[0] : v
            if (!dragging.current) {
              dragging.current = true
              resumeAfterDrag.current = status === "playing" || status === "buffering"
            }
            player.scrub(t)
          }}
          onValueCommitted={(v) => {
            const t = Array.isArray(v) ? v[0] : v
            dragging.current = false
            player.seek(t, resumeAfterDrag.current)
          }}
        />
        {/* chapter ticks */}
        <div className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2">
          {timeline.chapters.slice(1).map((c) => (
            <span
              key={c.board}
              className="absolute top-1/2 h-1 w-0.5 -translate-y-1/2 rounded-full bg-background"
              style={{ left: `${(c.start / total) * 100}%` }}
            />
          ))}
        </div>
        {/* not-yet-generated part of the timeline */}
        {generating && snap.playableEnd < total && (
          <div
            className="pointer-events-none absolute top-1/2 right-1 h-1 -translate-y-1/2 animate-pulse rounded-r-full bg-foreground/10"
            style={{ left: `${(snap.playableEnd / total) * 100}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          className="rounded-full"
          aria-label={playing || loading ? "Pause" : "Play"}
          onClick={() => player.toggle()}
          disabled={!snap.available && !generating}
        >
          {loading ? <Spinner /> : playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
        </Button>
        <IconButton label="Restart" shortcut="R" onClick={() => player.restart()} disabled={!snap.available}>
          <RotateCcwIcon />
        </IconButton>
        <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
          {formatTime(time)} <span className="opacity-50">/</span> {generating ? "~" : ""}
          {formatTime(timeline.total)}
        </span>
        {loading && <span className="ml-2 text-xs text-muted-foreground">{generating && snap.seg >= snap.available ? "Writing the next part…" : "Preparing voice…"}</span>}

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={`Speed ${snap.rate}x`}
            size="sm"
            className="w-12 tabular-nums"
            onClick={() => player.setRate(RATES[(RATES.indexOf(snap.rate) + 1) % RATES.length])}
          >
            {snap.rate}x
          </IconButton>
          <IconButton
            label={snap.voice === "ai" ? "AI voice (switch to browser voice)" : "Browser voice (switch to AI voice)"}
            onClick={() => player.setVoice(snap.voice === "ai" ? "browser" : "ai")}
            className={cn(snap.voice === "browser" && "text-muted-foreground")}
          >
            <AudioLinesIcon />
          </IconButton>
          <IconButton label={captions ? "Hide captions" : "Show captions"} shortcut="C" onClick={() => onCaptions(!captions)}>
            {captions ? <CaptionsIcon /> : <CaptionsOffIcon />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}
