import { ImageResponse } from "next/og"
import { SITE_NAME } from "@/lib/site"

const size = { width: 1200, height: 630 }

const ink = "#171717"
const dim = "#6b7280"

/** Social preview card: headline on the left, a mini whiteboard on the right. */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fafafa",
          backgroundImage: "radial-gradient(rgba(23,23,23,0.10) 2px, transparent 2px)",
          backgroundSize: "36px 36px",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* left: copy */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 24 24">
              <rect width="24" height="24" rx="7" fill={ink} />
              <path d="M6.5 15.5c2-4.5 4-6.5 5.5-6.5s1 3-0.5 5 1 2.5 2.5 1 2.5-3 3.5-3.5" fill="none" stroke="#fafafa" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 44, fontWeight: 700, color: ink }}>{SITE_NAME}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: ink, letterSpacing: -2 }}>Learn anything in two minutes.</div>
            <div style={{ fontSize: 30, lineHeight: 1.35, color: dim }}>An AI tutor that talks you through it while drawing on a whiteboard.</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {[
              ["Voice narration", "#dbeafe", "#1d4ed8"],
              ["Live whiteboard", "#ede9fe", "#6d28d9"],
              ["Quizzes", "#d1fae5", "#047857"],
            ].map(([label, bg, fg]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 22px", borderRadius: 999, background: bg, color: fg, fontSize: 24, fontWeight: 600, whiteSpace: "nowrap" }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* right: mini whiteboard */}
        <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", paddingLeft: 40 }}>
          <div
            style={{
              display: "flex",
              width: 470,
              height: 400,
              borderRadius: 36,
              background: "#ffffff",
              border: "2px solid #e5e5e5",
              transform: "rotate(2.5deg)",
              position: "relative",
            }}
          >
            <svg width="470" height="400" viewBox="0 0 470 400" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              {/* sun */}
              <circle cx="95" cy="110" r="34" stroke="#f59e0b" fill="#fef3c7" />
              <path d="M95 50V64M95 156V170M35 110H49M141 110H155M52 67L62 77M128 143L138 153M138 67L128 77M62 143L52 153" stroke="#f59e0b" />
              {/* arrow */}
              <path d="M150 118C210 112 250 128 292 168" stroke="#2563eb" />
              <path d="M270 168L294 170L288 146" stroke="#2563eb" />
              {/* box */}
              <rect x="290" y="150" width="140" height="84" rx="10" fill="#ede9fe" stroke="#7c3aed" />
              <path d="M312 192H408M312 212H378" stroke="#7c3aed" strokeWidth="4" />
              {/* wave */}
              <path d="M50 270C80 220 110 220 140 270S200 320 230 270 290 220 320 270 380 320 420 266" stroke="#dc2626" />
              {/* note */}
              <path d="M300 336H420V380H300Z" fill="#fef9c3" stroke="#ca8a04" strokeWidth="3" />
              <path d="M316 354H400M316 368H372" stroke="#ca8a04" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } }
  )
}
