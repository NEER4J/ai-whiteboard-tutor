"use client"

import { shapeOf } from "@/components/whiteboard/shapes"
import { BOARD_H, BOARD_W, type BoardElement, type Segment } from "./schema"
import { buildTimeline, clamp, visibleAt, wordIndexAt, type Timeline } from "./timeline"
import { fetchNarrationBlob } from "./voice"

/**
 * Renders a lesson to a video file, entirely in the browser: the whiteboard is drawn frame by frame on a
 * canvas (the same pure function of time the player uses), the narration is mixed in with Web Audio, and
 * MediaRecorder captures both. Nothing is uploaded. It records in real time, so a 2-minute lesson takes
 * about 2 minutes, and the tab has to stay open and visible while it runs.
 */

export type ExportProgress = {
  phase: "audio" | "render"
  /** 0..1 within the phase */
  ratio: number
  label: string
  /** seconds rendered / total seconds (render phase) */
  time?: number
  total?: number
}

export type ExportResult = { blob: Blob; ext: "mp4" | "webm"; mime: string; duration: number }

const W = 1280
const H = 720
const SCALE = 0.93
const BW = BOARD_W * SCALE
const BH = BOARD_H * SCALE
const X0 = (W - BW) / 2
const Y0 = 34
const FPS = 30

// Light palette (the video is always rendered on a white board).
const COLORS: Record<string, string> = {
  ink: "oklch(0.24 0.01 260)",
  blue: "oklch(0.55 0.19 258)",
  red: "oklch(0.58 0.21 27)",
  green: "oklch(0.58 0.15 150)",
  orange: "oklch(0.68 0.17 55)",
  purple: "oklch(0.52 0.2 295)",
}
const col = (c: string) => COLORS[c] ?? COLORS.ink

export function videoExportSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof AudioContext !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype
  )
}

function pickMime() {
  const options: { mime: string; ext: "mp4" | "webm" }[] = [
    { mime: "video/mp4;codecs=avc1.640028,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ]
  return options.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null
}

const abortError = () => new DOMException("Export cancelled", "AbortError")

export async function exportLessonVideo(opts: {
  title: string
  segments: Segment[]
  onProgress: (p: ExportProgress) => void
  signal: AbortSignal
}): Promise<ExportResult> {
  const { segments, signal, onProgress } = opts
  if (!videoExportSupported()) throw new Error("This browser can't record video. Try Chrome, Edge or Safari.")
  const format = pickMime()
  if (!format) throw new Error("This browser has no supported video format.")

  // 1. Narration audio for every segment (from the local cache when the lesson was already played).
  const audio = new AudioContext()
  const buffers: AudioBuffer[] = []
  try {
    for (let i = 0; i < segments.length; i++) {
      if (signal.aborted) throw abortError()
      onProgress({ phase: "audio", ratio: i / segments.length, label: `Preparing narration · ${i + 1} of ${segments.length}` })
      const blob = await fetchNarrationBlob(segments[i].narration)
      buffers.push(await audio.decodeAudioData(await blob.arrayBuffer()))
    }
    onProgress({ phase: "audio", ratio: 1, label: "Narration ready" })
    const timeline = buildTimeline(segments, buffers.map((b) => b.duration))

    // 2. Canvas + recorder
    const fontFamily = handFont()
    await document.fonts.load(`600 32px ${fontFamily}`).catch(() => [])
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const g = canvas.getContext("2d")!
    const dest = audio.createMediaStreamDestination()
    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...dest.stream.getAudioTracks()])
    const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()))

    const frame = makeRenderer(g, timeline, segments, opts.title, fontFamily)
    await frame(0)

    await audio.resume()
    recorder.start(500)
    const lead = 0.35
    const t0 = audio.currentTime + lead
    buffers.forEach((buf, i) => {
      const src = audio.createBufferSource()
      src.buffer = buf
      src.connect(dest)
      src.start(t0 + timeline.segStarts[i])
    })

    // 3. Real-time render loop
    const total = timeline.total
    await new Promise<void>((resolve, reject) => {
      let busy = false
      const tick = async () => {
        if (busy) return
        if (signal.aborted) {
          clearInterval(timer)
          reject(abortError())
          return
        }
        busy = true
        const t = clamp(audio.currentTime - t0, 0, total)
        await frame(t)
        onProgress({
          phase: "render",
          ratio: total ? t / total : 1,
          label: "Recording the lesson",
          time: t,
          total,
        })
        busy = false
        if (audio.currentTime - t0 >= total + 0.4) {
          clearInterval(timer)
          resolve()
        }
      }
      const timer = setInterval(tick, 1000 / 20)
    }).catch((e) => {
      if (recorder.state !== "inactive") recorder.stop()
      throw e
    })

    await frame(total)
    await new Promise((r) => setTimeout(r, 300))
    recorder.stop()
    await stopped
    const blob = new Blob(chunks, { type: format.mime.split(";")[0] })
    return { blob, ext: format.ext, mime: format.mime.split(";")[0], duration: total }
  } finally {
    void audio.close().catch(() => {})
  }
}

function handFont() {
  const probe = document.createElement("span")
  probe.className = "font-hand"
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  document.body.appendChild(probe)
  const fam = getComputedStyle(probe).fontFamily || "cursive"
  probe.remove()
  return fam
}

function makeRenderer(g: CanvasRenderingContext2D, tl: Timeline, segments: Segment[], title: string, fontFamily: string) {
  const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"

  return async (time: number) => {
    const { items } = visibleAt(tl, time)
    const byId = new Map<string, BoardElement>(items.map((i) => [i.el.id, i.el]))
    const lookup = (id: string) => byId.get(id)

    // Background
    g.fillStyle = "#fbfbf8"
    g.fillRect(0, 0, W, H)

    // Strokes via an SVG image (supports the same dash-offset draw-on animation as the live board)
    let paths = ""
    const texts: { run: ReturnType<typeof shapeOf>["texts"][number]; p: number }[] = []
    for (const { el, progress } of items) {
      const { strokes, texts: runs } = shapeOf(el, lookup)
      const washes = strokes.filter((s) => s.wash)
      const outlines = strokes.filter((s) => !s.fill && !s.wash)
      const fills = strokes.filter((s) => s.fill)
      const textShare = runs.length ? (outlines.length ? 0.4 : 1) : 0
      const lineShare = 1 - textShare
      const lineP = lineShare ? Math.min(1, progress / lineShare) : 1
      const textP = textShare ? Math.max(0, (progress - lineShare) / textShare) : 1
      for (const s of washes) {
        const o = 0.2 * Math.max(0, (progress - 0.35) / 0.65)
        if (o > 0) paths += `<path d="${s.d}" stroke="none" fill="${col(s.color)}" fill-opacity="${o}"/>`
      }
      for (const s of fills) {
        const o = 0.35 * Math.max(0, (progress - 0.55) / 0.45)
        if (o > 0) paths += `<path d="${s.d}" fill="none" stroke="${col(s.color)}" stroke-width="${s.width}" stroke-linecap="round" opacity="${o}"/>`
      }
      outlines.forEach((s, i) => {
        const p = Math.min(1, Math.max(0, lineP * outlines.length - i))
        if (p > 0)
          paths += `<path d="${s.d}" pathLength="1" fill="none" stroke="${col(s.color)}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="${1 - p}"/>`
      })
      for (const run of runs) texts.push({ run, p: textP })
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}" viewBox="0 0 ${BOARD_W} ${BOARD_H}">${paths}</svg>`
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    try {
      await img.decode()
      g.drawImage(img, X0, Y0, BW, BH)
    } catch {
      // skip this frame's strokes; the next frame redraws them
    }

    // Handwritten text, written on progressively
    g.textBaseline = "alphabetic"
    for (const { run, p } of texts) {
      const px = run.size * 1.18 * SCALE
      g.font = `600 ${px}px ${fontFamily}`
      g.fillStyle = col(run.color)
      g.textAlign = run.anchor === "middle" ? "center" : run.anchor === "end" ? "right" : "left"
      const total = run.lines.reduce((n, l) => n + l.length, 0)
      let budget = Math.round(p * total)
      run.lines.forEach((line, k) => {
        const shown = line.slice(0, Math.max(0, budget))
        budget -= line.length
        if (shown) g.fillText(shown, X0 + run.x * SCALE, Y0 + (run.y + k * run.size * 1.25) * SCALE)
      })
    }

    // Caption: the sentence being spoken, with the current word emphasised
    const si = Math.min(tl.segStarts.length - 1, Math.max(0, tl.segStarts.findLastIndex((s) => s <= time + 1e-6)))
    const seg = segments[si]
    if (seg) {
      const dur = tl.segDurs[si] || 1
      const words = seg.narration.split(/\s+/)
      const wi = wordIndexAt(words, clamp((time - tl.segStarts[si]) / dur, 0, 1))
      g.font = `500 25px ${sans}`
      g.textAlign = "left"
      const maxW = W - 200
      const lines: { text: string; start: number }[] = []
      let cur = ""
      let startIdx = 0
      words.forEach((w, i) => {
        const next = cur ? `${cur} ${w}` : w
        if (g.measureText(next).width > maxW && cur) {
          lines.push({ text: cur, start: startIdx })
          cur = w
          startIdx = i
        } else cur = next
      })
      if (cur) lines.push({ text: cur, start: startIdx })
      const lh = 34
      const top = 618 + (3 - Math.min(3, lines.length)) * (lh / 2)
      lines.slice(0, 3).forEach((ln, k) => {
        const ws = ln.text.split(" ")
        const widths = ws.map((w) => g.measureText(w + " ").width)
        const full = widths.reduce((a, b) => a + b, 0)
        let x = (W - full) / 2
        ws.forEach((w, j) => {
          const idx = ln.start + j
          g.fillStyle = idx === wi ? "#111827" : idx < wi ? "#4b5563" : "#9ca3af"
          g.fillText(w, x, top + k * lh + 24)
          x += widths[j]
        })
      })
    }

    // Title + watermark
    g.textAlign = "left"
    g.font = `600 17px ${sans}`
    g.fillStyle = "#6b7280"
    g.fillText(title, 28, 30)
    g.textAlign = "right"
    g.font = `500 15px ${sans}`
    g.fillStyle = "#9ca3af"
    g.fillText("Made with Chalk · chalk.itsneeraj.com", W - 28, 30)

    // Thin progress bar
    g.fillStyle = "#e5e7eb"
    g.fillRect(0, H - 4, W, 4)
    g.fillStyle = "#111827"
    g.fillRect(0, H - 4, (tl.total ? time / tl.total : 0) * W, 4)
  }
}
