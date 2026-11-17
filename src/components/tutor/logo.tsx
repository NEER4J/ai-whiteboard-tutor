export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="7" className="fill-primary" />
      <path
        d="M6.5 15.5c2-4.5 4-6.5 5.5-6.5s1 3-0.5 5 1 2.5 2.5 1 2.5-3 3.5-3.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}

/** Just the Chalk squiggle, no background tile. Inherits the text colour. */
export function LogoMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="4 6 16 12" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 15.5c2-4.5 4-6.5 5.5-6.5s1 3-0.5 5 1 2.5 2.5 1 2.5-3 3.5-3.5" />
    </svg>
  )
}
