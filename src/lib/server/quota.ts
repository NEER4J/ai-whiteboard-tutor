import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Free-tier allowance, enforced on the server.
 *
 * Usage is kept in a signed, HttpOnly cookie ("l.f.t.signature"), so a visitor
 * can't edit their own count, only discard the cookie. A per-IP daily cap in
 * rate-limit.ts backs that up. For a hard guarantee you would store the counts
 * in a shared database (e.g. Vercel KV / Upstash) keyed by user or IP.
 */

/** One shared budget: every request to the AI (a lesson, a follow-up, a quiz answer, a hint) costs one prompt. */
export const FREE_PROMPTS = Number(process.env.FREE_PROMPTS) || 16

export type Usage = { lessons: number; followups: number; tts: number }

const COOKIE = "chalk_usage"
const MAX_AGE = 60 * 60 * 24 * 30

function secret() {
  return process.env.USAGE_SECRET || process.env.AI_GATEWAY_API_KEY || "chalk-dev-secret"
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 22)
}

export function readUsage(req: Request): Usage {
  const empty: Usage = { lessons: 0, followups: 0, tts: 0 }
  const raw = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!raw) return empty
  const [l, f, t, sig] = raw.split(".")
  if (!sig) return empty
  const payload = `${l}.${f}.${t}`
  const good = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (good.length !== given.length || !timingSafeEqual(good, given)) return empty
  const n = (v: string) => (Number.isInteger(+v) && +v >= 0 && +v < 100_000 ? +v : 0)
  return { lessons: n(l), followups: n(f), tts: n(t) }
}

export function usageCookie(u: Usage, secure: boolean) {
  const payload = `${u.lessons}.${u.followups}.${u.tts}`
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
}

export const isSecure = (req: Request) =>
  req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:"

export const promptsUsed = (u: Usage) => u.lessons + u.followups

/** How many narration clips a visitor may fetch: enough for the prompts they've used, plus slack. */
export const ttsAllowance = (u: Usage) => u.lessons * 14 + u.followups * 5 + 4

export function quotaSummary(u: Usage) {
  return { prompts: { used: promptsUsed(u), limit: FREE_PROMPTS } }
}
