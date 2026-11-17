import { generateText, tool } from "ai"
import { z } from "zod"
import { checkTopic } from "@/lib/intent"
import { LESSON_MODEL, LESSON_PROVIDERS, clientIp, isLive } from "@/lib/server/config"
import { userGateway } from "@/lib/server/gateway"
import { DAY, hashIp, incr, today } from "@/lib/server/store"

const CHAT_PER_IP_DAY = Number(process.env.CHAT_PER_IP_DAY) || 40
const GLOBAL_DAILY_CHAT = Number(process.env.GLOBAL_DAILY_CHAT) || 400

const bodySchema = z.object({
  message: z.string().trim().min(1).max(600),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1500) })).max(12).optional(),
})

const SYSTEM = `You are Chalk, a friendly AI tutor who explains things out loud while drawing on a whiteboard.
You are chatting with someone on the home screen. Talk naturally: answer greetings, questions about yourself, quick factual
questions and small requests directly, in 1-4 short sentences (light markdown is fine, an occasional emoji is fine).

You have one tool, create_lesson. Call it when the person wants to LEARN or UNDERSTAND something that benefits from a visual,
narrated whiteboard lesson: "teach me X", "explain X", "how does X work", "why does X happen", "what is X" for a concept, or when they
accept your offer to make a lesson. Pass a clear, self-contained topic (for example "How do vaccines train the immune system?"),
resolving words like "that" or "it" from the conversation. Do NOT call it for greetings, thanks, opinions, chit-chat, or simple
one-line factual questions; answer those in text, and when a topic would make a great lesson, offer to draw it.
When you call the tool, also write one short sentence first (e.g. "Great pick, let me draw that out.").
Never claim you made a lesson unless you called the tool. If something is harmful or off-limits, decline politely.`

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Please type a message." }, { status: 400 })
  const { message, level, history } = parsed.data

  const gw = userGateway(req)
  if (!isLive() && !gw) {
    // Sample mode (no AI key): fall back to treating the message as a topic.
    const verdict = checkTopic(message)
    return Response.json(verdict.ok ? { reply: "Let me put that on the whiteboard.", lessonTopic: message } : { reply: verdict.reply })
  }

  if (!gw) {
    const ip = clientIp(req)
    const [mine, all] = await Promise.all([incr(`chalk:chat:${hashIp(ip)}:${today()}`, DAY), incr(`chalk:chat:all:${today()}`, DAY)])
    if (mine > CHAT_PER_IP_DAY || all > GLOBAL_DAILY_CHAT) {
      return Response.json({ error: "You've chatted a lot today. Add your own AI Gateway key to keep going, or come back tomorrow.", code: "quota_exceeded" }, { status: 402 })
    }
  }

  try {
    const result = await generateText({
      model: gw ? gw(LESSON_MODEL) : LESSON_MODEL,
      reasoning: "none",
      providerOptions: {
        ...(LESSON_PROVIDERS ? { gateway: { only: LESSON_PROVIDERS } } : {}),
        openai: { strictJsonSchema: false },
      },
      system: `${SYSTEM}\nThe learner's level is ${level}.`,
      messages: [...(history ?? []).map((m) => ({ role: m.role, content: m.text })), { role: "user" as const, content: message }],
      tools: {
        create_lesson: tool({
          description: "Create a narrated whiteboard lesson (about two minutes) about a topic.",
          inputSchema: z.object({ topic: z.string().min(2).max(300).describe("The self-contained topic or question to teach") }),
        }),
      },
      maxOutputTokens: 500,
      abortSignal: req.signal,
    })
    const call = result.toolCalls?.find((c) => c.toolName === "create_lesson")
    const lessonTopic = call ? String((call.input as { topic?: string }).topic ?? "").trim() : ""
    const reply = result.text.trim() || (lessonTopic ? "Great pick, let me draw that out." : "Sorry, I didn't catch that. What would you like to learn?")
    return Response.json({ reply, ...(lessonTopic ? { lessonTopic } : {}) })
  } catch (err) {
    console.error("[chat] failed", err)
    return Response.json({ error: "Chalk couldn't reply just now. Please try again." }, { status: 500 })
  }
}
