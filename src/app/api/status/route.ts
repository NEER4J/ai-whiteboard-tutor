import { connection } from "next/server"
import { LESSON_MODEL, TTS_MODEL, isLive } from "@/lib/server/config"

/** Tells the UI whether lessons are live-generated or pre-written samples. */
export async function GET() {
  await connection() // evaluate per request: depends on runtime env vars
  const live = isLive()
  return Response.json({
    mode: live ? "live" : "sample",
    model: live ? LESSON_MODEL : null,
    voice: live ? TTS_MODEL : null,
  })
}
