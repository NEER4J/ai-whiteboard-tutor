import { ArrowUpRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const PORTFOLIO_URL = "https://www.itsneeraj.com/"

/** Small "created by" tag linking to the author's portfolio. */
export function Credit({ className }: { className?: string }) {
  return (
    <a
      href={PORTFOLIO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      Created by <span className="font-medium text-foreground">Neeraj</span>
      <ArrowUpRightIcon className="size-3 opacity-60 transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:opacity-100" />
    </a>
  )
}
