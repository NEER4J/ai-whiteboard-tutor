/**
 * Cheap, instant check that runs in the browser BEFORE a lesson is requested, so
 * greetings, thanks and gibberish never start a full generation. The lesson
 * model has the same rule as a safety net for anything subtler.
 */

const SMALL_TALK =
  /^(hi+|hii+|hey+|heya|hello+|hiya|yo+|sup|howdy|hola|namaste|good\s*(morning|afternoon|evening|night)|thanks?(\s*(you|u|a lot))?|thank\s*you|thx|ty|ok(ay)?|k|cool|nice|great|awesome|fine|yes|no|yep|nope|sure|hmm+|huh|lol|haha+|bye|goodbye|test(ing)?|testing\s*\d*|hello\s*there|hi\s*there|hey\s*there|anyone\s*there)[\s!.?,]*$/i

const ABOUT_ME = /^(who|what)\s+are\s+you\b|\bhow\s+are\s+you\b|\byour\s+name\b|\bwho\s+made\s+you\b|\bwhat\s+can\s+you\s+do\b/i

export type Intent = { ok: true } | { ok: false; reply: string }

export const SUGGESTIONS = ["Why is the sky blue?", "How does a neural network learn?", "How do vaccines work?", "What is compound interest?"]

export function checkTopic(raw: string): Intent {
  const t = raw.trim()
  const letters = t.replace(/[^\p{L}]/gu, "")

  if (SMALL_TALK.test(t)) {
    const thanks = /^(thanks?|thank|thx|ty)/i.test(t)
    return {
      ok: false,
      reply: thanks
        ? "You're welcome! 😊 What would you like to learn next? Type any topic and I'll teach it on the whiteboard."
        : "Hi! 👋 I'm Chalk, a tutor who explains things out loud while drawing on a whiteboard. What would you like to understand? Type any topic, or try one of these:",
    }
  }
  if (ABOUT_ME.test(t)) {
    return {
      ok: false,
      reply:
        "I'm Chalk, an AI tutor. Give me a topic and I'll teach it in about two minutes with narration and a whiteboard, then answer your follow-up questions. What shall we explore?",
    }
  }
  // Too little to teach from: single characters, punctuation, keyboard mashing.
  const words = t.split(/\s+/).filter(Boolean)
  const mashing = letters.length >= 3 && words.length === 1 && (!/[aeiouyAEIOUY]/.test(letters) || /(.)\1{3,}/u.test(letters))
  if (letters.length < 3 || mashing) {
    return {
      ok: false,
      reply: "I couldn't tell what you'd like to learn. Type a topic or a question, like one of these:",
    }
  }
  return { ok: true }
}
