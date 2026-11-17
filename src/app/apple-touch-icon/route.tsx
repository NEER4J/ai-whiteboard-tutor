import { ImageResponse } from "next/og"

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#171717" }}>
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path d="M3.5 17.5c2.4-5.6 4.8-8 6.9-8s1.2 3.6-.6 6 1.2 3 3 1.2 3-3.6 4.2-4.2" fill="none" stroke="#fafafa" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: 180, height: 180, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } }
  )
}
