/**
 * A very faint whiteboard backdrop: a few marker doodles tucked into the four
 * corners (triangle, bulb, checklist, sticky note) over a dot grid. Decorative
 * only; it fades out toward the centre so the prompt stays clean.
 */
export function BoardDoodles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,transparent_55%,black_100%)]"
    >
      <div className="absolute inset-0 text-foreground opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.09]" />
      <svg className="absolute inset-0 size-full opacity-[0.22] dark:opacity-[0.28]" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* triangle with right angle */}
        <g transform="translate(70 90) rotate(-8)" className="text-sky-300">
          <path d="M0 110 L0 0 L150 110 Z" />
          <path d="M0 90 L20 90 L20 110" />
          <text x="-34" y="62" className="font-hand" fill="currentColor" stroke="none" fontSize="30">a</text>
          <text x="60" y="140" className="font-hand" fill="currentColor" stroke="none" fontSize="30">b</text>
          <text x="86" y="46" className="font-hand" fill="currentColor" stroke="none" fontSize="30">c</text>
        </g>
        {/* light bulb, top right */}
        <g transform="translate(1040 90) rotate(8)" className="text-amber-300">
          <path d="M30 60 C-6 30 14 -10 40 -10 C66 -10 86 30 50 60 V82 H30 Z" />
          <path d="M30 96 H50 M34 108 H46" />
          <path d="M40 -34 V-22 M8 -22 L16 -12 M72 -22 L64 -12" />
        </g>
        {/* sticky note */}
        <g transform="translate(1000 600) rotate(5)" className="text-violet-300">
          <path d="M0 0 H130 V110 L100 140 H0 Z" />
          <path d="M100 140 V110 H130" />
          <text x="16" y="44" className="font-hand" fill="currentColor" stroke="none" fontSize="28">remember:</text>
          <text x="16" y="82" className="font-hand" fill="currentColor" stroke="none" fontSize="28">ask why?</text>
        </g>
        {/* little checklist note */}
        <g transform="translate(40 640) rotate(-4)" className="text-emerald-300">
          <rect x="0" y="0" width="150" height="104" rx="8" />
          <path d="M16 30 l8 8 l14 -16 M16 62 l8 8 l14 -16" />
          <path d="M52 32 H130 M52 64 H112" />
        </g>
      </svg>
    </div>
  )
}
