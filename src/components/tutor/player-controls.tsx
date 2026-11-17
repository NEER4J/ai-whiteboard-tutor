"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  FastForwardIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  RotateCcwIcon,
  Settings2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Player, PlayerSnapshot } from "@/lib/player"
import { clamp, formatTime } from "@/lib/timeline"
import { IconButton } from "./icon-button"

const RATES = [0.75, 1, 1.25, 1.5, 2]

type Props = {
  player: Player
  snap: PlayerSnapshot
  captions: boolean
  onCaptions: (v: boolean) => void
  generating: boolean
}

/** Player card: chapter-segmented timeline on top, transport and settings below. */
export function PlayerControls({ player, snap, captions, onCaptions, generating }: Props) {
  const { status, time, timeline } = snap
  const playing = status === "playing"
  const loading = status === "buffering"

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-background px-3 pt-1 pb-2.5 max-lg:px-2.5">
      <Timeline player={player} snap={snap} generating={generating} />

      <div className="flex items-center gap-1">
        {/* transport */}
        <Button
          size="icon"
          className="size-10 shrink-0 rounded-full ring-4 ring-primary/10 transition-shadow hover:ring-primary/20"
          aria-label={playing || loading ? "Pause" : status === "ended" ? "Replay" : "Play"}
          onClick={() => player.toggle()}
          disabled={!snap.available && !generating}
        >
          {loading ? <Spinner /> : playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
        </Button>
        <IconButton label="Back 5 seconds" shortcut="←" className="rounded-full" disabled={!snap.available} onClick={() => player.seek(time - 5)}>
          <RewindIcon className="size-4" />
        </IconButton>
        <IconButton label="Forward 5 seconds" shortcut="→" className="rounded-full" disabled={!snap.available} onClick={() => player.seek(time + 5)}>
          <FastForwardIcon className="size-4" />
        </IconButton>

        <div className="ml-1.5 flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-medium tabular-nums">
            {formatTime(time)}
            <span className="hidden text-muted-foreground sm:inline">
              {" "}
              / {generating ? "~" : ""}
              {formatTime(timeline.total)}
            </span>
          </span>
          {loading && (
            <span className="truncate text-[11px] text-muted-foreground">
              {generating && snap.seg >= snap.available ? "Writing the next part…" : "Preparing voice…"}
            </span>
          )}
        </div>

        {/* settings */}
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="secondary" size="sm" className="h-8 w-12 rounded-full px-0 font-medium tabular-nums" aria-label={`Playback speed ${snap.rate}x`} />}
            >
              {snap.rate}×
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-36">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(snap.rate)} onValueChange={(v) => player.setRate(Number(v))}>
                  {RATES.map((r) => (
                    <DropdownMenuRadioItem key={r} value={String(r)} className="tabular-nums">
                      {r}× {r === 1 && <span className="ml-auto text-xs text-muted-foreground">Normal</span>}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <IconButton
            label={captions ? "Hide captions" : "Show captions"}
            shortcut="C"
            aria-pressed={captions}
            className={cn("rounded-full", captions && "bg-secondary text-foreground")}
            onClick={() => onCaptions(!captions)}
          >
            {captions ? <CaptionsIcon /> : <CaptionsOffIcon className="text-muted-foreground" />}
          </IconButton>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Voice and playback options" />}>
              <Settings2Icon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Narration voice</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={snap.voice} onValueChange={(v) => player.setVoice(v as "ai" | "browser")}>
                  <DropdownMenuRadioItem value="ai" className="flex-col items-start gap-0">
                    <span className="flex items-center gap-1.5">
                      <AudioLinesIcon className="size-3.5" /> AI voice
                    </span>
                    <span className="text-xs text-muted-foreground">Natural, from the AI model</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="browser" className="flex-col items-start gap-0">
                    <span>Browser voice</span>
                    <span className="text-xs text-muted-foreground">Built in, free, works offline</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => player.restart()} disabled={!snap.available}>
                <RotateCcwIcon /> Restart lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * One rounded segment per chapter (width = its length). Hover shows the time and
 * chapter name; click or drag to seek; arrow keys move 5s. Parts that are still
 * being generated pulse until they exist.
 */
function Timeline({ player, snap, generating }: { player: Player; snap: PlayerSnapshot; generating: boolean }) {
  const { timeline, time, status } = snap
  const total = Math.max(timeline.total, 0.1)
  const chapters = timeline.chapters
  const reach = snap.playableEnd || total
  const barRef = React.useRef<HTMLDivElement>(null)
  const segRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [hover, setHover] = React.useState<{ x: number; left: number; t: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const resumeAfter = React.useRef(false)

  const spans = React.useMemo(
    () =>
      (chapters.length ? chapters : [{ board: 0, title: "Lesson", start: 0, firstSeg: 0 }]).map((c, i, all) => ({
        title: c.title,
        start: c.start,
        end: i + 1 < all.length ? all[i + 1].start : total,
      })),
    [chapters, total]
  )
  const currentIdx = Math.max(0, spans.findLastIndex((s) => time >= s.start - 1e-6))

  /** Pointer x -> lesson time, measured against the actual segment under the cursor. */
  const locate = (clientX: number) => {
    const bar = barRef.current
    if (!bar) return { x: 0, left: 0, t: 0 }
    let best = 0
    let bestDist = Infinity
    spans.forEach((_, i) => {
      const r = segRefs.current[i]?.getBoundingClientRect()
      if (!r) return
      const dist = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0
      if (dist < bestDist) {
        best = i
        bestDist = dist
      }
    })
    const r = segRefs.current[best]?.getBoundingClientRect()
    if (!r) return { x: 0, left: 0, t: 0 }
    const f = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1)
    const t = spans[best].start + f * (spans[best].end - spans[best].start)
    const x = clamp(clientX - bar.getBoundingClientRect().left, 0, bar.clientWidth)
    // keep the tooltip fully inside the bar
    return { x, left: clamp(x, 56, Math.max(56, bar.clientWidth - 56)), t: clamp(t, 0, Math.max(0, reach - 0.05)) }
  }

  const label = (t: number) => {
    const s = spans.findLast((sp) => t >= sp.start - 1e-6) ?? spans[0]
    return { time: formatTime(t), title: s.title }
  }

  return (
    <div className="relative">
      {hover && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-lg bg-foreground px-2 py-1 text-[11px] whitespace-nowrap text-background"
          style={{ left: hover.left }}
        >
          <span className="tabular-nums">{label(hover.t).time}</span> · {label(hover.t).title}
        </div>
      )}
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Lesson position"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(total)}, ${spans[currentIdx]?.title ?? ""}`}
        className="group/tl relative flex h-7 cursor-pointer touch-none items-center gap-1 outline-none select-none"
        onPointerDown={(e) => {
          if (!snap.available) return
          e.currentTarget.setPointerCapture(e.pointerId)
          resumeAfter.current = status === "playing" || status === "buffering"
          setDragging(true)
          const p = locate(e.clientX)
          setHover(p)
          player.scrub(p.t)
        }}
        onPointerMove={(e) => {
          const p = locate(e.clientX)
          setHover(p)
          if (dragging) player.scrub(p.t)
        }}
        onPointerUp={(e) => {
          if (!dragging) return
          setDragging(false)
          player.seek(locate(e.clientX).t, resumeAfter.current)
        }}
        onPointerLeave={() => !dragging && setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault()
            player.seek(time + 5)
          } else if (e.key === "ArrowLeft") {
            e.preventDefault()
            player.seek(time - 5)
          } else if (e.key === "Home") {
            e.preventDefault()
            player.seek(0)
          }
        }}
      >
        {spans.map((s, i) => {
          const len = Math.max(0.01, s.end - s.start)
          const fill = clamp((time - s.start) / len, 0, 1)
          const pending = generating && s.start >= reach - 0.01
          const isCurrent = i === currentIdx
          return (
            <div
              key={i}
              ref={(el) => {
                segRefs.current[i] = el
              }}
              className="relative flex h-full items-center"
              style={{ flexGrow: len, flexBasis: 0 }}
            >
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-full bg-foreground/10 transition-[height] duration-150",
                  isCurrent || dragging ? "h-2" : "h-1.5",
                  "group-hover/tl:h-2 group-focus-visible/tl:h-2",
                  pending && "animate-pulse bg-foreground/5"
                )}
              >
                <div className="h-full rounded-full bg-foreground" style={{ width: `${fill * 100}%` }} />
              </div>
              {isCurrent && snap.available > 0 && (
                <span
                  className={cn(
                    "pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background ring-2 ring-foreground transition-transform",
                    dragging ? "scale-110" : "scale-90 group-hover/tl:scale-100 group-focus-visible/tl:scale-100"
                  )}
                  style={{ left: `${fill * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
