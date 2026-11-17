"use client"

import * as React from "react"
import { FileTextIcon, ImageIcon, PaperclipIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ACCEPT, type Attachment } from "@/lib/attachments"

const fmt = (n: number) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${Math.round(n / 1024)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)

export function AttachmentChips({ files, onRemove }: { files: Attachment[]; onRemove: (id: string) => void }) {
  return (
    <>
      {files.map((f) => (
        <span key={f.id} className="inline-flex h-8 max-w-56 items-center gap-1.5 rounded-lg bg-muted py-1 pr-1 pl-2 text-xs">
          {f.kind === "image" ? <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate font-medium">{f.name}</span>
          <span className="shrink-0 text-muted-foreground">{fmt(f.size)}</span>
          <button
            type="button"
            aria-label={`Remove ${f.name}`}
            onClick={() => onRemove(f.id)}
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
    </>
  )
}

/** Paperclip button + hidden file input. Also used with paste (see PromptBox onPasteFiles). */
export function AttachButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = React.useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
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
              onClick={() => input.current?.click()}
            />
          }
        >
          <PaperclipIcon />
        </TooltipTrigger>
        <TooltipContent>Attach notes, a PDF or an image (or paste one)</TooltipContent>
      </Tooltip>
    </>
  )
}
