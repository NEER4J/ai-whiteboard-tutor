"use client"

import * as React from "react"
import { BrainCircuitIcon, RulerIcon, SunIcon, SyringeIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import type { Attachment } from "@/lib/attachments"
import { useAttachments } from "@/lib/use-attachments"
import { checkTopic, SUGGESTIONS } from "@/lib/intent"
import type { Level } from "@/lib/schema"
import { AttachButton, AttachmentChips } from "./attachment-chips"
import { Credit } from "./credit"
import { BoardDoodles } from "./board-doodles"
import { LevelSlider } from "./level-slider"
import { LogoMark } from "./logo"
import { PromptBox } from "./prompt-box"

// Each card gets its own pastel (light and dark variants written out in full so Tailwind sees them).
const EXAMPLES = [
  {
    text: "Why is the sky blue?",
    icon: SunIcon,
    card: "bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-400/10 dark:hover:bg-sky-400/20",
    iconColor: "text-sky-600 dark:text-sky-300",
  },
  {
    text: "How does a neural network learn?",
    icon: BrainCircuitIcon,
    card: "bg-violet-50 hover:bg-violet-100/80 dark:bg-violet-400/10 dark:hover:bg-violet-400/20",
    iconColor: "text-violet-600 dark:text-violet-300",
  },
  {
    text: "Explain the Pythagorean theorem",
    icon: RulerIcon,
    card: "bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-400/10 dark:hover:bg-amber-400/20",
    iconColor: "text-amber-600 dark:text-amber-300",
  },
  {
    text: "How do vaccines train the immune system?",
    icon: SyringeIcon,
    card: "bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/20",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
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

  const start = (text: string) => {
    // Greetings, thanks and gibberish never start a lesson.
    if (!files.length) {
      const verdict = checkTopic(text)
      if (!verdict.ok) {
        setLocalNotice(verdict.reply)
        return
      }
    }
    setLocalNotice(null)
    const t = text.trim() || (files.length ? `the attached ${files.length > 1 ? "material" : files[0].name}` : "")
    onStart(t, files.length ? files : undefined)
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
          onSubmit={() => start(topic)}
          placeholder="Teach me how black holes form…"
          onPasteFiles={add}
          header={files.length ? <AttachmentChips files={files} onRemove={remove} /> : undefined}
          addon={
            <>
              <AttachButton onFiles={add} />
              <span className="ml-1 hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <Kbd>↵</Kbd> to start
              </span>
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

        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Get started with an example</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {EXAMPLES.map(({ text, icon: Icon, card, iconColor }) => (
              <button
                key={text}
                type="button"
                onClick={() => onStart(text)}
                className={cn("group flex min-h-28 flex-col justify-between gap-4 rounded-2xl p-4 text-left text-sm leading-snug text-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", card)}>
                <span>{text}</span>
                <Icon className={cn("size-[18px]", iconColor)} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <Credit className="relative mt-2 mb-2 md:hidden" />
    </div>
  )
}
