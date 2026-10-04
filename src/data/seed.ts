import type { Candidate, Interview, Verdict } from './types'
import { QUESTIONS } from './questions'

const now = Date.now()
const min = 60_000
const day = 86_400_000

export const SEED_CANDIDATES: Candidate[] = [
  { id: 'c01', name: 'Marcus Reyes', citizenId: 'LS-48213', age: 27, discord: 'mreyes#2214', appliedAt: now - 2 * day, status: 'en_entrevista' },
  { id: 'c02', name: 'Elena Vargas', citizenId: 'LS-11902', age: 24, discord: 'evargas', appliedAt: now - 3 * day, status: 'apto' },
  { id: 'c03', name: 'Tyrone Hayes', citizenId: 'LS-77310', age: 31, discord: 'thayes_ls', appliedAt: now - 4 * day, status: 'no_apto' },
  { id: 'c04', name: 'Lucía Moreno', citizenId: 'LS-30477', age: 22, discord: 'lucim', appliedAt: now - 1 * day, status: 'pendiente' },
  { id: 'c05', name: 'Dmitri Volkov', citizenId: 'LS-66021', age: 29, discord: 'dvolkov', appliedAt: now - 5 * day, status: 'revision' },
  { id: 'c06', name: 'Aisha Grant', citizenId: 'LS-90155', age: 26, discord: 'agrant', appliedAt: now - 6 * day, status: 'apto' },
  { id: 'c07', name: 'Kevin O’Brien', citizenId: 'LS-25688', age: 35, discord: 'kob', appliedAt: now - 0.5 * day, status: 'pendiente' },
  { id: 'c08', name: 'Sofía Delgado', citizenId: 'LS-14420', age: 23, discord: 'sofid', appliedAt: now - 7 * day, status: 'apto' },
  { id: 'c09', name: 'Jamal Carter', citizenId: 'LS-51873', age: 28, discord: 'jcarter', appliedAt: now - 8 * day, status: 'no_apto' },
  { id: 'c10', name: 'Nadia Petrova', citizenId: 'LS-82904', age: 25, discord: 'npetrova', appliedAt: now - 0.2 * day, status: 'pendiente' },
]

const pick = (ids: string[]) => ids

function finished(
  id: string,
  candidateId: string,
  daysAgo: number,
  verdicts: Verdict[],
  score: number,
  result: Interview['result'],
  incidents = 0,
): Interview {
  const qs = QUESTIONS.slice(0, verdicts.length).map((q) => q.id)
  const start = now - daysAgo * day
  return {
    id,
    code: id.toUpperCase(),
    candidateId,
    interviewer: 'Sgt. A. Carrillo',
    status: 'finished',
    createdAt: start - 10 * min,
    startedAt: start,
    finishedAt: start + 24 * min,
    candidateJoinedAt: start - 2 * min,
    questionIds: qs,
    currentIndex: qs.length - 1,
    answers: Object.fromEntries(qs.map((q, i) => [q, { text: 'Respuesta registrada.', receivedAt: start + (i + 1) * min }])),
    evaluations: Object.fromEntries(qs.map((q, i) => [q, verdicts[i]])),
    incidents: Array.from({ length: incidents }, (_, i) => ({ id: `${id}-i${i}`, type: 'TAB_SWITCH' as const, at: start + (i + 3) * min, critical: false })),
    timeline: [],
    games: { memoria: 70 + (score % 20), reaccion: 60 + (score % 30), atencion: 75, matriculas: 68, reconstruccion: 72 },
    score,
    result,
  }
}

/** Entrevista en curso para la demo (con el candidato ya conectado) */
function liveDemo(): Interview {
  const qs = pick(['q01', 'q02', 'q03', 'q05', 'q07', 'q09', 'q10', 'q12', 'q13', 'q16', 'q04', 'q11', 'q14', 'q15', 'q17', 'q18', 'q06', 'q08'])
  const start = now - 23 * min - 42_000
  return {
    id: 'int-demo',
    code: 'LSPD-7Q4K',
    candidateId: 'c01',
    interviewer: 'Sgt. A. Carrillo',
    status: 'live',
    createdAt: start - 6 * min,
    startedAt: start,
    candidateJoinedAt: start - 3 * min,
    questionIds: qs,
    currentIndex: 3,
    answers: {
      q01: { text: 'Hay que avisar dos veces por megafonía y que el supervisor lo autorice. No se puede si va muy rápido o hay peatones.', receivedAt: start + 3 * min },
      q02: { text: 'Tres unidades como máximo y el helicóptero de apoyo.', receivedAt: start + 7 * min },
      q03: { text: 'Primero presencia, luego hablar, después control físico y el arma lo último.', receivedAt: start + 12 * min },
    },
    evaluations: { q01: 'correct', q02: 'correct', q03: 'partial' },
    incidents: [{ id: 'inc-1', type: 'TAB_SWITCH', at: start + 9 * min, critical: false }],
    timeline: [
      { id: 't0', at: start - 3 * min, kind: 'join', label: 'CANDIDATO CONECTADO', tone: 'brand' },
      { id: 't1', at: start, kind: 'start', label: 'ENTREVISTA INICIADA', tone: 'brand' },
      { id: 't2', at: start + 1 * min, kind: 'question', label: 'PREGUNTA 1', tone: 'neutral' },
      { id: 't3', at: start + 3.5 * min, kind: 'evaluation', label: 'PREGUNTA 1 · CORRECTA', tone: 'ok' },
      { id: 't4', at: start + 4 * min, kind: 'question', label: 'PREGUNTA 2', tone: 'neutral' },
      { id: 't5', at: start + 7.5 * min, kind: 'evaluation', label: 'PREGUNTA 2 · CORRECTA', tone: 'ok' },
      { id: 't6', at: start + 9 * min, kind: 'incident', label: 'CAMBIO DE PESTAÑA', tone: 'warn' },
      { id: 't7', at: start + 10 * min, kind: 'question', label: 'PREGUNTA 3', tone: 'neutral' },
      { id: 't8', at: start + 12.5 * min, kind: 'evaluation', label: 'PREGUNTA 3 · PARCIAL', tone: 'warn' },
      { id: 't9', at: start + 14 * min, kind: 'question', label: 'PREGUNTA 4', tone: 'neutral' },
    ],
    games: {},
  }
}

export const SEED_INTERVIEWS: Interview[] = [
  liveDemo(),
  {
    id: 'int-wait',
    code: 'LSPD-2M8X',
    candidateId: 'c04',
    interviewer: 'Ofc. J. Navarro',
    status: 'waiting',
    createdAt: now - 4 * min,
    candidateJoinedAt: now - 1 * min,
    questionIds: ['q05', 'q06', 'q07', 'q08', 'q09', 'q11', 'q14', 'q15', 'q18', 'q01', 'q02', 'q03'],
    currentIndex: 0,
    answers: {},
    evaluations: {},
    incidents: [],
    timeline: [{ id: 'w0', at: now - 1 * min, kind: 'join', label: 'CANDIDATO CONECTADO', tone: 'brand' }],
    games: {},
  },
  {
    id: 'int-sched',
    code: 'LSPD-9T1R',
    candidateId: 'c07',
    interviewer: 'Sgt. A. Carrillo',
    status: 'scheduled',
    createdAt: now - 20 * min,
    questionIds: ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09', 'q10', 'q11', 'q12'],
    currentIndex: 0,
    answers: {},
    evaluations: {},
    incidents: [],
    timeline: [],
    games: {},
  },
  finished('int-e02', 'c02', 1, ['correct', 'correct', 'partial', 'correct', 'correct', 'correct', 'correct', 'partial', 'correct', 'correct'], 86, 'APTO'),
  finished('int-e03', 'c03', 2, ['incorrect', 'partial', 'incorrect', 'correct', 'incorrect', 'partial', 'incorrect', 'incorrect', 'partial', 'correct'], 41, 'NO_APTO', 3),
  finished('int-e05', 'c05', 3, ['correct', 'partial', 'partial', 'correct', 'incorrect', 'partial', 'correct', 'partial', 'correct', 'partial'], 63, 'REVISION', 2),
  finished('int-e06', 'c06', 4, ['correct', 'correct', 'correct', 'correct', 'partial', 'correct', 'correct', 'correct', 'correct', 'partial'], 91, 'APTO'),
  finished('int-e08', 'c08', 5, ['correct', 'partial', 'correct', 'correct', 'correct', 'partial', 'correct', 'correct', 'partial', 'correct'], 81, 'APTO', 1),
  finished('int-e09', 'c09', 6, ['partial', 'incorrect', 'incorrect', 'partial', 'incorrect', 'correct', 'incorrect', 'partial', 'incorrect', 'incorrect'], 34, 'NO_APTO', 4),
]
