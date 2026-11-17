"use client"

import * as React from "react"
import { AudioWaveformIcon, PlayIcon, RefreshCwIcon } from "lucide-react"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { PlayerSnapshot } from "@/lib/player"
import { buildTimeline, formatTime } from "@/lib/timeline"
import { MarkdownLite } from "./markdown-lite"
import { PromptBox } from "./prompt-box"
import type { ChatItem, ClipState } from "./types"

type Props = {
  items: ChatItem[]
  clips: Record<string, ClipState>
  activeClipId: string | null
  snap: PlayerSnapshot
  input: string
  setInput: (v: string) => void
  onSend: (text: string) => void
  onPlayClip: (clipId: string) => void
  onChapter: (clipId: string, chapter: number) => void
  onRetry: (clipId: string) => void
  onStop: () => void
  busy: boolean
  textareaRef: React.Ref<HTMLTextAreaElement>
}

const QUICK = [
  { label: "Explain it simpler", text: "I didn't quite get that. Can you explain it more simply, with a different analogy?" },
  { label: "Give an example", text: "Can you show me a concrete example?" },
  { label: "Quiz me", text: "Quiz me with one question to check that I understood." },
]

export function ChatPanel(props: Props) {
  const { items, clips, input, setInput, onSend, busy, onStop, textareaRef } = props
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-5 px-4 py-4">
              {items.map((item) => (
                <MessageScrollerItem key={item.id} messageId={item.id} scrollAnchor={item.role === "user"}>
                  {item.role === "user" ? (
                    <Message align="end">
                      <MessageContent>
                        <Bubble align="end" variant="muted">
                          <BubbleContent className="rounded-2xl px-3.5">{item.text}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  ) : (
                    <AssistantMessage clip={clips[item.clipId]} {...props} />
                  )}
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {QUICK.map((q) => (
            <Button
              key={q.label}
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-full font-normal"
              disabled={busy}
              onClick={() => onSend(q.text)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <PromptBox
          textareaRef={textareaRef}
          value={input}
          onChange={setInput}
          onSubmit={() => onSend(input)}
          placeholder="Ask a follow-up question…"
          busy={busy}
          onStop={onStop}
        />
      </div>
    </div>
  )
}

function AssistantMessage({
  clip,
  activeClipId,
  snap,
  onPlayClip,
  onChapter,
  onRetry,
}: Props & { clip: ClipState | undefined }) {
  if (!clip) return null
  const active = activeClipId === clip.id
  const generating = !clip.done && !clip.error

  return (
    <Message>
      <MessageContent className="gap-2">
        {clip.kind === "lesson" && (
          <div className="flex items-center gap-2 px-0.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <AudioWaveformIcon className="size-3.5" />
            </span>
            <span className="truncate text-sm font-medium">{clip.title ?? "Writing your lesson…"}</span>
          </div>
        )}

        {clip.reply ? (
          <Bubble variant="ghost">
            <BubbleContent className="text-[14px] leading-relaxed">
              <MarkdownLite text={clip.reply} />
            </BubbleContent>
          </Bubble>
        ) : generating ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Thinking…
          </div>
        ) : null}

        {clip.kind === "lesson" && <Chapters clip={clip} active={active} snap={snap} onChapter={onChapter} />}

        {clip.kind === "followup" && clip.segments.length > 0 && (
          <div>
            <Button
              variant={active ? "secondary" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => onPlayClip(clip.id)}
              disabled={active && (snap.status === "playing" || snap.status === "buffering")}
            >
              {active && snap.status === "playing" ? (
                <>
                  <AudioWaveformIcon data-icon="inline-start" className="animate-pulse" /> Playing on the board
                </>
              ) : (
                <>
                  <PlayIcon data-icon="inline-start" /> {active ? "Play explanation" : "Replay on the board"}
                </>
              )}
            </Button>
          </div>
        )}

        {clip.error && (
          <Bubble variant="destructive">
            <BubbleContent>{clip.error}</BubbleContent>
          </Bubble>
        )}
        {clip.error && (
          <MessageFooter className="px-0">
            <Button variant="ghost" size="sm" onClick={() => onRetry(clip.id)}>
              <RefreshCwIcon data-icon="inline-start" /> Try again
            </Button>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

function Chapters({
  clip,
  active,
  snap,
  onChapter,
}: {
  clip: ClipState
  active: boolean
  snap: PlayerSnapshot
  onChapter: (clipId: string, chapter: number) => void
}) {
  const timeline = React.useMemo(
    () => (active ? snap.timeline : buildTimeline(clip.segments, [])),
    [active, snap.timeline, clip.segments]
  )
  const current = active ? timeline.boardOfSeg[snap.seg] ?? -1 : -1
  const chapters = timeline.chapters
  const generating = !clip.done && !clip.error
  if (!chapters.length && !generating) return null

  return (
    <ol className="flex flex-col">
      {chapters.map((c, i) => {
        const ready = clip.done || c.firstSeg < Math.max(0, clip.segments.length - 1)
        return (
          <li key={c.board}>
            <button
              type="button"
              disabled={!ready}
              onClick={() => onChapter(clip.id, i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50",
                current === c.board && "bg-muted"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums",
                  current === c.board ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(c.start)}</span>
            </button>
          </li>
        )
      })}
      {generating && (
        <li className="flex items-center gap-3 px-2 py-1.5 text-sm text-muted-foreground">
          <Spinner className="size-5 p-0.5" />
          Drawing the next part…
        </li>
      )}
    </ol>
  )
}
