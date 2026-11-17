/**
 * A very faint whiteboard backdrop: dot grid plus scattered marker doodles
 * (formulas, arrows, a bulb, a wave, stars). Decorative only; it fades out
 * toward the centre so the prompt stays clean.
 */
export function BoardDoodles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden text-foreground opacity-[0.07] dark:opacity-[0.09] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_50%,transparent_35%,black_85%)]"
    >
      <div className="absolute inset-0 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* triangle with right angle */}
        <g transform="translate(70 90) rotate(-8)">
          <path d="M0 110 L0 0 L150 110 Z" />
          <path d="M0 90 L20 90 L20 110" />
          <text x="-34" y="62" className="font-hand" fill="currentColor" stroke="none" fontSize="30">a</text>
          <text x="60" y="140" className="font-hand" fill="currentColor" stroke="none" fontSize="30">b</text>
          <text x="86" y="46" className="font-hand" fill="currentColor" stroke="none" fontSize="30">c</text>
        </g>
        {/* formulas */}
        <text x="290" y="70" className="font-hand" fill="currentColor" stroke="none" fontSize="40" transform="rotate(-4 290 70)">E = mc²</text>
        <text x="880" y="96" className="font-hand" fill="currentColor" stroke="none" fontSize="38" transform="rotate(5 880 96)">a² + b² = c²</text>
        <text x="90" y="520" className="font-hand" fill="currentColor" stroke="none" fontSize="44" transform="rotate(-6 90 520)">∑ n = ?</text>
        <text x="930" y="690" className="font-hand" fill="currentColor" stroke="none" fontSize="36" transform="rotate(-3 930 690)">f(x) = 2x + 1</text>
        {/* sine wave with axes */}
        <g transform="translate(950 250)">
          <path d="M0 60 H190 M0 0 V120" />
          <path d="M0 60 C25 -10 45 -10 62 60 S100 130 125 60 S160 -10 190 60" />
        </g>
        {/* light bulb */}
        <g transform="translate(1060 480) rotate(8)">
          <path d="M30 60 C-6 30 14 -10 40 -10 C66 -10 86 30 50 60 V82 H30 Z" />
          <path d="M30 96 H50 M34 108 H46" />
          <path d="M40 -34 V-22 M8 -22 L16 -12 M72 -22 L64 -12" />
        </g>
        {/* arrows */}
        <path d="M230 620 C300 560 360 600 420 660" />
        <path d="M398 664 L424 664 L416 640" transform="translate(0 -4)" />
        <path d="M760 90 C700 120 690 170 720 210" />
        <path d="M708 190 L722 214 L744 198" />
        {/* circled idea + underline */}
        <ellipse cx="205" cy="365" rx="62" ry="32" transform="rotate(-6 205 365)" />
        <text x="162" y="375" className="font-hand" fill="currentColor" stroke="none" fontSize="30">idea!</text>
        <path d="M820 640 C860 650 900 632 940 644" />
        {/* stars and sparkles */}
        <path d="M600 40 l6 14 l15 2 l-11 10 l3 15 l-13 -8 l-13 8 l3 -15 l-11 -10 l15 -2 z" />
        <path d="M1110 380 l5 11 l12 2 l-9 8 l2 12 l-10 -6 l-10 6 l2 -12 l-9 -8 l12 -2 z" />
        <path d="M520 700 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z" />
        {/* sticky note */}
        <g transform="translate(1000 600) rotate(5)">
          <path d="M0 0 H130 V110 L100 140 H0 Z" />
          <path d="M100 140 V110 H130" />
          <text x="16" y="44" className="font-hand" fill="currentColor" stroke="none" fontSize="28">remember:</text>
          <text x="16" y="82" className="font-hand" fill="currentColor" stroke="none" fontSize="28">ask why?</text>
        </g>
        {/* little checklist note */}
        <g transform="translate(40 640) rotate(-4)">
          <rect x="0" y="0" width="150" height="104" rx="8" />
          <path d="M16 30 l8 8 l14 -16 M16 62 l8 8 l14 -16" />
          <path d="M52 32 H130 M52 64 H112" />
        </g>
      </svg>
    </div>
  )
}
