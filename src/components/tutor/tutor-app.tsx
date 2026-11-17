"use client"

import * as React from "react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { Attachment } from "@/lib/attachments"
import { Player } from "@/lib/player"
import type { BoardElement, LessonRequest, Level } from "@/lib/schema"
import { videoExportSupported } from "@/lib/export-video"
import { useVideoExport } from "@/lib/use-video-export"
import { keyHeaders } from "@/lib/byok"
import { findSessionByTopic, getSession, saveSession } from "@/lib/sessions"
import { useUserKey } from "@/lib/byok"
import { setVoiceModelId } from "@/lib/voice"
import { QuotaError, streamClip, type ClipUpdate } from "@/lib/stream-clip"
import { describe, type InkStroke } from "@/components/whiteboard/whiteboard"
import { AppSidebar, type AppStatus } from "./app-sidebar"
import { BoardStage } from "./board-stage"
import { ChapterPicker } from "./chapter-picker"
import { ChatPanel } from "./chat-panel"
import { EmptyState } from "./empty-state"
import { HeaderActions } from "./header-actions"
import { KeyDialog } from "./key-dialog"
import type { ChatItem, ClipState } from "./types"


let idSeq = 0
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${idSeq++}`

const noopSubscribe = () => () => {}

const sessionTitle = (topic: string) => {
  const t = topic.replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "")
  return t.length > 56 ? `${t.slice(0, 55)}…` : t.charAt(0).toUpperCase() + t.slice(1)
}

/** Each saved lesson lives at /lesson/<id>, so a reload (or a shared tab) reopens it. */
const lessonPath = (id: string) => `/lesson/${encodeURIComponent(id)}`
const lessonIdFromPath = (path: string) => {
  const m = /^\/lesson\/([^/]+)\/?$/.exec(path)
  return m ? decodeURIComponent(m[1]) : null
}
const setUrl = (path: string, mode: "push" | "replace" = "push") => {
  if (window.location.pathname === path) return
  if (mode === "push") window.history.pushState(null, "", path)
  else window.history.replaceState(null, "", path)
}

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
  const [status, setStatus] = React.useState<AppStatus>(null)
  const [level, setLevel] = React.useState<Level>("beginner")
  const [captions, setCaptions] = React.useState(true)
  const [topic, setTopic] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<ChatItem[]>([])
  const [clips, setClips] = React.useState<Record<string, ClipState>>({})
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [lessonId, setLessonId] = React.useState<string | null>(null)
  const [input, setInput] = React.useState("")
  const [chatting, setChatting] = React.useState(false)
  const activeSessionRef = React.useRef<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [ink, setInk] = React.useState<Record<string, InkStroke[]>>({})
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const boardPanel = React.useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === boardPanel.current && !!boardPanel.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else boardPanel.current?.requestFullscreen?.().catch(() => toast.error("Full screen isn't available in this browser"))
  }

  // Refs mirror state for use inside streaming callbacks.
  const activeRef = React.useRef<string | null>(null)
  const clipsRef = React.useRef(clips)
  React.useLayoutEffect(() => {
    clipsRef.current = clips
  }, [clips])
  const requests = React.useRef(new Map<string, LessonRequest>())
  const aborts = React.useRef(new Map<string, AbortController>())

  const userKey = useUserKey()
  const videoExport = useVideoExport()
  const [keyDialog, setKeyDialog] = React.useState<{ open: boolean; reason: "quota" | "manual" | "ip" | "capacity" }>({ open: false, reason: "manual" })

  /** Mode and free-allowance counts from the server (the cookie travels with the request). */
  const refreshStatus = React.useCallback(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((st) => {
        setStatus(st)
        setVoiceModelId(st?.voice)
      })
      .catch(() => setStatus(null))
  }, [])
  React.useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  React.useEffect(() => {
    player?.setNoticeHandler((msg) => toast(msg))
  }, [player])

  // No AI credentials: narrate with the browser voice from the start (no error toast).
  React.useEffect(() => {
    if (status?.mode === "sample") player?.setVoice("browser")
  }, [status?.mode, player])

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
    async (clipId: string, req: LessonRequest, opts: { inChat?: boolean } = {}) => {
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
          [clipId]: {
            ...m[clipId],
            // Sample mode always returns the same pre-written lesson, so name the
            // session after what the learner asked for instead.
            title: u.mode === "sample" && kind === "lesson" ? sessionTitle(req.topic) : u.title,
            reply: u.reply,
            segments: u.segments,
            done: u.done,
            mode: u.mode,
          },
        }))
        if (activeRef.current === clipId) player.setContent(u.segments, u.done)
        else if (!switched && (u.done ? u.segments.length > 0 : u.segments.length > 1)) {
          // First playable part of a follow-up: put it on the board.
          switched = true
          activate(clipId, u, true)
        }
      }

      // A lesson started from a chat that could not be made: turn its placeholder back into a plain reply.
      const abandon = (text: string) => {
        setItems((xs) => xs.map((it) => ("clipId" in it && it.clipId === clipId ? { id: it.id, role: "assistant" as const, text } : it)))
        setClips((m) => {
          const rest = { ...m }
          delete rest[clipId]
          return rest
        })
        if (activeRef.current === clipId) {
          activeRef.current = null
          setActiveId(null)
        }
      }

      try {
        const result = await streamClip(req, apply, ac.signal)
        refreshStatus()
        // The model decided this wasn't a topic (greeting, small talk): no lesson, just its reply.
        if (kind === "lesson" && result.segments.length === 0 && opts.inChat) {
          abandon(result.reply ?? "I couldn't turn that into a lesson. Could you rephrase it?")
          return
        }
        if (kind === "lesson" && result.segments.length === 0) {
          aborts.current.forEach((a) => a.abort())
          player?.pause()
          setNotice(result.reply ?? "What would you like to learn? Type any topic and I'll teach it on the whiteboard.")
          setTopic(null)
          setItems([])
          setClips({})
          setLessonId(null)
          setActiveId(null)
          activeRef.current = null
          setUrl("/", "replace")
          return
        }
      } catch (err) {
        if (ac.signal.aborted) {
          setClips((m) => ({ ...m, [clipId]: { ...m[clipId], done: true } }))
          if (activeRef.current === clipId) player.setContent(clipsRef.current[clipId]?.segments ?? [], true)
          return
        }
        const message = err instanceof Error ? err.message : "Something went wrong."
        if (err instanceof QuotaError) {
          // Free allowance used up: offer to add their own key.
          setKeyDialog({ open: true, reason: err.kind })
          refreshStatus()
          if (kind === "lesson" && opts.inChat) {
            abandon(message)
            return
          }
          if (kind === "lesson") {
            setNotice(message)
            setTopic(null)
            setItems([])
            setClips({})
            setLessonId(null)
            setActiveId(null)
            activeRef.current = null
            setUrl("/", "replace")
            return
          }
        }
        setClips((m) => ({ ...m, [clipId]: { ...m[clipId], error: message } }))
      } finally {
        aborts.current.delete(clipId)
      }
    },
    [activate, player, refreshStatus]
  )

  const busy = chatting || Object.values(clips).some((c) => !c.done && !c.error)

  // Save the conversation to this browser's history once nothing is generating.
  React.useEffect(() => {
    if (!topic || !lessonId || busy) return
    const lesson = clips[lessonId]
    // A chat with no lesson yet is saved too, once Chalk has replied.
    if (lesson ? !lesson.segments.length : !items.some((i) => i.role === "assistant")) return
    const existing = getSession(lessonId)
    saveSession({
      id: lessonId,
      title: lesson?.title ?? sessionTitle(topic),
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

  const resetState = React.useCallback(() => {
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
    activeSessionRef.current = null
    setChatting(false)
  }, [player])

  /** Back to the home screen (and "/"). */
  const goHome = React.useCallback(() => {
    resetState()
    setUrl("/")
  }, [resetState])

  const startLesson = (raw: string, attachments?: Attachment[]) => {
    const t = raw.trim()
    if (t.length < 2) return
    // Already have this lesson? Replay it instead of asking the AI (and spending a prompt) again.
    if (!attachments?.length) {
      const existing = findSessionByTopic(t, level)
      if (existing) {
        toast("You already have this lesson, so I reopened it instead of generating it again.")
        openSession(existing.id)
        return
      }
    }
    resetState()
    const id = newId("lesson")
    activeSessionRef.current = id
    setUrl(lessonPath(id))
    setTopic(t)
    setLessonId(id)
    setItems([
      { id: newId("u"), role: "user", text: t, files: attachments?.map((a) => a.name) },
      { id: newId("a"), role: "assistant", clipId: id },
    ])
    run(id, {
      mode: "lesson",
      topic: t,
      level,
      attachments: attachments?.map(({ name, kind, mediaType, data }) => ({ name, kind, mediaType, data })),
    })
  }

  const openSession = (id: string, pushUrl = true) => {
    if (id === lessonId) return
    const saved = getSession(id)
    if (!saved) {
      toast.error("That lesson isn't saved in this browser.")
      setUrl("/", "replace")
      return
    }
    resetState()
    if (pushUrl) setUrl(lessonPath(id))
    const restored: Record<string, ClipState> = {}
    for (const [cid, c] of Object.entries(saved.clips)) restored[cid] = { ...c, done: true }
    clipsRef.current = restored
    setTopic(saved.topic)
    setLevel(saved.level)
    setItems(saved.items)
    setClips(restored)
    setLessonId(saved.lessonId)
    activeSessionRef.current = saved.lessonId
    if (restored[saved.lessonId]) activate(saved.lessonId, restored[saved.lessonId], false)
  }

  // Keep the page in step with the address bar: open the lesson in the URL on
  // load, and follow the browser's back/forward buttons.
  const navRef = React.useRef({ openSession, goHome })
  React.useLayoutEffect(() => {
    navRef.current = { openSession, goHome }
  })
  React.useEffect(() => {
    if (!player) return
    const sync = (fromPop: boolean) => {
      const id = lessonIdFromPath(window.location.pathname)
      if (id) navRef.current.openSession(id, false)
      else if (fromPop) resetState()
    }
    sync(false)
    const onPop = () => sync(true)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  /** One round of conversation: Chalk answers, or decides to make a lesson (the create_lesson tool). */
  const chatTurn = async (sessionId: string, message: string, history: { role: "user" | "assistant"; text: string }[]) => {
    setChatting(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ message, level, history: history.slice(-10) }),
      })
      const data = (await res.json().catch(() => null)) as { reply?: string; lessonTopic?: string; error?: string; code?: string } | null
      if (res.status === 402) setKeyDialog({ open: true, reason: "quota" })
      if (!res.ok || !data?.reply) throw new Error(data?.error ?? "Chalk couldn't reply just now. Please try again.")
      if (activeSessionRef.current !== sessionId) return // the learner moved on
      setItems((xs) => [...xs, { id: newId("a"), role: "assistant", text: data.reply! }])
      if (data.lessonTopic) {
        const t = data.lessonTopic
        setTopic(t)
        setItems((xs) => [...xs, { id: newId("a"), role: "assistant", clipId: sessionId }])
        void run(sessionId, { mode: "lesson", topic: t, level }, { inChat: true })
      }
    } catch (e) {
      if (activeSessionRef.current === sessionId) setItems((xs) => [...xs, { id: newId("a"), role: "assistant", text: (e as Error).message }])
    } finally {
      setChatting(false)
    }
  }

  /** From the home screen: open a chat page and talk to Chalk there. */
  const startChat = (raw: string) => {
    const message = raw.trim()
    if (!message) return
    resetState()
    const id = newId("lesson")
    activeSessionRef.current = id
    setUrl(lessonPath(id))
    setTopic(message)
    setLessonId(id)
    setItems([{ id: newId("u"), role: "user", text: message }])
    void chatTurn(id, message, [])
  }

  /** Follow-up message in a chat that has no lesson yet. */
  const continueChat = (raw: string) => {
    const message = raw.trim()
    if (!message || !lessonId || busy) return
    const history = items.map((it) => ({ role: it.role, text: it.role === "user" ? it.text : "text" in it ? it.text : (clipsRef.current[it.clipId]?.reply ?? "") })).filter((m) => m.text)
    setItems((xs) => [...xs, { id: newId("u"), role: "user", text: message }])
    setInput("")
    void chatTurn(lessonId, message, history)
  }

  const ask = (raw: string, attachments?: Attachment[]) => {
    const q = raw.trim() || (attachments?.length ? "Can you explain what I attached?" : "")
    if (q.length < 2 || !topic || busy) return
    const lesson = lessonId ? clipsRef.current[lessonId] : undefined
    const active = activeRef.current ? clipsRef.current[activeRef.current] : undefined
    const history = items
      .slice(-8)
      .map((it) =>
        it.role === "user"
          ? { role: "user" as const, text: it.text }
          : { role: "assistant" as const, text: "text" in it ? it.text : (clipsRef.current[it.clipId]?.reply ?? "") }
      )
      .filter((m) => m.text)
    const id = newId("followup")
    setItems((xs) => [
      ...xs,
      { id: newId("u"), role: "user", text: q, files: attachments?.map((a) => a.name) },
      { id: newId("a"), role: "assistant", clipId: id },
    ])
    setInput("")
    run(id, {
      mode: "followup",
      topic,
      level,
      question: q,
      attachments: attachments?.map(({ name, kind, mediaType, data }) => ({ name, kind, mediaType, data })),
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
  const showBoard = inLesson && !!lessonId && !!clips[lessonId]
  // The finished lesson itself (not a follow-up) is what gets exported as a video.
  const exportClip = lessonId && videoExportSupported() ? clips[lessonId] : undefined
  const cancelExport = videoExport.cancel
  React.useEffect(() => cancelExport, [lessonId, cancelExport]) // a different lesson (or leaving) drops any export in progress
  const exportable = exportClip?.done && exportClip.segments.length ? exportClip : undefined

  React.useEffect(() => {
    document.title = lessonTitle ? `${lessonTitle} — Chalk` : "Chalk — AI whiteboard tutor"
  }, [lessonTitle])

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-0 [--board-panel:#f4f4f5] dark:[--board-panel:var(--color-zinc-800)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppSidebar
        activeId={lessonId}
        status={status}
        userKey={userKey}
        onManageKey={() => setKeyDialog({ open: true, reason: "manual" })}
        onNew={goHome}
        onOpen={(id) => openSession(id)}
      />
      <SidebarInset id="main" tabIndex={-1} className="min-h-0 min-w-0 overflow-hidden outline-none border border-border/80 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:shadow-none">
        <header className="flex h-12 shrink-0 items-center px-3">
          {/* Left cell: sidebar toggle + lesson title. On wide screens it is exactly as
              wide as the chat column, so the chapter switcher that follows starts where
              the whiteboard preview starts. */}
          <div
            className={
              showBoard
                ? "flex min-w-0 items-center gap-2 pr-1 md:pr-3 lg:w-[380px] lg:shrink-0 lg:pr-3 xl:w-[420px]"
                : "flex items-center"
            }
          >
            <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground" />
            {showBoard && (
              <>
                <Separator orientation="vertical" className="mx-1 hidden h-4 shrink-0 self-center md:block" />
                <h1 className="hidden min-w-0 truncate text-sm font-medium md:block">{lessonTitle}</h1>
              </>
            )}
          </div>
          {showBoard && snap && (
            // On wide screens this is a tab fused to the top-left of the preview panel.
            <div className="relative min-w-0 flex-1 lg:h-10 lg:self-end lg:rounded-t-2xl lg:bg-[var(--board-panel)] lg:px-2 lg:after:absolute lg:after:bottom-0 lg:after:-right-3 lg:after:size-3 lg:after:[background:radial-gradient(circle_at_100%_0,transparent_0.75rem,var(--board-panel)_0.75rem)] lg:flex lg:flex-none lg:items-center">
              <ChapterPicker snap={snap} onSelect={(i) => activeId && goToChapter(activeId, i)} />
            </div>
          )}
          <HeaderActions
            inLesson={inLesson}
            title={lessonTitle ?? "Lesson"}
            items={items}
            clips={clips}
            onNew={goHome}
            onFullscreen={toggleFullscreen}
            fullscreen={fullscreen}
            exporter={exportable ? { api: videoExport, run: () => void videoExport.start(exportable.title ?? lessonTitle ?? "Lesson", exportable.segments) } : undefined}
          />
        </header>

        {!inLesson ? (
          <EmptyState level={level} setLevel={setLevel} onStart={startLesson} onChat={startChat} notice={notice} onClearNotice={() => setNotice(null)} />
        ) : !showBoard ? (
          <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
            <ChatPanel
              items={items}
              clips={clips}
              activeClipId={activeId}
              snap={snap}
              input={input}
              setInput={setInput}
              onSend={(text) => continueChat(text)}
              onPlayClip={playClip}
              onChapter={goToChapter}
              onRetry={retry}
              onStop={stop}
              level={level}
              busy={busy}
              textareaRef={textareaRef}
              chatOnly
              typing={chatting}
            />
          </main>
        ) : (
          <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Whiteboard preview */}
            <div ref={boardPanel} className="mx-3 mb-3 flex min-h-0 flex-none flex-col lg:flex-1 rounded-2xl bg-[var(--board-panel)] p-2.5 lg:order-2 lg:m-3 lg:mt-0 lg:min-w-0 lg:flex-1 lg:rounded-tl-none lg:p-5 fullscreen:m-0 fullscreen:rounded-none fullscreen:bg-background fullscreen:p-6">
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
                level={level}
                busy={busy}
                textareaRef={textareaRef}
                typing={chatting}
              />
            </aside>
          </main>
        )}
      </SidebarInset>
      <KeyDialog
        open={keyDialog.open}
        onOpenChange={(open) => setKeyDialog((d) => ({ ...d, open }))}
        reason={keyDialog.reason}
        freeLimit={status?.quota?.prompts.limit}
        onSaved={refreshStatus}
      />
    </SidebarProvider>
  )
}
