"use client"

import { KeyRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AppStatus } from "./app-sidebar"

/**
 * Sidebar card: how much free use is left (or that the visitor's own key is in use),
 * the way to add a key, and a one-line status footnote.
 */
export function UsageCard({ status, userKey, onManageKey }: { status: AppStatus; userKey: string | null; onManageKey: () => void }) {
  const quota = status?.quota
  const left = quota ? Math.max(0, quota.prompts.limit - quota.prompts.used) : null
  const out = left === 0 && !userKey
  const live = !!userKey || status?.mode === "live"
  const model = status?.model?.split("/")[1]

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-sidebar-accent/60 p-3">
      {/* headline */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{userKey ? "Your own key" : status?.mode === "sample" ? "Sample mode" : "Free prompts"}</span>
        {userKey ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            No limit
          </span>
        ) : quota && left !== null ? (
          <span className={cn("text-xs tabular-nums", out ? "font-medium text-destructive" : "text-muted-foreground")}>
            <span className={cn("font-semibold", out ? "" : "text-foreground")}>{left}</span> / {quota.prompts.limit} left
          </span>
        ) : null}
      </div>

      {quota && left !== null && !userKey && (
        <Progress
          value={(left / quota.prompts.limit) * 100}
          className="gap-0 [&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-indicator]]:bg-foreground/70"
        />
      )}

      {(userKey || status) && (
        <Button
          variant={out ? "default" : "secondary"}
          size="sm"
          className="h-8 w-full rounded-lg bg-background text-xs data-[variant=default]:bg-primary"
          onClick={onManageKey}
        >
          <KeyRoundIcon data-icon="inline-start" /> {userKey ? "Manage your key" : out ? "Add your key to continue" : "Use your own key"}
        </Button>
      )}

      {/* footnote */}
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", out ? "bg-destructive" : live ? "bg-emerald-500" : "bg-amber-500")} />
        <span>
          {!status
            ? "Checking…"
            : status.mode === "sample" && !userKey
              ? "No AI key set: lessons are pre-written."
              : `Live AI${model ? ` · ${model}` : ""}`}
          {" · "}Lessons stay in this browser.
        </span>
      </p>
    </div>
  )
}
