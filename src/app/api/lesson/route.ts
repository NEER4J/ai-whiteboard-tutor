import { Output, streamText } from "ai"
import { clipSchema, lessonRequestSchema } from "@/lib/schema"
import {
  followupSystemPrompt,
  followupUserPrompt,
  lessonSystemPrompt,
  lessonUserPrompt,
} from "@/lib/prompts"
import { LESSON_MODEL, LESSON_PROVIDERS, LESSON_REASONING, clientIp, isLive } from "@/lib/server/config"
import { userGateway } from "@/lib/server/gateway"
import { FREE_PER_IP_DAY, FREE_PROMPTS, GLOBAL_DAILY_PROMPTS, isSecure, promptsUsed, readUsage, usageCookie } from "@/lib/server/quota"
import { DAY, hashIp, incr, today } from "@/lib/server/store"
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

  const gw = userGateway(req) // the visitor's own key, if they added one
  const live = gw ? true : isLive()
  const isLesson = body.mode === "lesson"

  if (!live) {
    return sampleStream(isLesson ? SAMPLE_LESSON : SAMPLE_FOLLOWUP)
  }

  // Free tier: the server's key is shared, so spending is capped per visitor.
  // Visitors who bring their own key pay for themselves and skip these checks.
  let setCookie: string | null = null
  if (!gw) {
    const ip = clientIp(req)
    const burst = rateLimit(`lesson:${ip}`, 30, 10 * 60_000)
    const day = rateLimit(`lesson-day:${ip}`, 48, 24 * 60 * 60_000)
    if (!burst.ok || !day.ok) {
      const wait = Math.max(burst.retryAfter, day.retryAfter)
      return Response.json(
        { error: `You've asked a lot in a short time. Please try again in ${Math.ceil(wait / 60)} min, or add your own API key to keep going.`, code: "rate_limited" },
        { status: 429, headers: { "retry-after": String(wait) } }
      )
    }
    const usage = readUsage(req)
    if (promptsUsed(usage) >= FREE_PROMPTS) {
      return Response.json(
        { error: `You've used all ${FREE_PROMPTS} free prompts for today. Add your own AI Gateway key to keep learning, or come back tomorrow.`, code: "quota_exceeded" },
        { status: 402 }
      )
    }

    // Beyond the cookie: a per-IP daily cap (clearing cookies or going incognito doesn't reset it)
    // and a global daily budget so a spike can never run up an unbounded bill.
    const ipCount = await incr(`chalk:ip:${hashIp(ip)}:${today()}`, DAY)
    if (ipCount > FREE_PER_IP_DAY) {
      return Response.json(
        { error: "Free prompts for your network are used up for today. Add your own AI Gateway key to keep going, or come back tomorrow.", code: "quota_exceeded", kind: "ip" },
        { status: 402 }
      )
    }
    const globalCount = await incr(`chalk:global:${today()}`, DAY)
    if (globalCount > GLOBAL_DAILY_PROMPTS) {
      return Response.json(
        { error: "The free demo has reached its daily capacity. Add your own AI Gateway key to keep going, or come back tomorrow.", code: "quota_exceeded", kind: "capacity" },
        { status: 402 }
      )
    }
    usage[isLesson ? "lessons" : "followups"] += 1
    setCookie = usageCookie(usage, isSecure(req))
  }

  const userText = isLesson ? lessonUserPrompt(body) : followupUserPrompt(body)
  const media = (body.attachments ?? []).filter((a) => a.kind !== "text")
  const result = streamText({
    model: gw ? gw(LESSON_MODEL) : LESSON_MODEL,
    reasoning: LESSON_REASONING,
    providerOptions: {
      ...(LESSON_PROVIDERS ? { gateway: { only: LESSON_PROVIDERS } } : {}),
      // Our board schema has optional fields, which OpenAI's strict mode rejects.
      openai: { strictJsonSchema: false },
    },
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
        controller.enqueue(encoder.encode(`${ERROR_MARK}${friendlyError(err, !!gw)}`))
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
      ...(setCookie ? { "set-cookie": setCookie } : {}),
    },
  })
}

function friendlyError(err: unknown, ownKey: boolean) {
  const msg = err instanceof Error ? err.message : String(err)
  if (/api key|unauthori[sz]ed|401|403|authentication/i.test(msg))
    return ownKey
      ? "The AI Gateway rejected your API key. Check it in Settings → Use your own key."
      : "The AI service rejected our credentials. Check AI_GATEWAY_API_KEY."
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
