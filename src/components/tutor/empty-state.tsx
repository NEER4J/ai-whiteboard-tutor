"use client"

import * as React from "react"
import { BrainCircuitIcon, RulerIcon, SunIcon, SyringeIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import type { Attachment } from "@/lib/attachments"
import { useAttachments } from "@/lib/use-attachments"
import type { Level } from "@/lib/schema"
import { AttachButton, AttachmentChips } from "./attachment-chips"
import { BoardDoodles } from "./board-doodles"
import { LevelSlider } from "./level-slider"
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
}

export function EmptyState({ level, setLevel, onStart }: Props) {
  const [topic, setTopic] = React.useState("")
  const { files, add, remove } = useAttachments()
  // Time-of-day greeting without a hydration mismatch.
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => "Hello")

  const start = (text: string) => {
    const t = text.trim() || (files.length ? `the attached ${files.length > 1 ? "material" : files[0].name}` : "")
    onStart(t, files.length ? files : undefined)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-10">
      <BoardDoodles />
      <div className="relative my-auto flex w-full max-w-3xl flex-col gap-9 py-8">
        <div className="flex flex-col items-start gap-3 text-left">
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            {hello} <span aria-hidden>👋</span>
          </h1>
          <p className="max-w-lg text-base text-pretty text-muted-foreground">
            Type any topic, or attach your notes, and get a two-minute lesson drawn on a whiteboard.
          </p>
        </div>

        <PromptBox
          size="lg"
          autoFocus
          allowEmpty={files.length > 0}
          value={topic}
          onChange={setTopic}
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
    </div>
  )
}
