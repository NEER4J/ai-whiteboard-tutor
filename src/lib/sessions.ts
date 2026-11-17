"use client"

import * as React from "react"
import type { Level } from "./schema"
import type { ChatItem, ClipState } from "@/components/tutor/types"

/**
 * Chat history, kept in this browser's localStorage only (no accounts, nothing
 * is sent to a server). A saved session is everything needed to replay a lesson
 * and its follow-ups without calling the AI again.
 */

export type SavedSession = {
  id: string
  title: string
  topic: string
  level: Level
  createdAt: number
  updatedAt: number
  lessonId: string
  items: ChatItem[]
  clips: Record<string, ClipState>
}

export type SessionMeta = Pick<SavedSession, "id" | "title" | "updatedAt" | "level">

const KEY = "chalk:sessions:v1"
const MAX = 30
const listeners = new Set<() => void>()
let cache: SavedSession[] | null = null
let version = 0

function read(): SavedSession[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as SavedSession[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: SavedSession[]) {
  cache = next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX)
  version++
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Storage full or blocked: keep working in memory.
  }
  listeners.forEach((l) => l())
}

export function saveSession(s: SavedSession) {
  const rest = read().filter((x) => x.id !== s.id)
  write([s, ...rest])
}

export function getSession(id: string) {
  return read().find((s) => s.id === id)
}

export function deleteSession(id: string) {
  write(read().filter((s) => s.id !== id))
}

export function clearSessions() {
  write([])
}

let metaCache: { v: number; list: SessionMeta[] } = { v: -1, list: [] }
const EMPTY: SessionMeta[] = []

function snapshot() {
  if (metaCache.v !== version) {
    metaCache = {
      v: version,
      list: read().map(({ id, title, updatedAt, level }) => ({ id, title, updatedAt, level })),
    }
  }
  return metaCache.list
}

/** Live list of saved sessions (newest first). Empty on the server. */
export function useSessionList(): SessionMeta[] {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    snapshot,
    () => EMPTY
  )
}

export function groupByDay(list: SessionMeta[]) {
  // Only read the clock when there is something to group (never during prerender).
  if (!list.length) return []
  const now = Date.now()
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const day = 86_400_000
  const groups: { label: string; items: SessionMeta[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ]
  for (const s of list) {
    const i = s.updatedAt >= startOfToday ? 0 : s.updatedAt >= startOfToday - day ? 1 : s.updatedAt >= startOfToday - 7 * day ? 2 : 3
    groups[i].items.push(s)
  }
  return groups.filter((g) => g.items.length)
}
