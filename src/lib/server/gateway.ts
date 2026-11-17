import "server-only"
import { createGateway } from "ai"

/** Header carrying a visitor's own AI Gateway key (bring-your-own-key). */
export const KEY_HEADER = "x-chalk-key"

/** A plausible AI Gateway key: no spaces, sane length. Never logged or stored. */
export function userKey(req: Request): string | null {
  const k = req.headers.get(KEY_HEADER)?.trim()
  return k && /^[A-Za-z0-9._\-]{16,300}$/.test(k) ? k : null
}

/** Gateway client authenticated with the visitor's key, or null to use the server's own. */
export function userGateway(req: Request) {
  const key = userKey(req)
  return key ? createGateway({ apiKey: key }) : null
}
