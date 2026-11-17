"use client"

import * as React from "react"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import type { PlayerSnapshot } from "@/lib/player"
import type { Attachment } from "@/lib/attachments"
import { useAttachments } from "@/lib/use-attachments"
import { FileTextIcon } from "lucide-react"
import { AttachButton, AttachmentChips } from "./attachment-chips"
import { AssistantMessage } from "./assistant-message"
import { PromptBox } from "./prompt-box"
import type { ChatItem, ClipState } from "./types"

type Props = {
  items: ChatItem[]
  clips: Record<string, ClipState>
  activeClipId: string | null
  snap: PlayerSnapshot
  input: string
  setInput: (v: string) => void
  onSend: (text: string, attachments?: Attachment[]) => void
  onPlayClip: (clipId: string) => void
  onChapter: (clipId: string, chapter: number) => void
  onRetry: (clipId: string) => void
  onStop: () => void
  level: string
  busy: boolean
  textareaRef: React.Ref<HTMLTextAreaElement>
}

const QUICK = [
  { label: "Explain it simpler", text: "I didn't quite get that. Can you explain it more simply, with a different analogy?" },
  { label: "Give an example", text: "Can you show me a concrete example?" },
  { label: "Quiz me", text: "Quiz me with one question to check that I understood." },
]

export function ChatPanel(props: Props) {
  const { items, clips, input, setInput, onSend, busy, onStop, textareaRef } = props
  const { files, add, remove, clear } = useAttachments()
  const send = (text: string) => {
    onSend(text, files.length ? files : undefined)
    clear()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport className="outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <MessageScrollerContent className="gap-5 px-4 py-4">
              {items.map((item, idx) => (
                <MessageScrollerItem key={item.id} messageId={item.id} scrollAnchor={item.role === "user"}>
                  {item.role === "user" ? (
                    <Message align="end">
                      <MessageContent>
                        <Bubble align="end" variant="muted">
                          <BubbleContent className="rounded-2xl px-3.5">{item.text}</BubbleContent>
                        </Bubble>
                        {item.files?.length ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            {item.files.map((n, i) => (
                              <span key={`${n}-${i}`} className="inline-flex max-w-44 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                <FileTextIcon className="size-3 shrink-0" />
                                <span className="truncate">{n}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </MessageContent>
                    </Message>
                  ) : (
                    <AssistantMessage
                      clip={clips[item.clipId]}
                      userText={(() => {
                        const prev = items[idx - 1]
                        return prev?.role === "user" ? prev.text : ""
                      })()}
                      level={props.level}
                      activeClipId={props.activeClipId}
                      snap={props.snap}
                      onPlayClip={props.onPlayClip}
                      onChapter={props.onChapter}
                      onRetry={props.onRetry}
                      // Only the newest quiz question still waiting for an answer gets the answer box.
                      quizAnswer={
                        idx === items.length - 1
                          ? { busy: props.busy, onSubmit: (t) => props.onSend(t) }
                          : undefined
                      }
                    />
                  )}
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {QUICK.map((q) => (
            <Button
              key={q.label}
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-full font-normal"
              disabled={busy}
              onClick={() => send(q.text)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <PromptBox
          textareaRef={textareaRef}
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          allowEmpty={files.length > 0}
          onPasteFiles={add}
          header={files.length ? <AttachmentChips files={files} onRemove={remove} /> : undefined}
          addon={<AttachButton onFiles={add} />}
          placeholder="Ask a follow-up question…"
          busy={busy}
          onStop={onStop}
        />
      </div>
    </div>
  )
}
