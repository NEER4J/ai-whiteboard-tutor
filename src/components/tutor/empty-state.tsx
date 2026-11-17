"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Attachment } from "@/lib/attachments"
import { useAttachments } from "@/lib/use-attachments"
import { keyHeaders } from "@/lib/byok"
import { SUGGESTIONS } from "@/lib/intent"
import type { Level } from "@/lib/schema"
import { AttachButton, AttachmentChips } from "./attachment-chips"
import { Credit } from "./credit"
import { BoardDoodles } from "./board-doodles"
import { LevelSlider } from "./level-slider"
import { LogoMark } from "./logo"
import { PromptBox } from "./prompt-box"

// Visual, "wow" starters. Each chip has its own pastel (written out in full so Tailwind sees the classes).
const STARTERS = [
  { text: "How does a jet engine make thrust?", emoji: "✈️", chip: "bg-sky-50 hover:bg-sky-100 dark:bg-sky-400/10 dark:hover:bg-sky-400/20" },
  { text: "Inside a beating heart: how blood flows", emoji: "🫀", chip: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-400/10 dark:hover:bg-rose-400/20" },
  { text: "How do black holes bend light?", emoji: "🌌", chip: "bg-violet-50 hover:bg-violet-100 dark:bg-violet-400/10 dark:hover:bg-violet-400/20" },
  { text: "How does GPS find you from space?", emoji: "🛰️", chip: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/20" },
  { text: "How does CRISPR edit DNA?", emoji: "🧬", chip: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-400/10 dark:hover:bg-amber-400/20" },
  { text: "How does a rocket reach orbit?", emoji: "🚀", chip: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-400/10 dark:hover:bg-orange-400/20" },
]

type ChatMsg = { role: "user" | "assistant"; text: string }

const noopSubscribe = () => () => {}
function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

type Props = {
  level: Level
  setLevel: (l: Level) => void
  onStart: (topic: string, attachments?: Attachment[]) => void
  /** A friendly message from the tutor instead of a lesson (e.g. after "hi"). */
  notice?: string | null
  onClearNotice?: () => void
}

export function EmptyState({ level, setLevel, onStart, notice, onClearNotice }: Props) {
  const [topic, setTopic] = React.useState("")
  const { files, add, remove } = useAttachments()
  const [localNotice, setLocalNotice] = React.useState<string | null>(null)
  const shownNotice = localNotice ?? notice ?? null
  // Time-of-day greeting without a hydration mismatch.
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => "Hello")

  const [thread, setThread] = React.useState<ChatMsg[]>([])
  const [thinking, setThinking] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [thread, thinking])

  /** Everything typed here is a conversation: Chalk answers, or decides to make a lesson (the create_lesson tool). */
  const send = async (text: string) => {
    const message = text.trim()
    setLocalNotice(null)
    onClearNotice?.()
    // Attached material always becomes a lesson.
    if (files.length) {
      onStart(message || `the attached ${files.length > 1 ? "material" : files[0].name}`, files)
      return
    }
    if (!message || thinking) return
    setTopic("")
    const history = thread.slice(-8)
    setThread((t) => [...t, { role: "user", text: message }])
    setThinking(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ message, level, history }),
      })
      const data = (await res.json().catch(() => null)) as { reply?: string; lessonTopic?: string; error?: string } | null
      if (!res.ok || !data) throw new Error(data?.error ?? "Chalk couldn't reply just now. Please try again.")
      if (data.reply) setThread((t) => [...t, { role: "assistant", text: data.reply! }])
      if (data.lessonTopic) {
        // Let the reply be seen for a beat, then start the lesson.
        await new Promise((r) => setTimeout(r, 900))
        onStart(data.lessonTopic)
        setThread([])
      }
    } catch (e) {
      setThread((t) => [...t, { role: "assistant", text: (e as Error).message }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-10">
      <BoardDoodles />
      <div className="relative my-auto flex w-full max-w-3xl flex-col gap-9 py-8">
        <div className="flex flex-col items-start gap-3 text-left">
          <p className="text-sm font-medium text-muted-foreground">
            {hello} <span aria-hidden>👋</span>
          </p>
          <h1 className="text-4xl leading-[1.15] font-medium tracking-tight sm:text-5xl sm:leading-[1.15]">
            Learn{" "}
            <span className="-mx-1 rounded-md bg-[linear-gradient(transparent_58%,#fde68a_58%,#fde68a_92%,transparent_92%)] px-1 dark:bg-[linear-gradient(transparent_58%,rgb(250_204_21/0.28)_58%,rgb(250_204_21/0.28)_92%,transparent_92%)]">
              anything
            </span>{" "}
            in two minutes.
          </h1>
          <p className="max-w-lg text-base text-pretty text-muted-foreground">
            Type any topic or attach your notes. Chalk talks you through it out loud and draws it on a whiteboard as it goes.
          </p>
        </div>

        <PromptBox
          size="lg"
          autoFocus
          allowEmpty={files.length > 0}
          value={topic}
          onChange={(v) => {
            setTopic(v)
            if (shownNotice) {
              setLocalNotice(null)
              onClearNotice?.()
            }
          }}
          onSubmit={() => void send(topic)}
          placeholder="Ask anything, or say what you want to learn…"
          onPasteFiles={add}
          header={files.length ? <AttachmentChips files={files} onRemove={remove} /> : undefined}
          addon={
            <>
              <AttachButton onFiles={add} />
            </>
          }
          endAddon={<LevelSlider level={level} setLevel={setLevel} />}
        />

        {shownNotice && (
          <div className="-mt-4 flex animate-in gap-3 rounded-2xl bg-muted/60 p-3.5 duration-300 fade-in slide-in-from-top-1 dark:bg-muted/40" role="status">
            <LogoMark className="mt-0.5 h-5 w-6 shrink-0 text-foreground" />
            <div className="flex min-w-0 flex-col gap-2.5">
              <p className="text-sm leading-relaxed">{shownNotice}</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onStart(q)}
                    className="rounded-full bg-background px-3 py-1.5 text-xs transition-colors hover:bg-foreground hover:text-background"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {thread.length > 0 && (
          <div className="-mt-4 flex flex-col gap-3" aria-live="polite">
            {thread.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] animate-in rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm duration-200 fade-in slide-in-from-bottom-1">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="flex animate-in gap-3 rounded-2xl bg-muted/50 p-3.5 duration-300 fade-in slide-in-from-bottom-1 dark:bg-muted/30">
                  <LogoMark className="mt-0.5 h-5 w-6 shrink-0 text-foreground" />
                  <p className="min-w-0 text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
              )
            )}
            {thinking && (
              <div className="flex items-center gap-3 px-3.5 py-1" role="status" aria-label="Chalk is typing">
                <LogoMark className="h-5 w-6 shrink-0 text-muted-foreground" />
                <span className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {shownNotice && thread.length === 0 && (
          <div className="-mt-4 flex animate-in gap-3 rounded-2xl bg-muted/60 p-3.5 duration-300 fade-in slide-in-from-top-1 dark:bg-muted/40" role="status">
            <LogoMark className="mt-0.5 h-5 w-6 shrink-0 text-foreground" />
            <p className="text-sm leading-relaxed">{shownNotice}</p>
          </div>
        )}

        <div className="-mt-3 flex flex-wrap gap-2" aria-label="Suggested topics">
          {STARTERS.map(({ text, emoji, chip }) => (
            <button
              key={text}
              type="button"
              disabled={thinking}
              onClick={() => onStart(text)}
              className={cn("flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50", chip)}
            >
              <span aria-hidden>{emoji}</span>
              {text}
            </button>
          ))}
        </div>
      </div>
      <Credit className="relative mt-2 mb-2 md:hidden" />
    </div>
  )
}
