"use client"

import * as React from "react"
import { CheckIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { KEY_HEADER, looksLikeKey, setUserKey, useUserKey } from "@/lib/byok"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Why it opened: shows a different intro when the free allowance ran out. */
  reason?: "quota" | "manual"
  freeLimit?: number
  onSaved?: () => void
}

/** Lets a visitor use their own Vercel AI Gateway key once the free allowance is used. */
export function KeyDialog({ open, onOpenChange, reason = "manual", freeLimit = 16, onSaved }: Props) {
  const saved = useUserKey()
  const [value, setValue] = React.useState("")
  const [show, setShow] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fresh form each time it closes.
  const close = (next: boolean) => {
    if (!next) {
      setValue("")
      setError(null)
      setShow(false)
    }
    onOpenChange(next)
  }

  const save = async () => {
    const key = value.trim()
    if (!looksLikeKey(key)) {
      setError("That doesn't look like an AI Gateway key. It should be a single string with no spaces.")
      return
    }
    setChecking(true)
    setError(null)
    try {
      const res = await fetch("/api/key-check", { method: "POST", headers: { [KEY_HEADER]: key } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't verify the key.")
        return
      }
      setUserKey(key)
      toast.success("Your key is saved in this browser")
      close(false)
      onSaved?.()
    } catch {
      setError("Couldn't reach the server to verify the key. Check your connection.")
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
            <KeyRoundIcon className="size-5" />
          </div>
          <DialogTitle>{saved ? "Your API key" : reason === "quota" ? "You've used your free prompts" : "Use your own API key"}</DialogTitle>
          <DialogDescription>
            {saved
              ? "Lessons, answers and voice are now billed to your own Vercel AI Gateway account, with no free-tier limit."
              : reason === "quota"
                ? `Every visitor gets ${freeLimit} free prompts, counting lessons, follow-up questions, quiz answers and hints. To keep learning, add your own Vercel AI Gateway key. It takes a minute.`
                : `Chalk gives every visitor ${freeLimit} free prompts (lessons, follow-ups, quiz answers and hints all count). Add your own Vercel AI Gateway key to remove the limit.`}
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm dark:bg-emerald-400/10">
            <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <span className="min-w-0 flex-1 truncate">
              Key in use: <span className="font-mono text-xs">{saved.slice(0, 6)}…{saved.slice(-4)}</span>
            </span>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              AI Gateway API key
              <div className="relative">
                <Input
                  autoFocus
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value)
                    setError(null)
                  }}
                  placeholder="vck_…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!error}
                  className="h-10 rounded-xl pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide key" : "Show key"}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {error && <span className="text-xs font-normal text-destructive">{error}</span>}
            </label>
            <a
              href="https://vercel.com/ai-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Get a key from Vercel AI Gateway <ExternalLinkIcon className="size-3" />
            </a>
          </form>
        )}

        <div className="flex gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Your key stays in this browser. It is sent over HTTPS with each request so the server can call the AI Gateway for you; it is
            never stored or logged. Remove it any time.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {saved ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setUserKey(null)
                  toast("Key removed. You're back on the free allowance.")
                  close(false)
                  onSaved?.()
                }}
              >
                Remove key
              </Button>
              <Button onClick={() => close(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                Not now
              </Button>
              <Button onClick={save} disabled={checking || value.trim().length < 8}>
                {checking ? (
                  <>
                    <Spinner data-icon="inline-start" /> Verifying…
                  </>
                ) : (
                  "Save and continue"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
