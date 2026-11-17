"use client"

import * as React from "react"
import {
  BrainCircuitIcon,
  CaptionsIcon,
  ChevronDownIcon,
  DicesIcon,
  RulerIcon,
  SignalIcon,
  SunIcon,
  SyringeIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Level } from "@/lib/schema"
import { PromptBox } from "./prompt-box"

const EXAMPLES = [
  { text: "Why is the sky blue?", icon: SunIcon },
  { text: "How does a neural network learn?", icon: BrainCircuitIcon },
  { text: "Explain the Pythagorean theorem", icon: RulerIcon },
  { text: "How do vaccines train the immune system?", icon: SyringeIcon },
  { text: "What is compound interest?", icon: TrendingUpIcon },
]

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "Everyday words and analogies" },
  { value: "intermediate", label: "Intermediate", hint: "Correct terms and a worked example" },
  { value: "advanced", label: "Advanced", hint: "Precise, with notation and subtleties" },
]

const noopSubscribe = () => () => {}
function greeting() {
  const h = new Date().getHours()
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

type Props = {
  level: Level
  setLevel: (l: Level) => void
  captions: boolean
  setCaptions: (v: boolean) => void
  onStart: (topic: string) => void
  mode: "live" | "sample" | null
}

export function EmptyState({ level, setLevel, captions, setCaptions, onStart, mode }: Props) {
  const [topic, setTopic] = React.useState("")
  // Time-of-day greeting without a hydration mismatch.
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => "Hello")
  const current = LEVELS.find((l) => l.value === level)!

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-10">
      <div className="my-auto flex w-full max-w-4xl flex-col gap-10 py-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-[2.5rem]">
            {hello}.
            <br />
            What do you want to <span className="text-violet-500 dark:text-violet-400">learn</span>?
          </h1>
          {mode === "sample" && (
            <p className="mt-3 max-w-md text-xs text-balance text-muted-foreground">
              Sample mode: no AI key is configured, so every topic plays the same pre-written lesson.
            </p>
          )}
        </div>

        <PromptBox
          size="lg"
          autoFocus
          value={topic}
          onChange={setTopic}
          onSubmit={() => onStart(topic)}
          placeholder="Teach me how black holes form…"
          addon={
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-xl bg-background"
                      aria-label="Surprise me with a topic"
                      onClick={() => setTopic(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)].text)}
                    />
                  }
                >
                  <DicesIcon />
                </TooltipTrigger>
                <TooltipContent>Surprise me</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-pressed={captions}
                      aria-label="Captions"
                      className={cn("size-9 rounded-xl bg-background", captions ? "text-foreground" : "text-muted-foreground")}
                      onClick={() => setCaptions(!captions)}
                    />
                  }
                >
                  <CaptionsIcon />
                </TooltipTrigger>
                <TooltipContent>{captions ? "Captions on" : "Captions off"}</TooltipContent>
              </Tooltip>
              <span className="ml-1 hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <Kbd>↵</Kbd> to start
              </span>
            </>
          }
          endAddon={
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" className="h-9 rounded-xl bg-background px-3" />}>
                <SignalIcon data-icon="inline-start" className="text-violet-500" />
                {current.label}
                <ChevronDownIcon data-icon="inline-end" className="opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-64">
                <DropdownMenuRadioGroup value={level} onValueChange={(v) => setLevel(v as Level)}>
                  {LEVELS.map((l) => (
                    <DropdownMenuRadioItem key={l.value} value={l.value} className="flex-col items-start gap-0">
                      <span>{l.label}</span>
                      <span className="text-xs text-muted-foreground">{l.hint}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Get started with an example</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {EXAMPLES.slice(0, 4).map(({ text, icon: Icon }) => (
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
