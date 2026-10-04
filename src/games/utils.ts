import { FEEDBACK_COLOR, type FeedbackTone } from '@/lib/animations'

export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** n índices distintos en [0, total) */
export const pickDistinct = (total: number, n: number) => shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, n)

/** Tono semántico de una fracción 0..1 */
export type Verdict3 = Extract<FeedbackTone, 'success' | 'warning' | 'error'>

export const toneOf = (ratio: number): Verdict3 => (ratio >= 0.999 ? 'success' : ratio >= 0.5 ? 'warning' : 'error')

/** Tono de una puntuación 0..100 */
export const scoreTone = (score: number): Verdict3 => (score >= 70 ? 'success' : score >= 45 ? 'warning' : 'error')

export const rgb = (tone: FeedbackTone, alpha = 1) => `rgb(${FEEDBACK_COLOR[tone]} / ${alpha})`

/** Estilo de celda/elemento evaluado (borde + fondo + glow) */
export const feedbackStyle = (tone: FeedbackTone): React.CSSProperties => ({
  borderColor: rgb(tone, 0.7),
  background: rgb(tone, 0.14),
  boxShadow: `0 0 22px -6px ${rgb(tone, 0.7)}, inset 0 0 0 1px ${rgb(tone, 0.25)}`,
  color: rgb(tone),
})

/**
 * Navegación con flechas en una retícula de botones con `data-idx`.
 * Se adjunta al contenedor (onKeyDown).
 */
export function handleGridKeys(e: React.KeyboardEvent<HTMLElement>, cols: number) {
  const target = e.target as HTMLElement
  const raw = target.dataset.idx
  if (raw == null) return
  const idx = Number(raw)
  const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }
  const d = delta[e.key]
  if (d == null) return
  e.preventDefault()
  const next = e.currentTarget.querySelector<HTMLElement>(`[data-idx="${idx + d}"]`)
  next?.focus()
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
