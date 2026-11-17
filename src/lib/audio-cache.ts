"use client"

/**
 * Narration audio cache in IndexedDB (localStorage is too small for audio). Each clip is stored once,
 * keyed by a hash of the voice model + the exact narration text, so replaying, reloading or reopening a
 * saved lesson never calls the text-to-speech API again. Oldest clips are evicted past MAX_ENTRIES.
 */
const DB_NAME = "chalk-audio"
const STORE = "clips"
const MAX_ENTRIES = 160

type Row = { key: string; blob: Blob; ts: number }

let dbPromise: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        const store = db.createObjectStore(STORE, { keyPath: "key" })
        store.createIndex("ts", "ts")
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null) // private mode etc.: just skip caching
    }
  })
  return dbPromise
}

const wrap = <T,>(req: IDBRequest<T>) =>
  new Promise<T | undefined>((resolve) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })

/** Identifies a clip: same voice model + same text = same audio. */
export async function audioKey(voiceModel: string, text: string) {
  const data = new TextEncoder().encode(`${voiceModel}\n${text}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function getCachedAudio(key: string): Promise<Blob | null> {
  const db = await open()
  if (!db) return null
  const row = (await wrap(db.transaction(STORE).objectStore(STORE).get(key))) as Row | undefined
  return row?.blob ?? null
}

export async function putCachedAudio(key: string, blob: Blob) {
  const db = await open()
  if (!db) return
  try {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    store.put({ key, blob, ts: Date.now() } satisfies Row)
    const count = (await wrap(store.count())) ?? 0
    if (count > MAX_ENTRIES) {
      let toDelete = count - MAX_ENTRIES
      const cursorReq = store.index("ts").openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor && toDelete-- > 0) {
          cursor.delete()
          cursor.continue()
        }
      }
    }
  } catch {
    // quota exceeded or blocked: the clip just won't be cached
  }
}

export async function clearAudioCache() {
  const db = await open()
  if (!db) return
  db.transaction(STORE, "readwrite").objectStore(STORE).clear()
}
