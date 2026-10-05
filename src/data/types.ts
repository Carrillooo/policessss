export type Verdict = 'correct' | 'partial' | 'incorrect'
export type ResultLabel = 'APTO' | 'NO_APTO' | 'REVISION'

export interface Article {
  id: string // "1.28"
  category: string // id de categoría
  title: string
  summary: string
  body: string[]
  tags: string[]
  related: string[]
  updatedAt: string
}

export interface NormativaCategory {
  id: string
  code: string // "1"
  name: string
  icon: 'radio' | 'car' | 'shield' | 'handcuffs' | 'scale' | 'users' | 'siren'
}

export interface Question {
  id: string
  category: 'procedimiento' | 'fuerza' | 'persecucion' | 'detencion' | 'radio' | 'conducta' | 'situacional'
  text: string
  expected: string[]
  articles: string[]
  points: number
  difficulty: 1 | 2 | 3
}

export type CandidateStatus = 'pendiente' | 'en_entrevista' | 'apto' | 'no_apto' | 'revision'

export interface Candidate {
  id: string
  name: string
  /** ID de Discord (numérico) */
  discord: string
  appliedAt: number
  status: CandidateStatus
  notes?: string
}

export type IncidentType = 'TAB_SWITCH' | 'FOCUS_LOST' | 'FULLSCREEN_EXIT' | 'COPY_PASTE'
export interface Incident {
  id: string
  type: IncidentType
  at: number
  critical: boolean
}

export type TimelineKind = 'start' | 'question' | 'answer' | 'evaluation' | 'incident' | 'finish' | 'join' | 'game'
export interface TimelineEvent {
  id: string
  at: number
  kind: TimelineKind
  label: string
  tone: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger'
}

export interface Answer {
  text: string
  receivedAt: number
}

export type InterviewStatus = 'scheduled' | 'waiting' | 'live' | 'finished'

export interface Interview {
  id: string
  code: string
  candidateId: string
  interviewer: string
  status: InterviewStatus
  createdAt: number
  startedAt?: number
  finishedAt?: number
  candidateJoinedAt?: number
  questionIds: string[]
  currentIndex: number
  answers: Record<string, Answer>
  evaluations: Record<string, Verdict>
  incidents: Incident[]
  timeline: TimelineEvent[]
  games: Record<string, number> // gameId → 0..100
  score?: number
  result?: ResultLabel
}

export const INCIDENT_LABEL: Record<IncidentType, string> = {
  TAB_SWITCH: 'CAMBIO DE PESTAÑA',
  FOCUS_LOST: 'PÉRDIDA DE FOCO',
  FULLSCREEN_EXIT: 'SALIDA DE PANTALLA COMPLETA',
  COPY_PASTE: 'PEGADO DE TEXTO',
}

export const VERDICT_POINTS: Record<Verdict, number> = { correct: 1, partial: 0.5, incorrect: 0 }
