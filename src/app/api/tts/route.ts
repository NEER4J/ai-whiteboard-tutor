import { gateway, generateSpeech } from "ai"
import { z } from "zod"
import { TTS_MODEL, TTS_VOICE, clientIp, isLive } from "@/lib/server/config"
import { userGateway } from "@/lib/server/gateway"
import { isSecure, readUsage, ttsAllowance, usageCookie } from "@/lib/server/quota"
import { rateLimit } from "@/lib/server/rate-limit"

export const maxDuration = 60

const bodySchema = z.object({ text: z.string().trim().min(1).max(1200) })

/** Narration audio for one lesson segment (mp3). */
export async function POST(req: Request) {
  const gw = userGateway(req)
  if (!gw && !isLive()) {
    // The client falls back to the browser's built-in speech voice.
    return Response.json({ error: "Voice generation is unavailable in sample mode." }, { status: 503 })
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Invalid narration text." }, { status: 400 })

  let setCookie: string | null = null
  if (!gw) {
    const limit = rateLimit(`tts:${clientIp(req)}`, 250, 10 * 60_000)
    if (!limit.ok) return Response.json({ error: "Too many voice requests." }, { status: 429 })
    // Narration is only free for lessons the visitor actually started.
    const usage = readUsage(req)
    if (usage.tts >= ttsAllowance(usage)) {
      return Response.json({ error: "Free voice allowance used.", code: "quota_exceeded" }, { status: 402 })
    }
    usage.tts += 1
    setCookie = usageCookie(usage, isSecure(req))
  }

  try {
    const { audio } = await generateSpeech({
      model: (gw ?? gateway).speech(TTS_MODEL),
      text: parsed.data.text,
      ...(TTS_VOICE ? { voice: TTS_VOICE } : {}),
      // Only OpenAI honours mp3; other providers return their native browser-playable format.
      ...(TTS_MODEL.startsWith("openai/") ? { outputFormat: "mp3" } : {}),
      abortSignal: req.signal,
    })
    return new Response(audio.uint8Array as Uint8Array<ArrayBuffer>, {
      headers: {
        "content-type": audio.mediaType || "audio/mpeg",
        "cache-control": "private, max-age=3600",
        ...(setCookie ? { "set-cookie": setCookie } : {}),
      },
    })
  } catch (err) {
    console.error("[tts] failed", err)
    return Response.json({ error: "Voice generation failed." }, { status: 502 })
  }
}
