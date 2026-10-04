import { ARTICLES } from '@/data/normativa'
import type { Article } from '@/data/types'
import { normalize } from './utils'

export interface ArticleHit {
  article: Article
  score: number
  snippet: string
  /** rangos [inicio, fin) a resaltar dentro del snippet */
  marks: [number, number][]
}

/** Búsqueda de normativa: todas las palabras deben aparecer; puntúa título > tags > cuerpo */
export function searchArticles(query: string, limit = 8): ArticleHit[] {
  const q = normalize(query.trim())
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)
  const stems = terms.map((t) => (t.length > 5 ? t.slice(0, t.length - 2) : t)) // "pinchar" → "pinch", "ruedas" → "rued"
  const hits: ArticleHit[] = []

  for (const a of ARTICLES) {
    const title = normalize(a.title)
    const tags = normalize(a.tags.join(' '))
    const body = a.body.map(normalize)
    const idMatch = normalize('art ' + a.id + ' ' + a.id).includes(q)
    let score = idMatch ? 100 : 0
    let ok = true
    for (const s of stems) {
      const inT = title.includes(s)
      const inTag = tags.includes(s)
      const inB = body.some((b) => b.includes(s))
      if (!inT && !inTag && !inB && !idMatch) {
        ok = false
        break
      }
      score += (inT ? 10 : 0) + (inTag ? 6 : 0) + (inB ? 2 : 0)
    }
    if (!ok) continue

    // Snippet: el párrafo con más coincidencias
    let best = 0
    let bestCount = -1
    body.forEach((b, i) => {
      const c = stems.filter((s) => b.includes(s)).length
      if (c > bestCount) {
        bestCount = c
        best = i
      }
    })
    const raw = a.body[best]
    const norm = body[best]
    const first = Math.min(...stems.map((s) => norm.indexOf(s)).filter((x) => x >= 0), Infinity)
    const start = first === Infinity ? 0 : Math.max(0, first - 40)
    const end = Math.min(raw.length, start + 150)
    const snippet = (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '')
    const off = start > 0 ? 1 : 0
    const marks: [number, number][] = []
    const normSnip = norm.slice(start, end)
    for (const s of stems) {
      let idx = normSnip.indexOf(s)
      while (idx >= 0) {
        // extiende hasta final de palabra
        let e = idx + s.length
        while (e < normSnip.length && /[a-z0-9]/.test(normSnip[e])) e++
        marks.push([idx + off, e + off])
        idx = normSnip.indexOf(s, e)
      }
    }
    hits.push({ article: a, score, snippet, marks: marks.sort((x, y) => x[0] - y[0]) })
  }
  return hits.sort((x, y) => y.score - x.score).slice(0, limit)
}
