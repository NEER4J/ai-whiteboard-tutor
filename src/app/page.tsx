import type { Metadata } from "next"
import { TutorApp } from "@/components/tutor/tutor-app"
import { AUTHOR, GITHUB_URL, OG_BASE, PORTFOLIO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OG_BASE, url: "/" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: AUTHOR, url: PORTFOLIO_URL },
  sameAs: [GITHUB_URL],
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TutorApp />
    </>
  )
}
