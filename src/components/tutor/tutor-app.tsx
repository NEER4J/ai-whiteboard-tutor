"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Player } from "@/lib/player"
import type { BoardElement, LessonRequest, Level } from "@/lib/schema"
import { getSession, saveSession } from "@/lib/sessions"
import { streamClip, type ClipUpdate } from "@/lib/stream-clip"
import { describe, type InkStroke } from "@/components/whiteboard/whiteboard"
import { AppSidebar } from "./app-sidebar"
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
  const [captions, setCaptions] = React.useState(true)
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

  const busy = Object.values(clips).some((c) => !c.done && !c.error)

  // Save the conversation to this browser's history once nothing is generating.
  React.useEffect(() => {
    if (!topic || !lessonId || busy) return
    const lesson = clips[lessonId]
    if (!lesson || !lesson.segments.length) return
    const existing = getSession(lessonId)
    saveSession({
      id: lessonId,
      title: lesson.title ?? topic,
      topic,
      level,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      lessonId,
      items,
      clips,
    })
  }, [topic, lessonId, busy, clips, items, level])

  const stop = () => aborts.current.forEach((ac) => ac.abort())

  const reset = React.useCallback(() => {
    aborts.current.forEach((ac) => ac.abort())
    player?.pause()
    setTopic(null)
    setItems([])
    setClips({})
    setInk({})
    setInput("")
    setLessonId(null)
    setActiveId(null)
    activeRef.current = null
  }, [player])

  const startLesson = (raw: string) => {
    const t = raw.trim()
    if (t.length < 2) return
    reset()
    const id = newId("lesson")
    setTopic(t)
    setLessonId(id)
    setItems([
      { id: newId("u"), role: "user", text: t },
      { id: newId("a"), role: "assistant", clipId: id },
    ])
    run(id, { mode: "lesson", topic: t, level })
  }

  const openSession = (id: string) => {
    if (id === lessonId) return
    const saved = getSession(id)
    if (!saved) return
    reset()
    const restored: Record<string, ClipState> = {}
    for (const [cid, c] of Object.entries(saved.clips)) restored[cid] = { ...c, done: true }
    clipsRef.current = restored
    setTopic(saved.topic)
    setLevel(saved.level)
    setItems(saved.items)
    setClips(restored)
    setLessonId(saved.lessonId)
    activate(saved.lessonId, restored[saved.lessonId], false)
  }

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
  const lessonTitle = lessonId ? clips[lessonId]?.title ?? topic : null
  const inLesson = !!topic && !!snap

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-0">
      <AppSidebar activeId={lessonId} status={status} onNew={reset} onOpen={openSession} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          {inLesson && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <h1 className="truncate text-sm font-medium">{lessonTitle}</h1>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                <PlusIcon data-icon="inline-start" /> New lesson
              </Button>
            </>
          )}
        </header>

        {!inLesson ? (
          <EmptyState level={level} setLevel={setLevel} captions={captions} setCaptions={setCaptions} onStart={startLesson} mode={status?.mode ?? null} />
        ) : (
          <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Whiteboard preview */}
            <div className="flex h-[calc((100vw-1.5rem)*0.6+14rem)] max-h-[70dvh] shrink-0 flex-col rounded-2xl bg-muted/60 p-3 sm:h-[60dvh] lg:order-2 lg:m-3 lg:mt-0 lg:h-auto lg:min-w-0 lg:flex-1 lg:p-5 dark:bg-muted/30 max-lg:mx-3">
              <BoardStage
                player={player}
                snap={snap}
                clip={activeClip}
                isFollowup={activeClip?.kind === "followup"}
                onBackToLesson={() => lessonId && clips[lessonId] && activate(lessonId, clips[lessonId], true)}
                onExplain={explain}
                ink={ink}
                setInk={setInk}
                captions={captions}
                setCaptions={setCaptions}
              />
            </div>
            {/* Chat */}
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
      </SidebarInset>
    </SidebarProvider>
  )
}
