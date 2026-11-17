import { connection } from "next/server"
import { LESSON_MODEL, TTS_MODEL, clientIp, isLive } from "@/lib/server/config"
import { FREE_PER_IP_DAY, GLOBAL_DAILY_PROMPTS, FREE_PROMPTS, promptsUsed, readUsage } from "@/lib/server/quota"
import { hashIp, peek, sharedStoreConfigured, today } from "@/lib/server/store"

/** Tells the UI whether lessons are live or sample, and how much free allowance is left. */
export async function GET(req: Request) {
  await connection() // evaluate per request: depends on runtime env vars and cookies
  const live = isLive()
  let quota = null
  if (live) {
    // What is left is whichever limit is tightest: this browser, this network (IP), or the whole demo.
    const ip = clientIp(req)
    const [ipUsed, globalUsed] = await Promise.all([peek(`chalk:ip:${hashIp(ip)}:${today()}`), peek(`chalk:global:${today()}`)])
    const browser = promptsUsed(readUsage(req))
    const left = Math.max(0, Math.min(FREE_PROMPTS - browser, FREE_PER_IP_DAY - ipUsed, GLOBAL_DAILY_PROMPTS - globalUsed))
    quota = { prompts: { used: FREE_PROMPTS - left, limit: FREE_PROMPTS }, network: ipUsed > browser }
  }
  return Response.json({
    mode: live ? "live" : "sample",
    model: live ? LESSON_MODEL : null,
    voice: live ? TTS_MODEL : null,
    quota,
    // true when per-IP / global limits are counted in shared Redis (not just per server instance)
    sharedLimits: sharedStoreConfigured,
  })
}
