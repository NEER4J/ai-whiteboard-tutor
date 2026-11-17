"use client"

import * as React from "react"

/**
 * A visitor's own AI Gateway key. It lives only in this browser's localStorage
 * and is attached to requests as a header; the server never stores or logs it.
 */
const STORAGE_KEY = "chalk:gateway-key"
export const KEY_HEADER = "x-chalk-key"

const listeners = new Set<() => void>()
let cached: string | null | undefined

function read(): string | null {
  if (cached !== undefined) return cached
  try {
    cached = localStorage.getItem(STORAGE_KEY)
  } catch {
    cached = null
  }
  return cached
}

export function getUserKey() {
  return read()
}

export function setUserKey(key: string | null) {
  cached = key
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the key stays in memory for this tab only.
  }
  listeners.forEach((l) => l())
}

/** Headers to add to API requests when the visitor brought their own key. */
export function keyHeaders(): Record<string, string> {
  const k = read()
  return k ? { [KEY_HEADER]: k } : {}
}

export function looksLikeKey(k: string) {
  return /^[A-Za-z0-9._\-]{16,300}$/.test(k.trim())
}

export function useUserKey(): string | null {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
    () => null
  )
}
