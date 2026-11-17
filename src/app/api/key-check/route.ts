import { generateText } from "ai"
import { LESSON_MODEL, clientIp } from "@/lib/server/config"
import { userGateway } from "@/lib/server/gateway"
import { rateLimit } from "@/lib/server/rate-limit"

export const maxDuration = 30

/** Verifies a visitor's own AI Gateway key with a one-word request on their account. */
export async function POST(req: Request) {
  const gw = userGateway(req)
  if (!gw) return Response.json({ ok: false, error: "That doesn't look like an AI Gateway key." }, { status: 400 })
  if (!rateLimit(`keycheck:${clientIp(req)}`, 10, 10 * 60_000).ok) {
    return Response.json({ ok: false, error: "Too many attempts. Try again in a few minutes." }, { status: 429 })
  }
  try {
    await generateText({ model: gw(LESSON_MODEL), prompt: "Reply with the single word: ok", maxOutputTokens: 8, reasoning: "none" })
    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    const rejected = /api key|unauthori[sz]ed|401|403|authentication|invalid/i.test(msg)
    return Response.json(
      { ok: false, error: rejected ? "The AI Gateway rejected this key." : "Couldn't verify the key right now. Check it has credits and try again." },
      { status: rejected ? 401 : 502 }
    )
  }
}
