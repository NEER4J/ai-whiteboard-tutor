/** Shared site facts: used by metadata, sitemap, docs and the sidebar. */
export const SITE_NAME = "Chalk"
export const SITE_TAGLINE = "AI whiteboard tutor"
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`
export const SITE_DESCRIPTION =
  "Learn any topic in two minutes. Chalk is an AI tutor that talks you through it while drawing on a whiteboard, then answers your follow-up questions and quizzes you."

export const GITHUB_URL = "https://github.com/NEER4J/ai-whiteboard-tutor"
export const README_URL = `${GITHUB_URL}#readme`
export const PORTFOLIO_URL = "https://www.itsneeraj.com/"
export const AUTHOR = "Neeraj"

/**
 * Public origin for absolute URLs in metadata. Resolved at build time in next.config.ts
 * (NEXT_PUBLIC_SITE_URL, else the Vercel production URL, else localhost).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

/** Open Graph defaults. Next replaces (does not merge) nested metadata objects, so pages that set `openGraph` spread this. */
export const OG_IMAGE = { url: "/og", width: 1200, height: 630, alt: "Chalk, an AI whiteboard tutor that teaches any topic with voice and drawings" }
export const OG_BASE = {
  type: "website" as const,
  siteName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  locale: "en_US",
  images: [OG_IMAGE],
}
