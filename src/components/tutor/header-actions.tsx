"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { CopyIcon, DownloadIcon, MaximizeIcon, MinimizeIcon, MoonIcon, MoreHorizontalIcon, PlusIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconButton } from "./icon-button"
import type { ChatItem, ClipState } from "./types"

/** Plain-text/Markdown transcript of the lesson and every follow-up. */
export function buildTranscript(title: string, items: ChatItem[], clips: Record<string, ClipState>) {
  const out: string[] = [`# ${title}`, ""]
  for (const it of items) {
    if (it.role === "user") {
      out.push(`**You:** ${it.text}`, "")
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
}

export function HeaderActions({ inLesson, title, items, clips, onNew, onFullscreen, fullscreen }: Props) {
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
      <div className="flex items-center md:hidden">
        {inLesson ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More options" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={copy}>
                <CopyIcon /> Copy transcript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={download}>
                <DownloadIcon /> Download transcript
              </DropdownMenuItem>
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
      <div className="hidden items-center gap-0.5 md:flex">
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
