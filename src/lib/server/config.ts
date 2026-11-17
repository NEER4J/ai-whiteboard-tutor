import "server-only"

/** Text model used for lessons and follow-ups (any Vercel AI Gateway model id). */
export const LESSON_MODEL = process.env.LESSON_MODEL || "openai/gpt-6-luna"
/**
 * Gateway provider to route the lesson model through (the gateway's "only" option). Defaults to
 * the model's own maker; set LESSON_PROVIDER to another gateway provider slug, or "any" for no pin.
 */
const provider = process.env.LESSON_PROVIDER || (LESSON_MODEL.split("/")[0] ?? "")
export const LESSON_PROVIDERS: string[] | undefined = provider === "any" || !provider ? undefined : [provider]
/**
 * Reasoning effort for the lesson model. "medium" gives steadier, fuller lessons; "none" turns thinking off
 * so they start streaming sooner (about 10s faster).
 */
const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const
const effort = process.env.LESSON_REASONING as (typeof EFFORTS)[number] | undefined
export const LESSON_REASONING: (typeof EFFORTS)[number] = effort && EFFORTS.includes(effort) ? effort : "medium"
/**
 * Speech model used for narration (any Vercel AI Gateway speech model id).
 * Default: Gemini 3.8 Flash-Lite TTS, roughly 35% cheaper per lesson than
 * openai/tts-1 (see README "Cost").
 */
export const TTS_MODEL = process.env.TTS_MODEL || "google/gemini-3.8-flash-lite-tts"
/** Voice name; each provider has its own list. Unset for providers that pick a default. */
export const TTS_VOICE: string | undefined =
  process.env.TTS_VOICE ||
  (TTS_MODEL.startsWith("google/") ? "Kore" : TTS_MODEL.startsWith("openai/") ? "nova" : undefined)

/**
 * Live AI is on when the gateway can authenticate: an AI_GATEWAY_API_KEY, or
 * Vercel's OIDC token when deployed on Vercel. MOCK_AI=1 forces the sample mode.
 */
export function isLive() {
  if (process.env.MOCK_AI === "1") return false
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1"
  )
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  )
}
