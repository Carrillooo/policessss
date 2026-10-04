import type { GameId } from './types'

const KEY = 'lspd-games-best-v1'

export function getBestScores(): Partial<Record<GameId, number>> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Registra una puntuación; devuelve el máximo y si es un récord nuevo */
export function recordScore(id: GameId, score: number): { best: number; isNew: boolean } {
  const all = getBestScores()
  const prev = all[id]
  const isNew = prev == null || score > prev
  const best = isNew ? score : prev
  if (isNew) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: score }))
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }
  return { best, isNew: isNew && prev != null }
}
