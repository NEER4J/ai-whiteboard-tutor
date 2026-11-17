import "server-only"

/** Text model used for lessons and follow-ups (any Vercel AI Gateway model id). */
export const LESSON_MODEL = process.env.LESSON_MODEL || "anthropic/claude-haiku-5.5"
/**
 * Reasoning effort for the lesson model. "none" turns thinking off so lessons
 * start streaming as fast as possible (the lesson format is structured and the
 * prompt already carries the layout rules).
 */
const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const
const effort = process.env.LESSON_REASONING as (typeof EFFORTS)[number] | undefined
export const LESSON_REASONING: (typeof EFFORTS)[number] = effort && EFFORTS.includes(effort) ? effort : "none"
/** Speech model used for narration (any Vercel AI Gateway speech model id). */
export const TTS_MODEL = process.env.TTS_MODEL || "openai/tts-1"
export const TTS_VOICE = process.env.TTS_VOICE || "nova"

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
