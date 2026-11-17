"use client"

import * as React from "react"
import { ArrowLeftIcon, EraserIcon, HighlighterIcon, MousePointer2Icon, PenLineIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Player, PlayerSnapshot } from "@/lib/player"
import type { BoardElement } from "@/lib/schema"
import { visibleAt } from "@/lib/timeline"
import { Whiteboard, type InkStroke, type Tool } from "@/components/whiteboard/whiteboard"
import { Captions } from "./captions"
import { IconButton } from "./icon-button"
import { PlayerControls } from "./player-controls"
import type { ClipState } from "./types"

type Props = {
  player: Player
  snap: PlayerSnapshot
  clip: ClipState | undefined
  isFollowup: boolean
  onBackToLesson: () => void
  onExplain: (el: BoardElement) => void
  ink: Record<string, InkStroke[]>
  setInk: React.Dispatch<React.SetStateAction<Record<string, InkStroke[]>>>
  captions: boolean
  setCaptions: (v: boolean | ((c: boolean) => boolean)) => void
}

const TOOLS: { value: Tool; label: string; icon: React.ReactNode }[] = [
  { value: "pointer", label: "Select — click a drawing to ask about it", icon: <MousePointer2Icon /> },
  { value: "pen", label: "Pen", icon: <PenLineIcon /> },
  { value: "highlighter", label: "Highlighter", icon: <HighlighterIcon /> },
]

export function BoardStage({ player, snap, clip, isFollowup, onBackToLesson, onExplain, ink, setInk, captions, setCaptions }: Props) {
  const [tool, setTool] = React.useState<Tool>("pointer")
  const { board, items } = React.useMemo(() => visibleAt(snap.timeline, snap.time), [snap.timeline, snap.time])
  const chapter = snap.timeline.chapters[Math.max(0, board)]
  const inkKey = `${snap.clipId}:${board}`
  const boardInk = ink[inkKey] ?? []
  const generating = !!clip && !clip.done && !clip.error
  const waitingFirst = generating && snap.available === 0

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === "Space" && !t.closest("button, [role=slider]")) {
        e.preventDefault()
        player.toggle()
      } else if (e.key === "ArrowRight" && !t.closest("[role=slider]")) player.seek(snap.time + 5)
      else if (e.key === "ArrowLeft" && !t.closest("[role=slider]")) player.seek(snap.time - 5)
      else if (e.key.toLowerCase() === "r") player.restart()
      else if (e.key.toLowerCase() === "c") setCaptions((c) => !c)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [player, snap.time, setCaptions])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 max-lg:gap-1.5" aria-label="Lesson player">
      <div className="flex h-8 items-center gap-2 max-lg:h-6">
        {isFollowup && (
          <Button variant="ghost" size="sm" onClick={onBackToLesson} className="-ml-2 text-muted-foreground">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to lesson
          </Button>
        )}
        <div className="flex min-w-0 items-baseline gap-2">
          {isFollowup && <Badge variant="secondary">Follow-up</Badge>}
          <h2 className="truncate text-sm font-medium max-lg:text-[13px]">{clip?.title ?? "Preparing lesson"}</h2>
          {chapter && snap.available > 0 && (
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">· {chapter.title}</span>
          )}
        </div>
      </div>

      {/* Board: sized to the largest 5:3 box that fits the available space */}
      <div className="relative min-h-0 max-lg:aspect-[5/3] max-lg:max-h-[38dvh] max-lg:flex-none lg:flex-1 [container-type:size]">
        <div
          className="board-dots absolute top-1/2 left-1/2 -translate-1/2 overflow-hidden rounded-2xl"
          style={{ width: "min(100cqw, 100cqh * 5 / 3)", aspectRatio: "5 / 3" }}
        >
          <Whiteboard
            items={items}
            tool={tool}
            ink={boardInk}
            onInk={(s) => setInk((m) => ({ ...m, [inkKey]: [...(m[inkKey] ?? []), s] }))}
            onElementClick={(el) => {
              player.pause()
              onExplain(el)
            }}
          />

          {waitingFirst && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Spinner className="size-5" />
              <span>{isFollowup ? "Thinking about your question…" : "Planning your lesson…"}</span>
            </div>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full max-sm:top-1.5 max-sm:right-1.5 max-sm:scale-90 max-sm:origin-top-right bg-background/80 p-1 backdrop-blur-sm">
            <ToggleGroup
              value={[tool]}
              onValueChange={(v) => v[0] && setTool(v[0] as Tool)}
              size="sm"
              spacing={0}
              aria-label="Whiteboard tool"
            >
              {TOOLS.map((t) => (
                <Tooltip key={t.value}>
                  <TooltipTrigger render={<ToggleGroupItem value={t.value} aria-label={t.label} className="rounded-full" />}>
                    {t.icon}
                  </TooltipTrigger>
                  <TooltipContent>{t.label}</TooltipContent>
                </Tooltip>
              ))}
            </ToggleGroup>
            {boardInk.length > 0 && (
              <IconButton
                label="Clear my drawings"
                className="rounded-full"
                onClick={() => setInk((m) => ({ ...m, [inkKey]: [] }))}
              >
                <EraserIcon />
              </IconButton>
            )}
          </div>

          {captions && clip && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 hidden sm:block">
              <Captions snap={snap} segments={clip.segments} />
            </div>
          )}
        </div>
      </div>

      {/* On phones the board is small, so captions sit below it instead of on top. */}
      {captions && clip && (
        <div className="flex h-[4.4rem] shrink-0 items-center overflow-hidden sm:hidden [&_p]:bg-transparent [&_p]:px-1 [&_p]:py-0 [&_p]:text-xs [&_p]:leading-snug">
          <Captions snap={snap} segments={clip.segments} />
        </div>
      )}

      <PlayerControls player={player} snap={snap} captions={captions} onCaptions={setCaptions} generating={generating} />
    </section>
  )
}
