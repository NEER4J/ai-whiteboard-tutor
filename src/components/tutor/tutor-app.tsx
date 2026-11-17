"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Player } from "@/lib/player"
import type { BoardElement, LessonRequest, Level } from "@/lib/schema"
import { streamClip, type ClipUpdate } from "@/lib/stream-clip"
import { describe, type InkStroke } from "@/components/whiteboard/whiteboard"
import { BoardStage } from "./board-stage"
import { ChatPanel } from "./chat-panel"
import { EmptyState } from "./empty-state"
import type { ChatItem, ClipState } from "./types"

type Status = { mode: "live" | "sample"; model: string | null; voice: string | null }

let idSeq = 0
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${idSeq++}`

const noopSubscribe = () => () => {}

function usePlayer() {
  // One Player per mounted app; created lazily on the client only.
  const [player] = React.useState(() => (typeof window === "undefined" ? null : new Player()))
  React.useEffect(() => () => player?.destroy(), [player])
  const snap = React.useSyncExternalStore(
    player ? player.subscribe : noopSubscribe,
    () => player?.getSnapshot() ?? null,
    () => null
  )
  return { player: player as Player, snap }
}

export function TutorApp() {
  const { player, snap } = usePlayer()
  const [status, setStatus] = React.useState<Status | null>(null)
  const [level, setLevel] = React.useState<Level>("beginner")
  const [topic, setTopic] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<ChatItem[]>([])
  const [clips, setClips] = React.useState<Record<string, ClipState>>({})
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [lessonId, setLessonId] = React.useState<string | null>(null)
  const [input, setInput] = React.useState("")
  const [ink, setInk] = React.useState<Record<string, InkStroke[]>>({})
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Refs mirror state for use inside streaming callbacks.
  const activeRef = React.useRef<string | null>(null)
  const clipsRef = React.useRef(clips)
  React.useLayoutEffect(() => {
    clipsRef.current = clips
  }, [clips])
  const requests = React.useRef(new Map<string, LessonRequest>())
  const aborts = React.useRef(new Map<string, AbortController>())

  React.useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  React.useEffect(() => {
    player?.setNoticeHandler((msg) => toast(msg))
  }, [player])

  const activate = React.useCallback(
    (id: string, clip: Pick<ClipState, "segments" | "done">, autoplay: boolean) => {
      activeRef.current = id
      setActiveId(id)
      player.load(id, clip.segments, clip.done, { autoplay })
      if (autoplay) player.play()
    },
    [player]
  )

  const run = React.useCallback(
    async (clipId: string, req: LessonRequest) => {
      requests.current.set(clipId, req)
      const ac = new AbortController()
      aborts.current.set(clipId, ac)
      const kind = req.mode === "lesson" ? "lesson" : "followup"
      setClips((m) => ({ ...m, [clipId]: { id: clipId, kind, segments: [], done: false } }))
      let switched = kind === "lesson"
      if (kind === "lesson") activate(clipId, { segments: [], done: false }, true)

      const apply = (u: ClipUpdate) => {
        setClips((m) => ({
          ...m,
          [clipId]: { ...m[clipId], title: u.title, reply: u.reply, segments: u.segments, done: u.done, mode: u.mode },
        }))
        if (activeRef.current === clipId) player.setContent(u.segments, u.done)
        else if (!switched && (u.done ? u.segments.length > 0 : u.segments.length > 1)) {
          // First playable part of a follow-up: put it on the board.
          switched = true
          activate(clipId, u, true)
        }
      }

      try {
        await streamClip(req, apply, ac.signal)
      } catch (err) {
        if (ac.signal.aborted) {
          setClips((m) => ({ ...m, [clipId]: { ...m[clipId], done: true } }))
          if (activeRef.current === clipId) player.setContent(clipsRef.current[clipId]?.segments ?? [], true)
          return
        }
        const message = err instanceof Error ? err.message : "Something went wrong."
        setClips((m) => ({ ...m, [clipId]: { ...m[clipId], error: message } }))
      } finally {
        aborts.current.delete(clipId)
      }
    },
    [activate, player]
  )

  const startLesson = (raw: string) => {
    const t = raw.trim()
    if (t.length < 2) return
    const id = newId("lesson")
    setTopic(t)
    setLessonId(id)
    setItems([
      { id: newId("u"), role: "user", text: t },
      { id: newId("a"), role: "assistant", clipId: id },
    ])
    run(id, { mode: "lesson", topic: t, level })
  }

  const busy = Object.values(clips).some((c) => !c.done && !c.error)

  const ask = (raw: string) => {
    const q = raw.trim()
    if (q.length < 2 || !topic || busy) return
    const lesson = lessonId ? clipsRef.current[lessonId] : undefined
    const active = activeRef.current ? clipsRef.current[activeRef.current] : undefined
    const history = items
      .slice(-8)
      .map((it) =>
        it.role === "user"
          ? { role: "user" as const, text: it.text }
          : { role: "assistant" as const, text: clipsRef.current[it.clipId]?.reply ?? "" }
      )
      .filter((m) => m.text)
    const id = newId("followup")
    setItems((xs) => [...xs, { id: newId("u"), role: "user", text: q }, { id: newId("a"), role: "assistant", clipId: id }])
    setInput("")
    run(id, {
      mode: "followup",
      topic,
      level,
      question: q,
      lesson: lesson ? { title: lesson.title ?? topic, narration: lesson.segments.map((s) => s.narration) } : undefined,
      currentNarration: active?.segments[snap?.seg ?? 0]?.narration,
      history,
    })
  }

  const retry = (clipId: string) => {
    const req = requests.current.get(clipId)
    if (req) run(clipId, req)
  }

  const stop = () => aborts.current.forEach((ac) => ac.abort())

  const reset = () => {
    stop()
    player.pause()
    setTopic(null)
    setItems([])
    setClips({})
    setInk({})
    setLessonId(null)
    setActiveId(null)
    activeRef.current = null
  }

  const explain = (el: BoardElement) => {
    setInput(`Can you explain "${describe(el)}" in more detail?`)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const playClip = (id: string) => {
    const clip = clipsRef.current[id]
    if (!clip) return
    if (activeRef.current === id) player.play()
    else activate(id, clip, true)
  }

  const goToChapter = (id: string, chapter: number) => {
    const clip = clipsRef.current[id]
    if (!clip) return
    if (activeRef.current !== id) activate(id, clip, false)
    const c = player.getSnapshot().timeline.chapters[chapter]
    if (c) player.seek(c.start, true)
  }

  const activeClip = activeId ? clips[activeId] : undefined

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        <button type="button" onClick={reset} className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Chalk home">
          <Logo />
          Chalk
        </button>
        {status && (
          <Badge variant="secondary" className="font-normal text-muted-foreground" title={status.model ?? undefined}>
            <span className={status.mode === "live" ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-amber-500"} />
            {status.mode === "live" ? `Live · ${status.model?.split("/")[1] ?? "AI"}` : "Sample mode"}
          </Badge>
        )}
        {topic && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
            <PlusIcon data-icon="inline-start" /> New lesson
          </Button>
        )}
      </header>

      {!topic || !snap ? (
        <EmptyState level={level} setLevel={setLevel} onStart={startLesson} mode={status?.mode ?? null} />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-0">
          <div className="flex h-[calc((100vw-1.5rem)*0.6+14rem)] max-h-[70dvh] shrink-0 flex-col px-3 pb-3 sm:h-[60dvh] lg:order-2 lg:h-auto lg:min-w-0 lg:flex-1 lg:px-6 lg:pb-5">
            <BoardStage
              player={player}
              snap={snap}
              clip={activeClip}
              isFollowup={activeClip?.kind === "followup"}
              onBackToLesson={() => lessonId && clips[lessonId] && activate(lessonId, clips[lessonId], true)}
              onExplain={explain}
              ink={ink}
              setInk={setInk}
            />
          </div>
          <aside className="flex min-h-0 flex-1 flex-col lg:order-1 lg:w-[380px] lg:flex-none xl:w-[420px]">
            <ChatPanel
              items={items}
              clips={clips}
              activeClipId={activeId}
              snap={snap}
              input={input}
              setInput={setInput}
              onSend={ask}
              onPlayClip={playClip}
              onChapter={goToChapter}
              onRetry={retry}
              onStop={stop}
              busy={busy}
              textareaRef={textareaRef}
            />
          </aside>
        </main>
      )}
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect width="24" height="24" rx="7" className="fill-primary" />
      <path
        d="M6.5 15.5c2-4.5 4-6.5 5.5-6.5s1 3-0.5 5 1 2.5 2.5 1 2.5-3 3.5-3.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}
