"use client"

import { KeyRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AppStatus } from "./app-sidebar"

/** Sidebar card: free lessons left, or "using your own key", plus the way to add one. */
export function UsageCard({ status, userKey, onManageKey }: { status: AppStatus; userKey: string | null; onManageKey: () => void }) {
  const quota = status?.quota
  const left = quota ? Math.max(0, quota.lessons.limit - quota.lessons.used) : null
  const out = left === 0
  const dot = userKey || status?.mode === "live" ? "bg-emerald-500" : "bg-amber-500"

  return (
    <div className="rounded-xl bg-sidebar-accent/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <span className={cn("size-1.5 rounded-full", out && !userKey ? "bg-destructive" : dot)} />
        {userKey
          ? "Using your own key"
          : !status
            ? "Checking…"
            : status.mode === "sample"
              ? "Sample mode"
              : `Live AI · ${status.model?.split("/")[1] ?? ""}`}
      </div>

      {userKey ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">No free-tier limit. Billed to your AI Gateway account.</p>
      ) : quota && left !== null ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>{out ? "No free lessons left" : "Free lessons"}</span>
            <span className={cn("tabular-nums", out ? "font-medium text-destructive" : "text-foreground")}>
              {left} of {quota.lessons.limit} left
            </span>
          </div>
          <Progress
            value={(left / quota.lessons.limit) * 100}
            className="gap-0 [&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-indicator]]:bg-foreground/70"
          />
        </div>
      ) : (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {status?.mode === "sample" ? "No AI key is set, so lessons are pre-written. " : ""}
          Your lessons are saved only in this browser.
        </p>
      )}

      {(userKey || status) && (
        <Button
          variant={out && !userKey ? "default" : "secondary"}
          size="sm"
          className="mt-2.5 h-7 w-full rounded-lg text-xs"
          onClick={onManageKey}
        >
          <KeyRoundIcon data-icon="inline-start" /> {userKey ? "Manage your key" : "Use your own key"}
        </Button>
      )}
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground/80">Lessons are saved only in this browser.</p>
    </div>
  )
}
