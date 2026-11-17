import * as React from "react"

/**
 * Tiny, safe renderer for the short replies the tutor writes (bold, italic,
 * inline code, paragraphs). No HTML is ever injected.
 */
export function MarkdownLite({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className="[&+p]:mt-2">
            {inline(para)}
          </p>
        ))}
    </>
  )
}

function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\n)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const tok = m[0]
    if (tok === "\n") out.push(<br key={k++} />)
    else if (tok.startsWith("**")) out.push(<strong key={k++} className="font-semibold">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith("`")) out.push(<code key={k++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>)
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}
