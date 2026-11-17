"use client"

import * as React from "react"
import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder: string
  busy?: boolean
  onStop?: () => void
  disabled?: boolean
  addon?: React.ReactNode
  className?: string
  autoFocus?: boolean
  textareaRef?: React.Ref<HTMLTextAreaElement>
}

/** Chat input built on shadcn Input Group (AI Elements prompt-input pattern). */
export function PromptBox({ value, onChange, onSubmit, placeholder, busy, onStop, disabled, addon, className, autoFocus, textareaRef }: Props) {
  const canSend = value.trim().length > 1 && !busy && !disabled
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
    >
      <InputGroup className={cn("rounded-2xl border-transparent bg-muted/70 dark:bg-muted/50 has-[[data-slot=input-group-control]:focus-visible]:ring-2")}>
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          maxLength={500}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (canSend) onSubmit()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-40 min-h-12 px-4 pt-3.5 text-[15px] md:text-[15px]"
        />
        <InputGroupAddon align="block-end" className="px-2.5 pb-2.5">
          {addon}
          {busy && onStop ? (
            <InputGroupButton size="icon-sm" variant="secondary" className="ml-auto rounded-full" aria-label="Stop" onClick={onStop}>
              <SquareIcon className="size-3 fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              className="ml-auto rounded-full"
              disabled={!canSend}
              aria-label="Send"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
