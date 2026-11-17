import type { Level, Segment } from "@/lib/schema"

export type ClipKind = "lesson" | "followup"

export type ClipState = {
  id: string
  kind: ClipKind
  title?: string
  reply?: string
  segments: Segment[]
  done: boolean
  error?: string
  mode?: "live" | "sample"
}

export type ChatItem =
  | { id: string; role: "user"; text: string; files?: string[] }
  | { id: string; role: "assistant"; clipId: string }

export type Session = {
  topic: string
  level: Level
}
