"use client"

import type { Segment } from "./schema"
import { buildTimeline, clamp, estimateDuration, segmentAt, type Timeline } from "./timeline"
import { AiVoice, BrowserVoice, VoiceUnavailableError, type VoiceEngine } from "./voice"

export type PlayerStatus = "idle" | "playing" | "paused" | "buffering" | "ended"
export type VoiceKind = "ai" | "browser"

export type PlayerSnapshot = {
  clipId: string | null
  status: PlayerStatus
  time: number
  seg: number
  rate: number
  voice: VoiceKind
  /** segments fully generated and playable */
  available: number
  /** generation finished */
  done: boolean
  timeline: Timeline
  /** end of the playable part of the timeline */
  playableEnd: number
}

type Listener = () => void

/**
 * The clock that keeps voice and whiteboard in sync.
 *
 * The whiteboard is a pure function of `time` (see visibleAt), so play, pause,
 * seek and restart all reduce to "set the time, then (re)start the narration
 * for the segment that contains it". While playing, time is read from the
 * active voice engine every animation frame.
 */
export class Player {
  private segments: Segment[] = []
  private available = 0
  private done = false
  private clipId: string | null = null
  private status: PlayerStatus = "idle"
  private time = 0
  private seg = 0
  private rate = 1
  private voiceKind: VoiceKind = "ai"
  private ai = new AiVoice()
  private browser = new BrowserVoice()
  private token = 0
  private raf = 0
  private timeline: Timeline = buildTimeline([], [])
  private snapshot: PlayerSnapshot
  private listeners = new Set<Listener>()
  private savedTimes = new Map<string, number>()
  private wantPlay = false
  private onNotice?: (msg: string) => void

  constructor() {
    this.snapshot = this.makeSnapshot()
  }

  setNoticeHandler(fn: (msg: string) => void) {
    this.onNotice = fn
  }

  // ---- external store -------------------------------------------------
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getSnapshot = () => this.snapshot
  private emit() {
    this.snapshot = this.makeSnapshot()
    this.listeners.forEach((l) => l())
  }
  private makeSnapshot(): PlayerSnapshot {
    const end = this.available > 0 && this.timeline.segStarts.length >= this.available
      ? (this.timeline.segStarts[this.available - 1] ?? 0) + (this.timeline.segDurs[this.available - 1] ?? 0)
      : 0
    return {
      clipId: this.clipId,
      status: this.status,
      time: this.time,
      seg: this.seg,
      rate: this.rate,
      voice: this.voiceKind,
      available: this.available,
      done: this.done,
      timeline: this.timeline,
      playableEnd: end,
    }
  }

  private get engine(): VoiceEngine {
    return this.voiceKind === "ai" ? this.ai : this.browser
  }

  // ---- content ----------------------------------------------------------
  /** Switch to another clip, remembering where we were in the current one. */
  load(clipId: string, segments: Segment[], done: boolean, opts: { autoplay?: boolean } = {}) {
    if (this.clipId === clipId) return this.setContent(segments, done)
    if (this.clipId) this.savedTimes.set(this.clipId, this.time)
    this.halt()
    this.clipId = clipId
    this.segments = []
    this.available = 0
    this.done = false
    this.time = this.savedTimes.get(clipId) ?? 0
    this.status = "idle"
    this.wantPlay = !!opts.autoplay
    this.setContent(segments, done)
  }

  setContent(segments: Segment[], done: boolean) {
    const prevAvailable = this.available
    this.segments = segments
    this.done = done
    this.available = done ? segments.length : Math.max(0, segments.length - 1)
    this.rebuild()
    this.prefetch()

    if (this.available > prevAvailable) {
      if (this.status === "buffering") this.startAt(this.time)
      else if (this.wantPlay && this.status === "idle") {
        this.wantPlay = false
        this.startAt(this.time)
      }
    }
    if (done && this.status === "buffering" && this.seg >= this.available) {
      this.status = this.available ? "ended" : "idle"
    }
    this.emit()
  }

  private rebuild() {
    const durs = this.segments.map((s, i) =>
      i < this.available ? this.engine.durationOf(s.narration) ?? estimateDuration(s.narration) : estimateDuration(s.narration)
    )
    this.timeline = buildTimeline(this.segments, durs)
  }

  private requested = new Set<string>()
  private inflight = 0
  /** Fetch narration audio for every playable segment (3 at a time, nearest first). */
  private prefetch() {
    if (this.voiceKind !== "ai") return
    const from = segmentAt(this.timeline, this.time)
    const order = [
      ...Array.from({ length: Math.max(0, this.available - from) }, (_, k) => from + k),
      ...Array.from({ length: Math.min(from, this.available) }, (_, k) => k),
    ]
    for (const i of order) {
      if (this.inflight >= 3) return
      const text = this.segments[i]?.narration
      if (!text || this.requested.has(text)) continue
      this.requested.add(text)
      this.inflight++
      this.ai
        .prepare(text)
        .then(() => {
          this.rebuild()
          this.emit()
        })
        .catch((err) => {
          this.requested.delete(text)
          if (err instanceof VoiceUnavailableError) this.fallbackToBrowser()
        })
        .finally(() => {
          this.inflight--
          this.prefetch()
        })
    }
  }

  // ---- transport ---------------------------------------------------------
  play() {
    if (this.status === "playing" || this.status === "buffering") return
    if (!this.available) {
      this.wantPlay = true
      return
    }
    const t = this.status === "ended" ? 0 : this.time
    this.startAt(t)
  }

  pause() {
    this.wantPlay = false
    if (this.status !== "playing" && this.status !== "buffering") return
    this.halt()
    this.status = "paused"
    this.emit()
  }

  toggle() {
    if (this.status === "playing" || this.status === "buffering") this.pause()
    else this.play()
  }

  restart() {
    this.seek(0, true)
  }

  /** Jump to `t` seconds. Keeps playing if we were playing (or `forcePlay`). */
  seek(t: number, forcePlay = false) {
    const wasPlaying = this.status === "playing" || this.status === "buffering"
    const end = this.snapshot.playableEnd || this.timeline.total
    t = clamp(t, 0, Math.max(0, end - 0.05))
    this.halt()
    this.time = t
    this.seg = segmentAt(this.timeline, t)
    if (wasPlaying || forcePlay) this.startAt(t)
    else {
      if (this.status === "ended") this.status = "paused"
      this.emit()
    }
  }

  /** Move the playhead without starting audio (slider drag). */
  scrub(t: number) {
    this.halt()
    if (this.status === "playing" || this.status === "buffering") this.status = "paused"
    this.time = clamp(t, 0, this.timeline.total)
    this.seg = segmentAt(this.timeline, this.time)
    this.emit()
  }

  setRate(rate: number) {
    this.rate = rate
    if (this.status === "playing") {
      if (this.voiceKind === "ai") this.engine.setRate(rate)
      else this.startAt(this.time)
    }
    this.emit()
  }

  setVoice(kind: VoiceKind) {
    if (kind === this.voiceKind) return
    const wasPlaying = this.status === "playing" || this.status === "buffering"
    this.halt()
    this.voiceKind = kind
    this.rebuild()
    this.prefetch()
    if (wasPlaying) this.startAt(Math.min(this.time, this.timeline.total))
    else this.emit()
  }

  destroy() {
    this.halt()
    this.listeners.clear()
  }

  // ---- internals -----------------------------------------------------------
  private halt() {
    this.token++
    cancelAnimationFrame(this.raf)
    this.ai.stop()
    this.browser.stop()
  }

  private fallbackToBrowser() {
    if (this.voiceKind === "browser") return
    this.onNotice?.("AI voice is unavailable, so the browser's built-in voice is narrating.")
    this.setVoice("browser")
  }

  private async startAt(t: number) {
    this.halt()
    const tok = this.token
    let seg = segmentAt(this.timeline, t)
    // A time at (or past) the end of a segment belongs to the next one.
    if (t >= (this.timeline.segStarts[seg] ?? 0) + (this.timeline.segDurs[seg] ?? 0) - 0.01) seg++
    this.seg = seg
    this.time = t

    if (seg >= this.available) {
      this.status = this.done ? "ended" : "buffering"
      this.emit()
      return
    }

    const offset = Math.max(0, t - this.timeline.segStarts[seg])
    const text = this.segments[seg].narration
    this.status = "buffering"
    this.emit()
    this.prefetch()

    try {
      await this.engine.start(text, offset, this.rate, () => {
        if (tok === this.token) this.onSegmentEnd(seg)
      })
    } catch (err) {
      if (tok !== this.token) return
      if (err instanceof VoiceUnavailableError || this.voiceKind === "ai") {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          // Autoplay blocked: wait for the learner to press play.
          this.status = "paused"
          this.emit()
          return
        }
        if (this.voiceKind === "ai") {
          this.fallbackToBrowser()
          return
        }
      }
      this.onNotice?.("Narration could not start in this browser.")
      this.status = "paused"
      this.emit()
      return
    }
    if (tok !== this.token) return
    // Durations may have been measured while loading.
    this.rebuild()
    this.status = "playing"
    this.emit()
    this.loop(tok, seg)
  }

  private loop(tok: number, seg: number) {
    const step = () => {
      if (tok !== this.token) return
      const pos = this.engine.position()
      const start = this.timeline.segStarts[seg] ?? 0
      const dur = this.timeline.segDurs[seg] ?? 0
      this.time = start + Math.min(pos, dur)
      this.seg = seg
      this.emit()
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  private onSegmentEnd(seg: number) {
    const next = seg + 1
    const nextStart = this.timeline.segStarts[next] ?? this.timeline.total
    if (next < this.available) {
      this.startAt(nextStart)
      return
    }
    this.halt()
    this.time = nextStart
    if (this.done) {
      this.status = "ended"
      this.time = this.timeline.total
    } else {
      this.status = "buffering"
      this.seg = next
    }
    this.emit()
  }
}
