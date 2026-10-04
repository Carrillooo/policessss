import type { Interview, ResultLabel } from './types'
import { VERDICT_POINTS } from './types'

export const PASS_MARK = 70
export const REVIEW_MARK = 55

export interface ScoreBreakdown {
  questions: number // 0..100
  games: number | null // 0..100
  penalty: number
  total: number // 0..100
  evaluated: number
  correct: number
  partial: number
  incorrect: number
  result: ResultLabel
}

export function computeScore(iv: Interview): ScoreBreakdown {
  const verdicts = Object.values(iv.evaluations)
  const evaluated = verdicts.length
  const correct = verdicts.filter((v) => v === 'correct').length
  const partial = verdicts.filter((v) => v === 'partial').length
  const incorrect = verdicts.filter((v) => v === 'incorrect').length
  const raw = verdicts.reduce((s, v) => s + VERDICT_POINTS[v], 0)
  const questions = evaluated ? (raw / evaluated) * 100 : 0
  const gameScores = Object.values(iv.games)
  const games = gameScores.length ? gameScores.reduce((a, b) => a + b, 0) / gameScores.length : null
  const penalty = iv.incidents.reduce((s, i) => s + (i.critical ? 5 : 2), 0)
  const base = games == null ? questions : questions * 0.75 + games * 0.25
  const total = Math.max(0, Math.min(100, Math.round(base - penalty)))
  const criticals = iv.incidents.filter((i) => i.critical).length
  let result: ResultLabel = total >= PASS_MARK ? 'APTO' : total >= REVIEW_MARK ? 'REVISION' : 'NO_APTO'
  if (result === 'APTO' && criticals >= 2) result = 'REVISION'
  return { questions, games, penalty, total, evaluated, correct, partial, incorrect, result }
}

export const RESULT_META: Record<ResultLabel, { label: string; tone: 'ok' | 'danger' | 'warn' }> = {
  APTO: { label: 'APTO', tone: 'ok' },
  NO_APTO: { label: 'NO APTO', tone: 'danger' },
  REVISION: { label: 'REVISIÓN', tone: 'warn' },
}
