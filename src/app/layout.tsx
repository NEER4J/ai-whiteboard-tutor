import type { Metadata, Viewport } from "next"
import { Caveat, Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AUTHOR, PORTFOLIO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site"
import "./globals.css"

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const hand = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "600"] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI tutor",
    "whiteboard",
    "learn anything",
    "interactive lesson",
    "AI teacher",
    "voice narration",
    "explainer",
    "study tool",
    "Vercel AI Gateway",
    "Next.js",
  ],
  authors: [{ name: AUTHOR, url: PORTFOLIO_URL }],
  creator: AUTHOR,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Chalk, an AI whiteboard tutor that teaches any topic with voice and drawings" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og"],
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon" },
  robots: { index: true, follow: true },
  category: "education",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${hand.variable} h-full antialiased`}>
      <body className="h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delay={300}>
            {children}
            <Toaster position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
