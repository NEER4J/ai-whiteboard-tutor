"use client"

import * as React from "react"
import { toast } from "sonner"
import { exportLessonVideo, type ExportResult } from "./export-video"
import type { Segment } from "./schema"
import { VoiceUnavailableError } from "./voice"

export type VideoExportState =
  | { phase: "idle" }
  | { phase: "working"; ratio: number; label: string }
  | { phase: "done"; result: ExportResult; url: string }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson"

/** Renders the lesson to a video in the background; the header shows a progress ring while it runs. */
export function useVideoExport() {
  const [state, setState] = React.useState<VideoExportState>({ phase: "idle" })
  const abortRef = React.useRef<AbortController | null>(null)
  const urlRef = React.useRef<string | null>(null)

  const clear = React.useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setState({ phase: "idle" })
  }, [])

  const cancel = React.useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    clear()
  }, [clear])

  const start = React.useCallback(
    async (title: string, segments: Segment[]) => {
      clear()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setState({ phase: "working", ratio: 0, label: "Preparing narration" })
      toast.message("Exporting your video", { description: "Keep this tab open until it finishes." })
      try {
        const result = await exportLessonVideo({
          title,
          segments,
          signal: ctrl.signal,
          onProgress: (p) => {
            // Narration prep is the first ~10% of the ring; recording is the rest.
            const ratio = p.phase === "audio" ? p.ratio * 0.1 : 0.1 + p.ratio * 0.9
            setState({ phase: "working", ratio, label: p.label })
          },
        })
        const url = URL.createObjectURL(result.blob)
        urlRef.current = url
        setState({ phase: "done", result, url })
        toast.success("Your video is ready", { description: "Use Download video in the header." })
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setState({ phase: "idle" })
        toast.error(
          e instanceof VoiceUnavailableError
            ? "Video export needs the AI voice. Play the lesson once with it, then try again."
            : (e as Error).message || "Couldn't render the video."
        )
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
      }
    },
    [clear]
  )

  const download = React.useCallback(
    (title: string) => {
      if (state.phase !== "done") return
      const a = document.createElement("a")
      a.href = state.url
      a.download = `${slug(title)}.${state.result.ext}`
      a.click()
    },
    [state]
  )

  // Leaving the page mid-render would lose the video: ask first.
  React.useEffect(() => {
    if (state.phase !== "working") return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [state.phase])

  React.useEffect(() => () => abortRef.current?.abort(), [])

  return { state, start, cancel, download, reset: clear }
}

export type VideoExporter = ReturnType<typeof useVideoExport>
