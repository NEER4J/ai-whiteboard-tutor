import { connection } from "next/server"
import { LESSON_MODEL, TTS_MODEL, isLive } from "@/lib/server/config"
import { quotaSummary, readUsage } from "@/lib/server/quota"
import { sharedStoreConfigured } from "@/lib/server/store"

/** Tells the UI whether lessons are live or sample, and how much free allowance is left. */
export async function GET(req: Request) {
  await connection() // evaluate per request: depends on runtime env vars and cookies
  const live = isLive()
  return Response.json({
    mode: live ? "live" : "sample",
    model: live ? LESSON_MODEL : null,
    voice: live ? TTS_MODEL : null,
    quota: live ? quotaSummary(readUsage(req)) : null,
    // true when per-IP / global limits are counted in shared Redis (not just per server instance)
    sharedLimits: sharedStoreConfigured,
  })
}
