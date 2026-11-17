"use client"

import * as React from "react"
import {
  AudioWaveformIcon,
  CheckIcon,
  ClockIcon,
  CircleHelpIcon,
  LayersIcon,
  PlayIcon,
  LightbulbIcon,
  RefreshCwIcon,
  SendIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageContent } from "@/components/ui/message"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { PlayerSnapshot } from "@/lib/player"
import { buildTimeline, formatTime } from "@/lib/timeline"
import { LogoMark } from "./logo"
import { MarkdownLite } from "./markdown-lite"
import type { ClipState } from "./types"

/** What kind of follow-up this was, from the learner's own words. */
function intentOf(text: string) {
  // The learner's own quiz answer: the tutor is giving feedback, not asking a new question.
  if (/^here is my answer to your quiz/i.test(text)) return { label: "Feedback", quiz: false, tone: "emerald" as const }
  // A hint request keeps the same question open, so the answer box stays.
  if (/^i'?m not sure about the quiz/i.test(text)) return { label: "Hint", quiz: true, tone: "violet" as const }
  if (/quiz|test me|check that i/i.test(text)) return { label: "Quiz", quiz: true, tone: "violet" as const }
  if (/simpl|didn'?t (quite )?get|confus|analogy/i.test(text)) return { label: "Simpler explanation", quiz: false, tone: "sky" as const }
  if (/example|show me/i.test(text)) return { label: "Example", quiz: false, tone: "amber" as const }
  return { label: "Answer", quiz: false, tone: "emerald" as const }
}

const TONE = {
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
}

/** Chapter badge colours, rotating, matching the home-screen cards. */
const CHAPTER = [
  "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300",
]

type Props = {
  clip: ClipState | undefined
  userText: string
  level: string
  activeClipId: string | null
  snap: PlayerSnapshot
  onPlayClip: (clipId: string) => void
  onChapter: (clipId: string, chapter: number) => void
  onRetry: (clipId: string) => void
  /** Present on quiz questions that are still waiting for the learner's answer. */
  quizAnswer?: { busy: boolean; onSubmit: (text: string) => void }
  /** Present on the newest finished answer: lets the learner say it wasn't clear. */
  feedback?: { busy: boolean; onUnclear: () => void }
}

export function AssistantMessage({ clip, userText, level, activeClipId, snap, onPlayClip, onChapter, onRetry, quizAnswer, feedback }: Props) {
  if (!clip) return null
  const active = activeClipId === clip.id
  const generating = !clip.done && !clip.error
  const isLesson = clip.kind === "lesson"
  const intent = isLesson ? null : intentOf(userText)

  return (
    <Message>
      <MessageContent className="gap-3">
        {/* who's talking */}
        <div className="flex items-center gap-2 px-0.5">
          <LogoMark className="h-5 w-6 shrink-0 text-foreground" />
          <span className="truncate text-sm font-medium">
            {isLesson ? (clip.title ?? "Creating your lesson…") : "Tutor"}
          </span>
          {intent && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[intent.tone])}>{intent.label}</span>}
        </div>

        {/* live progress while the lesson / answer is being made */}
        {generating && <CreatingCard clip={clip} />}

        {/* the tutor's words */}
        {clip.reply &&
          (intent?.quiz ? (
            <div className="flex gap-2.5 rounded-2xl bg-violet-50 px-3.5 py-3 text-[14px] leading-relaxed dark:bg-violet-400/10">
              <CircleHelpIcon className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
              <div className="min-w-0">
                <p className="mb-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">Your turn: answer below</p>
                <MarkdownLite text={clip.reply} />
                {clip.done && quizAnswer && <QuizAnswer busy={quizAnswer.busy} onSubmit={quizAnswer.onSubmit} />}
              </div>
            </div>
          ) : (
            <Bubble variant="ghost">
              <BubbleContent className="text-[14px] leading-relaxed">
                <MarkdownLite text={clip.reply} />
              </BubbleContent>
            </Bubble>
          ))}

        {isLesson && <LessonCard clip={clip} active={active} snap={snap} level={level} onChapter={onChapter} />}

        {!isLesson && clip.segments.length > 0 && <BoardAnswer clip={clip} active={active} snap={snap} onPlay={onPlayClip} />}

        {feedback && clip.done && !clip.error && !intent?.quiz && (clip.segments.length > 0 || !!clip.reply) && (
          <FeedbackRow busy={feedback.busy} onUnclear={feedback.onUnclear} />
        )}

        {clip.error && (
          <div className="flex flex-col items-start gap-2">
            <Bubble variant="destructive">
              <BubbleContent>{clip.error}</BubbleContent>
            </Bubble>
            <Button variant="outline" size="sm" onClick={() => onRetry(clip.id)}>
              <RefreshCwIcon data-icon="inline-start" /> Try again
            </Button>
          </div>
        )}
      </MessageContent>
    </Message>
  )
}

/* ------------------------------------------------------------------ */

function Step({ state, children, detail }: { state: "done" | "active" | "todo"; children: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full",
          state === "done" && "bg-emerald-500 text-white",
          state === "active" && "bg-background text-foreground",
          state === "todo" && "bg-background text-transparent ring-1 ring-border"
        )}
      >
        {state === "done" ? <CheckIcon className="size-3" strokeWidth={3} /> : state === "active" ? <Spinner className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", state === "todo" ? "text-muted-foreground" : "font-medium")}>{children}</span>
        {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
      </span>
    </li>
  )
}

/** Shows what the tutor is doing right now, step by step, until the clip is complete. */
/** Whole seconds since mount, while `on` is true. */
function useElapsed(on: boolean) {
  const [s, setS] = React.useState(0)
  React.useEffect(() => {
    if (!on) return
    const t = setInterval(() => setS((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [on])
  return s
}

function CreatingCard({ clip }: { clip: ClipState }) {
  const isLesson = clip.kind === "lesson"
  const segs = clip.segments.length
  const boards = clip.segments.filter((s, i) => i === 0 || s.newBoard).length
  const currentBoard = [...clip.segments].reverse().find((s) => s.boardTitle)?.boardTitle
  const planned = !!(clip.title || clip.reply || segs)
  const expected = isLesson ? 9 : 3
  const value = Math.min(94, planned ? 12 + (segs / expected) * 82 : 6)
  const thinkingFor = useElapsed(!planned)

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3.5 dark:bg-muted/40">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{isLesson ? "Creating your lesson" : "Preparing your answer"}</span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <Progress value={value} className="gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:duration-500" />
      <ol className="flex flex-col gap-2.5">
        <Step
          state={planned ? "done" : "active"}
          detail={
            !planned ? (
              <span className="inline-flex items-center gap-1.5">
                The AI is thinking: picking the key ideas and the best order to teach them
                <span className="tabular-nums">· {thinkingFor}s</span>
              </span>
            ) : undefined
          }
        >
          {planned ? (isLesson ? "Planned the lesson" : "Understood your question") : "Thinking it through…"}
        </Step>
        <Step
          state={!planned ? "todo" : "active"}
          detail={
            planned
              ? segs
                ? `${isLesson ? `Board ${boards}${currentBoard ? `: ${currentBoard}` : ""} · ` : ""}${segs} step${segs === 1 ? "" : "s"} written so far`
                : "Sketching the first board…"
              : undefined
          }
        >
          {isLesson ? "Drawing the whiteboard and writing the narration" : "Drawing the answer on the board"}
        </Step>
        <Step state="todo" detail={undefined}>
          Recording the voice as you watch
        </Step>
      </ol>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LessonCard({
  clip,
  active,
  snap,
  level,
  onChapter,
}: {
  clip: ClipState
  active: boolean
  snap: PlayerSnapshot
  level: string
  onChapter: (clipId: string, chapter: number) => void
}) {
  const timeline = React.useMemo(() => (active ? snap.timeline : buildTimeline(clip.segments, [])), [active, snap.timeline, clip.segments])
  const current = active ? (timeline.boardOfSeg[snap.seg] ?? -1) : -1
  const playing = active && snap.status === "playing"
  const generating = !clip.done && !clip.error
  const chapters = timeline.chapters
  if (!chapters.length && !generating) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-[#f4f4f5] p-1.5 dark:bg-white/[0.08]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1.5 pb-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Lesson outline</span>
        {chapters.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <LayersIcon className="size-3" /> {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
          </span>
        )}
        {timeline.total > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <ClockIcon className="size-3" /> {generating ? "~" : ""}
            {formatTime(timeline.total)}
          </span>
        )}
        <Badge variant="secondary" className="ml-auto h-5 font-normal capitalize">
          {level}
        </Badge>
      </div>
      <ol className="flex flex-col">
        {chapters.map((c, i) => {
          const ready = clip.done || c.firstSeg < Math.max(0, clip.segments.length - 1)
          const isCurrent = current === c.board
          return (
            <li key={c.board} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
              <button
                type="button"
                disabled={!ready}
                onClick={() => onChapter(clip.id, i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-background/60 disabled:opacity-50",
                  isCurrent && "bg-background hover:bg-background dark:bg-card"
                )}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums", CHAPTER[i % CHAPTER.length])}>
                  {isCurrent && playing ? <AudioWaveformIcon className="size-3.5 animate-pulse" /> : i + 1}
                </span>
                <span className={cn("min-w-0 flex-1 truncate", isCurrent && "font-medium")}>{c.title}</span>
                {isCurrent ? (
                  <span className="text-xs font-medium text-foreground">{playing ? "Now playing" : "Paused here"}</span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">{formatTime(c.start)}</span>
                )}
              </button>
            </li>
          )
        })}
        {generating && (
          <li className="flex items-center gap-3 px-2 py-2" aria-label="Drawing the next chapter">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
          </li>
        )}
      </ol>
    </div>
  )
}

function BoardAnswer({ clip, active, snap, onPlay }: { clip: ClipState; active: boolean; snap: PlayerSnapshot; onPlay: (id: string) => void }) {
  const total = React.useMemo(() => buildTimeline(clip.segments, []).total, [clip.segments])
  const title = clip.segments.find((s) => s.boardTitle)?.boardTitle ?? "Whiteboard answer"
  const playing = active && snap.status === "playing"
  const busy = active && (snap.status === "playing" || snap.status === "buffering")
  return (
    <button
      type="button"
      onClick={() => onPlay(clip.id)}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-muted/50 p-2.5 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-muted/50",
        active && "bg-muted"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {playing ? <AudioWaveformIcon className="size-4 animate-pulse" /> : <PlayIcon className="size-4 fill-current" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {playing ? "Playing on the whiteboard" : active ? "Press to play on the whiteboard" : "Watch it on the whiteboard"}
          {total > 0 && <span className="tabular-nums"> · {formatTime(total)}</span>}
        </span>
      </span>
    </button>
  )
}

/** Type the quiz answer right under the question (or ask for a hint). */
function QuizAnswer({ busy, onSubmit }: { busy: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = React.useState("")
  const canSend = text.trim().length > 1 && !busy
  const submit = () => {
    if (!canSend) return
    onSubmit(`Here is my answer to your quiz question: ${text.trim()}`)
    setText("")
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        rows={2}
        maxLength={500}
        placeholder="Type your answer here…"
        aria-label="Your answer to the quiz question"
        className="min-h-16 resize-none rounded-xl border-transparent bg-background text-[14px] shadow-none focus-visible:ring-1"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-full" disabled={!canSend} onClick={submit}>
          <SendIcon data-icon="inline-start" /> Check my answer
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-400/15"
          disabled={busy}
          onClick={() => onSubmit("I'm not sure about the quiz question. Can you give me a hint without giving away the answer?")}
        >
          <LightbulbIcon data-icon="inline-start" /> Give me a hint
        </Button>
      </div>
    </div>
  )
}

/** "Was this clear?" A thumbs-down asks the tutor to explain it again differently. */
function FeedbackRow({ busy, onUnclear }: { busy: boolean; onUnclear: () => void }) {
  const [vote, setVote] = React.useState<"up" | "down" | null>(null)
  return (
    <div className="flex items-center gap-1 px-0.5 text-xs text-muted-foreground" role="group" aria-label="Was this explanation clear?">
      {vote === null ? (
        <>
          <span className="mr-1">Was this clear?</span>
          <Button variant="ghost" size="icon-xs" className="rounded-full" aria-label="Yes, it was clear" onClick={() => setVote("up")}>
            <ThumbsUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="rounded-full"
            aria-label="No, explain it differently"
            disabled={busy}
            onClick={() => {
              setVote("down")
              onUnclear()
            }}
          >
            <ThumbsDownIcon />
          </Button>
        </>
      ) : vote === "up" ? (
        <span>Glad it helped! Ask a follow-up or take a quiz.</span>
      ) : (
        <span>Thanks, let me try another way.</span>
      )}
    </div>
  )
}
