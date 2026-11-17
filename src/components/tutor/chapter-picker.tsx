"use client"

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PlayerSnapshot } from "@/lib/player"
import { formatTime } from "@/lib/timeline"
import { cn } from "@/lib/utils"
import { IconButton } from "./icon-button"

const COLORS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300",
]

/** Header control: shows the current chapter and lets you jump to any other one. */
export function ChapterPicker({ snap, onSelect }: { snap: PlayerSnapshot; onSelect: (chapter: number) => void }) {
  const chapters = snap.timeline.chapters
  // The lesson is still being written: show a placeholder tab so it is clear something is on its way.
  if (!chapters.length)
    return (
      <div className="flex min-w-0 items-center gap-2 px-1.5" role="status" aria-label="Preparing chapters">
        <Skeleton className="size-5 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32 max-w-[40vw] rounded-full" />
        <Skeleton className="hidden h-3 w-8 rounded-full sm:block" />
      </div>
    )
  const current = Math.max(0, snap.timeline.boardOfSeg[Math.min(snap.seg, snap.timeline.boardOfSeg.length - 1)] ?? 0)
  const ready = (i: number) => snap.done || chapters[i].firstSeg < snap.available
  const prev = current - 1
  const next = current + 1

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <IconButton label="Previous chapter" disabled={prev < 0} onClick={() => onSelect(prev)}>
        <ChevronLeftIcon />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" className="min-w-0 max-w-[16rem] gap-1.5 px-2 font-normal" aria-label="Choose chapter" />}
        >
          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums", COLORS[current % COLORS.length])}>
            {current + 1}
          </span>
          <span className="truncate">{chapters[current].title}</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {current + 1}/{chapters.length}
          </span>
          <ChevronDownIcon data-icon="inline-end" className="opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Chapters</DropdownMenuLabel>
            {chapters.map((c, i) => (
              <DropdownMenuItem key={c.board} disabled={!ready(i)} onClick={() => onSelect(i)} className="gap-2.5">
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums", COLORS[i % COLORS.length])}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                {i === current ? (
                  <CheckIcon className="size-4 shrink-0" />
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(c.start)}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <IconButton label="Next chapter" disabled={next >= chapters.length || !ready(next)} onClick={() => onSelect(next)}>
        <ChevronRightIcon />
      </IconButton>
    </div>
  )
}
