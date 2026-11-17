import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRightIcon, BookOpenIcon } from "lucide-react"
import { Logo } from "@/components/tutor/logo"
import { AUTHOR, GITHUB_URL, OG_BASE, PORTFOLIO_URL, README_URL, SITE_NAME } from "@/lib/site"

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How Chalk works: using the AI whiteboard tutor, keyboard shortcuts, free limits and bringing your own API key, the architecture, privacy, and how to run it yourself.",
  alternates: { canonical: "/docs" },
  openGraph: { ...OG_BASE, title: "Chalk documentation", description: "How to use, understand and run the Chalk AI whiteboard tutor.", url: "/docs" },
}

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "using-chalk", title: "Using Chalk" },
  { id: "shortcuts", title: "Keyboard shortcuts" },
  { id: "limits", title: "Free limits & your own key" },
  { id: "how-it-works", title: "How it works" },
  { id: "privacy", title: "Privacy" },
  { id: "run-it", title: "Run it yourself" },
  { id: "limitations", title: "Limitations" },
]

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"],
  ["← / →", "Back / forward 5 seconds"],
  ["R", "Restart the lesson"],
  ["C", "Show or hide captions"],
  ["Enter", "Send (Shift + Enter for a new line)"],
  ["Ctrl/⌘ + B", "Show or hide the sidebar"],
  ["Ctrl/⌘ + V", "Paste a screenshot or file into a prompt box to attach it"],
]

const STACK: [string, string][] = [
  ["Framework", "Next.js 16 (App Router), React 19, TypeScript"],
  ["UI", "shadcn/ui on Base UI, Tailwind CSS v4, AI Elements chat components"],
  ["AI", "Vercel AI SDK + AI Gateway: Claude Haiku 5.5 (medium thinking) for lessons, Gemini 3.8 Flash-Lite TTS for voice"],
  ["Whiteboard", "SVG + rough.js for the hand-drawn look, animated by stroke-dashoffset"],
  ["Storage", "Your browser's localStorage (lesson history, optional API key). No accounts, no database"],
]

const ENV: [string, string][] = [
  ["AI_GATEWAY_API_KEY", "Your Vercel AI Gateway key. Without it the app runs in sample mode."],
  ["LESSON_MODEL / LESSON_REASONING", "Lesson model id (default claude-haiku-5.5) and thinking effort (default medium)."],
  ["TTS_MODEL / TTS_VOICE", "Speech model and voice for narration."],
  ["FREE_PROMPTS / FREE_PER_IP_DAY", "Free prompts per visitor and per network each day, lessons and follow-ups together (default 10 each)."],
  ["USAGE_SECRET", "Signs the usage cookie. Set a long random string in production."],
  ["NEXT_PUBLIC_SITE_URL", "Your public URL, used for social preview and sitemap links."],
]

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 border-t pt-10 text-2xl font-semibold tracking-tight first:border-0 first:pt-0">
      {children}
    </h2>
  )
}

const P = ({ children }: { children: React.ReactNode }) => <p className="leading-relaxed text-muted-foreground">{children}</p>

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
)

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo className="size-7" /> {SITE_NAME}
        </Link>
        <span className="text-sm text-muted-foreground">/ Documentation</span>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            GitHub
          </a>
          <Link href="/" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">
            Open the app
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-4 py-10 sm:px-6">
        <aside className="sticky top-24 hidden h-fit w-52 shrink-0 lg:block">
          <p className="mb-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">On this page</p>
          <ul className="flex flex-col gap-0.5 border-l">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={README_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <BookOpenIcon className="size-4" /> README on GitHub <ArrowUpRightIcon className="size-3" />
          </a>
        </aside>

        <main className="flex min-w-0 max-w-3xl flex-1 flex-col gap-6 pb-24">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">Chalk documentation</h1>
            <p className="text-lg text-muted-foreground">
              Everything about the AI whiteboard tutor: how to use it, how it works under the hood, and how to run your own copy.
            </p>
          </div>

          <H2 id="overview">Overview</H2>
          <P>
            Chalk teaches any topic the way a good teacher does at a whiteboard. Type a topic and it generates a lesson of about two minutes:
            it <strong className="text-foreground">talks you through it out loud while drawing</strong> the diagram piece by piece, in sync
            with the narration. You can pause, scrub, jump between chapters, click a drawing to ask about it, and ask follow-up questions that
            are answered on the board, not just in text.
          </P>
          <P>
            It is built for curious self-learners: a student before an exam, or anyone who keeps hearing a term they don&apos;t really
            understand and wants the intuition quickly.
          </P>

          <H2 id="using-chalk">Using Chalk</H2>
          <ol className="flex flex-col gap-4">
            {[
              ["Pick a topic and a level", "Type any topic, or tap an example. The slider sets how deep the lesson goes: Beginner uses everyday words and analogies, Advanced uses precise terms and notation."],
              ["Optionally attach material", "Use the paperclip (or paste a screenshot) to attach notes, a PDF or an image, up to 3 files. The lesson is then taught from your material."],
              ["Watch it being built", "The lesson starts playing after the first part is ready while the rest is still being written. The chat shows live progress."],
              ["Control the lesson", "Play, pause, seek on the chapter timeline (hover for a preview), step 5 seconds, change speed, toggle captions, switch the narration voice. Use the chapter switcher in the header to jump around."],
              ["Ask and get quizzed", "Ask follow-ups in the chat or tap Explain it simpler, Give an example, or Quiz me. Type your quiz answer right under the question for feedback, or ask for a hint."],
              ["Point and draw", "Click any drawing to ask about it. Use the pen and highlighter to mark up the board."],
              ["Come back later", "Every lesson has its own URL and is saved in your sidebar. Search, reopen, or delete lessons any time."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-medium">{t}</h3>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ol>

          <H2 id="shortcuts">Keyboard shortcuts</H2>
          <div className="overflow-hidden rounded-2xl bg-muted/50">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-4 border-b border-background px-4 py-2.5 last:border-0">
                <kbd className="rounded-md bg-background px-2 py-0.5 font-mono text-xs">{k}</kbd>
                <span className="text-sm text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>

          <H2 id="limits">Free limits &amp; your own key</H2>
          <P>
            The hosted demo runs on a shared AI Gateway key, so every visitor gets <strong className="text-foreground">10 free prompts per day</strong>.
            Everything that asks the AI counts: a new lesson, a follow-up question, a quiz answer and a hint request. The sidebar shows how many
            are left today; the count resets at midnight UTC. When they run out, Chalk asks you to add your own key.
          </P>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>Open <strong className="text-foreground">Use your own key</strong> in the sidebar and paste a Vercel AI Gateway key. Get one at <a className="text-foreground underline underline-offset-4" href="https://vercel.com/ai-gateway" target="_blank" rel="noopener noreferrer">vercel.com/ai-gateway</a>.</li>
            <li>The key is verified with a one-word request, then kept <strong className="text-foreground">only in your browser</strong>. It is sent over HTTPS with each request so the server can call the gateway for you, and it is never stored or logged.</li>
            <li>With your own key there is no free-tier limit; usage is billed to your account. Remove the key any time.</li>
          </ul>
          <P>
            Limits are enforced on the server: 10 free prompts per day per browser (a signed cookie), 10 per day per IP address, and a hard cap of 50
            free prompts per day across all visitors. The IP and global counters live in Redis, so clearing cookies or opening a private window does not reset them. Everything resets at midnight UTC. If the daily cap for your network or for the whole demo is hit,
            Chalk says so and offers the same option: add your own key, or come back tomorrow.
          </P>

          <H2 id="how-it-works">How it works</H2>
          <P>
            <strong className="text-foreground">The lesson is data, not a video.</strong> The model returns a typed lesson: a list of segments,
            each with one to three spoken sentences and the whiteboard elements drawn while they&apos;re spoken (text, arrows, curves, shapes,
            graphs, bar charts, braces, sticky notes and 24 hand-drawn icons). Because it is structured, seeking, chapters, captions,
            click-to-ask and follow-up context all work directly on it, and every element is validated before it is drawn.
          </P>
          <P>
            <strong className="text-foreground">Voice and drawing stay in sync through cue phrases.</strong> Every element carries a short
            phrase quoted from its segment&apos;s narration. The client turns that phrase&apos;s position in the text into a time inside the
            segment&apos;s <em>measured</em> audio duration, and draws the element then. Audio is generated per segment, so any drift resets at
            the next segment.
          </P>
          <P>
            <strong className="text-foreground">The board is a pure function of time.</strong> Play, pause, seek and restart are just
            &ldquo;set the time, restart narration for that segment&rdquo;, which keeps the player small and seeking exact.
          </P>
          <P>
            <strong className="text-foreground">Streaming.</strong> The lesson JSON streams in and is parsed as it arrives, so playback starts
            after the first segment. Narration audio is prefetched a few segments ahead. If AI voice fails, the player falls back to your
            browser&apos;s built-in voice.
          </P>
          <div className="overflow-hidden rounded-2xl bg-muted/50">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-background px-4 py-3 last:border-0 sm:grid-cols-[8rem_1fr]">
                <span className="text-sm font-medium">{k}</span>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>

          <H2 id="privacy">Privacy</H2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>No accounts and no database. Your lessons and chat history are saved only in this browser, and narration audio is cached in your browser too, so replaying a lesson or reopening it never calls the AI again. Asking for a topic you already have reopens it for free.</li>
            <li>Your topics, questions and attached files are sent to the AI model to generate lessons, and are not stored by Chalk.</li>
            <li>If you add your own API key it stays in your browser (see above). The only cookie Chalk sets is a signed counter for the free allowance.</li>
          </ul>

          <H2 id="run-it">Run it yourself</H2>
          <pre className="overflow-x-auto rounded-2xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
{`git clone ${GITHUB_URL}.git
cd ai-whiteboard-tutor
npm install
cp .env.example .env.local   # add AI_GATEWAY_API_KEY for live AI
npm run dev                  # http://localhost:3000`}
          </pre>
          <P>Without a key the app runs in sample mode with a pre-written lesson, so you can try the interface with no credentials. Environment variables:</P>
          <div className="overflow-hidden rounded-2xl bg-muted/50">
            {ENV.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-background px-4 py-3 last:border-0 sm:grid-cols-[14rem_1fr]">
                <Code>{k}</Code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>

          <H2 id="limitations">Limitations</H2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>The model plans the layout, so labels can occasionally overlap on busy boards.</li>
            <li>Sync is proportional within a segment: good to a word or two with AI voice, estimated with the browser voice.</li>
            <li>Lessons live in one browser; there is no cross-device sync or sharing yet.</li>
            <li>English only for now. No math typesetting; formulas are handwritten text.</li>
          </ul>

          <footer className="mt-6 flex flex-col gap-3 border-t pt-8 text-sm text-muted-foreground">
            <p>
              MIT licensed. Created by{" "}
              <a className="font-medium text-foreground underline underline-offset-4" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
                {AUTHOR}
              </a>
              . <a className="underline underline-offset-4 hover:text-foreground" href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">Read the license</a>.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
