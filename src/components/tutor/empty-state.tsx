"use client"

import * as React from "react"
import { DnaIcon, HeartPulseIcon, OrbitIcon, PlaneIcon, RocketIcon, SatelliteDishIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Attachment } from "@/lib/attachments"
import { SUGGESTIONS } from "@/lib/intent"
import { useAttachments } from "@/lib/use-attachments"
import type { Level } from "@/lib/schema"
import { AttachButton, AttachmentChips } from "./attachment-chips"
import { Credit } from "./credit"
import { BoardDoodles } from "./board-doodles"
import { LevelSlider } from "./level-slider"
import { LogoMark } from "./logo"
import { PromptBox } from "./prompt-box"

// Visual, "wow" starters. Each chip has its own pastel and icon (written out in full so Tailwind sees the classes).
const STARTERS = [
  { text: "How does a jet engine make thrust?", icon: PlaneIcon, chip: "bg-sky-50 hover:bg-sky-100 dark:bg-sky-400/10 dark:hover:bg-sky-400/20", tint: "text-sky-600 dark:text-sky-300" },
  { text: "Inside a beating heart: how blood flows", icon: HeartPulseIcon, chip: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-400/10 dark:hover:bg-rose-400/20", tint: "text-rose-600 dark:text-rose-300" },
  { text: "How do black holes bend light?", icon: OrbitIcon, chip: "bg-violet-50 hover:bg-violet-100 dark:bg-violet-400/10 dark:hover:bg-violet-400/20", tint: "text-violet-600 dark:text-violet-300" },
  { text: "How does GPS find you from space?", icon: SatelliteDishIcon, chip: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/20", tint: "text-emerald-600 dark:text-emerald-300" },
  { text: "How does CRISPR edit DNA?", icon: DnaIcon, chip: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-400/10 dark:hover:bg-amber-400/20", tint: "text-amber-600 dark:text-amber-300" },
  { text: "How does a rocket reach orbit?", icon: RocketIcon, chip: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-400/10 dark:hover:bg-orange-400/20", tint: "text-orange-600 dark:text-orange-300" },
]

const noopSubscribe = () => () => {}
function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

type Props = {
  level: Level
  setLevel: (l: Level) => void
  onStart: (topic: string, attachments?: Attachment[]) => void
  /** Start a conversation with Chalk (opens the chat page). */
  onChat: (message: string) => void
  /** A friendly message from the tutor instead of a lesson (e.g. after "hi"). */
  notice?: string | null
  onClearNotice?: () => void
}

export function EmptyState({ level, setLevel, onStart, onChat, notice, onClearNotice }: Props) {
  const [topic, setTopic] = React.useState("")
  const { files, add, remove } = useAttachments()
  const [localNotice, setLocalNotice] = React.useState<string | null>(null)
  const shownNotice = localNotice ?? notice ?? null
  // Time-of-day greeting without a hydration mismatch.
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => "Hello")

  /** Typing here opens a chat. Attached material always becomes a lesson right away. */
  const send = (text: string) => {
    const message = text.trim()
    setLocalNotice(null)
    onClearNotice?.()
    if (files.length) {
      onStart(message || `the attached ${files.length > 1 ? "material" : files[0].name}`, files)
      return
    }
    if (message.length >= 1) onChat(message)
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
          onSubmit={() => send(topic)}
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

        {shownNotice && (
          <div className="-mt-4 flex animate-in gap-3 rounded-2xl bg-muted/60 p-3.5 duration-300 fade-in slide-in-from-top-1 dark:bg-muted/40" role="status">
            <LogoMark className="mt-0.5 h-5 w-6 shrink-0 text-foreground" />
            <p className="text-sm leading-relaxed">{shownNotice}</p>
          </div>
        )}

        <div className="-mt-3 flex flex-wrap gap-2" aria-label="Suggested topics">
          {STARTERS.map(({ text, icon: Icon, chip, tint }) => (
            <button
              key={text}
              type="button"
                            onClick={() => onStart(text)}
              className={cn("flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", chip)}
            >
              <Icon className={cn("size-4 shrink-0", tint)} aria-hidden />
              {text}
            </button>
          ))}
        </div>
      </div>
      <Credit className="relative mt-2 mb-2 md:hidden" />
    </div>
  )
}
