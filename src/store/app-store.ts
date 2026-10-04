import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Candidate, IncidentType, Interview, TimelineEvent, Verdict } from '@/data/types'
import { INCIDENT_LABEL } from '@/data/types'
import { SEED_CANDIDATES, SEED_INTERVIEWS } from '@/data/seed'
import { QUESTIONS } from '@/data/questions'
import { computeScore } from '@/data/scoring'
import { realtime } from '@/lib/realtime'
import { uid } from '@/lib/utils'

interface Session {
  name: string
  rank: string
  badge: string
}

interface AppState {
  session: Session | null
  candidates: Candidate[]
  interviews: Interview[]

  login: (name?: string) => void
  logout: () => void

  createInterview: (candidateId: string, questionCount?: number) => Interview
  createCandidate: (c: Pick<Candidate, 'name' | 'citizenId' | 'age' | 'discord'>) => Candidate
  joinInterview: (code: string) => Interview | null
  startInterview: (id: string) => void
  goToQuestion: (id: string, index: number) => void
  submitAnswer: (id: string, questionId: string, text: string) => void
  evaluate: (id: string, questionId: string, verdict: Verdict) => void
  reportIncident: (id: string, type: IncidentType) => void
  setGameScore: (id: string, game: string, score: number) => void
  finishInterview: (id: string) => void
  resetDemo: () => void
}

const ev = (kind: TimelineEvent['kind'], label: string, tone: TimelineEvent['tone']): TimelineEvent => ({
  id: uid('ev_'),
  at: Date.now(),
  kind,
  label,
  tone,
})

const code = () => 'LSPD-' + Math.random().toString(36).slice(2, 6).toUpperCase()

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Muta una entrevista, la publica por realtime y la devuelve */
      const mutate = (id: string, fn: (iv: Interview) => Interview) => {
        let next: Interview | undefined
        set((s) => ({
          interviews: s.interviews.map((iv) => {
            if (iv.id !== id) return iv
            next = fn(iv)
            return next
          }),
        }))
        if (next) realtime.publish({ type: 'interview:upsert', interview: next })
        return next
      }
      const setCandidateStatus = (candidateId: string, status: Candidate['status']) => {
        let next: Candidate | undefined
        set((s) => ({
          candidates: s.candidates.map((c) => (c.id === candidateId ? (next = { ...c, status }) : c)),
        }))
        if (next) realtime.publish({ type: 'candidate:upsert', candidate: next })
      }

      return {
        session: null,
        candidates: SEED_CANDIDATES,
        interviews: SEED_INTERVIEWS,

        login: (name = 'A. Carrillo') => set({ session: { name, rank: 'Sargento', badge: '#4127' } }),
        logout: () => set({ session: null }),

        createCandidate: (c) => {
          const cand: Candidate = { ...c, id: uid('c_'), appliedAt: Date.now(), status: 'pendiente' }
          set((s) => ({ candidates: [cand, ...s.candidates] }))
          realtime.publish({ type: 'candidate:upsert', candidate: cand })
          return cand
        },

        createInterview: (candidateId, questionCount = 12) => {
          const pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, questionCount)
          const s = get().session
          const iv: Interview = {
            id: uid('int_'),
            code: code(),
            candidateId,
            interviewer: s ? `Sgt. ${s.name}` : 'Entrevistador',
            status: 'scheduled',
            createdAt: Date.now(),
            questionIds: pool.map((q) => q.id),
            currentIndex: 0,
            answers: {},
            evaluations: {},
            incidents: [],
            timeline: [],
            games: {},
          }
          set((st) => ({ interviews: [iv, ...st.interviews] }))
          realtime.publish({ type: 'interview:upsert', interview: iv })
          return iv
        },

        joinInterview: (c) => {
          const iv = get().interviews.find((x) => x.code.toUpperCase() === c.trim().toUpperCase())
          if (!iv) return null
          if (iv.status === 'scheduled') {
            return (
              mutate(iv.id, (x) => ({
                ...x,
                status: 'waiting',
                candidateJoinedAt: Date.now(),
                timeline: [...x.timeline, ev('join', 'CANDIDATO CONECTADO', 'brand')],
              })) ?? null
            )
          }
          return iv
        },

        startInterview: (id) => {
          const iv = mutate(id, (x) => ({
            ...x,
            status: 'live',
            startedAt: Date.now(),
            currentIndex: 0,
            timeline: [...x.timeline, ev('start', 'ENTREVISTA INICIADA', 'brand'), ev('question', 'PREGUNTA 1', 'neutral')],
          }))
          if (iv) setCandidateStatus(iv.candidateId, 'en_entrevista')
        },

        goToQuestion: (id, index) =>
          void mutate(id, (x) => {
            const i = Math.max(0, Math.min(x.questionIds.length - 1, index))
            if (i === x.currentIndex) return x
            return { ...x, currentIndex: i, timeline: [...x.timeline, ev('question', `PREGUNTA ${i + 1}`, 'neutral')] }
          }),

        submitAnswer: (id, questionId, text) =>
          void mutate(id, (x) => {
            const n = x.questionIds.indexOf(questionId) + 1
            const first = !x.answers[questionId]
            return {
              ...x,
              answers: { ...x.answers, [questionId]: { text, receivedAt: Date.now() } },
              timeline: first ? [...x.timeline, ev('answer', `RESPUESTA ${n} RECIBIDA`, 'brand')] : x.timeline,
            }
          }),

        evaluate: (id, questionId, verdict) =>
          void mutate(id, (x) => {
            const n = x.questionIds.indexOf(questionId) + 1
            const label = { correct: 'CORRECTA', partial: 'PARCIAL', incorrect: 'INCORRECTA' }[verdict]
            const tone = ({ correct: 'ok', partial: 'warn', incorrect: 'danger' } as const)[verdict]
            return {
              ...x,
              evaluations: { ...x.evaluations, [questionId]: verdict },
              timeline: [...x.timeline, ev('evaluation', `PREGUNTA ${n} · ${label}`, tone)],
            }
          }),

        reportIncident: (id, type) =>
          void mutate(id, (x) => {
            const sameType = x.incidents.filter((i) => i.type === type).length
            // Salida de pantalla completa o reincidencia (3ª vez) → crítica
            const critical = type === 'FULLSCREEN_EXIT' || sameType >= 2
            return {
              ...x,
              incidents: [...x.incidents, { id: uid('inc_'), type, at: Date.now(), critical }],
              timeline: [...x.timeline, ev('incident', INCIDENT_LABEL[type], critical ? 'danger' : 'warn')],
            }
          }),

        setGameScore: (id, game, score) =>
          void mutate(id, (x) => ({
            ...x,
            games: { ...x.games, [game]: Math.round(score) },
            timeline: [...x.timeline, ev('game', `PRUEBA ${game.toUpperCase()} · ${Math.round(score)}`, 'brand')],
          })),

        finishInterview: (id) => {
          const iv = mutate(id, (x) => {
            const sc = computeScore(x)
            return {
              ...x,
              status: 'finished',
              finishedAt: Date.now(),
              score: sc.total,
              result: sc.result,
              timeline: [...x.timeline, ev('finish', 'ENTREVISTA FINALIZADA', 'brand')],
            }
          })
          if (iv?.result) {
            setCandidateStatus(iv.candidateId, iv.result === 'APTO' ? 'apto' : iv.result === 'NO_APTO' ? 'no_apto' : 'revision')
          }
        },

        resetDemo: () => {
          set({ candidates: SEED_CANDIDATES, interviews: SEED_INTERVIEWS })
          SEED_INTERVIEWS.forEach((interview) => realtime.publish({ type: 'interview:upsert', interview }))
        },
      }
    },
    {
      name: 'lspd-recruitment-v1',
      partialize: (s) => ({ session: s.session, candidates: s.candidates, interviews: s.interviews }),
    },
  ),
)

/* Aplicar mensajes remotos: sólo se sustituye la entidad afectada */
realtime.subscribe((msg) => {
  if (msg.type === 'interview:upsert') {
    useApp.setState((s) => {
      const exists = s.interviews.some((i) => i.id === msg.interview.id)
      return {
        interviews: exists
          ? s.interviews.map((i) => (i.id === msg.interview.id ? msg.interview : i))
          : [msg.interview, ...s.interviews],
      }
    })
  } else if (msg.type === 'candidate:upsert') {
    useApp.setState((s) => {
      const exists = s.candidates.some((c) => c.id === msg.candidate.id)
      return {
        candidates: exists
          ? s.candidates.map((c) => (c.id === msg.candidate.id ? msg.candidate : c))
          : [msg.candidate, ...s.candidates],
      }
    })
  }
})

/* Selectores */
export const useInterview = (id?: string) => useApp((s) => s.interviews.find((i) => i.id === id))
export const useCandidate = (id?: string) => useApp((s) => s.candidates.find((c) => c.id === id))
