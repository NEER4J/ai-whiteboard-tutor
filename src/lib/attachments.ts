import type { AttachmentPayload } from "./schema"

export type Attachment = AttachmentPayload & { id: string; size: number }

export const MAX_FILES = 3
/** Raw bytes across all files; base64 + JSON must stay under the host's ~4.5MB body limit. */
export const MAX_TOTAL_BYTES = 3_000_000
export const MAX_TEXT_CHARS = 20_000
export const ACCEPT = ".txt,.md,.csv,.json,.pdf,image/png,image/jpeg,image/webp,image/gif"

const TEXT_EXT = /\.(txt|md|markdown|csv|json)$/i

export class AttachmentError extends Error {}

export async function readAttachment(file: File): Promise<Attachment> {
  const id = `${file.name}-${file.size}-${file.lastModified}`
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) {
    const text = (await file.text()).slice(0, MAX_TEXT_CHARS)
    return { id, name: file.name, kind: "text", mediaType: "text/plain", data: text, size: Math.min(file.size, MAX_TEXT_CHARS) }
  }
  const isImage = /^image\/(png|jpeg|webp|gif)$/.test(file.type)
  const isPdf = file.type === "application/pdf"
  if (!isImage && !isPdf) throw new AttachmentError(`${file.name}: unsupported file type. Use text, PDF or an image.`)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new AttachmentError(`${file.name}: couldn't be read.`))
    r.readAsDataURL(file)
  })
  return {
    id,
    name: file.name,
    kind: isPdf ? "pdf" : "image",
    mediaType: file.type,
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    size: file.size,
  }
}

/** Adds files to an existing list, enforcing count/size limits. Never throws; returns user-facing errors. */
export async function mergeAttachments(existing: Attachment[], files: File[]) {
  let next = [...existing]
  const errors: string[] = []
  for (const f of files) {
    try {
      if (next.length >= MAX_FILES) throw new AttachmentError(`You can attach up to ${MAX_FILES} files.`)
      const a = await readAttachment(f)
      if (next.some((x) => x.id === a.id)) continue
      if (next.reduce((n, x) => n + x.size, 0) + a.size > MAX_TOTAL_BYTES) {
        throw new AttachmentError("Attachments are limited to 3 MB in total.")
      }
      next = [...next, a]
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Couldn't attach that file.")
    }
  }
  return { next, errors }
}
