"use client"

import * as React from "react"
import { BrainCircuitIcon, PaperclipIcon, RulerIcon, SunIcon, SyringeIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ACCEPT, AttachmentError, MAX_FILES, MAX_TOTAL_BYTES, readAttachment, type Attachment } from "@/lib/attachments"
import type { Level } from "@/lib/schema"
import { AttachmentChips } from "./attachment-chips"
import { BoardDoodles } from "./board-doodles"
import { LevelSlider } from "./level-slider"
import { PromptBox } from "./prompt-box"

const EXAMPLES = [
  { text: "Why is the sky blue?", icon: SunIcon },
  { text: "How does a neural network learn?", icon: BrainCircuitIcon },
  { text: "Explain the Pythagorean theorem", icon: RulerIcon },
  { text: "How do vaccines train the immune system?", icon: SyringeIcon },
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
  mode: "live" | "sample" | null
}

export function EmptyState({ level, setLevel, onStart, mode }: Props) {
  const [topic, setTopic] = React.useState("")
  const [files, setFiles] = React.useState<Attachment[]>([])
  const fileInput = React.useRef<HTMLInputElement>(null)
  // Time-of-day greeting without a hydration mismatch.
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => "Hello")

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    let next = [...files]
    for (const f of Array.from(list)) {
      try {
        if (next.length >= MAX_FILES) throw new AttachmentError(`You can attach up to ${MAX_FILES} files.`)
        const a = await readAttachment(f)
        if (next.some((x) => x.id === a.id)) continue
        if (next.reduce((n, x) => n + x.size, 0) + a.size > MAX_TOTAL_BYTES) {
          throw new AttachmentError("Attachments are limited to 3 MB in total.")
        }
        next = [...next, a]
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't attach that file.")
      }
    }
    setFiles(next)
    if (fileInput.current) fileInput.current.value = ""
  }

  const start = (text: string) => {
    const t = text.trim() || (files.length ? `the attached ${files.length > 1 ? "material" : files[0].name}` : "")
    onStart(t, files.length ? files : undefined)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-10">
      <BoardDoodles />
      <div className="relative my-auto flex w-full max-w-4xl flex-col gap-9 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
            {hello} <span aria-hidden>👋</span>
          </h1>
          <p className="max-w-md text-sm text-balance text-muted-foreground">
            Type any topic, or attach your notes, and get a two-minute lesson drawn on a whiteboard.
          </p>
          {mode === "sample" && (
            <p className="max-w-md text-xs text-balance text-muted-foreground/80">
              Sample mode: no AI key is configured, so every topic plays the same pre-written lesson.
            </p>
          )}
        </div>

        <PromptBox
          size="lg"
          autoFocus
          allowEmpty={files.length > 0}
          value={topic}
          onChange={setTopic}
          onSubmit={() => start(topic)}
          placeholder="Teach me how black holes form…"
          header={files.length ? <AttachmentChips files={files} onRemove={(id) => setFiles((fs) => fs.filter((f) => f.id !== id))} /> : undefined}
          addon={
            <>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => addFiles(e.target.files)}
              />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl bg-background"
                      aria-label="Attach files"
                      onClick={() => fileInput.current?.click()}
                    />
                  }
                >
                  <PaperclipIcon />
                </TooltipTrigger>
                <TooltipContent>Attach notes, a PDF or an image</TooltipContent>
              </Tooltip>
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
            {EXAMPLES.map(({ text, icon: Icon }) => (
              <button
                key={text}
                type="button"
                onClick={() => onStart(text)}
                className="group flex min-h-28 flex-col justify-between gap-4 rounded-2xl bg-muted/60 p-4 text-left text-sm leading-snug text-foreground/90 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-muted/40 dark:hover:bg-muted/70"
              >
                <span>{text}</span>
                <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
