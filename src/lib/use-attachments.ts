"use client"

import * as React from "react"
import { toast } from "sonner"
import { mergeAttachments, type Attachment } from "./attachments"

/** Attachment list state shared by the home and chat prompt boxes. */
export function useAttachments() {
  const [files, setFiles] = React.useState<Attachment[]>([])
  const add = React.useCallback(
    async (list: File[] | FileList | null) => {
      const arr = list ? Array.from(list) : []
      if (!arr.length) return
      const { next, errors } = await mergeAttachments(files, arr)
      errors.forEach((e) => toast.error(e))
      setFiles(next)
    },
    [files]
  )
  const remove = React.useCallback((id: string) => setFiles((fs) => fs.filter((f) => f.id !== id)), [])
  const clear = React.useCallback(() => setFiles([]), [])
  return { files, add, remove, clear }
}
