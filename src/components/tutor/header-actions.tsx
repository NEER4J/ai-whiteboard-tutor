"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { CheckIcon, CopyIcon, DownloadIcon, FilmIcon, XIcon, MaximizeIcon, MinimizeIcon, MoonIcon, MoreHorizontalIcon, PlusIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconButton } from "./icon-button"
import type { VideoExporter } from "@/lib/use-video-export"
import type { ChatItem, ClipState } from "./types"

/** Small circular progress loader (0..1). */
function Ring({ value, className }: { value: number; className?: string }) {
  const r = 8
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 20 20" className={className ?? "size-4"} aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" className="stroke-foreground/15" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0.02, value)))}
        transform="rotate(-90 10 10)"
        className="stroke-foreground transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

/** Plain-text/Markdown transcript of the lesson and every follow-up. */
export function buildTranscript(title: string, items: ChatItem[], clips: Record<string, ClipState>) {
  const out: string[] = [`# ${title}`, ""]
  for (const it of items) {
    if (it.role === "user") {
      out.push(`**You:** ${it.text}`, "")
      continue
    }
    if ("text" in it) {
      out.push(`**Tutor:** ${it.text}`, "")
      continue
    }
    const clip = clips[it.clipId]
    if (!clip) continue
    if (clip.reply) out.push(`**Tutor:** ${clip.reply}`, "")
    let board = -1
    for (const seg of clip.segments) {
      if (seg.newBoard || board < 0) {
        board++
        out.push(`## ${seg.boardTitle?.trim() || `Part ${board + 1}`}`, "")
      }
      out.push(seg.narration, "")
    }
  }
  return out.join("\n").trim() + "\n"
}

type Props = {
  inLesson: boolean
  title: string
  items: ChatItem[]
  clips: Record<string, ClipState>
  onNew: () => void
  onFullscreen: () => void
  fullscreen: boolean
  /** Background video export for the finished lesson (omitted when nothing is ready to export). */
  exporter?: { api: VideoExporter; run: () => void }
}

export function HeaderActions({ inLesson, title, items, clips, onNew, onFullscreen, fullscreen, exporter }: Props) {
  const { resolvedTheme, setTheme } = useTheme()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildTranscript(title, items, clips))
      toast.success("Transcript copied")
    } catch {
      toast.error("Couldn't copy to the clipboard")
    }
  }

  const download = () => {
    const blob = new Blob([buildTranscript(title, items, clips)], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson"}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")

  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5">
      {/* Phones: one overflow menu instead of a row of icons */}
      <div className="flex items-center @5xl/header:hidden">
        {/* While exporting (or once it is ready) the loader / download button sits in the header itself, not inside the menu */}
        {inLesson && exporter?.api.state.phase === "working" && (
          <button
            type="button"
            onClick={exporter.api.cancel}
            aria-label={`Exporting video ${Math.round(exporter.api.state.ratio * 100)}%. Tap to cancel`}
            className="mr-1 flex h-8 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-xs font-medium tabular-nums"
          >
            <Ring value={exporter.api.state.ratio} />
            {Math.round(exporter.api.state.ratio * 100)}%
          </button>
        )}
        {inLesson && exporter?.api.state.phase === "done" && (
          <Button size="sm" className="mr-1 h-8" onClick={() => exporter.api.download(title)} aria-label="Download video">
            <DownloadIcon data-icon="inline-start" /> Video
          </Button>
        )}
        {inLesson ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More options" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onFullscreen} className="hidden lg:flex">
                <MaximizeIcon /> Full-screen whiteboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copy}>
                <CopyIcon /> Copy transcript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={download}>
                <DownloadIcon /> Download transcript
              </DropdownMenuItem>
              {exporter && (
                <DropdownMenuItem
                  onClick={() => {
                    const s = exporter.api.state
                    if (s.phase === "idle") exporter.run()
                    else if (s.phase === "done") exporter.api.download(title)
                    else exporter.api.cancel()
                  }}
                >
                  {exporter.api.state.phase === "working" ? (
                    <>
                      <Ring value={exporter.api.state.ratio} /> Exporting {Math.round(exporter.api.state.ratio * 100)}% (tap to cancel)
                    </>
                  ) : exporter.api.state.phase === "done" ? (
                    <>
                      <DownloadIcon /> Download video
                    </>
                  ) : (
                    <>
                      <FilmIcon /> Export as video
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleTheme}>
                <SunIcon className="dark:hidden" />
                <MoonIcon className="hidden dark:block" /> Switch light / dark
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onNew}>
                <PlusIcon /> New lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <IconButton label="Toggle light / dark" onClick={toggleTheme}>
            <SunIcon className="dark:hidden" />
            <MoonIcon className="hidden dark:block" />
          </IconButton>
        )}
      </div>

      {/* Tablet and desktop */}
      <div className="hidden items-center gap-0.5 @5xl/header:flex">
        {inLesson && (
          <>
            <IconButton label={fullscreen ? "Exit full screen" : "Full-screen whiteboard"} onClick={onFullscreen}>
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </IconButton>
            <IconButton label="Copy transcript" onClick={copy}>
              <CopyIcon />
            </IconButton>
            <IconButton label="Download transcript (.md)" onClick={download}>
              <DownloadIcon />
            </IconButton>
            {exporter && <ExportButton title={title} exporter={exporter} />}
          </>
        )}
        <IconButton label="Toggle light / dark" onClick={toggleTheme}>
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </IconButton>
        {inLesson && (
          <Button variant="ghost" size="sm" className="ml-1" onClick={onNew}>
            <PlusIcon data-icon="inline-start" /> New lesson
          </Button>
        )}
      </div>
    </div>
  )
}

function ExportButton({ title, exporter }: { title: string; exporter: NonNullable<Props["exporter"]> }) {
  const { state, cancel, download, reset } = exporter.api
  if (state.phase === "working") {
    const pct = Math.round(state.ratio * 100)
    return (
      <div className="mx-1 flex items-center gap-1.5 rounded-lg bg-secondary py-1 pr-1 pl-2.5 text-xs font-medium tabular-nums" role="status" aria-live="polite" title={state.label}>
        <Ring value={state.ratio} />
        <span className="min-w-[6.5ch]">Exporting {pct}%</span>
        <Button variant="ghost" size="icon-xs" aria-label="Cancel export" onClick={cancel}>
          <XIcon />
        </Button>
      </div>
    )
  }
  if (state.phase === "done") {
    return (
      <div className="mx-1 flex items-center gap-0.5">
        <Button size="sm" onClick={() => download(title)}>
          <CheckIcon data-icon="inline-start" /> Download video
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={reset}>
          <XIcon />
        </Button>
      </div>
    )
  }
  return (
    <Button variant="secondary" size="sm" className="mx-1" onClick={exporter.run}>
      <FilmIcon data-icon="inline-start" /> Export video
    </Button>
  )
}
