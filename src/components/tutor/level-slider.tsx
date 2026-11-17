"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import type { Level } from "@/lib/schema";

export const LEVELS: { value: Level; label: string; hint: string }[] = [
  {
    value: "beginner",
    label: "Beginner",
    hint: "Everyday words and analogies",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    hint: "Correct terms, a worked example",
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "Precise, with notation and subtleties",
  },
];

/**
 * Three-stop slider. It moves continuously while dragged, then glides to the
 * nearest stop on release (CSS transition, disabled while dragging).
 */
export function LevelSlider({
  level,
  setLevel,
}: {
  level: Level;
  setLevel: (l: Level) => void;
}) {
  const index = LEVELS.findIndex((l) => l.value === level);
  const [drag, setDrag] = React.useState<number | null>(null);
  const shown = drag ?? index;
  const current = LEVELS[Math.round(shown)];

  return (
    <div
      className="flex h-9 items-center gap-3 rounded-xl border bg-background pr-3.5 pl-3"
      title={current.hint}
    >
      <span className="w-[5.6rem] text-sm font-medium">{current.label}</span>
      <div className="w-28">
        <Slider
          aria-label="Lesson level"
          className="py-2 [&_*]:cursor-pointer [&[data-dragging]_*]:cursor-grabbing [&:not([data-dragging])_[data-slot=slider-range]]:transition-[width] [&:not([data-dragging])_[data-slot=slider-range]]:duration-200 [&:not([data-dragging])_[data-slot=slider-thumb]]:transition-[inset-inline-start,left] [&:not([data-dragging])_[data-slot=slider-thumb]]:duration-200 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:shadow-sm [&_[data-slot=slider-track]]:h-1.5"
          min={0}
          max={2}
          step={0.01}
          value={[shown]}
          onValueChange={(v) => {
            const x = Array.isArray(v) ? v[0] : v;
            setDrag(x);
            const next = LEVELS[Math.round(x)].value;
            if (next !== level) setLevel(next);
          }}
          onValueCommitted={() => setDrag(null)}
        />
      </div>
    </div>
  );
}
