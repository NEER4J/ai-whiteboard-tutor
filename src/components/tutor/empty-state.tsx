"use client"

import * as React from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import type { Level } from "@/lib/schema"
import { PromptBox } from "./prompt-box"

const SUGGESTIONS = [
  "Why is the sky blue?",
  "How does a neural network learn?",
  "The Pythagorean theorem",
  "How do vaccines train the immune system?",
  "What is compound interest?",
  "How does TCP's three-way handshake work?",
]

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

type Props = {
  level: Level
  setLevel: (l: Level) => void
  onStart: (topic: string) => void
  mode: "live" | "sample" | null
}

export function EmptyState({ level, setLevel, onStart, mode }: Props) {
  const [topic, setTopic] = React.useState("")
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            What do you want to understand?
          </h1>
          <p className="max-w-lg text-[15px] text-balance text-muted-foreground">
            Get a two-minute lesson, narrated out loud and drawn on a whiteboard as it&apos;s explained. Pause anytime to ask
            questions.
          </p>
        </div>

        <PromptBox
          autoFocus
          value={topic}
          onChange={setTopic}
          onSubmit={() => onStart(topic)}
          placeholder="Type any topic, e.g. how do black holes form?"
          addon={
            <ToggleGroup
              value={[level]}
              onValueChange={(v) => v[0] && setLevel(v[0] as Level)}
              size="sm"
              spacing={0}
              aria-label="Learner level"
              className="rounded-full bg-background/60 p-0.5 dark:bg-background/30"
            >
              {LEVELS.map((l) => (
                <ToggleGroupItem
                  key={l.value}
                  value={l.value}
                  className="rounded-full px-3 text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground data-pressed:bg-background data-pressed:text-foreground dark:aria-pressed:bg-muted dark:data-pressed:bg-muted"
                >
                  {l.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        />

        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="secondary" size="sm" className="rounded-full font-normal" onClick={() => onStart(s)}>
              {s}
            </Button>
          ))}
        </div>

        {mode === "sample" && (
          <p className="text-center text-xs text-muted-foreground">
            Sample mode: no AI key is configured, so every topic plays a pre-written lesson.
          </p>
        )}
      </div>
    </div>
  )
}
