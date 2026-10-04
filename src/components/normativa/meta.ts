/**
 * Utilidades compartidas del módulo de normativa (iconos por categoría,
 * fechas y resaltado de términos). Sin componentes: sólo datos/funciones.
 */
import { Car, Radio, Scale, Shield, Siren, UserLock, Users, type LucideIcon } from 'lucide-react'
import { ARTICLES } from '@/data/normativa'
import type { Article, NormativaCategory } from '@/data/types'
import { normalize } from '@/lib/utils'

export const CATEGORY_ICON: Record<NormativaCategory['icon'], LucideIcon> = {
  siren: Siren,
  shield: Shield,
  handcuffs: UserLock,
  radio: Radio,
  car: Car,
  scale: Scale,
  users: Users,
}

/** "2026-09-21" → Date local (evita el desfase UTC de `new Date(iso)`) */
export function parseDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

const dayFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
/** "2026-09-21" → "21 sept 2026" */
export const formatDay = (iso: string) => dayFmt.format(parseDay(iso)).replace(/\./g, '')

/** Fecha de la última revisión de toda la normativa */
export const LATEST_UPDATE = ARTICLES.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), '')

/** Coincidencia del filtro rápido: todas las palabras deben aparecer */
export function matchesArticle(a: Article, query: string) {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const hay = normalize(['art', a.id, a.title, a.summary, a.tags.join(' ')].join(' '))
  return terms.every((t) => hay.includes(t))
}

/**
 * Rangos [inicio, fin) de `text` que coinciden con `query`.
 * Misma heurística de raíces que `searchArticles`: "pinchar" → "pinch".
 * `normalize` conserva la longitud en texto precompuesto, así que los
 * índices del texto normalizado valen para el original.
 */
export function findMarks(text: string, query?: string): [number, number][] {
  if (!query) return []
  const stems = normalize(query.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => (t.length > 5 ? t.slice(0, t.length - 2) : t))
  if (!stems.length) return []
  const norm = normalize(text)
  if (norm.length !== text.length) return []
  const marks: [number, number][] = []
  for (const s of stems) {
    let idx = norm.indexOf(s)
    while (idx >= 0) {
      let e = idx + s.length
      while (e < norm.length && /[a-z0-9]/.test(norm[e])) e++
      marks.push([idx, e])
      idx = norm.indexOf(s, e)
    }
  }
  // ordena y fusiona solapes
  marks.sort((x, y) => x[0] - y[0])
  const merged: [number, number][] = []
  for (const m of marks) {
    const last = merged[merged.length - 1]
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1])
    else merged.push([m[0], m[1]])
  }
  return merged
}
