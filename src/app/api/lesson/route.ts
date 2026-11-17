import { Output, streamText } from "ai"
import { clipSchema, lessonRequestSchema } from "@/lib/schema"
import {
  followupSystemPrompt,
  followupUserPrompt,
  lessonSystemPrompt,
  lessonUserPrompt,
} from "@/lib/prompts"
import { LESSON_MODEL, LESSON_REASONING, clientIp, isLive } from "@/lib/server/config"
import { rateLimit } from "@/lib/server/rate-limit"
import { SAMPLE_FOLLOWUP, SAMPLE_LESSON } from "@/lib/server/sample"

export const maxDuration = 120

/** Separator the client uses to detect a mid-stream failure. */
const ERROR_MARK = "\u0000ERROR:"

export async function POST(req: Request) {
  const parsed = lessonRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "Please enter a topic between 2 and 300 characters." }, { status: 400 })
  }
  const body = parsed.data

  const limit = rateLimit(`lesson:${clientIp(req)}`, 15, 10 * 60_000)
  if (!limit.ok) {
    return Response.json(
      { error: `You've asked a lot in a short time. Please try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    )
  }

  if (!isLive()) {
    return sampleStream(body.mode === "lesson" ? SAMPLE_LESSON : SAMPLE_FOLLOWUP)
  }

  const isLesson = body.mode === "lesson"
  const userText = isLesson ? lessonUserPrompt(body) : followupUserPrompt(body)
  const media = (body.attachments ?? []).filter((a) => a.kind !== "text")
  const result = streamText({
    model: LESSON_MODEL,
    reasoning: LESSON_REASONING,
    system: isLesson ? lessonSystemPrompt(body.level) : followupSystemPrompt(body.level),
    ...(media.length
      ? {
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: userText },
                ...media.map((a) =>
                  a.kind === "image"
                    ? { type: "image" as const, image: a.data, mediaType: a.mediaType }
                    : { type: "file" as const, data: a.data, mediaType: "application/pdf" }
                ),
              ],
            },
          ],
        }
      : { prompt: userText }),
    output: Output.object({ schema: clipSchema }),
    maxOutputTokens: 14000,
    abortSignal: req.signal,
  })

  // Pipe the raw JSON text through; the client parses partial JSON as it
  // arrives so playback can start before the whole lesson is written.
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") controller.enqueue(encoder.encode(part.text))
          else if (part.type === "error") throw part.error
        }
      } catch (err) {
        console.error("[lesson] generation failed", err)
        controller.enqueue(encoder.encode(`${ERROR_MARK}${friendlyError(err)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-tutor-mode": "live",
      "x-tutor-model": LESSON_MODEL,
    },
  })
}

function friendlyError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  if (/api key|unauthori[sz]ed|401|403|authentication/i.test(msg))
    return "The AI service rejected our credentials. Check AI_GATEWAY_API_KEY."
  if (/rate|429|quota|credit/i.test(msg)) return "The AI service is busy or out of credits. Please try again shortly."
  return "The tutor couldn't finish this lesson. Please try again."
}

/** Streams a pre-written clip in small chunks so the UI exercises the same path. */
function sampleStream(clip: unknown) {
  const json = JSON.stringify(clip)
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let i = 0; i < json.length; i += 60) {
        controller.enqueue(encoder.encode(json.slice(i, i + 60)))
        await new Promise((r) => setTimeout(r, 45))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "x-tutor-mode": "sample" },
  })
}
