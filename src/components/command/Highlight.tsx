/** Resalta rangos de coincidencia dentro de un texto */
export function Highlight({ text, marks }: { text: string; marks: [number, number][] }) {
  if (!marks.length) return <>{text}</>
  const out: React.ReactNode[] = []
  let cursor = 0
  marks.forEach(([s, e], i) => {
    if (s < cursor) return
    if (s > cursor) out.push(text.slice(cursor, s))
    out.push(
      <mark key={i} className="rounded-sm bg-blue-500/25 px-0.5 text-blue-100">
        {text.slice(s, e)}
      </mark>,
    )
    cursor = e
  })
  out.push(text.slice(cursor))
  return <>{out}</>
}
