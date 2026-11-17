"use client"

/**
 * Two narration engines with the same contract. Both report their position in
 * "1x seconds" into the current segment so the timeline is independent of the
 * playback speed.
 *
 *  - AiVoice: mp3 per segment from /api/tts (Vercel AI Gateway speech model).
 *    Exact durations, precise seeking.
 *  - BrowserVoice: the browser's speechSynthesis. Free and offline-capable,
 *    but durations are estimated and corrected with word-boundary events.
 */

import { audioKey, getCachedAudio, putCachedAudio } from "./audio-cache"
import { keyHeaders } from "./byok"
import { estimateDuration } from "./timeline"

export class VoiceUnavailableError extends Error {}

export interface VoiceEngine {
  readonly kind: "ai" | "browser"
  /** Known duration of a narration in seconds, if measured. */
  durationOf(text: string): number | undefined
  /** Warm the cache. Resolves with the measured duration (AI voice only). */
  prepare(text: string): Promise<number | undefined>
  /** Start speaking `text` from `offset` seconds. Resolves once audio starts. */
  start(text: string, offset: number, rate: number, onEnd: () => void): Promise<void>
  stop(): void
  position(): number
  setRate(rate: number): void
}

type Prepared = { url: string; duration: number }

/** The speech model the server reports; part of the cache key so a model change never replays old audio. */
let voiceModelId = "default"
export const setVoiceModelId = (id: string | null | undefined) => {
  voiceModelId = id || "default"
}

export class AiVoice implements VoiceEngine {
  readonly kind = "ai" as const
  private cache = new Map<string, Promise<Prepared>>()
  private durations = new Map<string, number>()
  private el: HTMLAudioElement | null = null
  private currentUrl = ""
  private ended = () => {}

  private audio() {
    if (!this.el) {
      this.el = new Audio()
      this.el.preload = "auto"
      this.el.addEventListener("ended", () => this.ended())
    }
    return this.el
  }

  durationOf(text: string) {
    return this.durations.get(text)
  }

  prepare(text: string) {
    return this.load(text).then((p) => p.duration)
  }

  private load(text: string): Promise<Prepared> {
    let p = this.cache.get(text)
    if (!p) {
      p = (async () => {
        // 1. Already generated before (this tab, an earlier visit, or a saved lesson)? Reuse it: no API call.
        const key = await audioKey(voiceModelId, text).catch(() => null)
        let blob = key ? await getCachedAudio(key).catch(() => null) : null
        // 2. Otherwise generate it once and keep it.
        if (!blob) {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "content-type": "application/json", ...keyHeaders() },
            body: JSON.stringify({ text }),
          })
          if (res.status === 503 || res.status === 402) throw new VoiceUnavailableError("AI voice unavailable")
          if (!res.ok) throw new Error(`TTS failed (${res.status})`)
          blob = await res.blob()
          if (key) void putCachedAudio(key, blob)
        }
        const url = URL.createObjectURL(blob)
        const duration = await measure(url)
        this.durations.set(text, duration)
        return { url, duration }
      })()
      p.catch(() => this.cache.delete(text))
      this.cache.set(text, p)
    }
    return p
  }

  async start(text: string, offset: number, rate: number, onEnd: () => void) {
    const { url } = await this.load(text)
    const el = this.audio()
    this.ended = onEnd
    if (this.currentUrl !== url) {
      el.src = url
      this.currentUrl = url
    }
    el.currentTime = offset
    el.playbackRate = rate
    await el.play()
  }

  stop() {
    this.ended = () => {}
    this.el?.pause()
  }

  position() {
    return this.el?.currentTime ?? 0
  }

  setRate(rate: number) {
    if (this.el) this.el.playbackRate = rate
  }
}

/** The narration audio for `text` (from the local cache, or generated once). Used by video export. */
export async function fetchNarrationBlob(text: string): Promise<Blob> {
  const key = await audioKey(voiceModelId, text).catch(() => null)
  const cached = key ? await getCachedAudio(key).catch(() => null) : null
  if (cached) return cached
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json", ...keyHeaders() },
    body: JSON.stringify({ text }),
  })
  if (res.status === 503 || res.status === 402) throw new VoiceUnavailableError("AI voice unavailable")
  if (!res.ok) throw new Error(`TTS failed (${res.status})`)
  const blob = await res.blob()
  if (key) void putCachedAudio(key, blob)
  return blob
}

function measure(url: string) {
  return new Promise<number>((resolve) => {
    const a = new Audio()
    a.preload = "metadata"
    const done = () => resolve(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0)
    a.addEventListener("loadedmetadata", done, { once: true })
    a.addEventListener("error", () => resolve(0), { once: true })
    a.src = url
  }).then((d) => d || 5)
}

/** Picks the most natural-sounding English voice the browser offers. */
function pickVoice() {
  const voices = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : []
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"))
  const prefs = [/natural/i, /google us english/i, /samantha/i, /aria/i, /jenny/i, /google uk english female/i, /daniel/i]
  for (const re of prefs) {
    const v = en.find((x) => re.test(x.name))
    if (v) return v
  }
  return en.find((v) => v.default) ?? en[0] ?? null
}

export class BrowserVoice implements VoiceEngine {
  readonly kind = "browser" as const
  private token = 0
  private text = ""
  private startPos = 0
  private startedAt = 0
  private rate = 1
  private anchorPos: number | null = null
  private anchorAt = 0
  private dur = 1

  static supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window
  }

  durationOf(text: string) {
    return estimateDuration(text)
  }

  prepare(text: string) {
    return Promise.resolve(estimateDuration(text))
  }

  async start(text: string, offset: number, rate: number, onEnd: () => void) {
    if (!BrowserVoice.supported()) throw new VoiceUnavailableError("No speech synthesis")
    const tok = ++this.token
    speechSynthesis.cancel()
    this.text = text
    this.rate = rate
    this.dur = estimateDuration(text)

    // Start from the word nearest to `offset`.
    let from = Math.floor((offset / this.dur) * text.length)
    from = Math.max(0, Math.min(text.length, from))
    while (from > 0 && /\S/.test(text[from - 1])) from--
    const rest = text.slice(from)
    this.startPos = (from / Math.max(1, text.length)) * this.dur
    this.anchorPos = null

    // Speak sentence by sentence: Chrome silently stops long utterances.
    const sentences = rest.match(/[^.!?]+[.!?]*\s*/g) ?? [rest]
    const voice = pickVoice()
    let base = from
    await new Promise((r) => setTimeout(r, 30)) // let cancel() settle (Chrome)
    if (tok !== this.token) return
    sentences.forEach((s, i) => {
      const u = new SpeechSynthesisUtterance(s)
      if (voice) u.voice = voice
      u.rate = rate
      const offsetChars = base
      u.onboundary = (e) => {
        if (tok !== this.token || e.name !== "word") return
        this.anchorPos = ((offsetChars + e.charIndex) / text.length) * this.dur
        this.anchorAt = performance.now()
      }
      if (i === sentences.length - 1) {
        u.onend = () => {
          if (tok === this.token) onEnd()
        }
      }
      base += s.length
      speechSynthesis.speak(u)
    })
    this.startedAt = performance.now()
  }

  stop() {
    this.token++
    if (BrowserVoice.supported()) speechSynthesis.cancel()
  }

  position() {
    const now = performance.now()
    const est =
      this.anchorPos !== null
        ? this.anchorPos + ((now - this.anchorAt) / 1000) * this.rate
        : this.startPos + ((now - this.startedAt) / 1000) * this.rate
    return Math.min(est, this.dur * 0.99)
  }

  setRate(rate: number) {
    this.rate = rate
  }
}
